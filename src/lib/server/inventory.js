import 'server-only';
import { phpPost, isTrue } from './php';
import { cached } from './cache';
import { slugify } from '@/lib/slug';
import { imageUrl } from '@/lib/site';

const ASC_CODE = process.env.PHP_ASC_CODE || 'GRWHDL001';
const INVENTORY_TTL_MS = Number(process.env.INVENTORY_CACHE_MS || 60000);

// The single price field a customer is charged. Listing, detail page, cart,
// PO, payment and invoice all read the price through unitPrice() so they can
// never disagree again. Confirm with the backend team which field is correct.
const PRICE_FIELD = process.env.PRICE_FIELD || 'Cust_Price';

export const unitPrice = (item) => Number(item?.[PRICE_FIELD]) || 0;

const EMPTY_FILTERS = {
    model_code: '', stock_type: '', imei: '', brand_id: '', phone_version: '', hot_deals: '',
    color: '', memory: '', model_name: '', user_type_app: '', search: '', price: '',
};

/** Full raw inventory from PHP, cached for INVENTORY_TTL_MS. */
export function getRawInventory() {
    return cached('inventory:raw', INVENTORY_TTL_MS, async () => {
        const payload = await phpPost('getStock_IMEI.php', { asc_code: ASC_CODE, ...EMPTY_FILTERS });
        if (!isTrue(payload) || !Array.isArray(payload?.data)) {
            throw new Error('Inventory fetch failed');
        }
        return payload.data;
    });
}

function deriveProcessor(item) {
    if (item.processor) return item.processor;
    const match = item.model?.match(/Core i\d/);
    return match ? `Intel ${match[0]}` : '';
}

// Storage arrives as "HDD/SSD" with empty halves, e.g. "/256GB SSD" or "1TB HDD/".
// Drop the empty parts; join real ones with " + " ("1TB HDD + 256GB SSD").
export const cleanStorage = (value) =>
    String(value || '')
        .split('/')
        .map((part) => part.trim())
        .filter((part) => part && !/^(n\/?a|na|-)$/i.test(part))
        .join(' + ');

/** One sellable serialized unit, shaped for the frontend. */
export function toUnit(item) {
    const price = unitPrice(item);
    const mrp = Number(item.MRP) > 0 ? Number(item.MRP) : Math.round(price * 1.2);
    const id = item.imei1 || item.imei || '';
    return {
        id,
        serialNumber: id,
        model_code: item.model_code,
        model: item.common_model || item.model,
        brand: item.brand,
        category: item.product_category,
        image: imageUrl(item.Original_image1),
        secondaryImage: imageUrl(item.Original_image2),
        condition: item.Stock_Type || 'Standard',
        price,
        mrp,
        stock: Number(item.Stock_Qty || 1),
        hsn_code: item.hsn_code || '',
        seller_cod: item.seller_cod || ASC_CODE,
        specs: {
            processor: deriveProcessor(item),
            ram: item.memory_ram || '',
            storage: cleanStorage(item.internal_storage),
            display: item.display_size || '',
            os: (item.product_category || '').toLowerCase() === 'monitor' ? '' : item.operating_system || '',
            color: item.color || '',
            gpu: item.gpu || '',
            battery: item.battary || '',
        },
    };
}

// Cart lines carry the grade, not the product category, so work the category
// out for them: by unit id, then by model code, then from the product name.
const LAPTOP_NAME = /\b(laptop|notebook|macbook|thinkpad|elitebook|probook|zbook|latitude|inspiron|ideapad|vostro|chromebook|vivobook|zenbook|travelmate)\b/i;

export async function getCartCategoryResolver() {
    const raw = await getRawInventory().catch(() => []);
    const byId = new Map();
    const byModelCode = new Map();
    for (const item of raw) {
        if (!item.product_category) continue;
        byId.set(String(item.imei1 || item.imei || ''), item.product_category);
        if (item.model_code && !byModelCode.has(String(item.model_code))) byModelCode.set(String(item.model_code), item.product_category);
    }
    return (line) =>
        byId.get(String(line.productId)) ||
        byModelCode.get(String(line.model_code)) ||
        (LAPTOP_NAME.test(String(line.productName || '')) ? 'Laptop' : '');
}

/** Inventory grouped into product bundles (one card per model). Cached. */
export function getProductBundles() {
    return cached('inventory:bundles', INVENTORY_TTL_MS, async () => {
        const raw = await getRawInventory();
        const groups = new Map();
        const slugOwners = new Map();

        for (const item of raw) {
            const key = item.model;
            if (!key) continue;
            const price = unitPrice(item);
            const mrp = Number(item.MRP) > 0 ? Number(item.MRP) : Math.round(price * 1.2);

            let bundle = groups.get(key);
            if (!bundle) {
                let slug = slugify(item.common_model || key) || slugify(key);
                // Two different models must never share a URL.
                if (slugOwners.has(slug) && slugOwners.get(slug) !== key) slug = `${slug}-${slugOwners.size}`;
                slugOwners.set(slug, key);

                bundle = {
                    id: key,
                    slug,
                    brand: item.brand,
                    model: item.common_model || key,
                    category: item.product_category,
                    image: imageUrl(item.Original_image1),
                    secondaryImage: imageUrl(item.Original_image2),
                    baseSpecs: { ram: item.memory_ram, storage: cleanStorage(item.internal_storage) },
                    totalStock: 0,
                    startingPrice: Infinity,
                    mrp,
                    updatedAt: item.updated_at || item.entry_date || null,
                    availableConditions: new Set(),
                };
                groups.set(key, bundle);
            }

            if (price > 0 && price < bundle.startingPrice) bundle.startingPrice = price;
            if (mrp > bundle.mrp) bundle.mrp = mrp;
            bundle.totalStock += Number(item.Stock_Qty || 1);
            bundle.availableConditions.add(item.Stock_Type || 'Standard');
        }

        return Array.from(groups.values()).map((b) => ({
            ...b,
            startingPrice: b.startingPrice === Infinity ? 0 : b.startingPrice,
            availableConditions: Array.from(b.availableConditions).sort(),
        }));
    });
}

/** Find a bundle by its slug, or by the old model-name URL (for redirects). */
export async function findBundle(param) {
    const bundles = await getProductBundles();
    const decoded = decodeURIComponent(param || '');
    return (
        bundles.find((b) => b.slug === decoded) ||
        bundles.find((b) => b.id === decoded || b.model === decoded) ||
        bundles.find((b) => b.slug === slugify(decoded)) ||
        null
    );
}

/** All serialized units for one model. */
export async function getUnitsForModel(modelKey) {
    const raw = await getRawInventory();
    return raw
        .filter((i) => i.model === modelKey || i.model_code === modelKey || i.common_model === modelKey)
        .filter((i) => i.imei1 || i.imei)
        .map(toUnit);
}

/**
 * Look up in-stock units by serial/IMEI.
 * Returns a Map of id -> { unit, raw } (ids not in stock are absent).
 */
export async function getUnitsByIds(ids) {
    const wanted = new Set(ids.map(String));
    const raw = await getRawInventory();
    const found = new Map();
    for (const item of raw) {
        const id = String(item.imei1 || item.imei || '');
        if (wanted.has(id) && !found.has(id)) found.set(id, { unit: toUnit(item), raw: item });
    }
    return found;
}
