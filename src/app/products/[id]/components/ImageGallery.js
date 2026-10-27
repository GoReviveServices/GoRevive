"use client";

import React from 'react';
import Link from 'next/link';
import { BadgeCheck, ClipboardList, Share2 } from 'lucide-react';
import SmartImage from '@/components/utils/UI/SmartImage';

/**
 * Product photos: a vertical thumbnail rail beside the main photo on desktop,
 * a swipeable strip under it on phones. Badges sit on the main photo.
 */
export default function ImageGallery({ mainImage, setMainImage, galleryImages, altText = "Product preview", badge, discountPct = 0, qcHref }) {
    const displayImage = mainImage || galleryImages?.[0];
    const hasThumbs = galleryImages?.length > 1;

    const share = async () => {
        const data = { title: altText, url: typeof window !== 'undefined' ? window.location.href : '' };
        try {
            if (navigator.share) await navigator.share(data);
            else await navigator.clipboard.writeText(data.url);
        } catch { /* user cancelled */ }
    };

    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex w-full flex-col gap-3 lg:flex-row-reverse">
                <div className="relative aspect-square w-full overflow-hidden rounded-[12px] border border-[#EEF0F2] bg-transparent lg:flex-1">
                    {badge && (
                        // Gold seal; the label slides out on hover / keyboard focus.
                        <span tabIndex={0} title={badge} className="group absolute left-3 top-3 z-10 inline-flex cursor-default items-center gap-1.5 rounded-full p-0.5 outline-none transition-all hover:bg-[#FFF6DA] hover:pr-2.5 focus-visible:bg-[#FFF6DA] focus-visible:pr-2.5">
                            <BadgeCheck aria-hidden="true" className="h-[26px] w-[26px] text-[#C9971C]" strokeWidth={2.25} />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#7A5A00] opacity-0 transition-all duration-200 group-hover:max-w-[180px] group-hover:opacity-100 group-focus-visible:max-w-[180px] group-focus-visible:opacity-100">{badge}</span>
                        </span>
                    )}
                    {discountPct > 0 && (
                        <span className="absolute right-3.5 top-3 z-10 text-[15px] font-extrabold text-[#1B8A4B]">{discountPct}% OFF</span>
                    )}
                    {/* Main product photo is the page's largest element: load it first (LCP). */}
                    <SmartImage
                        src={displayImage}
                        alt={altText}
                        fill
                        priority
                        sizes="(min-width: 1024px) 42vw, 100vw"
                        className="object-contain p-6 sm:p-12"
                    />
                </div>

                {hasThumbs && (
                    <div
                        className="flex gap-2 overflow-x-auto pb-1.5 snap-x snap-mandatory scroll-smooth lg:w-[60px] lg:flex-shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0"
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
                                    className={`relative h-[58px] w-[58px] flex-shrink-0 snap-start rounded-[8px] bg-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E3B] ${
                                        isSelected ? 'border-2 border-[#6FCF1E]' : 'border border-gray-200 opacity-75 hover:opacity-100'
                                    }`}
                                >
                                    <SmartImage src={img} alt="" fill sizes="58px" className="object-contain p-1.5" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                {qcHref && (
                    <Link href={qcHref} className="flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#D6E2DB] bg-white text-[13px] font-semibold text-[#1B5E3B] hover:bg-[#F7FAF8]">
                        <ClipboardList className="h-4 w-4" />View QC report
                    </Link>
                )}
                <button type="button" onClick={share} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#D6E2DB] bg-white text-[13px] font-semibold text-[#0B2136] hover:bg-[#F7FAF8]">
                    <Share2 className="h-4 w-4" />Share
                </button>
            </div>
        </div>
    );
}
