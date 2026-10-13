import Image from 'next/image';

// Certifications shown on the homepage, repeated near the buy box.
const ITEMS = [
    { src: '/images/cpcb-authorised-e-waste-recycler-logo.svg', title: 'CPCB Authorised', sub: 'E-waste handling' },
    { src: '/images/iso-9001-2015-certified-it-refurbisher.png', title: 'ISO 9001:2015', sub: 'Quality management' },
    { src: '/images/nist-800-88-certified-data-erasure.jpg', title: 'NIST 800-88', sub: 'Data erasure' },
    { src: '/images/gst-registered-business.webp', title: 'GST Invoice', sub: 'Input tax credit ready' },
];

export default function TrustStrip() {
    return (
        <ul aria-label="Certifications" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
            {ITEMS.map((i) => (
                <li key={i.title} className="flex min-w-0 items-center gap-2.5 rounded-[12px] border border-gray-100 bg-white p-2.5">
                    <Image src={i.src} alt={`${i.title} – ${i.sub}`} width={36} height={36} unoptimized={i.src.endsWith(".svg")} className="h-9 w-9 object-contain" />
                    <span className="min-w-0">
                        <span className="block text-xs font-bold text-[#0B2136]">{i.title}</span>
                        <span className="block text-[11px] text-gray-500">{i.sub}</span>
                    </span>
                </li>
            ))}
        </ul>
    );
}
