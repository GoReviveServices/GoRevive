"use client";

import { memo } from 'react';
import SmartImage from '@/components/utils/UI/SmartImage';

const DISPLAY = { Mobile: 'Phones' };
const plural = (c) => DISPLAY[c] || (c.endsWith('s') ? c : `${c}s`);
const CYCLE_S = 10; // photos flash ~2.6s, grid icon holds ~6s

// Keyframes live with the component so they can't be dropped by the CSS pipeline.
const KEYFRAMES = `
@keyframes grCatFlash{0%{opacity:0;transform:scale(.55) rotate(-8deg)}2.4%{opacity:1;transform:scale(1) rotate(0)}6%{opacity:1;transform:scale(1)}8.4%{opacity:0;transform:scale(1.2)}100%{opacity:0}}
@keyframes grGridIn{0%,31%{opacity:0;transform:scale(.2)}35%{opacity:1;transform:scale(1.15)}37%{opacity:1;transform:scale(1)}96%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.6)}}
@media (prefers-reduced-motion:reduce){.gr-cat-flash{display:none}.gr-grid-in{animation:none!important;opacity:1!important}}`;

// "All" tile: flicks through one photo per category, then the grid icon
// assembles and holds. Falls back to a static icon for reduced motion.
function AllIcon({ images }) {
    return (
        <span className="relative block w-[44px] h-[42px]" aria-hidden="true">
            <style>{KEYFRAMES}</style>
            {images.map((src, i) => (
                <span key={src} className="gr-cat-flash absolute inset-0 flex items-center justify-center" style={{ opacity: 0, animation: `grCatFlash ${CYCLE_S}s cubic-bezier(.3,.7,.3,1) ${i * 0.65}s infinite both` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="w-10 h-[38px] object-contain" />
                </span>
            ))}
            <span className="absolute inset-0 flex items-center justify-center">
                <span className="grid grid-cols-[8px_8px] gap-1">
                    {[0, 0.08, 0.24, 0.16].map((d, i) => (
                        <span key={i} className="gr-grid-in block w-2 h-2 rounded-[2.5px] border-[1.75px] border-solid border-[#1B5E3B]" style={{ animation: `grGridIn ${CYCLE_S}s cubic-bezier(.3,.7,.3,1) ${d}s infinite both` }} />
                    ))}
                </span>
            </span>
        </span>
    );
}

function Tile({ label, active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex-shrink-0 w-[88px] flex flex-col items-center gap-1 px-1 pt-1.5 pb-2 rounded-t-[10px] border-b-2 hover:bg-[#FAFCFA] transition-colors ${active ? 'border-[#1B5E3B]' : 'border-transparent'}`}
        >
            <span className="w-[46px] h-[46px] rounded-xl bg-white flex items-center justify-center overflow-hidden">{children}</span>
            <span className={`text-[12.5px] whitespace-nowrap ${active ? 'font-extrabold text-[#1B5E3B]' : 'font-semibold text-[#0A1A0E]'}`}>{label}</span>
        </button>
    );
}

export const CategoryStrip = memo(function CategoryStrip({ categories = [], active = [], onPick }) {
    if (categories.length === 0) return null;
    const isOnly = (name) => active.length === 1 && active[0] === name;
    return (
        <nav aria-label="Categories" className="mb-3 bg-white border border-[#E3EBE6] rounded-[14px] shadow-[0_1px_3px_rgba(10,31,20,.05)] overflow-hidden">
            <div className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden px-4 pt-1.5 justify-start lg:justify-evenly">
                <Tile label="All" active={active.length === 0} onClick={() => onPick(null)}>
                    <AllIcon images={categories.map(c => c.image).filter(Boolean).slice(0, 4)} />
                </Tile>
                {categories.map(c => (
                    <Tile key={c.name} label={plural(c.name)} active={isOnly(c.name)} onClick={() => onPick(c.name)}>
                        {c.image ? (
                            <span className="relative block w-[46px] h-[42px]">
                                <SmartImage src={c.image} alt="" fill sizes="46px" className="object-contain" />
                            </span>
                        ) : (
                            <span className="text-sm font-bold text-[#1B5E3B]">{c.name[0]}</span>
                        )}
                    </Tile>
                ))}
            </div>
        </nav>
    );
});
