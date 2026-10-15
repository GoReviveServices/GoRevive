"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/utils/Context/AuthContext';
import SmartImage from '@/components/utils/UI/SmartImage';
import { productPath } from '@/lib/slug';
import { withBrand } from '@/lib/site';
import { MIN_ORDER_UNITS } from '@/lib/pricing';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr = (n) => currency.format(n).replace(/\s/g, '');

// Grade -> color. Single source of truth for cards, rows and the sidebar.
export const GRADE_COLORS = { A: '#1B5E3B', B: '#2563A8', C: '#B4650B', D: '#B1401F' };
export const gradeColor = (g) => GRADE_COLORS[String(g).trim().toUpperCase()] || '#4A6355';
// Single letters read as "Grade A"; anything else ("Open Box") is shown as-is.
export const gradeLabel = (g) => (/^[A-Z]$/i.test(String(g).trim()) ? `Grade ${String(g).trim().toUpperCase()}` : String(g).trim());
const isLetter = (g) => /^[A-Z]$/i.test(String(g).trim());

const derive = (p) => {
    const hasDiscount = p.mrp > p.startingPrice && p.startingPrice > 0;
    return {
        hasDiscount,
        off: hasDiscount ? Math.round(((p.mrp - p.startingPrice) / p.mrp) * 100) : 0,
        low: p.totalStock > 0 && p.totalStock <= 5,
        spec: [p.baseSpecs?.ram && `${p.baseSpecs.ram} RAM`, p.baseSpecs?.storage].filter(Boolean).join(' · '),
        grades: p.availableConditions || [],
    };
};

const Seal = ({ size = 22 }) => (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C9971C" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const GuestPrice = ({ off, hasDiscount }) => (
    <Link href="/login" className="flex items-center justify-between gap-2 group/cta">
        <span className="flex flex-col leading-tight">
            <span className="text-[13px] font-extrabold text-[#1B8A4B]">{hasDiscount ? `Up to ${off}% below MRP` : 'Trade pricing'}</span>
            <span className="text-[13px] font-bold text-[#0A1A0E] group-hover/cta:text-[#1B5E3B]">Login to see price</span>
        </span>
        <span className="w-[30px] h-[30px] flex-shrink-0 rounded-full border border-[#D6E2DB] flex items-center justify-center text-[#1B5E3B] group-hover/cta:bg-[#F0FAF5]">
            <svg aria-hidden="true" className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </span>
    </Link>
);

