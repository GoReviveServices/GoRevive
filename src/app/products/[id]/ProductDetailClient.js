"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronRight, ArrowRight, Laptop } from 'lucide-react';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import { withBrand, pluralize } from '@/lib/site';
import { warrantyPrice, isWarrantyEligible } from '@/lib/warranty';

import ImageGallery from './components/ImageGallery';
import Configurator from './components/Configurator';
import ConditionSelector from './components/ConditionSelector';
import BuyBox from './components/BuyBox';
import SerializedTable from './components/SerializedTable';
import KeySpecs from './components/KeySpecs';
import GradeGuide from './components/GradeGuide';
import ProductFaq from './components/ProductFaq';
import TrustStrip from './components/TrustStrip';
import SmartImage from '@/components/utils/UI/SmartImage';
import { SpecHighlights, OfferCards, ServiceRow, SectionNav, SectionHeading } from './components/PdpBlocks';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '');

// Soft off-white page with warm/cool glows at the top.
const PAGE_BG = {
    background: 'radial-gradient(1100px 520px at 10% -10%, #FFF6EC 0, transparent 60%), radial-gradient(900px 480px at 95% 0, #F1F0FF 0, transparent 60%), linear-gradient(180deg, #FDFBF7 0, #FAFAF8 700px)',
};

