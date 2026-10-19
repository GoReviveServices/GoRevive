import 'server-only';
import { createHash } from 'node:crypto';
import { phpPost, isTrue } from './php';
import { imageUrl } from '@/lib/site';
import { computeOrderTotals, MIN_ORDER_UNITS } from '@/lib/pricing';
import { warrantyPrice, warrantyDays, isWarrantyEligible, EXT_WARRANTY_MONTHS, EXT_WARRANTY_RATE } from '@/lib/warranty';
import { getCartCategoryResolver } from './inventory';
import { fetchKycState } from './kyc';
import { kycAllowsOrder } from '@/lib/kyc';

// ---------------------------------------------------------------------------
// Cart, wallet and address — always read from PHP for the signed-in user.
// ---------------------------------------------------------------------------

export async function getServerCart(crmPartyCode) {
    const payload = await phpPost('view_cart.php', { userid: crmPartyCode });
    if (!isTrue(payload) || !Array.isArray(payload?.data?.cartdata)) return [];

    const categoryOf = await getCartCategoryResolver();
    return payload.data.cartdata.map((item) => {
        const productCategory = categoryOf(item);
        return {
        product: {
            id: item.productId,
            name: item.productName || item.model_code,
            category: item.item_category,
            productCategory,
            warrantyEligible: isWarrantyEligible(productCategory),
            brand: item.brand,
            // Never fall back to purchase_price: this object is sent to the browser.
            price: Number(item.price) || 0,
            stock: item.stock_qty ? Number(item.stock_qty) : 1,
            image: imageUrl(item.productImgUrl),
            condition: item.item_category,
            model_code: item.model_code,
            hsn_code: item.hsn_code || '',
            seller_cod: item.seller_cod || process.env.PHP_ASC_CODE || 'GRWHDL001',
            isStock: item.isStock,
        },
        quantity: Number(item.productQty || item.qty || 1),
        };
    });
}

export async function getWalletBalance(crmPartyCode) {
    const payload = await phpPost('get_customer_ledger.php', { customer_id: crmPartyCode });
    if (!isTrue(payload) || !Array.isArray(payload?.data)) return 0;
    return Math.max(0, Number(payload.data[0]?.balance) || 0);
}

export async function resolveAddress(user, addressId) {
    if (addressId === 'default-profile-address' && user.address1) {
        return { address: user.address1, city: user.city, state: user.state, zip: user.pincode };
    }
    const payload = await phpPost('view_address.php', { user_id: user.crm_party_code });
    const list = isTrue(payload) && Array.isArray(payload?.data) ? payload.data : [];
    const found = list.find((a) => String(a.addressid) === String(addressId));
    if (!found) return null;
    return {
        address: found.address1 || found.plot_no || '',
        city: found.city || '',
        state: found.state || '',
        zip: found.pincode || '',
    };
}

/** Stable fingerprint of what is being bought, so the cart cannot change after payment starts. */
export function cartFingerprint(items, warrantyIds = []) {
    const withWarranty = new Set(warrantyIds.map(String));
    const key = items
        .map((i) => `${i.product.id}:${i.product.price}:${i.quantity}:${withWarranty.has(String(i.product.id)) ? 'W' : ''}`)
        .sort()
        .join('|');
    return createHash('sha256').update(key).digest('hex');
}

