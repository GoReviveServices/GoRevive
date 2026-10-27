// Price bands for the product listing filter. `max` is exclusive.
// Edit this list to change the slots shown on /products.
export const PRICE_SLOTS = [
    { id: '0-10000', label: 'Under ₹10,000', min: 0, max: 10000 },
    { id: '10000-20000', label: '₹10,000 – ₹20,000', min: 10000, max: 20000 },
    { id: '20000-30000', label: '₹20,000 – ₹30,000', min: 20000, max: 30000 },
    { id: '30000-50000', label: '₹30,000 – ₹50,000', min: 30000, max: 50000 },
    { id: '50000-100000', label: '₹50,000 – ₹1,00,000', min: 50000, max: 100000 },
    { id: '100000-', label: 'Above ₹1,00,000', min: 100000, max: Infinity },
];

const byId = new Map(PRICE_SLOTS.map((s) => [s.id, s]));

/** Products without a price (0) never match a price slot. */
export const inSlot = (price, slotId) => {
    const slot = byId.get(slotId);
    return Boolean(slot) && price > 0 && price >= slot.min && price < slot.max;
};

export const matchesAnySlot = (price, slotIds) => slotIds.some((id) => inSlot(price, id));

export const SORT_OPTIONS = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'price-asc', label: 'Price: Low to High' },
    { id: 'price-desc', label: 'Price: High to Low' },
    { id: 'discount-desc', label: 'Biggest Discount' },
    { id: 'stock-desc', label: 'Most in Stock' },
    { id: 'name-asc', label: 'Name: A to Z' },
];

const discountPct = (p) => (p.mrp > p.startingPrice && p.startingPrice > 0 ? (p.mrp - p.startingPrice) / p.mrp : 0);
// Items without a price always go to the end of price sorts.
const priceOrInf = (p, dir) => (p.startingPrice > 0 ? p.startingPrice : dir * Infinity);

const COMPARATORS = {
    'price-asc': (a, b) => priceOrInf(a, 1) - priceOrInf(b, 1),
    'price-desc': (a, b) => priceOrInf(b, -1) - priceOrInf(a, -1),
    'discount-desc': (a, b) => discountPct(b) - discountPct(a),
    'stock-desc': (a, b) => b.totalStock - a.totalStock,
    'name-asc': (a, b) => String(a.model).localeCompare(String(b.model)),
};

/** Returns a new sorted array; 'relevance' keeps the original order. */
export function sortProducts(products, sortId) {
    const compare = COMPARATORS[sortId];
    if (!compare) return products;
    // `|| 0` treats NaN (two unpriced items) as equal so the sort stays stable.
    return [...products].sort((a, b) => compare(a, b) || 0);
}
