"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
    Truck, MapPin, Info, CircleCheck, CircleAlert, PackageCheck, Minus, Plus, ShieldCheck,
    ReceiptIndianRupee, Check, Star, ShoppingCart, Zap, FileText, Warehouse, Clock, Store, RotateCcw,
} from 'lucide-react';
import { MIN_ORDER_UNITS, BULK_DISCOUNT_MIN_UNITS, BULK_DISCOUNT_RATE } from '@/lib/pricing';
import { EXT_WARRANTY_MONTHS, EXT_WARRANTY_RATE, warrantyPrice } from '@/lib/warranty';

const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n).replace(/\s/g, '');

const SELLER = [
    [Warehouse, 'Ships from', 'GoRevive, Okhla Ph-I'],
    [Clock, 'Dispatch', '2–3 working days'],
    [Store, 'Sold by', 'GoRevive Pvt. Ltd.'],
    [RotateCcw, 'Returns', '7 days · DOA or grade mismatch'],
    [ReceiptIndianRupee, 'Invoice', 'GST invoice, ITC ready'],
];

/**
 * Amazon-style buy box: price, delivery check, quantity, bulk tiers,
 * warranty add-on, order-minimum meter and CTAs.
 * Wraps into two columns when it is given a full-width row.
 */
export default function BuyBox({
    isAuthenticated, loginHref, price, qty, setQty, left, cartUnits = 0,
    warrantyOffered, withWarranty, onToggleWarranty,
    devicesTotal, warrantyTotal, isAdding, onAdd, onBuy,
}) {
    const [pin, setPin] = useState('');
    const [checked, setChecked] = useState(false);
    const pinOk = /^\d{6}$/.test(pin);
    // TODO: replace with a real serviceability lookup when one exists.
    const pinState = !checked ? 'idle' : pinOk ? 'ok' : 'error';
    const pinMsg = { idle: 'Shipping charges shown at checkout. Dispatch in 2–3 working days.', ok: 'Serviceable · dispatch in 2–3 working days.', error: 'Enter a valid 6-digit pincode.' }[pinState];
    const PinIcon = { idle: Info, ok: CircleCheck, error: CircleAlert }[pinState];
    const pinTone = { idle: 'text-gray-500', ok: 'text-[#1B5E3B]', error: 'text-red-600' }[pinState];
    const pinBorder = { idle: 'border-[#DDE3DF]', ok: 'border-[#4CAF7D]', error: 'border-[#E4A49B]' }[pinState];

    const orderUnits = cartUnits + qty;
    const bulk = orderUnits >= BULK_DISCOUNT_MIN_UNITS;
    const unitPrice = bulk ? price * (1 - BULK_DISCOUNT_RATE) : price;
    const meterPct = Math.min(100, (orderUnits / BULK_DISCOUNT_MIN_UNITS) * 100);
    const meterTone = bulk ? 'bg-[#2E8B57]' : orderUnits >= MIN_ORDER_UNITS ? 'bg-[#4CAF7D]' : 'bg-gradient-to-r from-[#F2A93B] to-[#F7C863]';
    const meterMsg = orderUnits < MIN_ORDER_UNITS
        ? `Add ${MIN_ORDER_UNITS - orderUnits} more to reach the ${MIN_ORDER_UNITS}-unit minimum`
        : !bulk ? `${BULK_DISCOUNT_MIN_UNITS - orderUnits} more units unlock ${BULK_DISCOUNT_RATE * 100}% off` : `Bulk ${BULK_DISCOUNT_RATE * 100}% discount unlocked`;
    const perUnitWarranty = warrantyPrice(price);
    const w = withWarranty;

    return (
        <aside aria-label="Buy" className="flex flex-wrap items-start gap-x-7 gap-y-3.5 rounded-[18px] border-2 border-[#8AE63A] bg-white p-[18px] shadow-[0_20px_50px_-18px_rgba(46,139,87,0.45)]">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
                {isAuthenticated ? (
                    <div>
                        <p className="text-[26px] font-extrabold leading-tight text-[#0B2136]">{inr(unitPrice)}<span className="text-[13px] font-medium text-gray-500"> / unit + GST</span></p>
                        <p className="text-[13px] text-gray-500">{bulk ? `Bulk ${BULK_DISCOUNT_RATE * 100}% off applied (${BULK_DISCOUNT_MIN_UNITS}+ units in order)` : `Bulk ${BULK_DISCOUNT_RATE * 100}% off once your order reaches ${BULK_DISCOUNT_MIN_UNITS} units`}</p>
                    </div>
                ) : (
                    <p className="text-xl font-extrabold text-[#0B2136]">Login to see B2B price</p>
                )}

                {/* Delivery */}
                <div className="flex flex-col gap-2 rounded-[14px] border border-[#EEF0EC] bg-[#F7F8F6] p-3">
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor="pincode" className="flex items-center gap-1.5 text-[13px] font-bold text-[#0B2136]"><Truck className="h-4 w-4 text-[#1B5E3B]" />Delivery</label>
                        <span className="rounded-full bg-[#E3F6EA] px-2 py-0.5 text-[11px] font-bold text-[#1B5E3B]">Pan-India</span>
                    </div>
                    <div className={`flex h-[42px] items-center gap-2 rounded-full border-[1.5px] bg-white pl-3 pr-1 transition-colors ${pinBorder}`}>
                        <MapPin className="h-4 w-4 flex-shrink-0 text-[#8AA898]" />
                        <input
                            id="pincode"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setChecked(false); }}
                            onKeyDown={(e) => e.key === 'Enter' && setChecked(true)}
                            placeholder="Pincode"
                            className="min-w-0 flex-1 bg-transparent text-sm font-semibold tracking-[0.06em] text-[#0B2136] outline-none"
                        />
                        <button type="button" onClick={() => setChecked(true)} className="h-[34px] rounded-full bg-[#1B5E3B] px-4 text-[13px] font-bold text-white">Check</button>
                    </div>
                    <p className={`flex items-start gap-1.5 text-xs leading-snug ${pinTone}`}><PinIcon className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.25} /><span>{pinMsg}</span></p>
                </div>

                <p className={`flex items-center gap-1.5 text-[15px] font-bold ${left > 0 ? 'text-[#1B5E3B]' : 'text-red-600'}`}>
                    <PackageCheck className="h-[18px] w-[18px]" />
                    <span>{left > 0 ? `In stock · ${left} units ready to dispatch` : 'Out of stock in this configuration'}</span>
                </p>

                <div className="flex items-center gap-2.5">
                    <span className="text-[13px] font-semibold">Qty</span>
                    <div className="flex h-[38px] items-center overflow-hidden rounded-[8px] border border-[#C9D6CF]">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-full w-9 items-center justify-center bg-[#F7FAF8]"><Minus className="h-4 w-4" /></button>
                        <span className="w-[42px] text-center font-bold">{qty}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setQty(Math.min(Math.max(1, left), qty + 1))} className="flex h-full w-9 items-center justify-center bg-[#F7FAF8]"><Plus className="h-4 w-4" /></button>
                    </div>
                    <span className="text-xs text-gray-500">of {left}</span>
                </div>

                {isAuthenticated && (
                    <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-gray-200 text-center text-xs">
                        <div className={`flex flex-col gap-0.5 px-1 py-2 ${!bulk ? 'bg-[#F0FAF5]' : 'bg-white'}`}>
                            <span className="text-gray-500">{MIN_ORDER_UNITS}–{BULK_DISCOUNT_MIN_UNITS - 1} units in order</span><b className="text-[13px]">{inr(price)}</b>
                        </div>
                        <div className={`flex flex-col gap-0.5 px-1 py-2 ${bulk ? 'bg-[#F0FAF5]' : 'bg-white'}`}>
                            <span className="text-gray-500">{BULK_DISCOUNT_MIN_UNITS}+ units in order</span><b className="text-[13px]">{inr(price * (1 - BULK_DISCOUNT_RATE))}</b>
                        </div>
                    </div>
                )}

                {/* Extended warranty */}
                {warrantyOffered && (
                    <div className="relative flex flex-col gap-2.5 rounded-[16px] bg-gradient-to-br from-[#0A1F14] via-[#14402A] to-[#1B5E3B] px-3.5 pb-3.5 pt-4 text-white shadow-[0_14px_30px_-14px_rgba(10,31,20,0.6)]">
                        <span className="absolute -top-2.5 left-3.5 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFC861] to-[#FFA92E] px-2.5 py-[3px] text-[10px] font-extrabold tracking-[0.06em] text-[#3A2400] shadow-[0_4px_10px_rgba(255,169,46,0.4)]">
                            <Star className="h-2.5 w-2.5" strokeWidth={3} />RECOMMENDED
                        </span>
                        <div className="flex items-center gap-3">
                            <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FFD27A] to-[#E9A93A] shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]">
                                <ShieldCheck className="h-[22px] w-[22px] text-[#3A2400]" strokeWidth={2.25} />
                            </span>
                            <div className="min-w-0 flex-1 leading-snug">
                                <p className="text-[15px] font-extrabold">Protect with {EXT_WARRANTY_MONTHS}-month warranty</p>
                                <p className="text-[13px] font-semibold text-[#8AE63A]">
                                    {isAuthenticated ? `Only ${inr(perUnitWarranty)} per unit · ${EXT_WARRANTY_RATE * 100}% of price` : 'Available on every laptop'}
                                </p>
                            </div>
                        </div>
                        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#D6F0E2]">
                            {['Hardware faults', 'Free pickup', 'On GST invoice'].map((label) => (
                                <li key={label} className="flex items-center gap-1 whitespace-nowrap"><Check className="h-[13px] w-[13px] text-[#8AE63A]" strokeWidth={3} />{label}</li>
                            ))}
                        </ul>
                        {isAuthenticated ? (
                            <button
                                type="button"
                                aria-pressed={w}
                                onClick={onToggleWarranty}
                                className={`flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-extrabold ${w ? 'bg-[#8AE63A] text-[#0A1F14]' : 'bg-gradient-to-r from-[#FFC861] to-[#FFA92E] text-[#3A2400]'}`}
                            >
                                {w ? <Check className="h-4 w-4" strokeWidth={2.75} /> : <Plus className="h-4 w-4" strokeWidth={2.75} />}
                                {w ? 'Warranty added · tap to remove' : 'Add warranty'}
                            </button>
                        ) : (
                            <Link href={loginHref} className="flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[#FFC861] to-[#FFA92E] text-sm font-extrabold text-[#3A2400]">Login to add warranty</Link>
                        )}
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
                {isAuthenticated && (
                    <p className="flex justify-between border-t border-dashed border-[#D6E2DB] pt-3 text-sm">
                        <span>Total ({qty} {qty === 1 ? 'unit' : 'units'})</span>
                        <b>{inr(devicesTotal + warrantyTotal)} <span className="font-medium text-gray-500">+ GST</span></b>
                    </p>
                )}

                <div className="flex flex-col gap-1.5 rounded-[12px] bg-gradient-to-br from-[#F1FBE6] to-[#E3F6EA] px-3 py-2.5">
                    <p className="flex justify-between text-xs font-semibold"><span>{meterMsg}</span><span className="text-gray-500">{orderUnits}/{BULK_DISCOUNT_MIN_UNITS}</span></p>
                    <div className="relative h-1.5 rounded-full bg-[#E3EBE6]">
                        <div className={`absolute inset-y-0 left-0 rounded-full ${meterTone}`} style={{ width: `${meterPct}%` }} />
                        <div className="absolute -top-[3px] h-3 w-0.5 bg-[#0A1F14]" style={{ left: `${(MIN_ORDER_UNITS / BULK_DISCOUNT_MIN_UNITS) * 100}%` }} />
                    </div>
                    <p className="flex justify-between text-[11px] text-gray-500"><span>In cart: {cartUnits}</span><span>{MIN_ORDER_UNITS} min order</span><span>{BULK_DISCOUNT_MIN_UNITS} bulk −{BULK_DISCOUNT_RATE * 100}%</span></p>
                </div>

                {isAuthenticated ? (
                    <>
                        <button type="button" onClick={onAdd} disabled={isAdding || left === 0} className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#8AE63A] text-[15px] font-extrabold text-[#0A1F14] shadow-[0_10px_24px_-6px_rgba(111,207,30,0.7)] disabled:opacity-50">
                            <ShoppingCart className="h-[18px] w-[18px]" />Add {qty} to cart
                        </button>
                        <button type="button" onClick={onBuy} disabled={isAdding || left === 0} className="flex h-[46px] items-center justify-center gap-2 rounded-full bg-[#0A1F14] text-[15px] font-bold text-white disabled:opacity-50">
                            <Zap className="h-[18px] w-[18px] text-[#8AE63A]" />Buy now
                        </button>
                    </>
                ) : (
                    <Link href={loginHref} className="flex h-[46px] items-center justify-center rounded-full bg-[#0A1F14] text-[15px] font-bold text-white">Login to buy</Link>
                )}

                <dl className="overflow-hidden rounded-[12px] border border-[#EEF0EC] bg-[#FBFBFA]">
                    {SELLER.map(([Icon, k, v], i) => (
                        <div key={k} className={`flex items-center gap-2.5 px-3 py-[9px] text-xs ${i ? 'border-t border-[#EEF0EC]' : ''}`}>
                            <Icon aria-hidden="true" className="h-[15px] w-[15px] flex-shrink-0 text-[#1B5E3B]" />
                            <dt className="w-[74px] flex-shrink-0 text-gray-500">{k}</dt>
                            <dd className="min-w-0 flex-1 text-right font-bold text-[#0B2136]">{v}</dd>
                        </div>
                    ))}
                </dl>
                <Link href="/support" className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#1B5E3B] hover:underline">
                    <FileText className="h-4 w-4" />Need 25+ units? Request a quote
                </Link>
            </div>
        </aside>
    );
}
