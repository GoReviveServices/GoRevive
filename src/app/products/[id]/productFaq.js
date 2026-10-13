import { EXT_WARRANTY_MONTHS, EXT_WARRANTY_RATE } from '@/lib/warranty';
import { MIN_ORDER_UNITS, BULK_DISCOUNT_MIN_UNITS, BULK_DISCOUNT_RATE } from '@/lib/pricing';

// Questions shown on every product page (and published as FAQ schema).
// Answers are taken from the Warranty, Return and Shipping policy pages —
// update them together if a policy changes.
export const PRODUCT_FAQ = [
    {
        q: 'What warranty comes with this device?',
        a: `Every device includes a 7-day standard warranty for business buyers. You can add a ${EXT_WARRANTY_MONTHS}-month extended warranty for ${EXT_WARRANTY_RATE * 100}% of the unit price when you add it to your cart.`,
    },
    {
        q: 'What do the condition grades mean?',
        a: 'Grade A is as good as new, Grade B shows minimal signs of use, Grade C has visible usage or minor issues, and Grade D has visible usage or functional issues. Each unit is graded after a quality check.',
    },
    {
        q: 'Can I return a device?',
        a: 'Returns are accepted within 7 calendar days of delivery if the device is dead on arrival, has a hardware defect that does not match its grade, has the wrong specification, or is missing a listed component.',
    },
    {
        q: 'Is the old data erased?',
        a: 'Yes. Devices are wiped to the NIST 800-88 data-erasure standard before sale.',
    },
    {
        q: 'Is there a minimum order or a bulk discount?',
        a: `The minimum order is ${MIN_ORDER_UNITS} units. Orders of ${BULK_DISCOUNT_MIN_UNITS} or more units get an automatic ${BULK_DISCOUNT_RATE * 100}% discount on the devices.`,
    },
    {
        q: 'Will I get a GST invoice?',
        a: 'Yes. Every order comes with a GST invoice. Prices shown are exclusive of GST and shipping.',
    },
    {
        q: 'How soon is my order dispatched?',
        a: 'Orders are usually processed within 2–3 working days of confirmation, excluding public holidays. Shipping charges are shown at checkout.',
    },
];

export const faqSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PRODUCT_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
    })),
});
