import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { GRADE_INFO } from './ConditionSelector';
import { SectionHeading } from './PdpBlocks';

// What each condition grade means, with the grades this product is offered in highlighted.
export default function GradeGuide({ available = [] }) {
    return (
        <section id="grades" aria-labelledby="grades-heading" className="min-w-0 flex-[1_1_380px] scroll-mt-24 rounded-[18px] border border-[#DDEFE3] bg-white px-[22px] py-5 shadow-[0_10px_30px_-12px_rgba(27,94,59,0.18),0_1px_3px_rgba(10,31,20,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-4">
                <SectionHeading id="grades-heading" icon={BadgeCheck}>What the grades mean</SectionHeading>
                <Link href="/grading" className="whitespace-nowrap text-[13px] font-semibold text-[#1B5E3B] hover:underline">Full grading guide</Link>
            </div>
            <ul className="flex flex-col gap-2.5">
                {Object.entries(GRADE_INFO).map(([id, info]) => {
                    const offered = available.includes(id);
                    return (
                        <li key={id} className={`flex gap-3 rounded-[10px] p-3 ${offered ? 'border-2 border-[#2E8B57] bg-gradient-to-br from-[#F1FBE6] to-[#E3F6EA]' : 'border border-gray-200 bg-white'}`}>
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#0A1F14] to-[#1B5E3B] text-base font-extrabold text-[#8AE63A]">{id}</span>
                            <p className="text-[13px] leading-snug">
                                <b className="text-sm text-[#0B2136]">{info.note}</b><br />
                                <span className={offered ? 'font-semibold text-[#1B5E3B]' : 'text-gray-400'}>{offered ? 'Available for this model' : 'Not in stock for this model'}</span>
                            </p>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
