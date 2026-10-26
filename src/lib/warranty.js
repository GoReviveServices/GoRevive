// Extended warranty offered on the product page, cart and checkout.
// Change the numbers here and every page, the order total and the invoice follow.
export const EXT_WARRANTY_MONTHS = 6;
export const EXT_WARRANTY_RATE = 0.08; // 8% of the unit's price
export const STANDARD_WARRANTY_DAYS = 7; // included with every device
export const EXT_WARRANTY_DAYS = EXT_WARRANTY_MONTHS * 30;

/**
 * Warranty on the invoice line, in days, as a number: 180 (6 months) when the
 * extended warranty was bought for that line, otherwise the 7-day standard one.
 * The extended cover replaces the standard one, it is not added on top of it.
 */
export const warrantyDays = (hasExtended) => (hasExtended ? EXT_WARRANTY_DAYS : STANDARD_WARRANTY_DAYS);

/** Price of the extended warranty for one unit, rounded to the rupee. */
export const warrantyPrice = (unitPrice) => Math.round((Number(unitPrice) || 0) * EXT_WARRANTY_RATE);

// The extended warranty is sold on laptops only (MacBooks count as laptops).
// Category names come from the inventory's product_category field.
const ELIGIBLE_CATEGORY = /\b(laptop|notebook|macbook)s?\b/i;
export const isWarrantyEligible = (category) => ELIGIBLE_CATEGORY.test(String(category || ''));

// Wording of the standard (free) warranty, from the Warranty Policy page.
export const STANDARD_WARRANTY_NOTE = `Every device includes a ${STANDARD_WARRANTY_DAYS}-day standard warranty for business buyers.`;
