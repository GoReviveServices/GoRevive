import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { getProductFaq } from '../productFaq';
import { SectionHeading } from './PdpBlocks';

export default function ProductFaq({ category }) {
    return (
        <section id="faq" aria-labelledby="faq-heading" className="mt-4 scroll-mt-24 rounded-[18px] border border-[#DDEFE3] bg-white px-[22px] py-5 shadow-[0_10px_30px_-12px_rgba(27,94,59,0.18),0_1px_3px_rgba(10,31,20,0.05)]">
            <SectionHeading id="faq-heading" icon={MessageCircleQuestion} className="mb-2">Questions buyers ask</SectionHeading>
            {getProductFaq(category).map(({ q, a }, i) => (
                <details key={q} open={i === 0} className="group border-t border-[#EEF3F0]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-semibold text-[#0B2136] [&::-webkit-details-marker]:hidden">
                        {q}
                        <ChevronDown aria-hidden="true" className="h-[18px] w-[18px] flex-shrink-0 text-[#1B5E3B] transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="max-w-[760px] pb-3.5 text-sm leading-relaxed text-gray-600">{a}</p>
                </details>
            ))}
        </section>
    );
}
