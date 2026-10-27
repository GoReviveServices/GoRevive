"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/utils/Context/AuthContext';
import api from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { STANDARD_WARRANTY_DAYS } from '@/lib/warranty';

const num = (v) => Number(v) || 0;
const formatCurrency = (amount, decimals = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num(amount));
const formatPaise = (amount) => formatCurrency(amount, Number.isInteger(num(amount)) ? 0 : 2);

// "2026-10-26 15:24:35" parsed by hand: Safari cannot read that format.
const orderTime = (item) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(item.date_time || ''));
    return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0;
};

// Warranty on one line, from the warranty_days PHP stores per item.
const warrantyInfo = (days) => {
    const d = num(days);
    if (d <= 0) return null;
    const length = d % 30 === 0 && d >= 30 ? `${d / 30} month${d === 30 ? '' : 's'}` : `${d} day${d === 1 ? '' : 's'}`;
    const extended = d > STANDARD_WARRANTY_DAYS;
    return { length, extended };
};

// GST on one line: IGST for out-of-state, CGST + SGST within the state.
const taxLines = (item) => {
    const out = [];
    if (num(item.igst_amount) > 0) out.push(`IGST ${num(item.igst_per)}% ${formatCurrency(item.igst_amount, 2)}`);
    if (num(item.cgst_amount) > 0) out.push(`CGST ${num(item.cgst_per)}% ${formatCurrency(item.cgst_amount, 2)}`);
    if (num(item.sgst_amount) > 0) out.push(`SGST ${num(item.sgst_per)}% ${formatCurrency(item.sgst_amount, 2)}`);
    return out;
};

// "Extended warranty (1 unit, 8%)"
const warrantyLabel = (units, per) => {
    const parts = [];
    if (units) parts.push(`${units} unit${units === 1 ? '' : 's'}`);
    if (per) parts.push(`${per}%`);
    return `Extended warranty${parts.length ? ` (${parts.join(', ')})` : ''}`;
};

const PAYMENT_LABEL ={ CASHFREE: 'Online (Cashfree)', HDFC: 'Online (HDFC)', WALLET: 'Wallet' };

function groupOrders(rows) {
    const byId = rows.reduce((acc, item) => {
        if (!acc[item.order_id]) {
            // Order-level fields repeat on every row; take them from the first one.
            acc[item.order_id] = {
                order_id: item.order_id,
                date: item.entry_date,
                time: item.entry_time,
                sortKey: orderTime(item),
                status: item.status,
                payment_status: item.payment_status,
                payment_mode: item.payment_mode,
                payment_reference: item.payment_reference,
                items_total: num(item.total_invoice_amt),
                warranty_amount: num(item.extra_amt),
                warranty_per: num(item.extra_per),
                wallet_amount: num(item.wallet_amount),
                online_amount: num(item.cashfree_amount),
                invoice_no: item.invoice_no,
                delivery_time: item.delivery_time,
                courier: item.courier,
                docket_no: item.docket_no,
                items: [],
            };
        }
        acc[item.order_id].items.push(item);
        return acc;
    }, {});
    return Object.values(byId)
        .map((o) => ({ ...o, order_total: o.items_total + o.warranty_amount, paid: o.wallet_amount + o.online_amount }))
        .sort((a, b) => b.sortKey - a.sortKey);
}

// Status Badge Styling Helper
const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'success' || s === 'dispatched' || s === 'delivered') return "bg-emerald-100 text-emerald-700";
    if (s === 'cancelled' || s === 'failed') return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700"; // Pending / Processing
};

const Label = ({ children }) => <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</p>;

function SummaryRow({ label, value, strong, muted }) {
    return (
        <div className={`flex justify-between gap-4 ${strong ? 'font-bold text-[#0B2136]' : muted ? 'text-gray-500' : 'text-gray-700'}`}>
            <span>{label}</span>
            <span className="tabular-nums text-right">{value}</span>
        </div>
    );
}

