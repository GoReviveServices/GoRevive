import Link from 'next/link';
import { GRADE_INFO } from './ConditionSelector';

// What each condition grade means, with the grades this product is offered in highlighted.
export default function GradeGuide({ available = [] }) {
    return (
        <section aria-labelledby="grades-heading" className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
                <h2 id="grades-heading" className="text-2xl font-extrabold tracking-tight text-[#0B2136]">Condition Grades Explained</h2>
                <Link href="/grading" className="whitespace-nowrap text-sm font-semibold text-[#1B5E3B] hover:underline">Full grading guide</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Object.entries(GRADE_INFO).map(([id, info]) => {
                    const offered = available.includes(id);
                    return (
                        <div key={id} className={`rounded-2xl border p-4 ${offered ? 'border-[#1B5E3B]/30 bg-[#F0FAF5]' : 'border-gray-100 bg-white'}`}>
                            <p className="text-lg font-black text-[#0B2136]">{info.label}</p>
                            <p className="mt-1 text-sm text-gray-600">{info.note}</p>
                            <p className={`mt-3 text-xs font-bold ${offered ? 'text-[#1B5E3B]' : 'text-gray-400'}`}>{offered ? 'Available for this model' : 'Not in stock for this model'}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
