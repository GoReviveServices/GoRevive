"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FilterSidebar } from '@/components/module/Products/Components/FilterSidebar';
import { ProductToolbar } from '@/components/module/Products/Components/ProductToolbar';
import { ProductGrid } from '@/components/module/Products/Components/ProductGrid';
import { useDashboard } from '@/components/utils/Context/DashboardContext';
import { PRICE_SLOTS, SORT_OPTIONS, matchesAnySlot, sortProducts } from '@/lib/priceSlots';

const VALID_SORTS = new Set(SORT_OPTIONS.map(o => o.id));
const VALID_SLOTS = new Set(PRICE_SLOTS.map(s => s.id));

// All filter state lives in the URL (?category=&brand=&price=&sort=&search=),
// so filtered views can be shared, bookmarked and linked to.
export default function ProductsClient({ initialProducts = [] }) {
    const { productData, isLoading } = useDashboard();
    // Server-rendered products show immediately; live data replaces them.
    const products = productData.length > 0 ? productData : initialProducts;
    const loading = isLoading && products.length === 0;

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

    const filters = useMemo(() => ({
        category: searchParams.getAll('category'),
        brand: searchParams.getAll('brand'),
        price: searchParams.getAll('price').filter(id => VALID_SLOTS.has(id)),
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
    const handleSort = useCallback((value) => updateUrlParams('sort', value === 'relevance' ? '' : value), [updateUrlParams]);
    const clearAllFilters = useCallback(() => {
        // Keep the chosen sort order when clearing filters.
        router.replace(sort !== 'relevance' ? `${pathname}?sort=${sort}` : pathname, { scroll: false });
    }, [router, pathname, sort]);

    // Products matching search/category/brand, before the price filter. Used
    // both for the final list and for the per-slot counts in the sidebar.
    const baseFiltered = useMemo(() => {
        const term = filters.search.toLowerCase();
        return products.filter(p => {
            if (filters.category.length > 0 && !filters.category.includes(p.category)) return false;
            if (filters.brand.length > 0 && !filters.brand.includes(p.brand)) return false;
            if (term) {
                const haystack = `${p.model} ${p.brand} ${p.category || ''}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            return true;
        });
    }, [products, filters.category, filters.brand, filters.search]);

    const priceSlotCounts = useMemo(() => {
        const counts = {};
        PRICE_SLOTS.forEach(slot => {
            counts[slot.id] = baseFiltered.filter(p => matchesAnySlot(p.startingPrice, [slot.id])).length;
        });
        return counts;
    }, [baseFiltered]);

    const filteredAndSortedProducts = useMemo(() => {
        const priced = filters.price.length > 0
            ? baseFiltered.filter(p => matchesAnySlot(p.startingPrice, filters.price))
            : baseFiltered;
        return sortProducts(priced, sort);
    }, [baseFiltered, filters.price, sort]);

    const uniqueCategories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
    const uniqueBrands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(), [products]);
    const activeFilterCount = filters.category.length + filters.brand.length + filters.price.length + (filters.search ? 1 : 0);

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Mobile filter toggle */}
            <div className="lg:hidden flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <span className="font-bold text-[#0B2136]">
                    Filters {activeFilterCount > 0 && <span className="bg-[#1B5E3B] text-white px-2 py-0.5 rounded-full text-xs ml-1">{activeFilterCount}</span>}
                </span>
                <button
                    onClick={() => setIsMobileFiltersOpen(open => !open)}
                    aria-expanded={isMobileFiltersOpen}
                    aria-controls="product-filters"
                    className="flex items-center gap-2 text-sm font-bold text-[#1B5E3B] bg-[#F0FAF5] px-4 py-2 rounded-xl transition-colors"
                >
                    {isMobileFiltersOpen ? 'Close' : 'Filter'}
                </button>
            </div>

            <FilterSidebar
                filters={filters}
                uniqueCategories={uniqueCategories}
                uniqueBrands={uniqueBrands}
                priceSlotCounts={priceSlotCounts}
                handleFilterChange={handleFilterChange}
                clearAllFilters={clearAllFilters}
                activeFilterCount={activeFilterCount}
                isMobileFiltersOpen={isMobileFiltersOpen}
            />

            <div className="lg:flex-1 w-full min-w-0">
                <ProductToolbar
                    filters={filters}
                    sort={sort}
                    setSort={handleSort}
                    handleSearch={handleSearch}
                    removeFilter={handleFilterChange}
                    resultCount={filteredAndSortedProducts.length}
                />

                <ProductGrid
                    products={filteredAndSortedProducts}
                    loading={loading}
                    clearAllFilters={clearAllFilters}
                />
            </div>
        </div>
    );
}
