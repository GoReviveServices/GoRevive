import { KYC_SUPPORT_EMAIL } from '@/lib/kyc';

/**
 * Shown when the buyer's documents are uploaded but not approved yet.
 * The order still goes through; dispatch waits for the approval.
 */
export default function KycNotice({ kyc, compact = false }) {
    if (kyc?.state !== 'pending' && kyc?.state !== 'rejected') return null;
    const rejected = kyc.state === 'rejected';
    return (
        <div role="status" className={`flex items-start gap-3 rounded-[12px] border p-4 ${rejected ? 'border-red-200 bg-red-50' : 'border-sky-200 bg-sky-50'}`}>
            <svg aria-hidden="true" className={`mt-0.5 h-5 w-5 flex-shrink-0 ${rejected ? 'text-red-500' : 'text-sky-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-sm leading-relaxed">
                <p className={`font-bold ${rejected ? 'text-red-800' : 'text-sky-900'}`}>
                    {rejected ? 'Your documents were not approved' : 'Your documents are waiting for approval'}
                </p>
                {rejected && kyc.remark && !compact && <p className="mt-0.5 text-red-700">Reason: {kyc.remark}</p>}
                <p className={`mt-1 ${rejected ? 'text-red-700' : 'text-sky-800'}`}>
                    You can still place this order. It will be processed and dispatched after your documents are approved.
                    {' '}For more information contact{' '}
                    <a href={`mailto:${KYC_SUPPORT_EMAIL}`} className="font-bold underline">{KYC_SUPPORT_EMAIL}</a>.
                </p>
            </div>
        </div>
    );
}
