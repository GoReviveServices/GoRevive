import { notFound, permanentRedirect } from 'next/navigation';
import { findBundle, getProductBundles, getUnitsForModel } from '@/lib/server/inventory';
import { SITE_URL, SITE_NAME, BASE_OPEN_GRAPH, DEFAULT_OG_IMAGE, withBrand } from '@/lib/site';
import JsonLd from '@/components/utils/SEO/JsonLd';
import ProductDetailClient from './ProductDetailClient';
import { faqSchema } from './productFaq';

// Re-render each product page at most once a minute (ISR).
export const revalidate = 60;

const describe = (p) => {
    const specs = [p.baseSpecs?.ram, p.baseSpecs?.storage].filter(Boolean).join(' / ');
    const grades = p.availableConditions?.length ? ` Grades ${p.availableConditions.join(', ')}.` : '';
    return `Buy certified pre-owned ${withBrand(p.brand, p.model)}${specs ? ` (${specs})` : ''} in bulk from GoRevive. Quality-checked, graded and warranty-backed IT hardware at B2B prices.${grades}`
        .replace(/\s+/g, ' ')
        .trim();
};

// Search engines show ~155 characters; cut on a word boundary, not mid-word.
const clip = (text, max = 158) => (text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max)).replace(/[,.;:–-]+$/, '')}…`);

export async function generateMetadata({ params }) {
    const { id } = await params;
    const product = await findBundle(id).catch(() => null);
    if (!product) return { title: 'Product not found', robots: { index: false } };

    const title = `Pre-Owned ${withBrand(product.brand, product.model)}`.replace(/\s+/g, ' ');
    const url = `/products/${product.slug}`;
    return {
        title,
        description: clip(describe(product)),
        alternates: { canonical: url },
        openGraph: {
            ...BASE_OPEN_GRAPH,
            url,
            title: `${title} | ${SITE_NAME}`,
            description: clip(describe(product)),
            images: product.image ? [{ url: product.image, alt: title }] : [DEFAULT_OG_IMAGE],
        },
        twitter: { card: 'summary_large_image', title, description: clip(describe(product)), images: product.image ? [product.image] : [DEFAULT_OG_IMAGE] },
    };
}

export default async function ProductPage({ params }) {
    const { id } = await params;
    // If the inventory service is down this throws and app/error.js is shown,
    // instead of a misleading 404 that could get the page dropped from Google.
    const product = await findBundle(id);
    if (!product) notFound();

    // Old URLs used the raw model name; send them to the clean slug (301-equivalent).
    if (decodeURIComponent(id) !== product.slug) permanentRedirect(`/products/${product.slug}`);

    const [units, bundles] = await Promise.all([
        getUnitsForModel(product.id).catch(() => []),
        getProductBundles().catch(() => []),
    ]);

    const related = bundles
        .filter((b) => b.slug !== product.slug && b.category === product.category)
        .sort((a, b) => (b.brand === product.brand) - (a.brand === product.brand) || b.totalStock - a.totalStock)
        .slice(0, 8)
        .map(({ slug, brand, model, image }) => ({ slug, brand, model, image }));

    const url = `${SITE_URL}/products/${product.slug}`;
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.model,
        url,
        image: [product.image, product.secondaryImage].filter(Boolean),
        description: describe(product),
        brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
        category: product.category,
        itemCondition: 'https://schema.org/RefurbishedCondition',
        // Prices are shown only to signed-in business buyers, so no Offer price
        // is published here. Set PUBLIC_PRICES_IN_SCHEMA=true to include it.
        ...(process.env.PUBLIC_PRICES_IN_SCHEMA === 'true' && product.startingPrice > 0
            ? {
                offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'INR',
                    lowPrice: product.startingPrice,
                    offerCount: product.totalStock,
                    availability: product.totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                    itemCondition: 'https://schema.org/RefurbishedCondition',
                },
            }
            : {}),
    };
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
            ...(product.category
                ? [{ '@type': 'ListItem', position: 3, name: product.category, item: `${SITE_URL}/products?category=${encodeURIComponent(product.category)}` }]
                : []),
            { '@type': 'ListItem', position: product.category ? 4 : 3, name: product.model, item: url },
        ],
    };

    return (
        <>
            <JsonLd data={[productSchema, breadcrumbSchema, faqSchema(product.category)]} />
            <ProductDetailClient product={product} initialUnits={units} related={related} />
        </>
    );
}
