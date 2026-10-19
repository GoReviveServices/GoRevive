// Business-document (KYC) state, shared by the checkout screens and the server.
//
//   missing  - at least one of Aadhaar / PAN / GST certificate has not been uploaded
//   pending  - all three are uploaded, waiting for GoRevive to approve them
//   rejected - uploaded, but not accepted (an admin remark may explain why)
//   approved - uploaded and approved
//
// Only "missing" blocks an order. For pending and rejected documents the buyer
// can still order; GoRevive processes and dispatches it once the documents are approved.
export const KYC_SUPPORT_EMAIL = 'info@gorevive.in';

export const KYC_DOCS = [
    { key: 'aadhaar', field: 'aadhar_img', label: 'Aadhaar card' },
    { key: 'pan', field: 'pan_img', label: 'PAN card' },
    { key: 'gst', field: 'gst_img', label: 'GST certificate' },
];

export function getKycState(kycData) {
    const missing = KYC_DOCS.filter((d) => !kycData?.[d.field]).map((d) => d.key);
    if (missing.length) return { state: 'missing', missing, remark: '' };

    const status = String(kycData?.kyc_status || '').trim().toUpperCase();
    if (status === 'VERIFIED' || status === 'APPROVED') return { state: 'approved', missing: [], remark: '' };
    if (status === 'REJECTED') return { state: 'rejected', missing: [], remark: String(kycData?.remark || '') };
    return { state: 'pending', missing: [], remark: '' };
}

/** True when the order can go ahead (documents exist), even if not yet approved. */
export const kycAllowsOrder = (kyc) => kyc?.state && kyc.state !== 'missing';
/** True when the order will wait for document approval before it is dispatched. */
export const kycHoldsDispatch = (kyc) => kyc?.state === 'pending' || kyc?.state === 'rejected';
