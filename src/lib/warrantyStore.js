"use client";

import { useSyncExternalStore } from 'react';

// Remembers which cart units have the extended warranty, per account, in this
// browser. The server re-checks every id against the real cart and computes
// the price itself, so this only stores the buyer's choice.
const EMPTY = Object.freeze([]);
const MAX_IDS = 500;
const listeners = new Set();
const cache = new Map(); // key -> { raw, ids }

const keyFor = (userCode) => `gorevive_warranty_${userCode}`;

function read(userCode) {
    if (!userCode || typeof window === 'undefined') return EMPTY;
    const key = keyFor(userCode);
    let raw = null;
    try {
        raw = window.localStorage.getItem(key);
    } catch {
        /* storage blocked */
    }
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.ids;
    let ids = EMPTY;
    try {
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed)) ids = Object.freeze(parsed.map(String));
    } catch {
        /* corrupt value: start empty */
    }
    cache.set(key, { raw, ids });
    return ids;
}

export function setWarranty(userCode, ids, enabled) {
    if (!userCode) return;
    const current = new Set(read(userCode));
    ids.map(String).forEach((id) => (enabled ? current.add(id) : current.delete(id)));
    try {
        window.localStorage.setItem(keyFor(userCode), JSON.stringify([...current].slice(-MAX_IDS)));
    } catch {
        /* storage blocked: choice lasts until reload */
    }
    listeners.forEach((l) => l());
}

function subscribe(listener) {
    listeners.add(listener);
    const onStorage = () => listener();
    window.addEventListener('storage', onStorage); // other tabs
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

/** Warranty unit ids saved for this account (stable array between changes). */
export function useWarrantyIds(userCode) {
    return useSyncExternalStore(subscribe, () => read(userCode), () => EMPTY);
}
