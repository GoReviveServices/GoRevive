import { NextResponse } from 'next/server';
import { phpPost, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized } from '@/lib/server/session';
import { rateLimit } from '@/lib/server/rateLimit';

const ADDRESS_TYPES = ['Home', 'Office', 'Other'];
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function GET() {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const payload = await phpPost('view_address.php', { user_id: user.crm_party_code });
        const addresses = isTrue(payload) && Array.isArray(payload?.data) ? payload.data : [];
        return NextResponse.json({ success: true, addresses }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('Address fetch error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not load addresses.' }, { status: 500 });
    }
}

/**
 * Adds a shipping address for the signed-in buyer (manage_address.php, reqtype A).
 * The account (user_id) always comes from the session, never from the browser.
 */
export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const limit = rateLimit(`addr:${user.crm_party_code}`, 20, 15 * 60 * 1000);
    if (!limit.ok) {
        return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    try {
        const body = await request.json();
        const a = {
            contact_name: clean(body.contact_name, 80),
            state: clean(body.state, 60),
            city: clean(body.city, 60),
            plot_no: clean(body.plot_no, 100),
            locality: clean(body.locality, 150),
            landmark: clean(body.landmark, 100),
            contact_no: clean(body.contact_no, 10),
            alternate_no: clean(body.alternate_no, 10),
            pincode: clean(body.pincode, 6),
            addrs_type: ADDRESS_TYPES.includes(body.addrs_type) ? body.addrs_type : 'Other',
        };
        if (!a.alternate_no) a.alternate_no = a.contact_no;

        const problem =
            !a.contact_name ? 'Please enter the contact name.'
            : !a.plot_no ? 'Please enter the flat / house no. / building.'
            : !a.locality ? 'Please enter the street / area.'
            : !a.city ? 'Please enter the city.'
            : !a.state ? 'Please enter the state.'
            : !/^[1-9]\d{5}$/.test(a.pincode) ? 'Please enter a valid 6-digit pincode.'
            : !/^[6-9]\d{9}$/.test(a.contact_no) ? 'Please enter a valid 10-digit mobile number.'
            : !/^[6-9]\d{9}$/.test(a.alternate_no) ? 'Please enter a valid 10-digit alternate number.'
            : '';
        if (problem) return NextResponse.json({ success: false, message: problem }, { status: 400 });

        // The session keeps crm_party_code as a string, but manage_address.php
        // type-checks the user id ("Data type is not valid for userid") and
        // wants a number. Send it numeric when it is numeric, under both key
        // spellings the PHP API uses.
        const code = String(user.crm_party_code).trim();
        const userId = /^\d+$/.test(code) ? Number(code) : code;

        const payload = await phpPost('manage_address.php', {
            ...a,
            user_id: userId,
            userid: userId,
            reqtype: 'A',
            addressid: '',
        });
        if (isTrue(payload)) {
            return NextResponse.json({ success: true, message: payload?.message || 'Address added successfully' });
        }
        return NextResponse.json({ success: false, message: payload?.message || 'Could not save the address.' }, { status: 400 });
    } catch (error) {
        console.error('Address add error:', error.message);
        return NextResponse.json({ success: false, message: 'Could not save the address.' }, { status: 500 });
    }
}
