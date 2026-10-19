import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized, isRetailer } from '@/lib/server/session';
import { getServerCart } from '@/lib/server/orders';
import { getUnitsByIds } from '@/lib/server/inventory';

const ACTIONS = new Set(['P', 'R', 'M']); // P = add, R = remove, M = decrement
const MAX_UNITS_PER_REQUEST = 50;

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const cart = await getServerCart(user.crm_party_code);
        return NextResponse.json({ success: true, cart }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('Cart fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not load your cart.' }, { status: 500 });
    }
}

/**
 * Body: { ids: string[] } or { id: string }, plus action 'P' | 'R' | 'M'.
 * Only unit IDs come from the browser. Price, model and seller are looked up
 * on the server, so a unit can't be added at a made-up price.
 */
export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const body = await request.json();
        const action = ACTIONS.has(body.action) ? body.action : 'P';
        const ids = [...new Set((body.ids || (body.id ? [body.id] : [])).map(String).filter(Boolean))];

        if (ids.length === 0 || ids.length > MAX_UNITS_PER_REQUEST) {
            return NextResponse.json({ success: false, message: 'Select between 1 and 50 units.' }, { status: 400 });
        }

        // Retailers are charged Ret_Price, customers Cust_Price.
        const tier = isRetailer(user) ? 'retailer' : 'customer';
        let lines;
        if (action === 'P') {
            const found = await getUnitsByIds(ids, tier);
            // A unit with no price for this user (e.g. Ret_Price 0) can't be bought.
            const missing = ids.filter((id) => !found.has(id) || !(found.get(id).unit.price > 0));
            if (missing.length) {
                return NextResponse.json({ success: false, message: 'Some units are no longer available.', unavailable: missing }, { status: 409 });
            }
            lines = ids.map((id) => {
                const { unit, raw } = found.get(id);
                const purchase = Number(raw.purchase_price) > 0 ? Number(raw.purchase_price) : unit.price * 0.7;
                return { id, model_code: unit.model_code, condition: unit.condition, price: unit.price, purchase, seller: unit.seller_cod };
            });
        } else {
            // Removing: use what is already in this user's cart.
            const [cart, stock] = await Promise.all([
                getServerCart(user.crm_party_code),
                getUnitsByIds(ids, tier).catch(() => new Map()),
            ]);
            const inCart = new Map(cart.map((i) => [String(i.product.id), i.product]));
            lines = ids.filter((id) => inCart.has(id)).map((id) => {
                const p = inCart.get(id);
                // purchase_price is read server-side only and goes straight to PHP.
                const purchase = Number(stock.get(id)?.raw?.purchase_price) || p.price * 0.7;
                return { id, model_code: p.model_code, condition: p.condition, price: p.price, purchase, seller: p.seller_cod };
            });
            if (lines.length === 0) return NextResponse.json({ success: true, message: 'Nothing to remove.' });
        }

        const cartJSON = lines.map((l) => ({
            productid: l.id,
            model_code: String(l.model_code || ''),
            userid: String(user.crm_party_code),
            sessionid: String(user.crm_party_code),
            qty: '1',
            reqtype: action,
            stock_type: String(l.condition || ''),
            price: Number(l.price) || 0,
            purchase_price: Number(l.purchase || 0).toFixed(2),
            payment_mode: '',
            seller_cod: String(l.seller || 'GRWHDL001'),
            cod_charges: '',
            payment_remark: '',
        }));

        // One PHP call per unit, as the site did before, so each unit is
        // allocated or rejected on its own.
        const results = await Promise.all(
            cartJSON.map((line) =>
                phpPost('add_to_cart.php', { cartJSON: [line] })
                    .then((payload) => ({ id: line.productid, ok: isTrue(payload), message: payload?.message }))
                    .catch(() => ({ id: line.productid, ok: false, message: 'Request failed' }))
            )
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length === 0) {
            return NextResponse.json({ success: true, message: results[0]?.message || 'Cart updated successfully' });
        }
        return NextResponse.json(
            { success: false, message: failed[0].message || 'Failed to update cart', failed: failed.map((f) => f.id) },
            { status: failed.length === results.length ? 400 : 207 }
        );
    } catch (error) {
        console.error('Cart update error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
