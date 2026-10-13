// Site-wide constants used for SEO (metadata, sitemap, schema).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gorevive.in').replace(/\/+$/, '');
export const SITE_NAME = 'GoRevive';
export const IMAGE_HOST = (process.env.NEXT_PUBLIC_IMAGE_HOST || 'https://gorevive.jbbs.in').replace(/\/+$/, '');

export const imageUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${IMAGE_HOST}/${String(path).replace(/^\/+/, '')}`;
};

export const CONTACT = {
    phone: '+91-11-4275-8155',
    email: 'support@gorevive.in',
};

export const SOCIAL_LINKS = [
    'https://www.linkedin.com/company/gorevive-private-limited',
    'https://www.instagram.com/gorevive_official/',
    'https://www.facebook.com/Goreviveofficial/',
];

// Open Graph fields every page shares. Next.js replaces (not merges) a
// parent's `openGraph` when a page sets its own, so pages spread this in.
export const BASE_OPEN_GRAPH = { type: 'website', siteName: SITE_NAME, locale: 'en_IN' };

// The generated share image (app/opengraph-image.js). Listed explicitly
// because a page-level `openGraph` would otherwise drop it.
export const DEFAULT_OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'GoRevive – certified refurbished IT hardware' };

/** "Laptop" -> "Laptops", "Tablets" -> "Tablets" (for titles and copy). */
export const pluralize = (word = '') => (/s$/i.test(word) ? word : `${word}s`);

/** "Dell" + "Dell Latitude 5490" -> "Dell Latitude 5490" (no doubled brand). */
export const withBrand = (brand, model = '') =>
    brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model;

/** Standard metadata for a page: title, description, canonical URL, OG/Twitter. */
export function pageMetadata({ title, description, path, images = [DEFAULT_OG_IMAGE] }) {
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: { ...BASE_OPEN_GRAPH, url: path, title: `${title} | ${SITE_NAME}`, description, images },
        twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images },
    };
}
