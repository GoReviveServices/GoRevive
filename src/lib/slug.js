// Turns a product model name into a clean, lowercase, hyphenated URL slug.
// "Dell Latitude 5490 (Core i5 / 8GB)" -> "dell-latitude-5490-core-i5-8gb"
export function slugify(value = '') {
    return String(value)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 90)
        .replace(/-+$/g, '');
}

export const productPath = (product) => `/products/${product.slug || slugify(product.model || product.id)}`;
