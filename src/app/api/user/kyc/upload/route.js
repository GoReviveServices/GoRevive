import { NextResponse } from 'next/server';
import { phpPostForm, isTrue } from '@/lib/server/php';
import { getSessionUser, unauthorized } from '@/lib/server/session';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per document
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const FIELDS = ['aadhaar_image', 'pan_image', 'gst_image'];

export async function POST(request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    try {
        const formData = await request.formData();
        const phpFormData = new FormData();
        // The account comes from the session, never from the form.
        phpFormData.append('dist_code', user.crm_party_code);
        phpFormData.append('token', process.env.PHP_STATIC_TOKEN_CHECKOUT);

        for (const field of FIELDS) {
            const file = formData.get(field);
            if (!file || typeof file === 'string' || file.size === 0) continue;
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json({ success: false, message: 'Only JPG and PNG images are allowed.' }, { status: 400 });
            }
            if (file.size > MAX_BYTES) {
                return NextResponse.json({ success: false, message: 'Each document must be under 5 MB.' }, { status: 400 });
            }
            phpFormData.append(field, file);
        }

        const payload = await phpPostForm('saveMobileKycUploads.php', phpFormData);
        if (isTrue(payload)) {
            return NextResponse.json({ success: true, message: 'Documents uploaded successfully' });
        }
        return NextResponse.json({ success: false, message: payload?.message || 'Upload rejected by server' }, { status: 400 });
    } catch (error) {
        console.error('KYC upload error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error during upload' }, { status: 500 });
    }
}
