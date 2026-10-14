// Extended warranty offered on the product page, cart and checkout.
// Change the numbers here and every page, the order total and the invoice follow.
export const EXT_WARRANTY_MONTHS = 6;
export const EXT_WARRANTY_RATE = 0.08; // 8% of the unit's price

/** Price of the extended warranty for one unit, rounded to the rupee. */
export const warrantyPrice = (unitPrice) => Math.round((Number(unitPrice) || 0) * EXT_WARRANTY_RATE);

// The extended warranty is sold on laptops only (MacBooks count as laptops).
// Category names come from the inventory's product_category field.
const ELIGIBLE_CATEGORY = /\b(laptop|notebook|macbook)s?\b/i;
export const isWarrantyEligible = (category) => ELIGIBLE_CATEGORY.test(String(category || ''));

// Wording of the standard (free) warranty, from the Warranty Policy page.
export const STANDARD_WARRANTY_NOTE = 'Every device includes a 7-day standard warranty for business buyers.';
