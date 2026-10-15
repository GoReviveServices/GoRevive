"use client";

import Link from 'next/link';

// Grade wording matches the /grading page.
export const GRADE_INFO = {
    A: { label: 'Grade A', note: 'As good as new' },
    B: { label: 'Grade B', note: 'Minimal signs of usage' },
    C: { label: 'Grade C', note: 'Visible usage / minor issues' },
    D: { label: 'Grade D', note: 'Visible usage / functional issues' },
};

/** All four grades as cards with price and stock; grades without stock are disabled. */
export default function ConditionSelector({ selected, onSelect, pricesByGrade = {}, stockByGrade = {}, showPrices }) {
    const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '');
    const current = GRADE_INFO[selected];
    return (
        <fieldset>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <legend className="text-sm text-[#0B2136]">
                    Condition: <b>{current?.label || '—'}</b>{current && <span className="text-gray-500"> — {current.note}</span>}
                </legend>
                <Link href="/grading" className="whitespace-nowrap text-[13px] font-semibold text-[#1B5E3B] hover:underline">Grading guide</Link>
            </div>
            <div className="flex flex-wrap gap-2">
                {Object.entries(GRADE_INFO).map(([g, info]) => {
                    const stock = stockByGrade[g] || 0;
                    const active = g === selected;
                    return (
                        <button
                            key={g}
                            type="button"
                            aria-pressed={active}
                            disabled={!stock}
                            onClick={() => onSelect(g)}
                            className={`flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                                active ? 'border-2 border-[#2E8B57] bg-gradient-to-br from-[#F1FBE6] to-[#E3F6EA]' : 'border border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <span className="text-sm font-bold text-[#0B2136]">{info.label}</span>
                            <span className="text-[13px] font-semibold leading-snug text-[#0B2136]">
                                {showPrices && pricesByGrade[g] > 0 ? `from ${inr(pricesByGrade[g])}` : info.note}
                            </span>
                            <span className={`text-xs font-semibold ${stock ? 'text-[#1B5E3B]' : 'text-gray-400'}`}>{stock ? `${stock} in stock` : 'Out of stock'}</span>
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}