export default function OrdersPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Guard: Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, authLoading, router]);

    // Fetch Orders
    useEffect(() => {
        if (isAuthenticated && user?.crm_party_code) {
            const fetchOrders = async () => {
                try {
                    const response = await api.get('/user/orders');
                    if (response.data?.success && Array.isArray(response.data.orders)) {
                        setOrders(groupOrders(response.data.orders));
                    }
                } catch (error) {
                    if (error.response?.status !== 404) {
                        toast.error("Failed to load order history.");
                    }
                } finally {
                    setIsLoading(false);
                }
            };
            fetchOrders();
        }
    }, [isAuthenticated, user]);

    if (authLoading || isLoading) {
        return <div className="min-h-screen bg-[#F8FAFC] flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#1B5E3B]/20 border-t-[#1B5E3B] rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 py-12">
            <div className="container mx-auto px-4 max-w-[1000px]">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#0B2136]">Order History</h1>
                        <p className="text-gray-500 font-medium mt-1">Track your recent B2B purchases, warranties and payments.</p>
                    </div>
                    <Link href="/dashboard" className="text-sm font-bold text-[#1B5E3B] bg-white border border-gray-200 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Orders List */}
                {orders.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-[#0B2136] mb-2">No orders found</h2>
                        <p className="text-gray-500 mb-6">You haven’t placed any B2B orders yet.</p>
                        <Link href="/products" className="bg-[#0B2136] text-white font-bold px-6 py-3 rounded-lg hover:bg-[#12304d] transition-colors">
                            Browse Inventory
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            const units = order.items.reduce((acc, i) => acc + (num(i.Qty) || 1), 0);
                            const warrantyUnits = order.items.filter((i) => warrantyInfo(i.warranty_days)?.extended).length;
                            return (
                                <div key={order.order_id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                                    {/* Order Header */}
                                    <div className="bg-gray-50 border-b border-gray-200 p-5 grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-4">
                                        <div>
                                            <Label>Order Placed</Label>
                                            <p className="text-sm font-semibold text-gray-900 mt-1">{order.date}</p>
                                            {order.time && <p className="text-xs text-gray-500">{order.time.slice(0, 5)}</p>}
                                        </div>
                                        <div>
                                            <Label>Order Total</Label>
                                            <p className="text-sm font-semibold text-gray-900 mt-1">{formatPaise(order.order_total)}</p>
                                            <p className="text-xs text-gray-500">{units} unit{units === 1 ? '' : 's'}</p>
                                        </div>
                                        <div>
                                            <Label>Invoice No.</Label>
                                            <p className="text-sm font-mono font-semibold text-gray-900 mt-1 break-all">{order.invoice_no || '—'}</p>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <Label>Order ID</Label>
                                            <p className="text-sm font-mono font-semibold text-gray-900 mt-1 break-all">{order.order_id}</p>
                                        </div>
                                        <div>
                                            <Label>Status</Label>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <span className={`inline-block text-xs font-black px-2.5 py-0.5 rounded tracking-wide uppercase ${getStatusBadge(order.status)}`}>
                                                    {order.status}
                                                </span>
                                                <span className={`inline-block text-xs font-black px-2.5 py-0.5 rounded tracking-wide uppercase ${getStatusBadge(order.payment_status)}`}>
                                                    Payment {order.payment_status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="p-5 divide-y divide-gray-100">
                                        {order.items.map((item, index) => {
                                            const warranty = warrantyInfo(item.warranty_days);
                                            const taxes = taxLines(item);
                                            return (
                                                <div key={`${item.imei1}-${index}`} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-base font-bold text-[#0B2136] line-clamp-2">{item.model_name}</h3>
                                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                            {item.imei1 && <p><span className="font-semibold">Serial/IMEI:</span> <span className="font-mono">{item.imei1}</span></p>}
                                                            {item.stock_type && <p><span className="font-semibold">Grade:</span> {item.stock_type}</p>}
                                                            <p><span className="font-semibold">Qty:</span> {item.Qty}</p>
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            {warranty && (
                                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${warranty.extended ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600'}`}>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                                    {warranty.length} warranty{warranty.extended ? ' · Extended' : ' · Standard'}
                                                                </span>
                                                            )}
                                                            {item.status && item.status !== order.status && (
                                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                                                                    {item.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="sm:text-right shrink-0">
                                                        <p className="font-bold text-[#0B2136]">{formatPaise(item.item_total)}</p>
                                                        {num(item.taxable_value) > 0 && (
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Taxable {formatCurrency(item.taxable_value, 2)}{taxes.length ? ` + ${taxes.join(' + ')}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Payment & delivery */}
                                    <div className="border-t border-gray-200 p-5 grid md:grid-cols-2 gap-6 text-sm">
                                        <div className="space-y-2">
                                            <Label>Delivery</Label>
                                            {order.delivery_time && <p className="text-gray-700"><span className="font-semibold">Estimated:</span> {order.delivery_time}</p>}
                                            {order.courier || order.docket_no ? (
                                                <p className="text-gray-700">
                                                    <span className="font-semibold">Shipped via:</span> {order.courier || '—'}
                                                    {order.docket_no && <> · <span className="font-semibold">Docket:</span> <span className="font-mono">{order.docket_no}</span></>}
                                                </p>
                                            ) : (
                                                <p className="text-gray-500">Tracking details will appear here once the order is dispatched.</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Payment Summary</Label>
                                            <SummaryRow label="Items (incl. GST)" value={formatPaise(order.items_total)} />
                                            {order.warranty_amount > 0 && (
                                                <SummaryRow label={warrantyLabel(warrantyUnits, order.warranty_per)} value={formatPaise(order.warranty_amount)} />
                                            )}
                                            <div className="border-t border-gray-100 pt-1.5">
                                                <SummaryRow label="Order total" value={formatPaise(order.order_total)} strong />
                                            </div>
                                            {order.wallet_amount > 0 && <SummaryRow label="Paid from wallet" value={formatPaise(order.wallet_amount)} muted />}
                                            {order.online_amount > 0 && (
                                                <SummaryRow label={`Paid ${PAYMENT_LABEL[String(order.payment_mode).toUpperCase()] || order.payment_mode}`} value={formatPaise(order.online_amount)} muted />
                                            )}
                                            {order.payment_reference && (
                                                <p className="text-xs text-gray-500 pt-1">Payment ref: <span className="font-mono break-all">{order.payment_reference}</span></p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
