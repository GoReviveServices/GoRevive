"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/utils/Context/AuthContext';
import api from '@/lib/apiClient';
import { computeOrderTotals } from '@/lib/pricing';
import { useWarrantyIds, setWarranty } from '@/lib/warrantyStore';

const CartContext = createContext(undefined);

const idOf = (unitOrId) => String(typeof unitOrId === 'object' ? (unitOrId.serialNumber || unitOrId.id) : unitOrId);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const { user, isAuthenticated, isInitializing } = useAuth();
    const userCode = user?.crm_party_code;

    // Extended-warranty choices, limited to units actually in the cart.
    const savedWarrantyIds = useWarrantyIds(userCode);
    const warrantyIds = useMemo(() => {
        const inCart = new Set(cartItems.map(i => String(i.product.id)));
        return savedWarrantyIds.filter(id => inCart.has(id));
    }, [savedWarrantyIds, cartItems]);

    const toggleWarranty = useCallback((unitId, enabled) => {
        setWarranty(userCode, [idOf(unitId)], enabled ?? !warrantyIds.includes(idOf(unitId)));
    }, [userCode, warrantyIds]);

    // Display totals. The amount actually charged is recalculated on the server
    // with the same function (lib/pricing.js).
    const totals = useMemo(() => computeOrderTotals(cartItems, 0, warrantyIds), [cartItems, warrantyIds]);

    const fetchServerCart = useCallback(async () => {
        if (!userCode) {
            setCartItems([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get('/cart');
            setCartItems(response.data?.success && Array.isArray(response.data.cart) ? response.data.cart : []);
        } catch (error) {
            console.error("Failed to sync cart:", error.message);
            setCartItems([]);
        } finally {
            setLoading(false);
        }
    }, [userCode]);

    // Re-load whenever the signed-in account changes (login, logout, switch).
    useEffect(() => {
        if (isInitializing) return;
        fetchServerCart();
    }, [isInitializing, fetchServerCart]);

    const updateCart = useCallback(async (ids, action) => {
        const { data } = await api.post('/cart', { ids, action });
        await fetchServerCart();
        if (!data?.success) throw new Error(data?.message || 'Cart update failed');
        return data;
    }, [fetchServerCart]);

    const addToCart = useCallback(async (product, { warranty = false } = {}) => {
        if (!isAuthenticated) {
            toast.error("Please log in to add items to your cart.");
            return;
        }
        const id = idOf(product);
        if (cartItems.some(item => String(item.product.id) === id)) {
            toast.error("This specific unit is already in your cart.");
            return;
        }
        // Record the warranty choice first; it only counts once the unit is in the cart.
        setWarranty(userCode, [id], warranty);
        return toast.promise(updateCart([id], 'P'), {
            loading: 'Allocating unit...',
            success: (data) => data?.message || 'Added to order!',
            error: (err) => err.response?.data?.message || err.message || 'Failed to allocate unit.',
        }).catch(() => {}); // error already shown by the toast
    }, [cartItems, isAuthenticated, updateCart, userCode]);

    const addMultipleToCart = useCallback(async (productsArray, { warranty = false } = {}) => {
        if (!isAuthenticated) return toast.error("Please log in.");
        const ids = productsArray.map(idOf);
        setWarranty(userCode, ids, warranty);
        const toastId = toast.loading(`Allocating ${ids.length} units...`);
        try {
            await updateCart(ids, 'P');
            toast.success(`Added ${ids.length} units to order`, { id: toastId });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to allocate some units", { id: toastId });
        }
    }, [isAuthenticated, updateCart, userCode]);

    const removeMultipleFromCart = useCallback(async (productIdsArray) => {
        if (!isAuthenticated) return;
        const ids = productIdsArray.map(idOf);
        const toastId = toast.loading(`Releasing ${ids.length} units...`);
        try {
            await updateCart(ids, 'R');
            toast.success(`Released ${ids.length} units`, { id: toastId });
        } catch (error) {
            toast.error("Failed to release some units", { id: toastId });
        }
    }, [isAuthenticated, updateCart]);

    const removeFromCart = useCallback(async (productId) => {
        if (!isAuthenticated) return;
        return toast.promise(updateCart([idOf(productId)], 'R'), {
            loading: 'Removing item...',
            success: 'Item removed successfully.',
            error: 'Failed to remove item.',
        }).catch(() => {}); // error already shown by the toast
    }, [isAuthenticated, updateCart]);

    const decrementCartQuantity = useCallback(async (product) => {
        const existing = cartItems.find(item => String(item.product.id) === idOf(product));
        if (!existing || existing.quantity <= 1 || !isAuthenticated) return;
        return toast.promise(updateCart([idOf(product)], 'M'), {
            loading: 'Updating quantity...',
            success: 'Quantity updated.',
            error: 'Failed to update quantity.',
        }).catch(() => {}); // error already shown by the toast
    }, [cartItems, isAuthenticated, updateCart]);

    // After an order completes, re-read the cart from the server (PHP clears
    // purchased units). On logout this simply empties local state.
    const clearCart = useCallback(() => {
        setCartItems([]);
        if (userCode) fetchServerCart();
    }, [userCode, fetchServerCart]);

    const value = useMemo(() => ({
        cartItems,
        cartCount: totals.units,
        cartSubtotal: totals.subtotal,
        cartTotals: totals,
        warrantyIds,
        toggleWarranty,
        loading,
        refreshCart: fetchServerCart,
        addToCart,
        removeFromCart,
        decrementCartQuantity,
        addMultipleToCart,
        removeMultipleFromCart,
        clearCart,
    }), [cartItems, totals, warrantyIds, toggleWarranty, loading, fetchServerCart, addToCart, removeFromCart, decrementCartQuantity, addMultipleToCart, removeMultipleFromCart, clearCart]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
