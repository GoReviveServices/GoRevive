"use client";

import Link from 'next/link';

// Grade wording matches the /grading page.
export const GRADE_INFO = {
    A: { label: 'Grade A', note: 'As good as new' },
    B: { label: 'Grade B', note: 'Minimal signs of usage' },
    C: { label: 'Grade C', note: 'Visible usage / minor issues' },
    D: { label: 'Grade D', note: 'Visible usage / functional issues' },
};

export default function ConditionSelector({ grades, selected, onSelect, pricesByGrade = {}, showPrices }) {
    if (!grades.length) return null;
    const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '');
    return (
        <fieldset>
            <div className="mb-3 flex items-center justify-between">
                <legend className="text-sm font-bold text-[#0B2136]">Condition</legend>
                <Link href="/grading" className="inline-block py-1.5 text-xs font-semibold text-[#1B5E3B] hover:underline">Learn more</Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {grades.map((g) => {
                    const info = GRADE_INFO[g] || { label: g, note: '' };
                    const active = g === selected;
                    return (
                        <button
                            key={g}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onSelect(g)}
                            className={`rounded-[12px] border-2 px-3 py-2.5 text-left transition-colors ${
                                active ? 'border-[#1B5E3B] bg-[#F0FAF5]' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <span className={`block text-sm font-bold ${active ? 'text-[#1B5E3B]' : 'text-[#0B2136]'}`}>{info.label}</span>
                            {info.note && <span className="block text-[11px] leading-tight text-gray-500">{info.note}</span>}
                            {showPrices && pricesByGrade[g] > 0 && (
                                <span className="mt-1 block text-xs font-semibold text-gray-700">from {inr(pricesByGrade[g])}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
