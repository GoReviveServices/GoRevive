"use client";

import Image from 'next/image';
import { useState } from 'react';

const FALLBACK = '/images/placeholder-device.svg';

/**
 * next/image with a placeholder when the remote image is missing or broken.
 * next/image serves WebP/AVIF at the right size, lazy-loads below the fold,
 * and reserves space so the layout doesn't jump (better LCP and CLS).
 * Pass `priority` only for the main above-the-fold image.
 */
export default function SmartImage({ src, alt, ...props }) {
    const [failedSrc, setFailedSrc] = useState(null);
    const usable = src && failedSrc !== src ? src : FALLBACK;
    return <Image src={usable} alt={alt || ''} onError={() => setFailedSrc(src)} {...props} />;
}
