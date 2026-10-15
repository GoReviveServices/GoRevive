"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/components/utils/Context/DashboardContext';

const GAP = 12;
const INTERVAL_MS = 5000;

// Same banners as the homepage (PHP get_banner.php). Two per view from 1024px, one on phones.
export function BannerCarousel({ initialBanners = [] }) {
    const { bannerData } = useDashboard();
    const banners = (bannerData?.length ? bannerData : initialBanners).map((b, i) => ({
        src: b.bannerUrl,
        alt: b.title || b.banner_title || b.banner_name || `GoRevive offer on pre-owned IT hardware – slide ${i + 1}`,
        href: b.link || b.banner_link || b.url || null,
    }));

    const [perView, setPerView] = useState(1);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const update = () => setPerView(mq.matches ? 2 : 1);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const max = Math.max(0, banners.length - perView);
    const [rawIndex, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const index = Math.min(rawIndex, max);

    const step = useCallback((d) => setIndex(x => {
        const n = max + 1;
        return (((Math.min(x, max) + d) % n) + n) % n;
    }), [max]);

    // Restarts after every manual move (index in deps), pauses on hover.
    useEffect(() => {
        if (paused || max === 0) return;
        const t = setInterval(() => step(1), INTERVAL_MS);
        return () => clearInterval(t);
    }, [paused, max, step, index]);

    if (banners.length === 0) return null;

    const shift = `calc(${-index} * ((100% - ${(perView - 1) * GAP}px) / ${perView} + ${GAP}px))`;
    const slideClass = 'flex-shrink-0 basis-full lg:basis-[calc((100%-12px)/2)] aspect-[20/9] lg:aspect-auto lg:h-[220px] min-[1440px]:h-[253px] rounded-[10px] overflow-hidden bg-[#F4F4F6] shadow-[inset_0_0_0_1px_rgba(10,26,14,.06)] block';

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Offers"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative mb-4 p-2.5 bg-white border border-[#E3EBE6] rounded-[14px] shadow-[0_18px_50px_-28px_rgba(27,94,59,.28),0_1px_3px_rgba(10,31,20,.05)]"
        >
            <div className="overflow-hidden rounded-[10px]">
                <div className="flex gap-3 transition-transform duration-[550ms] ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateX(${shift})` }}>
                    {banners.map((b, i) => {
                        const img = (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={b.src}
                                alt={b.alt}
                                width={2000}
                                height={900}
                                loading={i < 2 ? 'eager' : 'lazy'}
                                fetchPriority={i === 0 ? 'high' : 'auto'}
                                decoding="async"
                                className="w-full h-full object-cover"
                            />
                        );
                        return b.href
                            ? <a key={i} href={b.href} className={slideClass}>{img}</a>
                            : <div key={i} className={slideClass}>{img}</div>;
                    })}
                </div>
            </div>

            {max > 0 && (
                <>
                    {['prev', 'next'].map(dir => (
                        <button
                            key={dir}
                            type="button"
                            onClick={() => step(dir === 'prev' ? -1 : 1)}
                            aria-label={dir === 'prev' ? 'Previous banner' : 'Next banner'}
                            className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 ${dir === 'prev' ? 'left-5' : 'right-5'} w-9 h-9 rounded-full bg-white/90 shadow-[0_4px_14px_-4px_rgba(10,31,20,.35)] items-center justify-center text-[#0A1A0E] hover:bg-white transition-colors`}
                        >
                            <svg aria-hidden="true" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                <path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
                            </svg>
                        </button>
                    ))}
                    <div className="absolute left-1/2 bottom-5 -translate-x-1/2 flex gap-[5px] px-2 py-[5px] rounded-full bg-[rgba(10,26,14,.35)]">
                        {Array.from({ length: max + 1 }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`Go to banner ${i + 1}`}
                                aria-current={i === index}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-[22px] bg-white' : 'w-1.5 bg-white/55'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
