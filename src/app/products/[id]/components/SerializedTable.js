"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Check, Lock, PackageOpen, ScanBarcode } from 'lucide-react';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';
import { SectionHeading } from './PdpBlocks';

const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '');
const valid = (v) => v != null && String(v).trim() && !['/', 'N/A', 'NA'].includes(String(v).trim());
const configOf = (u) => [u.specs?.processor, u.specs?.ram, u.specs?.storage].filter(valid).join(' · ') || '—';

const COLS = 'grid grid-cols-[44px_1.4fr_1.6fr_1fr_130px] items-center gap-3 px-[22px]';

/** Compact, selectable list of the exact serials in stock for the selected configuration. */
export default function SerializedTable({ matchingUnits, withWarranty = false, grade, initialRows = 6 }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { addMultipleToCart, cartItems } = useCart();
    const [selected, setSelected] = useState([]);
    const [sort, setSort] = useState('price');
    const [showAll, setShowAll] = useState(false);
    const [adding, setAdding] = useState(false);

    const cartIds = useMemo(() => new Set((cartItems || []).map(i => String(i.product.id))), [cartItems]);
    const units = useMemo(() => {
        const list = matchingUnits.filter(u => !cartIds.has(String(u.id)));
        return [...list].sort(sort === 'serial'
            ? (a, b) => String(a.serialNumber || a.id).localeCompare(String(b.serialNumber || b.id))
            : (a, b) => a.price - b.price);
    }, [matchingUnits, cartIds, sort]);
    const shown = showAll ? units : units.slice(0, initialRows);
    const picked = units.filter(u => selected.includes(u.id));
    const pickedTotal = picked.reduce((s, u) => s + u.price, 0);

    const toggle = (id) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
    const addPicked = async () => {
        if (!isAuthenticated) return router.push('/login');
        if (!picked.length) return;
        setAdding(true);
        try {
            await addMultipleToCart(picked, { warranty: withWarranty });
            setSelected([]);
        } finally {
            setAdding(false);
        }
    };

    return (
        <section id="units" aria-labelledby="units-heading" className="mt-4 scroll-mt-24 overflow-hidden rounded-[18px] border border-[#DDEFE3] bg-white shadow-[0_10px_30px_-12px_rgba(27,94,59,0.18),0_1px_3px_rgba(10,31,20,0.05)]">
            <div className="flex flex-wrap items-end justify-between gap-2.5 border-b border-gray-100 px-[22px] py-[18px]">
                <div className="min-w-0 flex-[1_1_300px]">
                    <SectionHeading id="units-heading" icon={ScanBarcode} className="mb-1">Pick exact units</SectionHeading>
                    <p className="text-[13px] text-gray-500">Pick exact serial numbers instead of quick add.{grade ? ` Grade ${grade} · ` : ' '}{units.length} available · live warehouse stock</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 text-[13px]">
                    <span className="text-gray-500">Sort</span>
                    {[['price', 'Lowest price'], ['serial', 'Serial no.']].map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setSort(id)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 font-semibold ${sort === id ? 'border-[#1B5E3B] bg-[#F0FAF5]' : 'border-[#D6E2DB] bg-white'}`}>{label}</button>
                    ))}
                </div>
            </div>

            {units.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-gray-500">
                    <PackageOpen className="h-8 w-8 text-gray-300" />
                    No units of this configuration in the warehouse right now. Try another grade or spec.
                </div>
            ) : !isAuthenticated ? (
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FAF5]"><Lock className="h-6 w-6 text-[#1B5E3B]" /></span>
                    <p className="font-bold text-[#0B2136]">Login to pick units by serial number</p>
                    <Link href="/login" className="rounded-full bg-[#0A1F14] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1B5E3B]">Login to continue</Link>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="min-w-[680px]">
                        <div className={`${COLS} bg-[#F7FAF8] py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8AA898]`}>
                            <span /><span>Serial no.</span><span>Configuration</span><span className="text-right">Price</span><span className="text-right">QC report</span>
                        </div>
                        {shown.map((u) => {
                            const on = selected.includes(u.id);
                            return (
                                <div
                                    key={u.id}
                                    role="checkbox"
                                    aria-checked={on}
                                    tabIndex={0}
                                    onClick={() => toggle(u.id)}
                                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(u.id); } }}
                                    className={`${COLS} cursor-pointer border-t border-[#EEF3F0] py-3 text-sm ${on ? 'bg-[#F1FBE6]' : 'bg-white hover:bg-gray-50/60'}`}
                                >
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-[5px] border-2 ${on ? 'border-[#1B5E3B] bg-[#1B5E3B]' : 'border-[#C9D6CF] bg-white'}`}>{on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                                    <span className="font-mono text-[13px]">{u.serialNumber || u.id}</span>
                                    <span className="text-[13px] text-gray-500">{configOf(u)}</span>
                                    <span className="flex flex-col text-right">
                                        <b>{inr(u.price)}</b>
                                        {u.mrp > u.price && <span className="text-xs text-[#1B5E3B]">Save {inr(u.mrp - u.price)}</span>}
                                    </span>
                                    <Link href={`/qc/${u.serialNumber || u.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1.5 text-[13px] font-semibold text-[#1B5E3B] hover:underline">
                                        <ClipboardList className="h-4 w-4" />View report
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isAuthenticated && units.length > 0 && (
                <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-[22px] py-3.5 ${picked.length ? 'bg-[#F0FAF5]' : 'bg-white'}`}>
                    {units.length > initialRows && (
                        <button type="button" onClick={() => setShowAll(v => !v)} className="text-sm font-bold text-[#1B5E3B]">
                            {showAll ? 'Show fewer' : `Show all ${units.length} units`}
                        </button>
                    )}
                    <div className="flex-1" />
                    <span className={`text-sm ${picked.length ? 'text-[#0B2136]' : 'text-gray-500'}`}>
                        {picked.length ? `${picked.length} selected · ${inr(pickedTotal)}` : 'Select units to add them by serial'}
                    </span>
                    <button type="button" onClick={addPicked} disabled={!picked.length || adding} className={`h-[42px] rounded-full px-[22px] text-sm font-bold ${picked.length ? 'bg-[#0A1F14] text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {adding ? 'Adding…' : picked.length ? `Add ${picked.length} to cart` : 'Add to cart'}
                    </button>
                </div>
            )}
        </section>
    );
}
