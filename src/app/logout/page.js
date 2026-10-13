"use client";

import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/components/utils/Context/AuthContext';
import { useCart } from '@/components/utils/Context/CartContext';

export default function LogoutPage() {
    
    const { logout } = useAuth(); 
    const { clearCart } = useCart(); 

    // Keep the latest functions in a ref so the effect below runs exactly once,
    // even when the auth/cart context re-renders while it waits.
    const actions = useRef({ logout, clearCart });
    useEffect(() => {
        actions.current = { logout, clearCart };
    }, [logout, clearCart]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                actions.current.clearCart?.();
                await actions.current.logout?.();
            } catch (error) {
                console.error("Logout failed:", error);
            }
            // Full page load so nothing cached while signed in stays visible.
            window.location.replace('/login');
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center pb-20">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-sm w-full mx-4">
                
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                    <svg className="w-8 h-8 text-[#0B2136]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-xl font-bold text-[#0B2136] mb-2">Securely logging out</h1>
                <p className="text-sm text-gray-500 mb-8">Clearing your session data and B2B pricing...</p>
                
                <div className="w-8 h-8 border-4 border-[#1B5E3B]/20 border-t-[#1B5E3B] rounded-full animate-spin"></div>
            </div>
        </div>
    );
}