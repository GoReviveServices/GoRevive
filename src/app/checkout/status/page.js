"use client";

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useCart } from '@/components/utils/Context/CartContext';

// Browser-side trace for development only; nothing is logged on the live site.
const debugLog = (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log('[checkout-debug]', ...args);
};

function StatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { clearCart } = useCart();

    const orderId = searchParams.get('order_id');
    const paidByWallet = searchParams.get('method') === 'wallet';

    // 'loading' | 'success' | 'failed'
    const [status, setStatus] = useState(paidByWallet ? 'success' : orderId ? 'loading' : 'failed');
    const [errorMessage, setErrorMessage] = useState(orderId || paidByWallet ? '' : 'Invalid return URL. Missing order ID.');
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        // Wallet orders were completed by the server before redirecting here.
        if (paidByWallet) {
            clearCart();
            return;
        }

        if (!orderId) return;

        // The server checks the payment with the bank, matches the amount to the
        // order it created, and creates the invoice exactly once.
        debugLog('status page: asking server to verify', { orderId });
        api.post('/payment/verify', { orderId })
            .then(({ data }) => {
                debugLog('/api/payment/verify reply', data);
                if (data?.success && data?.isPaid) {
                    clearCart();
                    setStatus('success');
                } else {
                    setStatus('failed');
                    setErrorMessage(data?.message || "Payment verification failed or was declined by the bank.");
                }
            })
            .catch((error) => {
                debugLog('/api/payment/verify failed', { status: error.response?.status, data: error.response?.data, message: error.message });
                setStatus('failed');
                setErrorMessage(error.response?.data?.message || "Network error during verification.");
            });
    }, [orderId, paidByWallet, clearCart]);

    // RENDER HELPERS
    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 border-4 border-[#1B5E3B]/20 border-t-[#1B5E3B] rounded-full animate-spin mb-6"></div>
                <h1 className="text-2xl font-bold text-[#0B2136] mb-2">Verifying Payment...</h1>
                <p className="text-gray-500">Please don’t close or refresh this page.</p>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h1 className="text-3xl font-bold text-[#0B2136] mb-4">Payment Failed</h1>
                <p className="text-gray-500 max-w-md mb-8">{errorMessage}</p>
                <div className="flex gap-4">
                    <button onClick={() => router.push('/checkout')} className="bg-[#0B2136] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#1B5E3B] transition-colors shadow-md">
                        Try Again
                    </button>
                    <Link href="/dashboard" className="bg-white border border-gray-200 text-gray-700 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-4xl font-black text-[#0B2136] mb-2">Payment Successful!</h1>
            <p className="text-gray-500 text-lg mb-2">Thank you for your business.</p>
            <p className="text-sm font-mono bg-gray-100 px-4 py-2 rounded-lg text-gray-600 mb-10">
                Order ID: <strong>{orderId}</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Link href="/order" className="flex-1 bg-[#1B5E3B] text-white font-bold px-6 py-4 rounded-xl hover:bg-[#14472d] transition-colors shadow-md text-center">
                    View Order Details
                </Link>
                <Link href="/products" className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold px-6 py-4 rounded-xl hover:bg-gray-50 transition-colors text-center">
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
}

export default function CheckoutStatusPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] py-20 flex items-center justify-center">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8 w-full max-w-2xl mx-4">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="w-12 h-12 border-4 border-[#1B5E3B]/20 border-t-[#1B5E3B] rounded-full animate-spin"></div>
                    </div>
                }>
                    <StatusContent />
                </Suspense>
            </div>
        </div>
    );
}