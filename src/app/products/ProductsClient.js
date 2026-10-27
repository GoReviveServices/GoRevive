"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FilterSidebar } from '@/components/module/Products/Components/FilterSidebar';
import { ProductToolbar } from '@/components/module/Products/Components/ProductToolbar';
import { ProductGrid } from '@/components/module/Products/Components/ProductGrid';
import { CategoryStrip } from '@/components/module/Products/Components/CategoryStrip';
import { BannerCarousel } from '@/components/module/Products/Components/BannerCarousel';
import { gradeColor, gradeLabel } from '@/components/module/Products/Components/ListingCard';
import { useDashboard } from '@/components/utils/Context/DashboardContext';
import { PRICE_SLOTS, SORT_OPTIONS, matchesAnySlot, sortProducts } from '@/lib/priceSlots';

const VALID_SORTS = new Set(SORT_OPTIONS.map(o => o.id));
const VALID_SLOTS = new Set(PRICE_SLOTS.map(s => s.id));
const GRADE_ORDER = ['A', 'B', 'C', 'D'];
// TODO: confirm these one-liners against /grading before going live.
const GRADE_NOTES = { A: 'Like new, no visible marks', B: 'Light signs of use', C: 'Visible wear, fully working', D: 'Heavy wear, fully working' };
const FACETS = ['price', 'category', 'brand', 'grade', 'ram'];
const ramOf = (p) => String(p.baseSpecs?.ram || '').trim();

