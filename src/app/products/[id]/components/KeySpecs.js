// Specifications of the selected configuration, as an icon grid.
const ICONS = {
    processor: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    ram: 'M4 7h16v10H4zM8 7v10M12 7v10M16 7v10',
    storage: 'M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2zm0 0v12c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12c0 1.1 3.6 2 8 2s8-.9 8-2',
    display: 'M3 5h18v12H3zM8 21h8M12 17v4',
    os: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
    gpu: 'M3 8h18v10H3zM7 12h.01M11 12h.01M15 12h.01M6 18v2M18 18v2',
    battery: 'M3 8h16v8H3zM21 11v2M6 11h6',
    color: 'M12 3a9 9 0 100 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.4-4-7.8-9-7.8z',
};

const LABELS = { processor: 'Processor', ram: 'RAM', storage: 'Storage', display: 'Display', os: 'Operating System', gpu: 'Graphics', battery: 'Battery', color: 'Colour' };

const valid = (v) => v != null && String(v).trim() && !['/', 'N/A', 'NA'].includes(String(v).trim());

export default function KeySpecs({ specs }) {
    const rows = Object.keys(LABELS).filter((k) => valid(specs?.[k])).map((k) => [k, specs[k]]);
    if (!rows.length) return null;
    return (
        <section id="specs" aria-labelledby="specs-heading" className="mt-12 scroll-mt-24">
            <h2 id="specs-heading" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0B2136]">Specifications</h2>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {rows.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <svg aria-hidden="true" className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#1B5E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[key]} /></svg>
                        <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{LABELS[key]}</dt>
                            <dd className="mt-0.5 break-words text-sm font-bold text-[#0B2136]">{String(value)}</dd>
                        </div>
                    </div>
                ))}
            </dl>
        </section>
    );
}
