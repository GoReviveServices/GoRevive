import Link from 'next/link';
import { BULK_DISCOUNT_MIN_UNITS, BULK_DISCOUNT_RATE, MIN_ORDER_UNITS } from '@/lib/pricing';

const Icon = ({ d, className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const ICON = {
    cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    ram: 'M4 7h16v10H4zM8 7v10M12 7v10M16 7v10',
    disk: 'M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2zm0 0v12c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12c0 1.1 3.6 2 8 2s8-.9 8-2',
    screen: 'M3 5h18v12H3zM8 21h8M12 17v4',
    os: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
    battery: 'M3 8h16v8H3zM21 11v2M6 11h6',
    shield: 'M9 12l2 2 4-4m5.6-4.4A11.95 11.95 0 0112 2.9a11.95 11.95 0 01-8.6 3.1A12 12 0 003 9c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-1-.1-2.1-.4-3.1z',
    lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    returns: 'M4 4v5h.6m15.4 2A8 8 0 004.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 01-15.4-2m15.4 2H15',
    invoice: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    tag: 'M7 7h.01M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9z',
    wallet: 'M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-3m0-6H5m15 6h-4a2 2 0 010-4h4v4z',
    boxes: 'M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4m0-10v10m9-14v10l-9 4',
};

const valid = (v) => v != null && String(v).trim() && !['/', 'N/A', 'NA'].includes(String(v).trim());

/** Flipkart-style "highlights": the specs a buyer scans first, as chips. */
export function SpecHighlights({ specs }) {
    const rows = [
        ['cpu', specs?.processor],
        ['ram', specs?.ram && `${specs.ram} RAM`],
        ['disk', specs?.storage],
        ['screen', specs?.display],
        ['os', specs?.os],
        ['battery', specs?.battery],
    ].filter(([, v]) => valid(v));
    if (!rows.length) return null;
    return (
        <ul aria-label="Key highlights" className="flex flex-wrap gap-2">
            {rows.map(([icon, value]) => (
                <li key={icon} className="inline-flex max-w-full items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#0B2136]">
                    <Icon d={ICON[icon]} className="h-4 w-4 flex-shrink-0 text-[#1B5E3B]" />
                    <span className="min-w-0 break-words">{String(value)}</span>
                </li>
            ))}
        </ul>
    );
}

/** Amazon-style offer cards in a horizontally scrolling row. */
export function OfferCards({ showPrices }) {
    const offers = [
        { icon: 'tag', tone: 'bg-[#F0FAF5] text-[#1B5E3B]', title: `${BULK_DISCOUNT_RATE * 100}% off on ${BULK_DISCOUNT_MIN_UNITS}+ units`, text: 'Bulk discount on all devices, applied automatically at checkout.' },
        { icon: 'wallet', tone: 'bg-blue-50 text-blue-700', title: 'Use your wallet', text: 'Your GoRevive wallet balance is applied before you pay.' },
        { icon: 'invoice', tone: 'bg-amber-50 text-amber-700', title: 'GST invoice · ITC ready', text: 'Claim input tax credit on every order.' },
        { icon: 'boxes', tone: 'bg-slate-100 text-slate-700', title: `Minimum ${MIN_ORDER_UNITS} units`, text: 'Mix any models in one order to reach the minimum.' },
    ];
    return (
        <section aria-labelledby="offers-heading">
            <h2 id="offers-heading" className="mb-2.5 text-sm font-bold text-[#0B2136]">Business offers{!showPrices && <span className="font-medium text-gray-500"> · login to apply</span>}</h2>
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
                {offers.map((o) => (
                    <li key={o.title} className="w-[220px] flex-shrink-0 snap-start rounded-[12px] border border-gray-200 bg-white p-3.5 shadow-sm">
                        <span className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full ${o.tone}`}><Icon d={ICON[o.icon]} className="h-4 w-4" /></span>
                        <p className="text-[13px] font-bold leading-snug text-[#0B2136]">{o.title}</p>
                        <p className="mt-1 text-xs leading-snug text-gray-500">{o.text}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Amazon-style icon row: the promises that matter at the moment of buying. */
export function ServiceRow() {
    const items = [
        { icon: 'shield', label: 'Quality checked & graded' },
        { icon: 'lock', label: 'NIST 800-88 data wipe' },
        { icon: 'returns', label: '7-day return eligibility' },
        { icon: 'truck', label: 'Pan-India delivery' },
    ];
    return (
        <ul aria-label="Why buy from GoRevive" className="grid grid-cols-4 gap-2 rounded-[14px] border border-gray-200 bg-white px-2 py-3.5 shadow-sm">
            {items.map((i) => (
                <li key={i.label} className="flex min-w-0 flex-col items-center gap-1.5 px-1 text-center">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F0FAF5] text-[#1B5E3B]"><Icon d={ICON[i.icon]} /></span>
                    <span className="text-[11px] font-semibold leading-tight text-[#0B2136]">{i.label}</span>
                </li>
            ))}
        </ul>
    );
}

/** In-page jump links, like the tab bar on Cashify / Flipkart product pages. */
export function SectionNav({ items }) {
    return (
        <nav aria-label="On this page" className="-mx-4 mt-10 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
            <ul className="flex min-w-max gap-1">
                {items.map(([href, label]) => (
                    <li key={href}>
                        <Link href={href} scroll className="inline-block border-b-2 border-transparent px-4 py-3 text-sm font-bold text-gray-600 hover:border-[#1B5E3B] hover:text-[#1B5E3B]">{label}</Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
