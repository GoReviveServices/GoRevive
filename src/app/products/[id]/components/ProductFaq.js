import { PRODUCT_FAQ } from '../productFaq';

export default function ProductFaq() {
    return (
        <section aria-labelledby="faq-heading" className="mt-12">
            <h2 id="faq-heading" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0B2136]">Frequently Asked Questions</h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {PRODUCT_FAQ.map(({ q, a }) => (
                    <details key={q} className="group px-5 py-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-[#0B2136] [&::-webkit-details-marker]:hidden">
                            {q}
                            <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{a}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
