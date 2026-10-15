"use client";

import { useState, useEffect, useRef } from 'react';
import { ProductSkeleton } from './ProductSkeleton';
import { ListingCard, ListingRow } from './ListingCard';

const ITEMS_PER_PAGE = 12;
const GRID = 'grid grid-cols-2 max-[359px]:grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-2.5 lg:gap-4';

export const ProductGrid = ({ products, loading, clearAllFilters, view = 'grid' }) => {
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [shownFor, setShownFor] = useState(products);
    const observerTarget = useRef(null);

    // Reset to the first 12 items whenever the filter/sort results change
    // (done during render, which avoids an extra re-render from an effect).
    if (shownFor !== products) {
        setShownFor(products);
        setVisibleCount(ITEMS_PER_PAGE);
    }

    // Infinite scroll: load 12 more before the user reaches the end.
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && visibleCount < products.length) {
                    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
                }
            },
            { rootMargin: '400px 0px' }
        );
        const target = observerTarget.current;
        if (target) observer.observe(target);
        return () => observer.disconnect();
    }, [visibleCount, products.length]);

    if (loading) {
        return (
            <div className={GRID}>
                {[...Array(8)].map((_, index) => <ProductSkeleton key={index} />)}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center text-center py-16 px-5 bg-white border border-dashed border-[#D6E2DB] rounded-2xl">
                <span className="w-14 h-14 rounded-[14px] bg-[#F0FAF5] flex items-center justify-center mb-3.5 text-[#1B5E3B]">
                    <svg aria-hidden="true" className="w-[26px] h-[26px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m13.5 8.5-5 5M8.5 8.5l5 5" /><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
                <h3 className="text-lg font-extrabold text-[#0A1A0E] mb-1">No devices match these filters</h3>
                <p className="text-sm text-[#4A6355] mb-[18px]">Try removing a filter or searching a different model.</p>
                <button onClick={clearAllFilters} className="h-10 px-5 rounded-full bg-[#0A1F14] text-white font-bold hover:bg-[#1B5E3B] transition-colors">Clear all filters</button>
            </div>
        );
    }

    const visibleProducts = products.slice(0, visibleCount);
    const hasMore = visibleCount < products.length;
    // List view is desktop-only; phones always get the 2-up grid.
    const isList = view === 'list';

    return (
        <div className="flex flex-col gap-3.5">
            <div className={isList ? 'hidden lg:flex flex-col bg-white border border-[#E3EBE6] rounded-[14px] overflow-hidden' : 'hidden'}>
                {isList && visibleProducts.map((p, i) => <ListingRow key={p.id} product={p} priority={i < 2} />)}
            </div>
            <div className={isList ? `${GRID} lg:hidden` : GRID}>
                {visibleProducts.map((p, i) => (
                    // The first row is above the fold: load those images eagerly for a faster LCP.
                    <ListingCard key={p.id} product={p} priority={i < 4} />
                ))}
            </div>

            {hasMore ? (
                <div ref={observerTarget} className="flex justify-center items-center gap-2.5 py-[18px] text-[13px] text-[#4A6355]">
                    <span className="w-[18px] h-[18px] rounded-full border-[2.5px] border-[#CFE3D7] border-t-[#1B5E3B] animate-spin" />
                    Loading more models…
                </div>
            ) : products.length > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-3 pt-2.5 pb-1 text-[12.5px] text-[#7A8F82]">
                    <span className="flex-1 h-px bg-[#E3EBE6]" />You&apos;ve seen all {products.length} models<span className="flex-1 h-px bg-[#E3EBE6]" />
                </div>
            )}
        </div>
    );
};
