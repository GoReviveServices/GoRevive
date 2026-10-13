"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import toast from 'react-hot-toast';
import { withBrand } from '@/lib/site';

import ImageGallery from './components/ImageGallery';
import Configurator from './components/Configurator';
import SerializedTable from './components/SerializedTable';
import DetailedSpecs from './components/DetailedSpecs';

// Format Helper
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

    // Quick Order State
    const [quickQty, setQuickQty] = useState(1);

    // ==========================================
    // 2. EXTRACT OPTIONS
    // ==========================================
    const availableGrades = useMemo(() => {
        const grades = new Set();
        familyUnits.forEach(u => grades.add(u.condition));
        return Array.from(grades).sort();
    }, [familyUnits]);

    const specOptions = useMemo(() => {
        const options = {};
        familyUnits.forEach(u => {
            if (u.specs) {
                Object.entries(u.specs).forEach(([key, value]) => {
                    if (!value || value === "/" || value === "N/A") return;
                    if (!options[key]) options[key] = new Set();
                    options[key].add(String(value));
                });
            }
        });
        
        const varyingSpecs = {};
        Object.keys(options).forEach(key => varyingSpecs[key] = Array.from(options[key]).sort());
        return varyingSpecs;
    }, [familyUnits]);

    // Default to the first grade / first value of each spec until the user picks.
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

    // ==========================================
    // 3. MATCHING LOGIC & QUICK ADD
    // ==========================================
    const matchingUnits = useMemo(() => {
        return familyUnits.filter(unit => {
            if (unit.condition !== selectedGrade) return false;
            if (unit.specs) {
                for (const [key, selectedValue] of Object.entries(selectedSpecs)) {
                    if (unit.specs[key] && String(unit.specs[key]) !== selectedValue) return false;
                }
            }
            return true;
        });
    }, [familyUnits, selectedGrade, selectedSpecs]);

    const representativeUnit = matchingUnits.length > 0 ? matchingUnits[0] : familyUnits[0];

    // Filter out units that the user already has in their cart
    const availableMatchingUnits = useMemo(() => {
        if (!cartItems) return matchingUnits;
        const cartIds = new Set(cartItems.map(item => item.product.id));
        return matchingUnits.filter(u => !cartIds.has(u.id));
    }, [matchingUnits, cartItems]);

    

    const handleQuickAdd = async (redirect = false) => {
        if (availableMatchingUnits.length < quickQty) {
            toast.error(`Only ${availableMatchingUnits.length} unallocated units available.`, { position: 'bottom-center' });
            return;
        }
        
        try {
            if (quickQty === 1) {
                await addToCart(availableMatchingUnits[0]);
            } else {
                const unitsToAdd = availableMatchingUnits.slice(0, quickQty);
                await addMultipleToCart(unitsToAdd);
            }
            // toast.success('Added to order!', { id: toastId });
            setQuickQty(1); 

            if (redirect) {
                router.push('/cart');
            }
        } catch (error) {
            // toast.error('Failed to allocate units.', { id: toastId });
        }
    };

    const galleryImages = baseProduct.images || [baseProduct.image, baseProduct.secondaryImage].filter(Boolean);
    const hasDiscount = representativeUnit?.mrp > representativeUnit?.price;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">
            <div className="container mx-auto px-4 max-w-[1200px] py-8 lg:py-12">
                <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
                    <ol className="flex flex-wrap items-center gap-1.5">
                        <li><Link href="/" className="hover:text-[#1B5E3B]">Home</Link></li>
                        <li aria-hidden="true">/</li>
                        <li><Link href="/products" className="hover:text-[#1B5E3B]">Refurbished IT Products</Link></li>
                        {baseProduct.category && (
                            <>
                                <li aria-hidden="true">/</li>
                                <li><Link href={`/products?category=${encodeURIComponent(baseProduct.category)}`} className="hover:text-[#1B5E3B]">{baseProduct.category}</Link></li>
                            </>
                        )}
                        <li aria-hidden="true">/</li>
                        <li aria-current="page" className="text-[#0B2136] font-semibold line-clamp-1">{baseProduct.model}</li>
                    </ol>
                </nav>

                <div className="flex flex-col lg:flex-row gap-10 xl:gap-16">
                    
                    <div className="lg:w-[45%] relative">
                        <ImageGallery 
                            mainImage={mainImage} 
                            setMainImage={setMainImage} 
                            galleryImages={galleryImages} 
                            altText={`Refurbished ${withBrand(baseProduct.brand, baseProduct.model)}`} 
                        />
                    </div>

                    <div className="lg:w-[55%] flex flex-col">
                        <div className="mb-6">
                            <span className="inline-block text-[#1B5E3B] text-xs font-black uppercase tracking-widest mb-2">
                                {baseProduct.brand} • {baseProduct.category}
                            </span>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B2136] leading-tight mb-4">
                                {baseProduct.model}
                            </h1>
                        </div>

                        <Configurator 
                            availableGrades={availableGrades}
                            specOptions={specOptions}
                            selectedGrade={selectedGrade}
                            setSelectedGrade={setSelectedGrade}
                            selectedSpecs={selectedSpecs}
                            setSelectedSpecs={setSelectedSpecs}
                        />

                        {/* ==========================================
                            QUICK ACTION / BULK ORDER BLOCK
                            ========================================== */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
                            {isAuthenticated ? (
                                <div>
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">B2B Base Price</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-black text-[#0B2136] tracking-tight">
                                                    {formatCurrency(representativeUnit?.price || 0)}
                                                </span>
                                                {hasDiscount && (
                                                    <span className="text-sm font-bold text-gray-400 line-through">
                                                        {formatCurrency(representativeUnit.mrp)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold px-3 py-1 rounded-md ${availableMatchingUnits.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {availableMatchingUnits.length} Ready to Auto-Allocate
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Quantity Selector */}
                                        <div className="flex items-center border border-gray-300 rounded-xl h-14 w-full sm:w-36 overflow-hidden">
                                            <button 
                                                onClick={() => setQuickQty(Math.max(1, quickQty - 1))} 
                                                className="px-4 h-full text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                                            >−</button>
                                            <input 
                                                type="number" 
                                                value={quickQty} 
                                                onChange={(e) => setQuickQty(Math.min(availableMatchingUnits.length, Math.max(1, parseInt(e.target.value) || 1)))}
                                                className="w-full h-full text-center font-bold text-[#0B2136] focus:outline-none bg-transparent"
                                            />
                                            <button 
                                                onClick={() => setQuickQty(Math.min(availableMatchingUnits.length, quickQty + 1))} 
                                                className="px-4 h-full text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                                            >+</button>
                                        </div>

                                        <button 
                                            onClick={() => handleQuickAdd(false)}
                                            disabled={availableMatchingUnits.length === 0}
                                            className="flex-1 h-14 rounded-xl p-3 text-sm font-bold bg-white border-2 border-[#0B2136] text-[#0B2136] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add to Cart
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleQuickAdd(true)}
                                            disabled={availableMatchingUnits.length === 0}
                                            className="flex-1 h-14 rounded-xl p-3 text-sm font-bold bg-[#0B2136] text-white hover:bg-[#1B5E3B] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-500 text-sm mb-4">Please log in to view B2B pricing and quick-add inventory.</p>
                                    <Link
                                        href="/login"
                                        className="block w-full py-4 rounded-xl text-sm font-bold bg-[#0B2136] text-white hover:bg-[#1B5E3B] transition-colors shadow-md"
                                    >
                                        Login to View & Buy
                                    </Link>
                                </div>
                            )}
                        </div>
                        
                    </div>
                </div>
                
                {/* Visual Separator for Manual Selection */}
                <div className="flex items-center gap-4 my-8">
                    <hr className="flex-1 border-gray-200" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Or Pick Specific Units Below</span>
                    <hr className="flex-1 border-gray-200" />
                </div>

                <SerializedTable matchingUnits={matchingUnits} />

                <DetailedSpecs specs={representativeUnit?.specs} />

                {related.length > 0 && (
                    <section aria-labelledby="related-heading" className="mt-16">
                        <h2 id="related-heading" className="text-xl font-extrabold text-[#0B2136] mb-4">
                            More refurbished {baseProduct.category ? baseProduct.category.toLowerCase() : 'devices'}
                        </h2>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {related.map((r) => (
                                <li key={r.slug}>
                                    <Link href={`/products/${r.slug}`} className="block h-full bg-white border border-gray-100 rounded-xl p-4 hover:border-[#1B5E3B]/40 hover:shadow-sm transition-all">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#1B5E3B] mb-1">{r.brand}</span>
                                        <span className="block text-sm font-semibold text-[#0B2136] line-clamp-2">{r.model}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}