"use client";

import React from 'react';
import SmartImage from '@/components/utils/UI/SmartImage';

export default function ImageGallery({ mainImage, setMainImage, galleryImages, altText = "Product preview" }) {
    const displayImage = mainImage || galleryImages?.[0];

    return (
        <div className="lg:sticky lg:top-24 flex flex-col gap-4 w-full max-w-2xl">
            <div className="relative rounded-lg shadow-2xl shadow-white bg-white aspect-square overflow-hidden">
                {/* Main product photo is the page's largest element: load it first (LCP). */}
                <SmartImage
                    src={displayImage}
                    alt={altText}
                    fill
                    priority
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-contain p-6 sm:p-12 mix-blend-multiply"
                />
            </div>

            {galleryImages?.length > 1 && (
                <div
                    className="flex gap-4 overflow-x-auto pb-1.5 scroll-smooth snap-x snap-mandatory"
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
                                className={`relative flex-shrink-0 shadow snap-start w-20 h-20 bg-white rounded-md border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E3B] ${
                                    isSelected
                                        ? 'border-[#0B2136]'
                                        : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-400'
                                }`}
                            >
                                <SmartImage
                                    src={img}
                                    alt=""
                                    fill
                                    sizes="80px"
                                    className="object-contain p-2 mix-blend-multiply"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
