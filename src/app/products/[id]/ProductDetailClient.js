"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import { withBrand, pluralize } from '@/lib/site';
import { warrantyPrice, isWarrantyEligible } from '@/lib/warranty';

import ImageGallery from './components/ImageGallery';
import Configurator from './components/Configurator';
import ConditionSelector from './components/ConditionSelector';
import WarrantyAddon from './components/WarrantyAddon';
import SerializedTable from './components/SerializedTable';
import KeySpecs from './components/KeySpecs';
import GradeGuide from './components/GradeGuide';
import ProductFaq from './components/ProductFaq';
import TrustStrip from './components/TrustStrip';
import SmartImage from '@/components/utils/UI/SmartImage';
import { SpecHighlights, OfferCards, ServiceRow, SectionNav } from './components/PdpBlocks';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '');

// Rendered by the server page (page.js) with the product and its units
// already loaded, so the content is in the initial HTML for search engines
// and nothing has to be fetched after the page appears.
export default function ProductDetailClient({ product: baseProduct, initialUnits = [], related = [] }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { addToCart, addMultipleToCart, cartItems } = useCart();

    const familyUnits = initialUnits;
    const [mainImage, setMainImage] = useState(baseProduct.image);
    const [quickQty, setQuickQty] = useState(1);
    const [withWarranty, setWithWarranty] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // ---------- options ----------
    const availableGrades = useMemo(() => [...new Set(familyUnits.map(u => u.condition))].sort(), [familyUnits]);

    const lowestPriceByGrade = useMemo(() => {
        const out = {};
        familyUnits.forEach(u => {
            if (u.price > 0 && (!out[u.condition] || u.price < out[u.condition])) out[u.condition] = u.price;
        });
        return out;
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

    const qty = Math.max(1, Math.min(quickQty, availableMatchingUnits.length || 1));
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

    const handleQuickAdd = async (redirect = false) => {
        if (!isAuthenticated) {
            router.push(`/login?next=${encodeURIComponent(`/products/${baseProduct.slug}`)}`);
            return;
        }
        if (availableMatchingUnits.length < qty || qty === 0) {
            toast.error(`Only ${availableMatchingUnits.length} units of this configuration are available.`, { position: 'bottom-center' });
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
    const loginHref = `/login?next=${encodeURIComponent(`/products/${baseProduct.slug}`)}`;
    const savings = hasDiscount ? mrp - price : 0;
    const left = availableMatchingUnits.length;
    const pageLinks = [
        ['#units', 'Pick units'],
        ...(representativeUnit?.specs ? [['#specs', 'Specifications']] : []),
        ['#grades', 'Condition grades'],
        ['#faq', 'FAQ'],
        ...(related.length ? [['#related', 'Similar devices']] : []),
    ];

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#E9F4EE_0,#F8FAFC_340px)] lg:pb-16">
            <div className="container mx-auto max-w-[1280px] px-4 py-5 lg:py-8">
                <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
                    <ol className="flex flex-wrap items-center gap-1.5">
                        <li><Link href="/" className="inline-block py-1.5 hover:text-[#1B5E3B]">Home</Link></li>
                        <li aria-hidden="true">/</li>
                        <li><Link href="/products" className="inline-block py-1.5 hover:text-[#1B5E3B]">Pre-Owned IT Products</Link></li>
                        {baseProduct.category && (
                            <>
                                <li aria-hidden="true">/</li>
                                <li><Link href={`/products?category=${encodeURIComponent(baseProduct.category)}`} className="inline-block py-1.5 hover:text-[#1B5E3B]">{baseProduct.category}</Link></li>
                            </>
                        )}
                        <li aria-hidden="true">/</li>
                        <li aria-current="page" className="line-clamp-1 font-semibold text-[#0B2136]">{baseProduct.model}</li>
                    </ol>
                </nav>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-10">
                    {/* LEFT: gallery */}
                    <div className="min-w-0">
                        <div className="lg:sticky lg:top-24">
                            <ImageGallery
                                mainImage={mainImage}
                                setMainImage={setMainImage}
                                galleryImages={galleryImages}
                                altText={`Pre-Owned ${title}`}
                                badge={`Pre-Owned${selectedGrade ? ` · Grade ${selectedGrade}` : ''}`}
                                discountPct={isAuthenticated ? discountPct : 0}
                            />
                        </div>
                    </div>

                    {/* RIGHT: details + buy box */}
                    <div className="flex min-w-0 flex-col gap-5">
                        <header>
                            <Link
                                href={`/products?brand=${encodeURIComponent(baseProduct.brand || '')}`}
                                className="inline-flex items-center rounded-full bg-[#E3F3EA] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#1B5E3B] hover:bg-[#D3EBDF]"
                            >
                                {baseProduct.brand}{baseProduct.category ? ` • ${baseProduct.category}` : ''}
                            </Link>
                            <h1 className="mt-2.5 text-2xl font-extrabold leading-tight text-[#0B2136] lg:text-[30px]">{title}</h1>
                            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                <span className={`inline-flex items-center gap-1.5 font-bold ${left > 0 ? (left <= 5 ? 'text-amber-700' : 'text-emerald-700') : 'text-red-600'}`}>
                                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${left > 0 ? (left <= 5 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'}`} />
                                    {left === 0 ? 'Out of stock' : left <= 5 ? `Only ${left} left in this configuration` : 'In stock'}
                                </span>
                                <span className="text-gray-500">
                                    {familyUnits.length} {familyUnits.length === 1 ? 'unit' : 'units'} in all
                                    {availableGrades.length > 0 && <> · {availableGrades.length === 1 ? 'Grade' : 'Grades'} {availableGrades.join(', ')}</>}
                                </span>
                            </p>
                            <div className="mt-3.5"><SpecHighlights specs={representativeUnit?.specs} /></div>
                        </header>

                        {/* Buy box */}
                        <div className="overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(11,33,54,0.04),0_16px_40px_-20px_rgba(11,33,54,0.25)]">
                            {/* Price */}
                            <div className="border-b border-gray-100 bg-gradient-to-r from-[#F4FAF7] to-white p-5">
                                {isAuthenticated ? (
                                    <>
                                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                            <span className="text-[34px] font-black leading-none tracking-tight text-[#0B2136]">{formatCurrency(price)}</span>
                                            {hasDiscount && <span className="text-base font-semibold text-gray-400 line-through">{formatCurrency(mrp)}</span>}
                                            {hasDiscount && <span className="rounded-[6px] bg-[#1B5E3B] px-2 py-0.5 text-xs font-black text-white">{discountPct}% OFF</span>}
                                        </div>
                                        {savings > 0 && <p className="mt-1.5 text-sm font-bold text-[#1B5E3B]">You save {formatCurrency(savings)} on MRP</p>}
                                        <p className="mt-1 text-xs text-gray-500">B2B price per unit for the selected condition · + GST · shipping calculated at checkout</p>
                                    </>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E3F3EA] text-[#1B5E3B]">
                                                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </span>
                                            <div>
                                                <p className="text-lg font-bold text-[#0B2136]">Login to see B2B price</p>
                                                {hasDiscount && <p className="text-sm font-semibold text-[#1B5E3B]">Up to {discountPct}% below MRP</p>}
                                            </div>
                                        </div>
                                        <Link href={loginHref} className="rounded-[12px] bg-[#0B2136] px-6 py-3 text-sm font-bold text-white hover:bg-[#1B5E3B]">Login</Link>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-5 p-5">
                                <ConditionSelector
                                    grades={availableGrades}
                                    selected={selectedGrade}
                                    onSelect={setSelectedGrade}
                                    pricesByGrade={lowestPriceByGrade}
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

                                {warrantyOffered && (
                                    <WarrantyAddon
                                        unitPrice={price}
                                        quantity={qty}
                                        selected={withWarranty}
                                        onToggle={() => setWithWarranty(v => !v)}
                                        isAuthenticated={isAuthenticated}
                                        loginHref={loginHref}
                                    />
                                )}

                                {/* Quantity + actions */}
                                <div>
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-[#0B2136]">Quantity</span>
                                        <span className={`rounded-[6px] px-3 py-1 text-xs font-bold ${left > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                            {left > 0 ? `${left} available in this configuration` : 'Out of stock in this configuration'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <div className="flex h-12 flex-shrink-0 items-center overflow-hidden rounded-[12px] border border-gray-300 sm:w-36">
                                            <button type="button" aria-label="Decrease quantity" onClick={() => setQuickQty(Math.max(1, qty - 1))} className="h-full px-4 font-bold text-gray-600 hover:bg-gray-50">−</button>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                aria-label="Quantity"
                                                value={qty}
                                                min={1}
                                                max={Math.max(1, left)}
                                                onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                className="h-full w-full bg-transparent text-center font-bold text-[#0B2136] focus:outline-none"
                                            />
                                            <button type="button" aria-label="Increase quantity" onClick={() => setQuickQty(Math.min(Math.max(1, left), qty + 1))} className="h-full px-4 font-bold text-gray-600 hover:bg-gray-50">+</button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickAdd(false)}
                                            disabled={isAdding || left === 0}
                                            className="h-12 w-full rounded-[12px] border-2 border-[#0B2136] bg-white text-sm font-bold text-[#0B2136] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                                        >
                                            Add to Cart
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickAdd(true)}
                                            disabled={isAdding || left === 0}
                                            className="h-12 w-full rounded-[12px] bg-[#1B5E3B] text-sm font-bold text-white shadow-md hover:bg-[#0B2136] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                    {isAuthenticated && devicesTotal > 0 && (
                                        <p className="mt-3 text-sm text-gray-600">
                                            {qty} × device = <strong className="text-[#0B2136]">{formatCurrency(devicesTotal)}</strong>
                                            {warrantyTotal > 0 && <> + warranty <strong className="text-[#0B2136]">{formatCurrency(warrantyTotal)}</strong></>}
                                            <span className="text-gray-400"> (+ GST)</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <OfferCards showPrices={isAuthenticated} />
                        <ServiceRow />
                    </div>
                </div>

                <SectionNav items={pageLinks} />

                {/* Specific units */}
                <section id="units" aria-labelledby="units-heading" className="mt-10 scroll-mt-24">
                    <h2 id="units-heading" className="mb-1 text-2xl font-extrabold tracking-tight text-[#0B2136]">Pick specific units</h2>
                    <p className="text-sm text-gray-500">Choose exact serial numbers instead of the quick add above.</p>
                    <SerializedTable matchingUnits={matchingUnits} withWarranty={warrantyOn} />
                </section>

                <KeySpecs specs={representativeUnit?.specs} />
                <GradeGuide available={availableGrades} />

                <section aria-labelledby="trust-heading" className="mt-12">
                    <h2 id="trust-heading" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0B2136]">Certified & trusted</h2>
                    <TrustStrip />
                </section>

                <ProductFaq category={baseProduct.category} />

                {related.length > 0 && (
                    <section id="related" aria-labelledby="related-heading" className="mt-12 scroll-mt-24">
                        <h2 id="related-heading" className="mb-5 text-2xl font-extrabold tracking-tight text-[#0B2136]">
                            More pre-owned {baseProduct.category ? pluralize(baseProduct.category).toLowerCase() : 'devices'}
                        </h2>
                        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {related.map((r) => (
                                <li key={r.slug}>
                                    <Link href={`/products/${r.slug}`} className="group block h-full overflow-hidden rounded-[14px] border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:border-[#1B5E3B]/40 hover:shadow-md">
                                        <span className="relative block aspect-[4/3] bg-gradient-to-b from-white to-slate-50">
                                            <SmartImage src={r.image} alt={`Pre-Owned ${withBrand(r.brand, r.model)}`} fill sizes="(min-width: 768px) 22vw, 46vw" className="object-contain p-4 mix-blend-multiply transition-transform group-hover:scale-105" />
                                        </span>
                                        <span className="block p-3">
                                            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#1B5E3B]">{r.brand}</span>
                                            <span className="line-clamp-2 block text-sm font-semibold text-[#0B2136]">{r.model}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            {/* Mobile buy bar: sticks to the bottom while scrolling the product, stops above the footer */}
            <div className="sticky bottom-0 z-40 mt-8 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        {isAuthenticated ? (
                            <>
                                <p className="text-lg font-black leading-none text-[#0B2136]">{formatCurrency(devicesTotal + warrantyTotal || price)}</p>
                                <p className="mt-0.5 truncate text-[11px] text-gray-500">{qty} unit{qty > 1 ? 's' : ''}{warrantyOn ? ' + warranty' : ''} · + GST</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-[#0B2136]">Login to see B2B price</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleQuickAdd(true)}
                        disabled={isAdding || (isAuthenticated && left === 0)}
                        className="h-11 rounded-[12px] bg-[#1B5E3B] px-6 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {isAuthenticated ? 'Buy Now' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}
