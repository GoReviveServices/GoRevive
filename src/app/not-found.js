import Link from 'next/link';

export const metadata = {
    title: 'Page not found',
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <div className="min-h-[70vh] bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-20 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-[#1B5E3B] mb-3">404</p>
            <h1 className="text-3xl font-extrabold text-[#0B2136] mb-3">We couldn&apos;t find that page</h1>
            <p className="text-gray-500 max-w-md mb-8">The product may have sold out or the link may be out of date.</p>
            <nav aria-label="Helpful links" className="flex flex-wrap justify-center gap-3">
                <Link href="/products" className="px-6 py-3 bg-[#0B2136] text-white font-bold rounded-xl hover:bg-[#1B5E3B] transition-colors">Browse pre-owned products</Link>
                <Link href="/grading" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">How we grade devices</Link>
                <Link href="/support" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Contact support</Link>
            </nav>
        </div>
    );
}