/** Grid card for /products. */
export const ListingCard = React.memo(function ListingCard({ product, priority = false }) {
    const { isAuthenticated } = useAuth();
    const href = productPath(product);
    const d = derive(product);

    return (
        <article className="group flex flex-col bg-white border border-[#E3EBE6] rounded-[14px] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9DED1] hover:shadow-[0_16px_40px_-18px_rgba(27,94,59,.35)]">
            <Link href={href} aria-label={product.model} className="relative block aspect-square bg-[#FAFAF9] border-b border-[#EEF2EF]">
                <span className="absolute inset-4">
                    <SmartImage src={product.image} alt={`Pre-Owned ${withBrand(product.brand, product.model)}`} fill sizes="(min-width: 1024px) 260px, 50vw" priority={priority} className="object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.03]" />
                </span>
                <span className="absolute top-2 left-2" title={d.grades[0] ? `Certified · ${gradeLabel(d.grades[0])}` : 'Certified'}><Seal /></span>
                {d.low && <span className="absolute left-2 bottom-2 text-[11px] font-bold text-[#B1401F] bg-white px-2 py-0.5 rounded-md border border-[#F3D5CC]">Only {product.totalStock} left</span>}
            </Link>
            <div className="flex-1 flex flex-col gap-1.5 px-3.5 pt-3 pb-3.5">
                <span className="text-[10.5px] font-extrabold tracking-[.09em] uppercase text-[#1B5E3B]">{product.brand}</span>
                <Link href={href} tabIndex={-1} className="text-[14.5px] font-semibold leading-snug text-[#0A1A0E] line-clamp-2 min-h-[39px] group-hover:text-[#1B5E3B]">{product.model}</Link>
                {d.spec && <span className="text-[12.5px] text-[#4A6355]">{d.spec}</span>}
                {d.grades.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[11.5px] text-[#4A6355] mr-0.5">{d.grades.every(isLetter) ? 'Grades' : 'Condition'}</span>
                        {d.grades.map(g => (
                            <span key={g} title={gradeLabel(g)} className={`h-5 ${isLetter(g) ? 'w-5 justify-center' : 'px-1.5'} rounded-[5px] border border-solid text-[11px] font-extrabold flex items-center whitespace-nowrap`} style={{ color: gradeColor(g), borderColor: gradeColor(g) }}>{isLetter(g) ? String(g).trim().toUpperCase() : String(g).trim()}</span>
                        ))}
                    </div>
                )}
                <div className="flex-1" />
                <div className="border-t border-[#EEF2EF] pt-2.5 mt-1">
                    {isAuthenticated ? (
                        <>
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-[20px] font-extrabold tracking-tight text-[#0A1A0E]">{inr(product.startingPrice)}</span>
                                {d.hasDiscount && <span className="text-[12.5px] text-[#7A8F82] line-through">{inr(product.mrp)}</span>}
                                {d.hasDiscount && <span className="text-[13px] font-extrabold text-[#1B8A4B]">{d.off}% off</span>}
                            </div>
                            <div className="text-[11.5px] text-[#4A6355] mt-0.5">From · per unit, excl. GST · {product.totalStock} in stock</div>
                        </>
                    ) : <GuestPrice off={d.off} hasDiscount={d.hasDiscount} />}
                </div>
            </div>
        </article>
    );
});

/** List row (Flipkart-style) for /products, desktop only. */
export const ListingRow = React.memo(function ListingRow({ product, priority = false }) {
    const { isAuthenticated } = useAuth();
    const href = productPath(product);
    const d = derive(product);
    const bullets = [product.baseSpecs?.ram && `RAM: ${product.baseSpecs.ram}`, product.baseSpecs?.storage && `Storage: ${product.baseSpecs.storage}`, product.category && `Category: ${product.category}`].filter(Boolean);

    return (
        <article className="group grid grid-cols-[180px_minmax(0,1fr)_230px] gap-5 px-5 py-[18px] border-b border-[#EEF2EF] last:border-b-0 hover:bg-[#FBFDFB]">
            <Link href={href} aria-label={product.model} className="relative block aspect-square rounded-[10px] bg-[#FAFAF9]">
                <span className="absolute inset-3">
                    <SmartImage src={product.image} alt={`Pre-Owned ${withBrand(product.brand, product.model)}`} fill sizes="180px" priority={priority} className="object-contain mix-blend-multiply" />
                </span>
                <span className="absolute top-1.5 left-1.5"><Seal size={20} /></span>
            </Link>
            <div className="min-w-0 flex flex-col gap-2">
                <Link href={href} className="text-[17px] font-semibold leading-snug text-[#0A1A0E] group-hover:text-[#1B5E3B]">{product.model}</Link>
                {d.grades.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        {d.grades.map(g => (
                            <span key={g} className="h-[22px] px-2 rounded-[5px] border border-solid text-[11.5px] font-extrabold flex items-center whitespace-nowrap" style={{ color: gradeColor(g), borderColor: gradeColor(g) }}>{gradeLabel(g)}</span>
                        ))}
                    </div>
                )}
                <ul className="list-disc pl-[18px] text-[13.5px] text-[#24402F] flex flex-col gap-[3px]">
                    {bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
            </div>
            <div className="flex flex-col gap-1">
                {isAuthenticated ? (
                    <>
                        <span className="text-2xl font-extrabold tracking-tight text-[#0A1A0E]">{inr(product.startingPrice)}</span>
                        {d.hasDiscount && (
                            <div className="flex gap-2 items-baseline">
                                <span className="text-[13px] text-[#7A8F82] line-through">{inr(product.mrp)}</span>
                                <span className="text-[13.5px] font-extrabold text-[#1B8A4B]">{d.off}% off</span>
                            </div>
                        )}
                        <span className="text-xs text-[#4A6355]">Lowest unit price · excl. GST</span>
                    </>
                ) : <GuestPrice off={d.off} hasDiscount={d.hasDiscount} />}
                <span className={`text-[12.5px] font-bold mt-1.5 ${d.low ? 'text-[#B1401F]' : 'text-[#1B5E3B]'}`}>{d.low ? `Only ${product.totalStock} left` : `${product.totalStock} units in stock`}</span>
                <span className="text-xs text-[#4A6355]">Min. order {MIN_ORDER_UNITS} units</span>
            </div>
        </article>
    );
});
