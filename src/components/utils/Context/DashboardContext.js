"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/apiClient';

const DashboardContext = createContext(undefined);

const PRIORITY_BRANDS = { apple: 1, dell: 2, hp: 3 };

const sortBrands = (products) =>
    [...new Set(products.map(p => p.brand).filter(Boolean))].sort((a, b) => {
        const rankA = PRIORITY_BRANDS[a.toLowerCase()] || 99;
        const rankB = PRIORITY_BRANDS[b.toLowerCase()] || 99;
        return rankA !== rankB ? rankA - rankB : a.localeCompare(b);
    });

const readCache = (key) => {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeCache = (key, value) => {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage full or blocked — not important */
    }
};

/**
 * Catalogue + banners, loaded only when a page actually uses them
 * (home and product listing). Pages like About or the policies no longer
 * download the whole inventory.
 */
export const DashboardProvider = ({ children }) => {
    const [bannerData, setBannerData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingBanners, setIsLoadingBanners] = useState(true);
    const started = useRef(false);

    const load = useCallback(async () => {
        if (started.current) return;
        started.current = true;

        // Stale-while-revalidate: show this session's cached copy at once...
        const cachedProducts = readCache('gorevive_products');
        const cachedBanners = readCache('gorevive_banners');
        if (Array.isArray(cachedProducts)) {
            setProductData(cachedProducts);
            setIsLoading(false);
        }
        if (Array.isArray(cachedBanners)) {
            setBannerData(cachedBanners);
            setIsLoadingBanners(false);
        }

        // ...then refresh in the background.
        const [bannerRes, productRes] = await Promise.all([
            api.get('/dashboard/banners').catch(() => null),
            api.get('/products').catch(() => null),
        ]);

        if (Array.isArray(bannerRes?.data?.banners)) {
            setBannerData(bannerRes.data.banners);
            writeCache('gorevive_banners', bannerRes.data.banners);
        }
        if (productRes?.data?.success && Array.isArray(productRes.data.products)) {
            setProductData(productRes.data.products);
            writeCache('gorevive_products', productRes.data.products);
        }
        setIsLoadingBanners(false);
        setIsLoading(false);
    }, []);

    const uniqueCategories = useMemo(() => [...new Set(productData.map(p => p.category).filter(Boolean))], [productData]);
    const uniqueBrands = useMemo(() => sortBrands(productData), [productData]);

    const value = useMemo(() => ({
        bannerData,
        productData,
        uniqueCategories,
        uniqueBrands,
        isLoading,
        isLoadingBanners,
        load,
    }), [bannerData, productData, uniqueCategories, uniqueBrands, isLoading, isLoadingBanners, load]);

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    const { load } = context;
    useEffect(() => { load(); }, [load]);
    return context;
};
