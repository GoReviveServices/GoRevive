"use client";

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from './Icons/Icon';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const SearchBarInner = ({ className = '', onSearch }) => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Builds the products URL, keeping any filters already applied there.
    const searchUrl = (value) => {
        const params = new URLSearchParams(pathname === '/products' ? searchParams.toString() : '');
        if (value.trim()) params.set('search', value.trim());
        else params.delete('search');
        const qs = params.toString();
        return qs ? `/products?${qs}` : '/products';
    };

    const commit = (value) => {
        // Only navigate away from other pages when the user actually typed something.
        if (pathname !== '/products' && !value.trim()) return;
        router.replace(searchUrl(value), { scroll: false });
        if (onSearch) onSearch();
    };

    const [term, setTerm] = useDebouncedSearch(searchParams.get('search') || '', commit, 300);

    const handleSearch = (e) => {
        e.preventDefault();
        if (term.trim()) {
            router.push(searchUrl(term));
            if (onSearch) onSearch();
        }
    };

    const clearSearch = () => {
        setTerm('');
        if (pathname === '/products') router.replace(searchUrl(''), { scroll: false });
        if (onSearch) onSearch();
    };

    return (
        <form onSubmit={handleSearch} role="search" className={`relative group ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon
                    type="search"
                    className="h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors duration-300"
                />
            </div>
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
                id="site-search"
                type="search"
                className="block w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200/80 rounded-full text-sm text-gray-900 placeholder-gray-400 hover:bg-gray-100/50 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15 transition-all duration-300 outline-none"
                placeholder="Search products..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
            />

            {term && (
                <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-1.5 pr-2 flex items-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    aria-label="Clear search"
                >
                    <div className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <Icon type="close" className="h-3.5 w-3.5" />
                    </div>
                </button>
            )}
        </form>
    );
};

// Export wrapped version with Suspense
export const SearchBar = (props) => {
    return (
        <Suspense fallback={
            <div className={`relative ${props.className || ''}`}>
                <div className="block w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200/80 rounded-full">
                    {/* Skeleton loading state */}
                </div>
            </div>
        }>
            <SearchBarInner {...props} />
        </Suspense>
    );
};