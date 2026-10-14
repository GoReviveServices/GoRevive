"use client";

import React from 'react';
import SmartImage from '@/components/utils/UI/SmartImage';

/**
 * Product photos: a vertical thumbnail rail beside the main photo on desktop,
 * a swipeable strip under it on phones. Badges sit on the main photo.
 */
export default function ImageGallery({ mainImage, setMainImage, galleryImages, altText = "Product preview", badge, discountPct = 0 }) {
    const displayImage = mainImage || galleryImages?.[0];
    const hasThumbs = galleryImages?.length > 1;

    return (
        <div className="flex w-full flex-col gap-3 lg:flex-row-reverse">
            <div className="relative aspect-square w-full overflow-hidden rounded-[16px] border border-gray-100 bg-gradient-to-b from-white to-slate-50 shadow-[0_1px_2px_rgba(11,33,54,0.04),0_12px_32px_-16px_rgba(11,33,54,0.18)] lg:max-h-[calc(100vh-14rem)] lg:flex-1">
                {badge && (
                    <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#0B2136] px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-sm">
                        <svg aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.53.22l1.7 1.7 2.4-.3a.75.75 0 01.83.55l.6 2.34 2.2.97a.75.75 0 01.37.97l-.97 2.2.6 2.33a.75.75 0 01-.55.83l-2.34.6-.97 2.2a.75.75 0 01-.97.37l-2.2-.97-2.33.6a.75.75 0 01-.83-.55l-.6-2.34-2.2-.97a.75.75 0 01-.37-.97l.97-2.2-.6-2.33a.75.75 0 01.55-.83l2.34-.6.97-2.2a.75.75 0 01.97-.37l.37.16 1.7-1.7a.75.75 0 01.53-.22zm3.36 7.78a.75.75 0 00-1.22-.88l-2.9 4.05-1.3-1.3a.75.75 0 00-1.06 1.06l1.9 1.9a.75.75 0 001.14-.1l3.44-4.73z" clipRule="evenodd" /></svg>
                        {badge}
                    </span>
                )}
                {discountPct > 0 && (
                    <span className="absolute right-3 top-3 z-10 rounded-[8px] bg-[#1B5E3B] px-2.5 py-1 text-xs font-black text-white shadow-sm">{discountPct}% OFF</span>
                )}
                {/* Main product photo is the page's largest element: load it first (LCP). */}
                <SmartImage
                    src={displayImage}
                    alt={altText}
                    fill
                    priority
                    sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-contain p-6 sm:p-12 mix-blend-multiply"
                />
            </div>

            {hasThumbs && (
                <div
                    className="flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory scroll-smooth lg:w-[76px] lg:flex-shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:max-h-[calc(100vh-14rem)]"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {galleryImages.map((img, idx) => {
                        const isSelected = displayImage === img;
                        return (
                            <button
                                key={img}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`Show image ${idx + 1} of ${altText}`}
                                onClick={() => setMainImage(img)}
                                className={`relative h-16 w-16 flex-shrink-0 snap-start rounded-[10px] border-2 bg-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E3B] lg:h-[72px] lg:w-[72px] ${
                                    isSelected
                                        ? 'border-[#1B5E3B] shadow-sm'
                                        : 'border-gray-200 opacity-70 hover:border-gray-400 hover:opacity-100'
                                }`}
                            >
                                <SmartImage src={img} alt="" fill sizes="72px" className="object-contain p-1.5 mix-blend-multiply" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
