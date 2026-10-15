"use client";

import { memo, useState } from 'react';
import { PRICE_SLOTS, SORT_OPTIONS } from '@/lib/priceSlots';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const slotLabel = (id) => PRICE_SLOTS.find(s => s.id === id)?.label || id;

export const ProductToolbar = memo(function ProductToolbar({
    filters,
    sort,
    setSort,
    handleSearch,
    removeFilter,
    clearAllFilters,
    view,
    setView,
}) {
    // Typing updates the box instantly; the list filters 300ms after you stop.
    const [term, setTerm] = useDebouncedSearch(filters.search, handleSearch, 300);
    const [menuOpen, setMenuOpen] = useState(false);
    const sortLabel = SORT_OPTIONS.find(o => o.id === sort)?.label || 'Relevance';

    const chips = [
        ...(filters.search ? [{ key: 'q', label: `“${filters.search}”`, remove: () => handleSearch('') }] : []),
        ...filters.price.map(v => ({ key: `p${v}`, label: slotLabel(v), remove: () => removeFilter('price', v) })),
        ...filters.category.map(v => ({ key: `c${v}`, label: v, remove: () => removeFilter('category', v) })),
        ...filters.brand.map(v => ({ key: `b${v}`, label: v, remove: () => removeFilter('brand', v) })),
        ...filters.grade.map(v => ({ key: `g${v}`, label: `Grade ${v}`, remove: () => removeFilter('grade', v) })),
        ...filters.ram.map(v => ({ key: `r${v}`, label: `${v} RAM`, remove: () => removeFilter('ram', v) })),
    ];

    const viewBtn = (id, label, path) => (
        <button
            type="button"
            onClick={() => setView(id)}
            aria-label={label}
            aria-pressed={view === id}
            className={`w-[34px] h-8 rounded-full flex items-center justify-center ${view === id ? 'bg-white shadow-[0_1px_3px_rgba(10,31,20,.15)] text-[#1B5E3B]' : 'text-[#7A8F82]'}`}
        >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
        </button>
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap bg-white border border-[#E3EBE6] rounded-[14px] shadow-[0_1px_3px_rgba(10,31,20,.05)] px-3 py-2.5">
                <div className="relative flex-1 basis-[260px] min-w-[180px] lg:max-w-[520px]">
                    <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8F82]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <label htmlFor="inventory-search" className="sr-only">Search inventory</label>
                    <input
                        id="inventory-search"
                        type="search"
                        placeholder="Search model, brand, processor"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full h-[38px] pl-9 pr-3.5 rounded-full bg-[#F2F6F3] border border-transparent text-[13.5px] text-[#0A1A0E] outline-none focus:bg-white focus:border-[#4CAF7D] transition-colors"
                    />
                </div>

                <div className="hidden lg:block relative ml-auto">
                    <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(o => !o)}
                        className="h-[38px] flex items-center gap-2 pl-3.5 pr-3 rounded-full border border-[#E3EBE6] bg-white text-[13.5px] text-[#4A6355] whitespace-nowrap hover:border-[#B8C9BF]"
                    >
                        <svg aria-hidden="true" className="w-[15px] h-[15px] text-[#1B5E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" /></svg>
                        Sort by <b className="font-bold text-[#0A1A0E]">{sortLabel}</b>
                        <svg aria-hidden="true" className={`w-[15px] h-[15px] transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                            <div role="listbox" aria-label="Sort by" className="absolute right-0 top-[calc(100%+6px)] z-[31] min-w-[220px] bg-white border border-[#E3EBE6] rounded-xl shadow-[0_18px_40px_-12px_rgba(10,31,20,.25)] p-1.5">
                                {SORT_OPTIONS.map(o => {
                                    const active = o.id === sort;
                                    return (
                                        <button
                                            key={o.id}
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onClick={() => { setSort(o.id); setMenuOpen(false); }}
                                            className={`w-full h-[38px] px-2.5 rounded-lg flex items-center justify-between gap-3 text-left text-[13.5px] hover:bg-[#F4F8F5] ${active ? 'bg-[#F0FAF5] font-extrabold text-[#1B5E3B]' : 'font-medium text-[#24402F]'}`}
                                        >
                                            {o.label}
                                            {active && <svg aria-hidden="true" className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="hidden lg:flex p-[3px] gap-0.5 rounded-full bg-[#F2F6F3]">
                    {viewBtn('grid', 'Grid view', 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z')}
                    {viewBtn('list', 'List view', 'M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13')}
                </div>
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center" aria-label="Active filters">
                    {chips.map(c => (
                        <button key={c.key} type="button" onClick={c.remove} aria-label={`Remove ${c.label}`} className="h-[30px] flex items-center gap-1.5 pl-3 pr-2.5 rounded-full border border-[#CFE3D7] bg-[#F0FAF5] text-[12.5px] font-semibold text-[#1B5E3B] hover:border-[#1B5E3B]">
                            {c.label}
                            <svg aria-hidden="true" className="w-[13px] h-[13px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    ))}
                    <button type="button" onClick={clearAllFilters} className="px-1 text-[12.5px] font-bold text-[#B1401F]">Clear all</button>
                </div>
            )}
        </div>
    );
});