const pad = (n) => String(n).padStart(2, '0');
const istTimestamp = (d = new Date()) => {
    // Orders are booked in India Standard Time regardless of server timezone.
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())} ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}`;
};

// ---------------------------------------------------------------------------
// Order creation and completion
// ---------------------------------------------------------------------------

/**
 * Prices the signed-in user's cart on the server and creates the PO in PHP.
 * Returns the order snapshot that payment and invoicing are checked against.
 */
export async function createOrder(user, { addressId, gateway, warrantyIds = [] }) {
    const [items, walletBalance, address, kyc] = await Promise.all([
        getServerCart(user.crm_party_code),
        getWalletBalance(user.crm_party_code),
        resolveAddress(user, addressId),
        fetchKycState(user.crm_party_code),
    ]);

    // Business documents must be uploaded. They do not have to be approved yet:
    // the accounts team verifies them manually, so approval is not checked here.
    if (!kyc) throw new OrderError('We could not check your business documents. Please try again in a moment.');
    if (!kycAllowsOrder(kyc)) throw new OrderError('Please upload your business documents (Aadhaar, PAN and GST certificate) before placing an order.', { code: 'KYC_MISSING' });

    if (items.length === 0) throw new OrderError('Your cart is empty.');
    if (!address) throw new OrderError('Please choose a valid shipping address.');

    const unavailable = items.filter((i) => i.product.isStock !== 'Available' || i.product.stock < i.quantity);
    if (unavailable.length) throw new OrderError('Some items in your cart are no longer available.', { unavailable: unavailable.map((i) => i.product.id) });
    if (items.some((i) => !(i.product.price > 0))) throw new OrderError('An item in your cart has no valid price. Please remove and re-add it.');

    // Extended warranty: only for laptops really in this cart; price set here.
    const cartIds = new Set(items.filter((i) => i.product.warrantyEligible).map((i) => String(i.product.id)));
    const warranty = [...new Set((Array.isArray(warrantyIds) ? warrantyIds : []).map(String))].filter((id) => cartIds.has(id));
    const totals = computeOrderTotals(items, walletBalance, warranty);
    if (totals.units < MIN_ORDER_UNITS) throw new OrderError(`Minimum order is ${MIN_ORDER_UNITS} units.`);
    const orderId = `GR_${user.crm_party_code}_${Date.now()}`;
    const orderDate = istTimestamp();
    const paymentMode = totals.payable === 0 ? 'Wallet' : gateway;

    const po = await phpPost(
        'POCreate.php',
        {
            POJSON: {
                order_details: items.map((i) => ({
                    sku_id: i.product.model_code || '',
                    imei: i.product.id || '',
                    qnty: String(i.quantity),
                    item_category: i.product.condition || i.product.category || 'Unknown',
                    item_name: i.product.name || '',
                    item_price: i.product.price,
                    ...warrantyFields(i, warranty),
                })),
                order_no: orderId,
                order_date: orderDate,
                tot_qnty: totals.units,
                tot_amount: totals.total,
                payment_mode: paymentMode,
                cod_charges: '',
                ...warrantyTotals(totals),
                payment_remark: totals.warrantyUnits
                    ? `B2B Website Order. Extended warranty (${EXT_WARRANTY_MONTHS} months) on ${totals.warrantyUnits} unit(s): Rs ${totals.warranty}`
                    : 'B2B Website Order',
                crm_party_code: user.crm_party_code,
                party_name: user.cust_name,
                party_mobile: user.mobile,
                party_email: user.email,
                shipping_address: address.address,
                shipping_city: address.city,
                shipping_state: address.state,
                shipping_zip: address.zip,
            },
        },
        { raw: true }
    );
    if (po?.status === 'false' || po?.response?.status === 'false') {
        throw new OrderError(po?.message || po?.response?.message || 'Failed to create purchase order.');
    }

    return {
        orderId,
        orderDate,
        crm: user.crm_party_code,
        gateway: paymentMode,
        total: totals.total,
        walletAmount: totals.walletAmount,
        payable: totals.payable,
        warrantyIds: warranty,
        warrantyAmount: totals.warranty,
        warrantyUnits: totals.warrantyUnits,
        fingerprint: cartFingerprint(items, warranty),
        address,
        kycState: kyc.state,
    };
}

/**
 * Creates the invoice in PHP once payment has been verified on the server.
 * Re-reads the cart and refuses if it no longer matches what was paid for.
 */
export async function completeOrder(user, order, paymentReference) {
    const items = await getServerCart(user.crm_party_code);
    const warranty = order.warrantyIds || [];
    if (cartFingerprint(items, warranty) !== order.fingerprint) {
        throw new OrderError('Your cart changed after payment started. Our team will contact you to reconcile this order.');
    }

    const payload = {
        order_no: order.orderId,
        invoice_no: '',
        invoice_date: order.orderDate.split(' ')[0],
        tot_qty: items.reduce((acc, i) => acc + i.quantity, 0),
        tot_discount_amt: 0,
        tot_taxable_amt: order.total,
        tot_cgst_amt: 0,
        tot_sgst_amt: 0,
        tot_igst_amt: 0,
        tot_amount: order.total,
        payment_mode: order.gateway,
        wallet_amount: order.walletAmount,
        cashfree_amount: order.payable,
        ...warrantyTotals({ warranty: order.warrantyAmount || 0, warrantyUnits: order.warrantyUnits || 0 }),
        crm_party_code: user.crm_party_code,
        payment_reference: paymentReference || order.orderId,
        payment_status: 'Success',
        company_gstno: '',
        customer_gstno: user.gst_no || '',
        party_name: user.cust_name,
        party_mobile: user.mobile,
        party_email: user.email,
        shipping_address: order.address.address,
        shipping_city: order.address.city,
        shipping_state: order.address.state,
        shipping_zip: order.address.zip,
        ship_from_state: 'Delhi',
        ship_from_addrs: '',
        invoice_details: items.map((i) => ({
            model_name: i.product.name,
            model_code: i.product.model_code || '',
            type: i.product.category || 'Unknown',
            hsn_code: i.product.hsn_code || '',
            qty: String(i.quantity),
            imei1: i.product.id,
            imei2: '',
            disccount: '0.00',
            item_category: i.product.condition || i.product.category || 'D',
            purchase_price: i.product.price,
            taxable_value: i.product.price * i.quantity,
            cgst_per: '0.00',
            cgst_amount: '0.00',
            sgst_per: '0.00',
            sgst_amount: '0.00',
            igst_per: '0.00',
            igst_amount: '0.00',
            price: String(i.product.price),
            item_total: String(i.product.price * i.quantity),
            warranty_days: String(warrantyDays(warranty.includes(String(i.product.id)))),
            ...warrantyFields(i, warranty),
        })),
    };

    const res = await phpPost('invoice_creation.php', { BillJSON: payload }, { raw: true });
    if (res?.status === 'false' || res?.response?.status === 'false') {
        throw new OrderError(res?.message || res?.response?.message || 'Failed to create invoice.');
    }
    return res;
}

// Extended warranty on the PO/invoice. The order total already includes it.
// The totals use the invoice's existing extra-charge fields; the per-line
// fields tell the backend which units are covered. Confirm with the PHP team
// that invoice_creation.php and POCreate.php store and print these.
function warrantyTotals({ warranty, warrantyUnits }) {
    return warranty > 0
        ? {
            extra_charges: `Extended warranty ${EXT_WARRANTY_MONTHS} months x ${warrantyUnits}`,
            extra_per: EXT_WARRANTY_RATE * 100,
            extra_amt: warranty,
        }
        : { extra_charges: '', extra_per: 0, extra_amt: 0 };
}

function warrantyFields(item, warrantyIds) {
    const covered = warrantyIds.includes(String(item.product.id));
    return {
        ext_warranty_months: covered ? String(EXT_WARRANTY_MONTHS) : '0',
        ext_warranty_amount: covered ? String(warrantyPrice(item.product.price) * item.quantity) : '0',
    };
}

export class OrderError extends Error {
    constructor(message, extra = {}) {
        super(message);
        this.name = 'OrderError';
        this.extra = extra;
    }
}