// Rendered by the server page (page.js) with the product and its units
// already loaded, so the content is in the initial HTML for search engines
// and nothing has to be fetched after the page appears.
export default function ProductDetailClient({ product: baseProduct, initialUnits = [], related = [] }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { addToCart, addMultipleToCart, cartItems, cartCount = 0 } = useCart();

    const familyUnits = initialUnits;
    const [mainImage, setMainImage] = useState(baseProduct.image);
    const [quickQty, setQuickQty] = useState(1);
    const [withWarranty, setWithWarranty] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // ---------- options ----------
    const availableGrades = useMemo(() => [...new Set(familyUnits.map(u => u.condition))].sort(), [familyUnits]);

    const { lowestPriceByGrade, stockByGrade } = useMemo(() => {
        const low = {}, stock = {};
        familyUnits.forEach(u => {
            stock[u.condition] = (stock[u.condition] || 0) + 1;
            if (u.price > 0 && (!low[u.condition] || u.price < low[u.condition])) low[u.condition] = u.price;
        });
        return { lowestPriceByGrade: low, stockByGrade: stock };
    }, [familyUnits]);

    const specOptions = useMemo(() => {
        const options = {};
        familyUnits.forEach(u => {
            Object.entries(u.specs || {}).forEach(([key, value]) => {
                if (!value || value === "/" || value === "N/A") return;
                (options[key] ||= new Set()).add(String(value));
            });
        });
        const varying = {};
        // Only specs with a real choice become selectors; fixed ones show in Specifications.
        Object.keys(options).forEach(key => { if (options[key].size > 1) varying[key] = [...options[key]].sort(); });
        return varying;
    }, [familyUnits]);

    const defaultSpecs = useMemo(() => {
        const initial = {};
        Object.keys(specOptions).forEach(k => { initial[k] = specOptions[k][0]; });
        return initial;
    }, [specOptions]);

    const [gradeChoice, setSelectedGrade] = useState(null);
    const [specChoice, setSpecChoice] = useState(null);
    const selectedGrade = gradeChoice ?? availableGrades[0] ?? null;
    const selectedSpecs = specChoice ?? defaultSpecs;
    const setSelectedSpecs = (updater) =>
        setSpecChoice(prev => (typeof updater === 'function' ? updater(prev ?? defaultSpecs) : updater));

    // ---------- matching units ----------
    const matchingUnits = useMemo(() => familyUnits.filter(unit => {
        if (unit.condition !== selectedGrade) return false;
        for (const [key, selectedValue] of Object.entries(selectedSpecs)) {
            if (unit.specs?.[key] && String(unit.specs[key]) !== selectedValue) return false;
        }
        return true;
    }).sort((a, b) => a.price - b.price), [familyUnits, selectedGrade, selectedSpecs]);

    const representativeUnit = matchingUnits[0] || familyUnits[0];

    const availableMatchingUnits = useMemo(() => {
        const cartIds = new Set((cartItems || []).map(item => String(item.product.id)));
        return matchingUnits.filter(u => !cartIds.has(String(u.id)));
    }, [matchingUnits, cartItems]);

    const left = availableMatchingUnits.length;
    const qty = Math.max(1, Math.min(quickQty, left || 1));
    const unitsToAdd = availableMatchingUnits.slice(0, qty);
    const devicesTotal = unitsToAdd.reduce((s, u) => s + u.price, 0);
    // The extended warranty is sold on laptops only.
    const warrantyOffered = isWarrantyEligible(baseProduct.category);
    const warrantyOn = warrantyOffered && withWarranty;
    const warrantyTotal = warrantyOn ? unitsToAdd.reduce((s, u) => s + warrantyPrice(u.price), 0) : 0;

    const price = representativeUnit?.price || baseProduct.startingPrice || 0;
    const mrp = representativeUnit?.mrp || baseProduct.mrp || 0;
    const hasDiscount = mrp > price && price > 0;
    const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const savings = hasDiscount ? mrp - price : 0;

    const loginHref = `/login?next=${encodeURIComponent(`/products/${baseProduct.slug}`)}`;

    const handleQuickAdd = async (redirect = false) => {
        if (!isAuthenticated) {
            router.push(loginHref);
            return;
        }
        if (left < qty || qty === 0) {
            toast.error(`Only ${left} units of this configuration are available.`, { position: 'bottom-center' });
            return;
        }
        setIsAdding(true);
        try {
            if (qty === 1) await addToCart(unitsToAdd[0], { warranty: warrantyOn });
            else await addMultipleToCart(unitsToAdd, { warranty: warrantyOn });
            setQuickQty(1);
            if (redirect) router.push('/cart');
        } finally {
            setIsAdding(false);
        }
    };

    const galleryImages = baseProduct.images || [baseProduct.image, baseProduct.secondaryImage].filter(Boolean);
    const title = withBrand(baseProduct.brand, baseProduct.model);
    const pageLinks = [
        ['#units', 'Pick units'],
        ...(representativeUnit?.specs ? [['#specs', 'Specifications']] : []),
        ['#grades', 'Condition grades'],
        ['#faq', 'FAQ'],
        ...(related.length ? [['#related', 'Similar devices']] : []),
    ];

    const stockTone = left === 0 ? 'text-red-600' : left <= 5 ? 'text-amber-700' : 'text-[#1B5E3B]';
    const stockDot = left === 0 ? 'bg-red-500' : left <= 5 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div className="min-h-screen lg:pb-16" style={PAGE_BG}>
            <div className="container mx-auto max-w-[1820px] px-4 py-2 lg:py-2">
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-gray-500">
                    <ol className="flex flex-wrap items-center gap-1.5">
                        <li><Link href="/" className="inline-block py-1.5 hover:text-[#1B5E3B]">Home</Link></li>
                        <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                        <li><Link href="/products" className="inline-block py-1.5 hover:text-[#1B5E3B]">Pre-Owned IT Products</Link></li>
                        {baseProduct.category && (
                            <>
                                <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                                <li><Link href={`/products?category=${encodeURIComponent(baseProduct.category)}`} className="inline-block py-1.5 hover:text-[#1B5E3B]">{baseProduct.category}</Link></li>
                            </>
                        )}
                        <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
                        <li aria-current="page" className="line-clamp-1 font-semibold text-[#0B2136]">{baseProduct.model}</li>
                    </ol>
                </nav>

                {/* Above the fold.
                    2xl: gallery | info | buy box
                    lg–xl: gallery (sticky, spans both rows) | info, then buy box under info
                    mobile: stacked in DOM order */}
                <section className="grid items-start gap-6 rounded-[20px] border border-[#DDEFE3] bg-white p-4 shadow-[0_18px_50px_-20px_rgba(27,94,59,0.28),0_1px_3px_rgba(10,31,20,0.05)] sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:[grid-template-areas:'g_i'_'g_b'] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(340px,380px)] 2xl:[grid-template-areas:'g_i_b']">
                    <div className="mx-auto w-full min-w-0 max-w-[560px] lg:sticky lg:top-24 lg:[grid-area:g]">
                        <ImageGallery
                            mainImage={mainImage}
                            setMainImage={setMainImage}
                            galleryImages={galleryImages}
                            altText={`Pre-Owned ${title}`}
                            badge={`Certified${selectedGrade ? ` · Grade ${selectedGrade}` : ''}`}
                            discountPct={isAuthenticated ? discountPct : 0}
                            qcHref={representativeUnit ? `/qc/${representativeUnit.serialNumber || representativeUnit.id}` : null}
                        />
                    </div>

                    <div className="flex min-w-0 flex-col gap-4 lg:[grid-area:i]">
                        <header>
                            <Link
                                href={`/products?brand=${encodeURIComponent(baseProduct.brand || '')}`}
                                className="text-[13px] font-semibold text-[#1B5E3B] hover:underline"
                            >
                                Visit the {baseProduct.brand} pre-owned store
                            </Link>
                            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-[#0B2136] lg:text-[26px]">{title}</h1>
                            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                                <span className={`inline-flex items-center gap-1.5 font-bold ${stockTone}`}>
                                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${stockDot}`} />
                                    {left === 0 ? 'Out of stock' : left <= 5 ? `Only ${left} left in this configuration` : 'In stock'}
                                </span>
                                <span className="text-gray-500">
                                    {familyUnits.length} {familyUnits.length === 1 ? 'unit' : 'units'} in all
                                    {availableGrades.length > 0 && <> · {availableGrades.length === 1 ? 'Grade' : 'Grades'} {availableGrades.join(', ')}</>}
                                </span>
                            </p>
                            <div className="mt-3"><SpecHighlights specs={representativeUnit?.specs} /></div>
                        </header>

                        {/* Price */}
                        <div className="border-t border-gray-100 pt-4">
                            {isAuthenticated ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {hasDiscount && <span className="text-[26px] font-extrabold text-[#1B8A4B]">-{discountPct}%</span>}
                                        <span className="text-[34px] font-extrabold leading-none tracking-tight text-[#0B2136]">{formatCurrency(price)}</span>
                                        <span className="text-sm text-gray-500">per unit</span>
                                    </div>
                                    <p className="mt-1.5 text-[13px] text-gray-500">
                                        {hasDiscount && <>M.R.P.: <span className="line-through">{formatCurrency(mrp)}</span> · You save <b className="rounded-[5px] bg-[#E3F6EA] px-1.5 py-px text-[#1B5E3B]">{formatCurrency(savings)}</b> · </>}
                                        Price excl. GST &amp; shipping
                                    </p>
                                    <p className="mt-1 text-[13px] text-[#0B2136]">
                                        <b>{formatCurrency(price * 1.18)}</b> incl. 18% GST — claim the full <b>{formatCurrency(price * 0.18)}</b> as input tax credit
                                    </p>
                                </>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#F0FAF5] px-4 py-3.5">
                                    <div>
                                        <p className="text-xl font-extrabold text-[#0B2136]">{hasDiscount ? `Up to ${discountPct}% below MRP` : 'B2B pricing'}</p>
                                        <p className="text-[13px] text-gray-600">B2B prices are visible to verified business accounts.</p>
                                    </div>
                                    <Link href={loginHref} className="rounded-full bg-[#0A1F14] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1B5E3B]">Login to see price</Link>
                                </div>
                            )}
                        </div>

                        <ConditionSelector
                            selected={selectedGrade}
                            onSelect={(g) => { setSelectedGrade(g); setQuickQty(1); }}
                            pricesByGrade={lowestPriceByGrade}
                            stockByGrade={stockByGrade}
                            showPrices={isAuthenticated}
                        />

                        {Object.keys(specOptions).length > 0 && (
                            <Configurator
                                availableGrades={[]}
                                specOptions={specOptions}
                                selectedGrade={selectedGrade}
                                setSelectedGrade={setSelectedGrade}
                                selectedSpecs={selectedSpecs}
                                setSelectedSpecs={setSelectedSpecs}
                            />
                        )}

                        <div className="border-t border-gray-100 pt-4">
                            <OfferCards showPrices={isAuthenticated} />
                        </div>
                    </div>

                    <div className="min-w-0 lg:[grid-area:b] 2xl:sticky 2xl:top-24">
                        <BuyBox
                            isAuthenticated={isAuthenticated}
                            loginHref={loginHref}
                            price={price}
                            qty={qty}
                            setQty={setQuickQty}
                            left={left}
                            cartUnits={cartCount}
                            warrantyOffered={warrantyOffered}
                            withWarranty={withWarranty}
                            onToggleWarranty={() => setWithWarranty(v => !v)}
                            devicesTotal={devicesTotal}
                            warrantyTotal={warrantyTotal}
                            isAdding={isAdding}
                            onAdd={() => handleQuickAdd(false)}
                            onBuy={() => handleQuickAdd(true)}
                        />
                    </div>
                </section>

                <ServiceRow />
                <div className="mt-3"><TrustStrip /></div>

                <SectionNav items={pageLinks} />

                <SerializedTable matchingUnits={matchingUnits} withWarranty={warrantyOn} grade={selectedGrade} />

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
                    <KeySpecs specs={representativeUnit?.specs} />
                    <GradeGuide available={availableGrades} />
                </div>

                <ProductFaq category={baseProduct.category} />

                {related.length > 0 && (
                    <section id="related" aria-labelledby="related-heading" className="mt-5 scroll-mt-24">
                        <div className="mb-3 flex items-center justify-between">
                            <SectionHeading id="related-heading" icon={Laptop}>
                                Compare similar pre-owned {baseProduct.category ? pluralize(baseProduct.category).toLowerCase() : 'devices'}
                            </SectionHeading>
                            <Link href={`/products?category=${encodeURIComponent(baseProduct.category || '')}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1B5E3B] hover:underline">
                                View all <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {related.map((r) => (
                                <li key={r.slug}>
                                    <Link href={`/products/${r.slug}`} className="group flex h-full flex-col gap-2 rounded-[16px] border border-[#DDEFE3] bg-white p-3 shadow-[0_10px_26px_-14px_rgba(27,94,59,0.3)] transition-all hover:-translate-y-[3px] hover:shadow-[0_18px_36px_-14px_rgba(27,94,59,0.4)]">
                                        <span className="relative block aspect-[4/3] overflow-hidden rounded-[12px] border border-[#EEF0F2] bg-transparent">
                                            <SmartImage src={r.image} alt={`Pre-Owned ${withBrand(r.brand, r.model)}`} fill sizes="(min-width: 768px) 22vw, 46vw" className="object-contain p-4 transition-transform group-hover:scale-105" />
                                        </span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5E3B]">{r.brand}</span>
                                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B2136]">{r.model}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            {/* Mobile buy bar: sticks to the bottom while scrolling the product, stops above the footer */}
            <div className="sticky bottom-0 z-40 mt-8 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_rgba(10,31,20,0.08)] backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        {isAuthenticated ? (
                            <>
                                <p className="text-lg font-extrabold leading-none text-[#0B2136]">{formatCurrency(devicesTotal + warrantyTotal || price)}</p>
                                <p className="mt-0.5 truncate text-[11px] text-gray-500">{qty} unit{qty > 1 ? 's' : ''}{warrantyOn ? ' + warranty' : ''} · + GST</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-[#0B2136]">Login to see B2B price</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleQuickAdd(false)}
                        disabled={isAdding || (isAuthenticated && left === 0)}
                        className="h-11 rounded-full bg-[#8AE63A] px-6 text-sm font-bold text-[#0A1F14] disabled:opacity-50"
                    >
                        {isAuthenticated ? `Add ${qty} to cart` : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}
