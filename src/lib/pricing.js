import { warrantyPrice } from './warranty';

// Shared order maths, used by the browser (for display) and the server (for
// the amount actually charged), so the two can never disagree.
export const MIN_ORDER_UNITS = 5;
export const BULK_DISCOUNT_MIN_UNITS = 10;
export const BULK_DISCOUNT_RATE = 0.03;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * @param {Array<{product:{id:string, price:number}, quantity:number}>} items
 * @param {number} walletBalance
 * @param {Iterable<string>} warrantyIds  units with the extended warranty added
 */
export function computeOrderTotals(items = [], walletBalance = 0, warrantyIds = []) {
    const withWarranty = new Set([...warrantyIds].map(String));
    const units = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const subtotal = round2(items.reduce((sum, i) => sum + (Number(i.product?.price) || 0) * (Number(i.quantity) || 0), 0));
    // The bulk discount applies to devices only, not to the warranty add-on.
    const discountRate = units >= BULK_DISCOUNT_MIN_UNITS ? BULK_DISCOUNT_RATE : 0;
    const discount = round2(subtotal * discountRate);
    const warrantyItems = items.filter((i) => withWarranty.has(String(i.product?.id)));
    const warrantyUnits = warrantyItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const warranty = round2(warrantyItems.reduce((sum, i) => sum + warrantyPrice(i.product?.price) * (Number(i.quantity) || 0), 0));
    const total = round2(subtotal - discount + warranty);
    const walletAmount = round2(Math.max(0, Math.min(Number(walletBalance) || 0, total)));
    const payable = round2(total - walletAmount);
    return { units, subtotal, discountRate, discount, warranty, warrantyUnits, total, walletAmount, payable };
}
