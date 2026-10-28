"use client";

import { useState } from "react";

/**
 * Click-to-load YouTube player. Avoids ~1 MB of YouTube JS, third-party cookies
 * and main-thread work until the visitor actually presses play.
 */
export default function LiteYouTube({ id, title }) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <iframe
        className="w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={`Play video: ${title}`}
      className="group absolute inset-0 w-full h-full cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        width={480}
        height={360}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <span className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg group-hover:bg-red-700 transition-colors">
        <svg className="w-7 h-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </button>
  );
}
