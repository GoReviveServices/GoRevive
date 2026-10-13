"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import { withBrand, pluralize } from '@/lib/site';
import { warrantyPrice } from '@/lib/warranty';
import { BULK_DISCOUNT_MIN_UNITS, BULK_DISCOUNT_RATE, MIN_ORDER_UNITS } from '@/lib/pricing';

import ImageGallery from './components/ImageGallery';
import Configurator from './components/Configurator';
import ConditionSelector from './components/ConditionSelector';
import WarrantyAddon from './components/WarrantyAddon';
import SerializedTable from './components/SerializedTable';
import KeySpecs from './components/KeySpecs';
import GradeGuide from './components/GradeGuide';
import ProductFaq from './components/ProductFaq';
import TrustStrip from './components/TrustStrip';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount).replace(/\s/g, '');

const HIGHLIGHTS = [
    { label: 'Quality checked & graded', icon: 'M9 12l2 2 4-4m5.6-4.4A11.95 11.95 0 0112 2.9a11.95 11.95 0 01-8.6 3.1A12 12 0 003 9c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-1-.1-2.1-.4-3.1z' },
    { label: 'NIST 800-88 data wipe', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { label: '7-day return eligibility', icon: 'M4 4v5h.6m15.4 2A8 8 0 004.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 01-15.4-2m15.4 2H15' },
    { label: 'GST invoice', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
];

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
    const warrantyTotal = withWarranty ? unitsToAdd.reduce((s, u) => s + warrantyPrice(u.price), 0) : 0;

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
            if (qty === 1) await addToCart(unitsToAdd[0], { warranty: withWarranty });
            else await addMultipleToCart(unitsToAdd, { warranty: withWarranty });
            setQuickQty(1);
            if (redirect) router.push('/cart');
        } finally {
            setIsAdding(false);
        }
    };

    const galleryImages = baseProduct.images || [baseProduct.image, baseProduct.secondaryImage].filter(Boolean);
    const title = withBrand(baseProduct.brand, baseProduct.model);

    return (
        <div className="min-h-screen bg-[#F8FAFC] lg:pb-16">
            <div className="container mx-auto px-4 max-w-[1240px] py-6 lg:py-10">
                <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-500">
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
                        <li aria-current="page" className="text-[#0B2136] font-semibold line-clamp-1">{baseProduct.model}</li>
                    </ol>
                </nav>

                <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
                    {/* LEFT: gallery */}
                    <div className="lg:w-[46%]">
                        <div className="lg:sticky lg:top-24">
                            <ImageGallery
                                mainImage={mainImage}
                                setMainImage={setMainImage}
                                galleryImages={galleryImages}
                                altText={`Pre-Owned ${title}`}
                            />
                        </div>
                    </div>

                    {/* RIGHT: buy box */}
                    <div className="lg:w-[54%] flex flex-col gap-5">
                        <div>
                            <p className="text-[#1B5E3B] text-xs font-black uppercase tracking-widest mb-2">
                                {baseProduct.brand}{baseProduct.category ? ` • ${baseProduct.category}` : ''}
                            </p>
                            <h1 className="text-2xl lg:text-[30px] font-extrabold text-[#0B2136] leading-tight">{title}</h1>
                            <p className="mt-2 text-sm text-gray-500">
                                {familyUnits.length} {familyUnits.length === 1 ? 'unit' : 'units'} in stock
                                {availableGrades.length > 0 && <> · {availableGrades.length === 1 ? 'Grade' : 'Grades'} {availableGrades.join(', ')}</>}
                            </p>
                        </div>

                        <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2" aria-label="Why buy from GoRevive">
                            {HIGHLIGHTS.map(h => (
                                <li key={h.label} className="flex items-center gap-2 rounded-[10px] bg-white border border-gray-100 px-3 py-2 text-[12px] leading-tight font-semibold text-[#0B2136]">
                                    <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-[#1B5E3B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={h.icon} /></svg>
                                    <span>{h.label}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Price */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            {isAuthenticated ? (
                                <>
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <span className="text-3xl font-black text-[#0B2136] tracking-tight">{formatCurrency(price)}</span>
                                        {hasDiscount && <span className="text-base font-semibold text-gray-400 line-through">{formatCurrency(mrp)}</span>}
                                        {hasDiscount && <span className="rounded-[6px] bg-[#F0FAF5] px-2 py-0.5 text-sm font-bold text-[#1B5E3B]">{discountPct}% off</span>}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">B2B price per unit for the selected condition · + GST · shipping calculated at checkout</p>
                                </>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-bold text-[#0B2136]">Login to see B2B price</p>
                                        {hasDiscount && <p className="text-sm text-[#1B5E3B] font-semibold">Up to {discountPct}% below MRP</p>}
                                    </div>
                                    <Link href={`/login?next=${encodeURIComponent(`/products/${baseProduct.slug}`)}`} className="rounded-[12px] bg-[#0B2136] px-6 py-3 text-sm font-bold text-white hover:bg-[#1B5E3B]">
                                        Login
                                    </Link>
                                </div>
                            )}
                        </div>

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

                        <WarrantyAddon
                            unitPrice={price}
                            quantity={qty}
                            selected={withWarranty}
                            onToggle={() => setWithWarranty(v => !v)}
                            isAuthenticated={isAuthenticated}
                            loginHref={`/login?next=${encodeURIComponent(`/products/${baseProduct.slug}`)}`}
                        />

                        {/* Quantity + actions */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-[#0B2136]">Quantity</span>
                                <span className={`text-xs font-bold px-3 py-1 rounded-[6px] ${availableMatchingUnits.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {availableMatchingUnits.length > 0 ? `${availableMatchingUnits.length} available in this configuration` : 'Out of stock in this configuration'}
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex flex-shrink-0 items-center border border-gray-300 rounded-[12px] h-12 sm:w-36 overflow-hidden">
                                    <button type="button" aria-label="Decrease quantity" onClick={() => setQuickQty(Math.max(1, qty - 1))} className="px-4 h-full text-gray-600 hover:bg-gray-50 font-bold">−</button>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        aria-label="Quantity"
                                        value={qty}
                                        min={1}
                                        max={Math.max(1, availableMatchingUnits.length)}
                                        onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-full h-full text-center font-bold text-[#0B2136] focus:outline-none bg-transparent"
                                    />
                                    <button type="button" aria-label="Increase quantity" onClick={() => setQuickQty(Math.min(Math.max(1, availableMatchingUnits.length), qty + 1))} className="px-4 h-full text-gray-600 hover:bg-gray-50 font-bold">+</button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleQuickAdd(false)}
                                    disabled={isAdding || availableMatchingUnits.length === 0}
                                    className="w-full sm:flex-1 h-12 rounded-[12px] text-sm font-bold bg-white border-2 border-[#0B2136] text-[#0B2136] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add to Cart
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickAdd(true)}
                                    disabled={isAdding || availableMatchingUnits.length === 0}
                                    className="w-full sm:flex-1 h-12 rounded-[12px] text-sm font-bold bg-[#0B2136] text-white hover:bg-[#1B5E3B] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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

                        {/* Offers */}
                        <section aria-labelledby="offers-heading" className="rounded-2xl overflow-hidden border border-[#0B2136]/10 bg-white shadow-sm">
                            <h2 id="offers-heading" className="bg-gradient-to-r from-[#0B2136] to-[#1B5E3B] px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">Business offers</h2>
                            <ul className="divide-y divide-gray-100">
                                <li className="flex items-start gap-3 px-5 py-3.5">
                                    <span className="mt-0.5 flex-shrink-0 whitespace-nowrap rounded-[6px] bg-[#F0FAF5] px-2 py-0.5 text-xs font-black text-[#1B5E3B]">{BULK_DISCOUNT_RATE * 100}% OFF</span>
                                    <p className="text-sm text-gray-700"><strong className="text-[#0B2136]">Bulk discount:</strong> buy {BULK_DISCOUNT_MIN_UNITS}+ units in one order and get {BULK_DISCOUNT_RATE * 100}% off all devices, applied automatically.</p>
                                </li>
                                <li className="flex items-start gap-3 px-5 py-3.5">
                                    <span className="mt-0.5 flex-shrink-0 whitespace-nowrap rounded-[6px] bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-700">WALLET</span>
                                    <p className="text-sm text-gray-700"><strong className="text-[#0B2136]">GoRevive wallet:</strong> your wallet balance is applied at checkout before you pay.</p>
                                </li>
                                <li className="flex items-start gap-3 px-5 py-3.5">
                                    <span className="mt-0.5 flex-shrink-0 whitespace-nowrap rounded-[6px] bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-700">MOQ</span>
                                    <p className="text-sm text-gray-700">Minimum order of {MIN_ORDER_UNITS} units per checkout, across any models.</p>
                                </li>
                            </ul>
                        </section>

                        <TrustStrip />
                    </div>
                </div>

                {/* Specific units */}
                <section aria-labelledby="units-heading" className="mt-12">
                    <h2 id="units-heading" className="sr-only">Pick specific units</h2>
                    <div className="flex items-center gap-4 mb-2">
                        <hr className="flex-1 border-gray-200" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or pick specific units</span>
                        <hr className="flex-1 border-gray-200" />
                    </div>
                    <SerializedTable matchingUnits={matchingUnits} withWarranty={withWarranty} />
                </section>

                <KeySpecs specs={representativeUnit?.specs} />
                <GradeGuide available={availableGrades} />
                <ProductFaq />

                {related.length > 0 && (
                    <section aria-labelledby="related-heading" className="mt-12">
                        <h2 id="related-heading" className="text-2xl font-extrabold tracking-tight text-[#0B2136] mb-5">
                            More pre-owned {baseProduct.category ? pluralize(baseProduct.category).toLowerCase() : 'devices'}
                        </h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {related.map((r) => (
                                <li key={r.slug}>
                                    <Link href={`/products/${r.slug}`} className="block h-full bg-white border border-gray-100 rounded-[12px] p-4 hover:border-[#1B5E3B]/40 hover:shadow-sm transition-all">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#1B5E3B] mb-1">{r.brand}</span>
                                        <span className="block text-sm font-semibold text-[#0B2136] line-clamp-2">{r.model}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            {/* Mobile buy bar: sticks to the bottom while scrolling the product, stops above the footer */}
            <div className="lg:hidden sticky bottom-0 z-40 mt-8 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        {isAuthenticated ? (
                            <>
                                <p className="text-lg font-black text-[#0B2136] leading-none">{formatCurrency(devicesTotal + warrantyTotal || price)}</p>
                                <p className="mt-0.5 truncate text-[11px] text-gray-500">{qty} unit{qty > 1 ? 's' : ''}{withWarranty ? ' + warranty' : ''} · + GST</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-[#0B2136]">Login to see B2B price</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => handleQuickAdd(true)}
                        disabled={isAdding || (isAuthenticated && availableMatchingUnits.length === 0)}
                        className="h-11 rounded-[12px] bg-[#0B2136] px-6 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {isAuthenticated ? 'Buy Now' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}
