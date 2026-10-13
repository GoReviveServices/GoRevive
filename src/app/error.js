"use client";

import Link from 'next/link';

export default function Error({ reset }) {
    return (
        <div className="min-h-[70vh] bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-20 text-center">
            <h1 className="text-3xl font-extrabold text-[#0B2136] mb-3">Something went wrong</h1>
            <p className="text-gray-500 max-w-md mb-8">We couldn&apos;t load this page right now. Please try again in a moment.</p>
            <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => reset()} className="px-6 py-3 bg-[#0B2136] text-white font-bold rounded-xl hover:bg-[#1B5E3B] transition-colors">Try again</button>
                <Link href="/" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Go to homepage</Link>
            </div>
        </div>
    );
}
