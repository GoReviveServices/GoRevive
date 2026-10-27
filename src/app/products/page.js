import { Suspense } from 'react';
import { getProductBundles } from '@/lib/server/inventory';
import { getBanners } from '@/lib/server/banners';
import { getPriceTier } from '@/lib/server/session';
import { SITE_URL, pageMetadata, pluralize } from '@/lib/site';
import JsonLd from '@/components/utils/SEO/JsonLd';
import { ProductSkeleton } from '@/components/module/Products/Components/ProductSkeleton';
import ProductsClient from './ProductsClient';


const one = (v) => (Array.isArray(v) ? (v.length === 1 ? v[0] : null) : v || null);

// Category or brand landing views (?category=Laptop) get their own title and
// canonical URL; any other filter combination points back to /products.
export async function generateMetadata({ searchParams }) {
    const sp = await searchParams;
    const category = one(sp.category);
    const brand = one(sp.brand);
    const onlyCategory = category && !sp.brand && !sp.price && !sp.search && !sp.grade && !sp.ram;
    const onlyBrand = brand && !sp.category && !sp.price && !sp.search && !sp.grade && !sp.ram;

    if (onlyCategory) {
        return pageMetadata({
            title: `Pre-Owned ${pluralize(category)} for Business – Bulk B2B Prices`,
            description: `Buy certified pre-owned ${pluralize(category).toLowerCase()} in bulk from GoRevive. Every unit is quality-checked, graded A–D and backed by warranty. GST invoice for businesses.`,
            path: `/products?category=${encodeURIComponent(category)}`,
        });
    }
    if (onlyBrand) {
        return pageMetadata({
            title: `Pre-Owned ${brand} Laptops & Devices – Bulk B2B Prices`,
            description: `Shop certified pre-owned ${brand} devices in bulk from GoRevive. Graded, tested and warranty-backed with GST invoicing for businesses across India.`,
            path: `/products?brand=${encodeURIComponent(brand)}`,
        });
    }
    // Any other filter combination (price, search, several brands…) is the
    // same content as /products, so it points there and stays out of the index.
    const filtered = Boolean(sp.category || sp.brand || sp.price || sp.search || sp.sort || sp.grade || sp.ram);
    return {
        ...pageMetadata({
            title: 'Buy Pre-Owned Laptops, Desktops & Monitors in Bulk',
            description: 'Browse certified pre-owned laptops, MacBooks, desktops, monitors and phones at B2B prices. Filter by brand, grade and price. Warranty-backed with GST invoice.',
            path: '/products',
        }),
        ...(filtered ? { robots: { index: false, follow: true } } : {}),
    };
}

const GridFallback = () => (
    <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-2.5 lg:gap-4">
        {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
    </div>
);

export default async function ProductsPage() {
    // Retailers see Ret_Price, everyone else Cust_Price.
    const tier = await getPriceTier();
    const [products, banners] = await Promise.all([
        getProductBundles(tier).catch(() => []),
        getBanners().catch(() => []),
    ]);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Pre-Owned IT products',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 50).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/products/${p.slug}`,
            name: p.model,
        })),
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] bg-[radial-gradient(1100px_520px_at_10%_-10%,#FFF6EC_0,transparent_60%),radial-gradient(900px_480px_at_95%_0,#F1F0FF_0,transparent_60%)]">
            <JsonLd data={itemList} />
            {/* Kept for SEO and screen readers; the page opens visually on categories + banners. */}
            <h1 className="sr-only">Certified Pre-Owned IT Hardware</h1>
            <div className="mx-auto max-w-[1440px] px-4 sm:px-5 pt-4 pb-24 lg:pb-14">
                <Suspense fallback={<GridFallback />}>
                    <ProductsClient initialProducts={products} initialBanners={banners} />
                </Suspense>
            </div>
        </div>
    );
}
