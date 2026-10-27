"use client";

import React from 'react';
import Link from 'next/link';
import SmartImage from '@/components/utils/UI/SmartImage';
import { productPath } from '@/lib/slug';
import { withBrand } from '@/lib/site';

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const formatCurrency = (amount) => currencyFormatter.format(amount).replace(/\s/g, '');

// Grade -> color. Single source of truth so every place a grade appears
// (image badge, text list) stays consistent.
const GRADE_COLORS = {
    A: '#1B5E3B',
    B: '#2563A8',
    C: '#B4650B',
    D: '#B1401F',
};

export const ProductCard = React.memo(function ProductCard({ product, priority = false }) {
    const href = productPath(product);
    const altText = `Pre-Owned ${withBrand(product.brand, product.model)}`;

    const hasDiscount = product.mrp > product.startingPrice;
    const discountPercent = hasDiscount ? Math.round(((product.mrp - product.startingPrice) / product.mrp) * 100) : 0;
    const discountAmount = hasDiscount ? (product.mrp - product.startingPrice) : 0;
    const isLowStock = product.totalStock > 0 && product.totalStock <= 5;
    const conditions = product.availableConditions || [];

    return (
        <div className="group relative flex flex-row md:flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-[0_16px_40px_rgba(11,33,54,0.08)] hover:-translate-y-0.5 hover:border-gray-200 transition-all duration-300 h-full">

            <Link
                href={href}
                aria-label={product.model}
                className="relative w-[38%] md:w-full aspect-square md:aspect-[4/3] bg-[#FAFAF9] flex-shrink-0 flex items-center justify-center p-5 md:p-6 border-r md:border-r-0 md:border-b border-gray-100 overflow-hidden"
            >
                <span className="relative block w-full h-full">
                    <SmartImage
                        src={product.image}
                        alt={altText}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 40vw"
                        priority={priority}
                        className="object-contain mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    />
                </span>
            </Link>

            <div className="flex flex-col flex-grow p-4 md:p-5 w-[62%] md:w-full">

                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[#1B5E3B] text-[10px] md:text-[11px] font-bold uppercase tracking-[0.08em]">
                        {product.brand}
                    </span>
                    {isLowStock && (
                        <span className="text-[10px] font-semibold text-[#B1401F] whitespace-nowrap">
                            {product.totalStock} left
                        </span>
                    )}
                </div>

                <Link href={href} className="block mb-2" tabIndex={-1}>
                    <h3 className="font-bold text-[#0B2136] text-[13.5px] md:text-[15px] leading-snug line-clamp-2 group-hover:text-[#1B5E3B] transition-colors">
                        {product.model}
                    </h3>
                </Link>

                {/* Grade takes the spot specs used to occupy — specs already live in the title,
                    grade is the one piece of decision-relevant info that didn't have a home. */}
                {conditions.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">Grade</span>
                        <div className="flex items-center gap-1">
                            {conditions.map((condition, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <span className="text-[10px] text-gray-300">/</span>}
                                    <span
                                        className="text-[11px] font-black"
                                        style={{ color: GRADE_COLORS[condition] || '#6B7280' }}
                                        title={`Grade ${condition}`}
                                    >
                                        {condition}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex-grow" />

                <div className="mt-3 pt-3 border-t border-gray-100">
                    {product.startingPrice > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-[19px] md:text-[21px] font-black text-[#0B2136] tracking-tight leading-none">
                                    {formatCurrency(product.startingPrice)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-[12px] md:text-[13px] text-gray-400 line-through font-medium">
                                        {formatCurrency(product.mrp)}
                                    </span>
                                )}
                            </div>
                            {hasDiscount && (
                                <p className="text-[10.5px] text-[#1B5E3B] font-semibold">
                                    Save {formatCurrency(discountAmount)} · {discountPercent}% off
                                </p>
                            )}
                        </div>
                    ) : (
                        <span className="text-[13px] font-bold text-[#0B2136]">Price on request</span>
                    )}
                </div>

            </div>
        </div>
    );
});
