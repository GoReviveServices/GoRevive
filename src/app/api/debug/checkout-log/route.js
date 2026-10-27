import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getSessionUser, unauthorized } from '@/lib/server/session';
import { checkoutLogPath, checkoutLogDir } from '@/lib/server/checkoutLog';

// Download the checkout debug log (logs/checkout/<order_no>.json) from the browser.
//
//   /api/debug/checkout-log                      → list of your logged orders, newest first
//   /api/debug/checkout-log?order_id=GR_..._...  → downloads that order's JSON file
//
// Works while developing only (next dev). To allow it on a deployed server, set
// CHECKOUT_LOG_DOWNLOAD=true. You must be signed in, and you only ever get logs
// for your own orders (order ids start with GR_<your crm_party_code>_).

const allowed = () => process.env.NODE_ENV !== 'production' || process.env.CHECKOUT_LOG_DOWNLOAD === 'true';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET(request) {
    if (!allowed()) return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 });

    const user = await getSessionUser();
    if (!user) return unauthorized();
    const prefix = `GR_${user.crm_party_code}_`;
    const orderId = new URL(request.url).searchParams.get('order_id');

    if (!orderId) {
        let names = [];
        try { names = await readdir(checkoutLogDir()); } catch { /* no logs yet */ }
        const mine = names.filter((n) => n.startsWith(prefix) && n.endsWith('.json'));
        const orders = await Promise.all(mine.map(async (n) => {
            const s = await stat(path.join(checkoutLogDir(), n)).catch(() => null);
            const id = n.slice(0, -'.json'.length);
            return { order_id: id, updated_at: s?.mtime?.toISOString() ?? null, download: `/api/debug/checkout-log?order_id=${encodeURIComponent(id)}` };
        }));
        orders.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
        return NextResponse.json({ success: true, folder: checkoutLogDir(), orders }, { headers: noStore });
    }

    if (!orderId.startsWith(prefix)) {
        return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    const file = checkoutLogPath(orderId);
    let body;
    try {
        body = await readFile(file, 'utf8');
    } catch {
        return NextResponse.json({ success: false, message: 'No log saved for this order.', looked_in: file }, { status: 404 });
    }
    return new NextResponse(body, {
        headers: {
            ...noStore,
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${path.basename(file)}"`,
        },
    });
}
