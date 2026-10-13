"use client";

import Link from 'next/link';
import { EXT_WARRANTY_MONTHS, STANDARD_WARRANTY_NOTE, warrantyPrice } from '@/lib/warranty';

const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '');

/**
 * Standard-warranty note + "Add 6 months extended warranty".
 * Signed-in buyers see the per-unit price and can add it. Guests are only
 * told the extended warranty exists (no price or percentage) and asked to log in.
 */
export default function WarrantyAddon({ unitPrice, quantity = 1, selected, onToggle, isAuthenticated, loginHref = '/login' }) {
    const perUnit = warrantyPrice(unitPrice);
    return (
        <section aria-labelledby="warranty-heading" className="rounded-[16px] border border-gray-100 bg-white p-2 shadow-sm">
            <h2 id="warranty-heading" className="sr-only">Warranty</h2>
            <p className="flex items-start gap-2 rounded-[12px] bg-[#1B5E3B] px-4 py-2.5 text-sm font-semibold leading-snug text-white">
                <svg aria-hidden="true" className="mt-px h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                <span>{STANDARD_WARRANTY_NOTE}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-[12px] bg-gray-50 px-4 py-3 sm:flex-nowrap">
                <svg aria-hidden="true" className="h-10 w-10 flex-shrink-0" viewBox="0 0 40 40">
                    <path d="M20 3 6 8v10c0 9 6 15.5 14 19 8-3.5 14-10 14-19V8L20 3z" fill="#0B2136" />
                    <path d="M20 6.5 9 10.5v7.7c0 7.2 4.7 12.4 11 15.3 6.3-2.9 11-8.1 11-15.3v-7.7L20 6.5z" fill="#1B5E3B" />
                    <path d="m14.5 20 3.8 3.8 7.4-7.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isAuthenticated ? (
                    <>
                        <p className="min-w-0 flex-1 text-[15px] leading-snug text-gray-800">
                            Add <strong className="font-bold">{EXT_WARRANTY_MONTHS} Months</strong> extended warranty
                            {perUnit > 0 && (
                                <>
                                    {' '}at <strong className="whitespace-nowrap font-bold">{inr(perUnit)}</strong>
                                    {quantity > 1 && <span className="text-gray-500"> per unit ({inr(perUnit * quantity)} for {quantity})</span>}
                                </>
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-pressed={selected}
                            className={`ml-auto min-w-[96px] rounded-[10px] px-5 py-2.5 text-sm font-bold transition-colors ${
                                selected
                                    ? 'border-2 border-[#1B5E3B] bg-[#F0FAF5] text-[#1B5E3B]'
                                    : 'bg-[#0B2136] text-white hover:bg-[#1B5E3B]'
                            }`}
                        >
                            {selected ? '✓ Added' : 'Add'}
                        </button>
                    </>
                ) : (
                    <>
                        <p className="min-w-0 flex-1 text-[15px] leading-snug text-gray-800">
                            <strong className="font-bold">{EXT_WARRANTY_MONTHS} Months</strong> extended warranty available on every device
                        </p>
                        <Link href={loginHref} className="ml-auto inline-block whitespace-nowrap py-2 text-sm font-bold text-[#1B5E3B] hover:underline">
                            Login to add
                        </Link>
                    </>
                )}
            </div>
        </section>
    );
}
