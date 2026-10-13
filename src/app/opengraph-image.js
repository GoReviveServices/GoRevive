import { ImageResponse } from 'next/og';

// Default share image (og:image / twitter:image) for every page that doesn't
// set its own. Product pages use the product photo instead.
export const alt = 'GoRevive – Certified refurbished IT hardware and secure IT asset disposal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '72px 80px',
                    background: 'linear-gradient(135deg, #0B2136 0%, #0F2D1C 60%, #1B5E3B 100%)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 40, fontWeight: 800 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: '#8AE63A', display: 'flex' }} />
                    GoRevive
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>
                        Certified Refurbished IT Hardware, in Bulk
                    </div>
                    <div style={{ fontSize: 30, color: '#D6F0E2' }}>
                        Laptops · Desktops · MacBooks · Monitors · Secure IT Asset Disposal
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 28, fontSize: 24, color: '#BBDEFB' }}>
                    <span>CPCB Authorised</span>
                    <span>ISO 9001:2015</span>
                    <span>NIST 800-88 Data Erasure</span>
                </div>
            </div>
        ),
        size
    );
}
