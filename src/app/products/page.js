import { Suspense } from 'react';
import Link from 'next/link';
import { getProductBundles } from '@/lib/server/inventory';
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
    const onlyCategory = category && !sp.brand && !sp.price && !sp.search;
    const onlyBrand = brand && !sp.category && !sp.price && !sp.search;

    if (onlyCategory) {
        return pageMetadata({
            title: `Refurbished ${pluralize(category)} for Business – Bulk B2B Prices`,
            description: `Buy certified refurbished ${pluralize(category).toLowerCase()} in bulk from GoRevive. Every unit is quality-checked, graded A–D and backed by warranty. GST invoice for businesses.`,
            path: `/products?category=${encodeURIComponent(category)}`,
        });
    }
    if (onlyBrand) {
        return pageMetadata({
            title: `Refurbished ${brand} Laptops & Devices – Bulk B2B Prices`,
            description: `Shop certified refurbished ${brand} devices in bulk from GoRevive. Graded, tested and warranty-backed with GST invoicing for businesses across India.`,
            path: `/products?brand=${encodeURIComponent(brand)}`,
        });
    }
    // Any other filter combination (price, search, several brands…) is the
    // same content as /products, so it points there and stays out of the index.
    const filtered = Boolean(sp.category || sp.brand || sp.price || sp.search || sp.sort);
    return {
        ...pageMetadata({
            title: 'Buy Refurbished Laptops, Desktops & Monitors in Bulk',
            description: 'Browse certified refurbished laptops, MacBooks, desktops, monitors and phones at B2B prices. Filter by brand, grade and price. Warranty-backed with GST invoice.',
            path: '/products',
        }),
        ...(filtered ? { robots: { index: false, follow: true } } : {}),
    };
}

const GridFallback = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
    </div>
);

export default async function ProductsPage() {
    const products = await getProductBundles().catch(() => []);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Refurbished IT products',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 50).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/products/${p.slug}`,
            name: p.model,
        })),
    };

    return (
        <div className="bg-[#F8FAFC] min-h-screen">
            <JsonLd data={itemList} />
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-6 lg:py-8">
                    <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-2">
                        <Link href="/" className="hover:text-[#1B5E3B]">Home</Link> <span aria-hidden="true">/</span> <span className="text-[#0B2136] font-semibold">Products</span>
                    </nav>
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B2136]">Certified Refurbished IT Hardware</h1>
                    <p className="text-gray-500 mt-2 max-w-3xl text-[15px]">
                        Business-grade laptops, desktops, monitors and phones — every unit tested, graded and warranty-backed.
                        See <Link href="/grading" className="text-[#1B5E3B] font-semibold underline-offset-2 hover:underline">how we grade devices</Link>.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1400px] py-8">
                <Suspense fallback={<GridFallback />}>
                    <ProductsClient initialProducts={products} />
                </Suspense>
            </div>
        </div>
    );
}
