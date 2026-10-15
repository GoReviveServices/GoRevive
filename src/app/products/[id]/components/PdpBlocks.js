"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cpu, MemoryStick, HardDrive, Monitor, AppWindow, BatteryMedium, Tag, Wallet, ReceiptIndianRupee, Boxes, ShieldCheck, LockKeyhole, RotateCcw, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { BULK_DISCOUNT_MIN_UNITS, BULK_DISCOUNT_RATE, MIN_ORDER_UNITS } from '@/lib/pricing';

const GAP = 10; // px between offer cards (gap-2.5)
const valid = (v) => v != null && String(v).trim() && !['/', 'N/A', 'NA'].includes(String(v).trim());

/** Section title with its icon tile, used across the page. */
export function SectionHeading({ id, icon: Icon, children, className = '' }) {
    return (
        <h2 id={id} className={`flex items-center gap-2.5 text-[21px] font-bold tracking-tight text-[#0B2136] ${className}`}>
            {Icon && (
                <span aria-hidden="true" className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#EAF7EF]">
                    <Icon className="h-[18px] w-[18px] text-[#1B5E3B]" />
                </span>
            )}
            {children}
        </h2>
    );
}

/** Flipkart-style "highlights": the specs a buyer scans first, as chips. */
export function SpecHighlights({ specs }) {
    const rows = [
        [Cpu, specs?.processor],
        [MemoryStick, specs?.ram && `${specs.ram} RAM`],
        [HardDrive, specs?.storage],
        [Monitor, specs?.display],
        [AppWindow, specs?.os],
        [BatteryMedium, specs?.battery],
    ].filter(([, v]) => valid(v));
    if (!rows.length) return null;
    return (
        <ul aria-label="Key highlights" className="flex flex-wrap gap-2">
            {rows.map(([Icon, value]) => (
                <li key={String(value)} className="inline-flex max-w-full items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#0B2136]">
                    <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[#1B5E3B]" />
                    <span className="min-w-0 break-words">{String(value)}</span>
                </li>
            ))}
        </ul>
    );
}

/** Offer cards as a swipeable carousel with arrows and dots. */
export function OfferCards({ showPrices }) {
    const offers = [
        { Icon: Tag, card: 'bg-[#EAF8EF]', chip: 'bg-[#C9EBD7] text-[#1B5E3B]', title: `${BULK_DISCOUNT_RATE * 100}% off on ${BULK_DISCOUNT_MIN_UNITS}+ units`, text: 'Auto-applied at checkout' },
        { Icon: Wallet, card: 'bg-[#F1FBE6]', chip: 'bg-[#D9F5BE] text-[#3F7F0E]', title: 'Use your wallet', text: 'Balance applied before you pay' },
        { Icon: ReceiptIndianRupee, card: 'bg-[#E8F2FD]', chip: 'bg-[#CFE3FA] text-[#1565C0]', title: 'GST invoice · ITC ready', text: 'Claim full input tax credit' },
        { Icon: Boxes, card: 'bg-[#FFF6E5]', chip: 'bg-[#FFE6B8] text-[#9A5B00]', title: `Minimum ${MIN_ORDER_UNITS} units`, text: 'Mix any models to qualify' },
    ];
    const trackRef = useRef(null);
    const lockRef = useRef(0);
    const [idx, setIdx] = useState(0);
    const [maxIdx, setMaxIdx] = useState(offers.length - 1);

    const step = () => { const el = trackRef.current; return el?.children[0] ? el.children[0].offsetWidth + GAP : 1; };
    const measure = useCallback(() => {
        const el = trackRef.current; if (!el) return;
        setMaxIdx(Math.max(0, Math.min(offers.length - 1, Math.ceil((el.scrollWidth - el.clientWidth) / step() - 0.01))));
    }, [offers.length]);
    useEffect(() => {
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [measure]);

    const go = (i) => {
        const el = trackRef.current; if (!el) return;
        const next = Math.max(0, Math.min(maxIdx, i));
        lockRef.current = Date.now() + 450; // ignore scroll events from our own smooth scroll
        el.scrollTo({ left: Math.min(next * step(), el.scrollWidth - el.clientWidth), behavior: 'smooth' });
        setIdx(next);
    };
    const onScroll = (e) => {
        if (Date.now() < lockRef.current) return;
        const el = e.currentTarget;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        setIdx(atEnd ? maxIdx : Math.round(el.scrollLeft / step()));
    };

    const arrow = 'flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#D6E2DB] bg-white transition-opacity disabled:opacity-40';
    return (
        <section aria-labelledby="offers-heading" aria-roledescription="carousel">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h2 id="offers-heading" className="text-[15px] font-bold text-[#0B2136]">Offers for business buyers{!showPrices && <span className="font-medium text-gray-500"> · login to apply</span>}</h2>
                <div className="flex gap-1.5">
                    <button type="button" aria-label="Previous offer" onClick={() => go(idx - 1)} disabled={idx === 0} className={arrow}><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" aria-label="Next offer" onClick={() => go(idx + 1)} disabled={idx >= maxIdx} className={arrow}><ChevronRight className="h-4 w-4" /></button>
                </div>
            </div>
            <ul ref={trackRef} onScroll={onScroll} className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {offers.map(({ Icon, card, chip, title, text }) => (
                    <li key={title} className={`flex min-w-0 flex-[0_0_min(240px,78%)] snap-start items-center gap-2.5 rounded-[12px] px-3 py-2.5 ${card}`}>
                        <span className={`flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px] ${chip}`}><Icon aria-hidden="true" className="h-[15px] w-[15px]" /></span>
                        <span className="min-w-0 leading-tight">
                            <span className="block truncate text-[13px] font-bold text-[#0B2136]">{title}</span>
                            <span className="block truncate text-xs text-gray-600">{text}</span>
                        </span>
                    </li>
                ))}
            </ul>
            {maxIdx > 0 && (
                <div className="mt-2 flex justify-center gap-1.5">
                    {Array.from({ length: maxIdx + 1 }, (_, i) => (
                        <button key={i} type="button" aria-label={`Go to offer ${i + 1}`} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-[18px] bg-[#1B5E3B]' : 'w-1.5 bg-[#C9D6CF]'}`} />
                    ))}
                </div>
            )}
        </section>
    );
}

/** Dark trust strip: the promises that matter at the moment of buying. */
export function ServiceRow() {
    const items = [
        { Icon: ShieldCheck, title: 'Quality checked & graded', sub: 'QC report attached to every serial' },
        { Icon: LockKeyhole, title: 'NIST 800-88 data erasure', sub: 'Erasure certificate included' },
        { Icon: RotateCcw, title: '7-day returns', sub: 'DOA, defects or wrong spec' },
        { Icon: Truck, title: 'Pan-India delivery', sub: 'Insured shipping' },
    ];
    return (
        <ul aria-label="Why buy from GoRevive" className="mt-[18px] grid grid-cols-1 gap-px overflow-hidden rounded-[18px] bg-[#1B3A28] shadow-[0_18px_40px_-18px_rgba(10,31,20,0.5)] sm:grid-cols-2 lg:grid-cols-4">
            {items.map(({ Icon, title, sub }) => (
                <li key={title} className="flex items-center gap-3 bg-[#0A1F14] px-[18px] py-4 text-white">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#8AE63A]"><Icon aria-hidden="true" className="h-5 w-5 text-[#0A1F14]" /></span>
                    <span className="min-w-0">
                        <span className="block text-sm font-bold">{title}</span>
                        <span className="block text-xs text-[#9FD8B8]">{sub}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** Sticky in-page jump links, like the tab bar on Cashify / Flipkart product pages. */
export function SectionNav({ items }) {
    return (
        <nav aria-label="On this page" className="sticky top-0 z-30 -mx-4 mt-4 overflow-x-auto border-b border-[#D6E2DB] bg-[#FAFAF8]/90 px-4 backdrop-blur sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
            <ul className="flex min-w-max gap-1">
                {items.map(([href, label], i) => (
                    <li key={href}>
                        <Link href={href} scroll className={`inline-block whitespace-nowrap border-b-[3px] px-3.5 py-3 text-sm ${i === 0 ? 'border-[#8AE63A] font-bold text-[#0B2136]' : 'border-transparent font-semibold text-gray-500 hover:border-[#8AE63A] hover:text-[#0B2136]'}`}>{label}</Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
