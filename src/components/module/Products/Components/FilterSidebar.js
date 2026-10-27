"use client";

import { memo, useState } from 'react';

/**
 * sections: [{ key, title, options: [{ value, label, count, checked, color?, sub? }] }]
 * Desktop: sticky card. Mobile: full-screen sheet opened from the bottom bar.
 */
export const FilterSidebar = memo(function FilterSidebar({
    sections,
    onToggle,
    clearAllFilters,
    activeFilterCount,
    isMobileFiltersOpen,
    onClose,
    resultCount,
}) {
    const [collapsed, setCollapsed] = useState({});

    return (
        <aside
            id="product-filters"
            aria-label="Product filters"
            className={`${isMobileFiltersOpen ? 'fixed inset-0 z-[60] flex' : 'hidden'} lg:flex lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:w-[264px] lg:max-h-[calc(100vh-32px)] lg:rounded-[14px] lg:border lg:border-[#E3EBE6] lg:shadow-[0_1px_3px_rgba(10,31,20,.05)] flex-col flex-shrink-0 overflow-auto bg-white`}
        >
            <div className="sticky top-0 z-[1] bg-white flex justify-between items-center px-4 py-3.5 border-b border-[#EEF2EF]">
                <h2 className="text-base font-extrabold text-[#0A1A0E]">Filters</h2>
                <div className="flex items-center gap-3.5">
                    {activeFilterCount > 0 && (
                        <button type="button" onClick={clearAllFilters} className="text-[12.5px] font-bold text-[#B1401F] hover:text-[#8A2F16]">Clear all</button>
                    )}
                    <button type="button" onClick={onClose} aria-label="Close filters" className="lg:hidden p-1 text-[#0A1A0E]">
                        <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1">
                {sections.map(section => {
                    const open = !collapsed[section.key];
                    const selected = section.options.filter(o => o.checked).length;
                    return (
                        <fieldset key={section.key} className="border-b border-[#EEF2EF]">
                            <legend className="sr-only">{section.title}</legend>
                            <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => setCollapsed(c => ({ ...c, [section.key]: open }))}
                                className="w-full flex justify-between items-center px-4 py-[13px] text-[#0A1A0E]"
                            >
                                <span className="text-xs font-extrabold tracking-[.08em] uppercase">{section.title}</span>
                                <span className="flex items-center gap-2">
                                    {selected > 0 && <span className="text-[11px] font-bold text-[#1B5E3B]">{selected} selected</span>}
                                    <svg aria-hidden="true" className={`w-4 h-4 text-[#4A6355] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </span>
                            </button>
                            {open && (
                                <div className="flex flex-col gap-0.5 px-2.5 pb-3">
                                    {section.options.map(o => (
                                        <label key={o.value} className="flex items-center gap-2.5 px-1.5 py-[7px] rounded-lg cursor-pointer hover:bg-[#F4F8F5]">
                                            <input
                                                type="checkbox"
                                                checked={o.checked}
                                                onChange={() => onToggle(section.key, o.value)}
                                                className="w-[17px] h-[17px] flex-shrink-0 rounded accent-[#1B5E3B] cursor-pointer"
                                            />
                                            <span className="flex-1 min-w-0 flex flex-col leading-tight">
                                                <span className={`text-sm ${o.checked ? 'font-bold' : 'font-medium'}`} style={{ color: o.color || '#0A1A0E' }}>{o.label}</span>
                                                {o.sub && <span className="text-[11.5px] text-[#4A6355]">{o.sub}</span>}
                                            </span>
                                            <span className="text-xs text-[#7A8F82] tabular-nums">
                                                <span aria-hidden="true">{o.count}</span>
                                                <span className="sr-only">, {o.count} {o.count === 1 ? 'product' : 'products'}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    );
                })}
            </div>

            <div className="lg:hidden sticky bottom-0 bg-white border-t border-[#E3EBE6] px-4 py-3">
                <button type="button" onClick={onClose} className="w-full h-12 rounded-xl bg-[#1B5E3B] text-white text-[15px] font-bold">
                    Show {resultCount} results
                </button>
            </div>
        </aside>
    );
});
