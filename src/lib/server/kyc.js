import 'server-only';
import { phpPost, isTrue } from './php';
import { getKycState } from '@/lib/kyc';

/** Reads the signed-in user's document record from PHP. Returns null if it can't be read. */
export async function fetchKycData(crmPartyCode) {
    const payload = await phpPost('getKycStatus.php', { userid: crmPartyCode });
    if (isTrue(payload) && Array.isArray(payload?.data)) return payload.data[0] || {};
    return null;
}

/** { state, missing, remark } for an account, or null if PHP could not be reached. */
export async function fetchKycState(crmPartyCode) {
    try {
        const data = await fetchKycData(crmPartyCode);
        return data ? getKycState(data) : null;
    } catch (error) {
        console.error('KYC state error:', error.message);
        return null;
    }
}
