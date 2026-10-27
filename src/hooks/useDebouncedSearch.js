"use client";

import { useEffect, useState } from 'react';

/**
 * Keeps a text input responsive while only committing (e.g. updating the URL
 * and re-filtering) after the user pauses typing for `delay` ms.
 *
 * @param {string} value     The committed value (usually from the URL).
 * @param {(term: string) => void} onCommit  Called with the debounced term.
 * @param {number} delay
 * @returns {[string, (t: string) => void]}
 */
export function useDebouncedSearch(value, onCommit, delay = 300) {
    const [term, setTerm] = useState(value);
    const [seenValue, setSeenValue] = useState(value);
    const [sent, setSent] = useState(value);

    // If the committed value changes from outside (back button, "clear"),
    // show it — unless it is just our own debounced update coming back.
    if (value !== seenValue) {
        setSeenValue(value);
        if (value !== sent) setTerm(value);
    }

    useEffect(() => {
        if (term === value) return undefined;
        const timer = setTimeout(() => {
            setSent(term);
            onCommit(term);
        }, delay);
        return () => clearTimeout(timer);
        // onCommit is intentionally left out so a new function identity on
        // each render doesn't restart the timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, value, delay]);

    return [term, setTerm];
}