// All filter state lives in the URL (?category=&brand=&price=&grade=&ram=&sort=&search=),
// so filtered views can be shared, bookmarked and linked to.
export default function ProductsClient({ initialProducts = [], initialBanners = [] }) {
    const { productData, isLoading } = useDashboard();
    // Server-rendered products show immediately; live data replaces them.
    const products = productData.length > 0 ? productData : initialProducts;
    const loading = isLoading && products.length === 0;

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
    const [view, setView] = useState('grid');

    const filters = useMemo(() => ({
        category: searchParams.getAll('category'),
        brand: searchParams.getAll('brand'),
        price: searchParams.getAll('price').filter(id => VALID_SLOTS.has(id)),
        grade: searchParams.getAll('grade'),
        ram: searchParams.getAll('ram'),
        search: searchParams.get('search') || '',
    }), [searchParams]);

    const sortParam = searchParams.get('sort');
    const sort = VALID_SORTS.has(sortParam) ? sortParam : 'relevance';

    const updateUrlParams = useCallback((key, value) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(key);
        if (Array.isArray(value)) value.forEach(v => params.append(key, v));
        else if (value) params.set(key, value);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, [searchParams, router, pathname]);

    const handleFilterChange = useCallback((type, value) => {
        const current = filters[type];
        const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
        updateUrlParams(type, next);
    }, [filters, updateUrlParams]);

    const handleSearch = useCallback((term) => updateUrlParams('search', term.trim()), [updateUrlParams]);
    const handleSort = useCallback((value) => { updateUrlParams('sort', value === 'relevance' ? '' : value); setIsMobileSortOpen(false); }, [updateUrlParams]);
    const pickCategory = useCallback((cat) => updateUrlParams('category', cat ? [cat] : []), [updateUrlParams]);
    const clearAllFilters = useCallback(() => {
        // Keep the chosen sort order when clearing filters.
        router.replace(sort !== 'relevance' ? `${pathname}?sort=${sort}` : pathname, { scroll: false });
    }, [router, pathname, sort]);

    // Does a product pass every filter except `except`? Used for the list itself
    // and for honest per-option counts in the sidebar (each facet ignores itself).
    const matches = useCallback((p, except) => {
        const term = filters.search.toLowerCase();
        if (term && !`${p.model} ${p.brand} ${p.category || ''}`.toLowerCase().includes(term)) return false;
        if (except !== 'category' && filters.category.length && !filters.category.includes(p.category)) return false;
        if (except !== 'brand' && filters.brand.length && !filters.brand.includes(p.brand)) return false;
        if (except !== 'price' && filters.price.length && !matchesAnySlot(p.startingPrice, filters.price)) return false;
        if (except !== 'grade' && filters.grade.length && !(p.availableConditions || []).some(g => filters.grade.includes(g))) return false;
        if (except !== 'ram' && filters.ram.length && !filters.ram.includes(ramOf(p))) return false;
        return true;
    }, [filters]);

    const filteredAndSortedProducts = useMemo(
        () => sortProducts(products.filter(p => matches(p)), sort),
        [products, matches, sort]
    );

    const uniqueCategories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
    const uniqueBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);
    // Conditions come straight from Stock_Type: letters first (A–D), then words like "Open Box".
    const uniqueGrades = useMemo(() => [...new Set(products.flatMap(p => p.availableConditions || []).filter(Boolean))]
        .sort((a, b) => ((GRADE_ORDER.indexOf(a) + 1) || 99) - ((GRADE_ORDER.indexOf(b) + 1) || 99) || String(a).localeCompare(String(b))), [products]);
    const uniqueRams = useMemo(() => [...new Set(products.map(ramOf).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b)), [products]);

    const categoryTiles = useMemo(() => uniqueCategories.map(name => ({
        name,
        image: products.find(p => p.category === name && p.image)?.image || null,
    })), [uniqueCategories, products]);

    const sections = useMemo(() => {
        const base = Object.fromEntries(FACETS.map(f => [f, products.filter(p => matches(p, f))]));
        const build = (key, values, { label = v => v, test, color, sub }) => values
            .map(v => ({ value: v, label: label(v), count: base[key].filter(p => test(p, v)).length, checked: filters[key].includes(v), color: color?.(v), sub: sub?.(v) }))
            .filter(o => o.count > 0 || o.checked); // hide empty options unless already selected
        return [
            { key: 'price', title: 'Price', options: build('price', PRICE_SLOTS.map(s => s.id), { label: id => PRICE_SLOTS.find(s => s.id === id).label, test: (p, v) => matchesAnySlot(p.startingPrice, [v]) }) },
            { key: 'category', title: 'Category', options: build('category', uniqueCategories, { test: (p, v) => p.category === v }) },
            { key: 'brand', title: 'Brand', options: build('brand', uniqueBrands, { test: (p, v) => p.brand === v }) },
            { key: 'grade', title: 'Condition grade', options: build('grade', uniqueGrades, { label: gradeLabel, test: (p, v) => (p.availableConditions || []).includes(v), color: gradeColor, sub: g => GRADE_NOTES[g] }) },
            { key: 'ram', title: 'RAM', options: build('ram', uniqueRams, { test: (p, v) => ramOf(p) === v }) },
        ].filter(s => s.options.length > 0);
    }, [products, matches, filters, uniqueCategories, uniqueBrands, uniqueGrades, uniqueRams]);

    const activeFilterCount = filters.category.length + filters.brand.length + filters.price.length + filters.grade.length + filters.ram.length + (filters.search ? 1 : 0);

    return (
        <>
            <CategoryStrip categories={categoryTiles} active={filters.category} onPick={pickCategory} />
            <BannerCarousel initialBanners={initialBanners} />

            <div className="flex gap-5 items-start">
                <FilterSidebar
                    sections={sections}
                    onToggle={handleFilterChange}
                    clearAllFilters={clearAllFilters}
                    activeFilterCount={activeFilterCount}
                    isMobileFiltersOpen={isMobileFiltersOpen}
                    onClose={() => setIsMobileFiltersOpen(false)}
                    resultCount={filteredAndSortedProducts.length}
                />

                <div className="flex-1 min-w-0 flex flex-col gap-3.5">
                    <ProductToolbar
                        filters={filters}
                        sort={sort}
                        setSort={handleSort}
                        handleSearch={handleSearch}
                        removeFilter={handleFilterChange}
                        clearAllFilters={clearAllFilters}
                        view={view}
                        setView={setView}
                    />
                    <ProductGrid
                        products={filteredAndSortedProducts}
                        loading={loading}
                        clearAllFilters={clearAllFilters}
                        view={view}
                    />
                </div>
            </div>

            {/* Mobile: sticky Sort | Filter bar */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 bg-white border-t border-[#E3EBE6] shadow-[0_-6px_20px_-10px_rgba(10,31,20,.2)]">
                <button type="button" onClick={() => setIsMobileSortOpen(true)} className="h-[54px] flex items-center justify-center gap-2 border-r border-[#E3EBE6] text-[14.5px] font-bold text-[#0A1A0E]">
                    <svg aria-hidden="true" className="w-[17px] h-[17px] text-[#1B5E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" /></svg>
                    Sort
                </button>
                <button type="button" onClick={() => setIsMobileFiltersOpen(true)} aria-controls="product-filters" aria-expanded={isMobileFiltersOpen} className="h-[54px] flex items-center justify-center gap-2 text-[14.5px] font-bold text-[#0A1A0E]">
                    <svg aria-hidden="true" className="w-[17px] h-[17px] text-[#1B5E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" /></svg>
                    Filter
                    {activeFilterCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#1B5E3B] text-white text-[11.5px] flex items-center justify-center">{activeFilterCount}</span>}
                </button>
            </div>

            {isMobileSortOpen && (
                <div className="lg:hidden fixed inset-0 z-[70] bg-[rgba(10,26,14,.4)] flex items-end" onClick={() => setIsMobileSortOpen(false)}>
                    <div role="listbox" aria-label="Sort by" className="w-full bg-white rounded-t-[18px] pt-2 pb-4" onClick={e => e.stopPropagation()}>
                        <div className="text-xs font-extrabold tracking-[.08em] uppercase text-[#4A6355] px-5 py-3">Sort by</div>
                        {SORT_OPTIONS.map(o => {
                            const active = o.id === sort;
                            return (
                                <button key={o.id} type="button" role="option" aria-selected={active} onClick={() => handleSort(o.id)} className={`w-full h-[50px] px-5 flex items-center justify-between text-[15px] ${active ? 'font-extrabold text-[#1B5E3B]' : 'font-medium text-[#24402F]'}`}>
                                    {o.label}
                                    <span className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${active ? 'border-[#1B5E3B]' : 'border-[#B8C9BF]'}`}>{active && <span className="w-2 h-2 rounded-full bg-[#1B5E3B]" />}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
