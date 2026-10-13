import { Plus_Jakarta_Sans, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/utils/Navigation/Header";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from '@/components/utils/Context/AuthContext';
import { DashboardProvider } from "@/components/utils/Context/DashboardContext";
import { Footer } from "@/components/utils/Footer/Footer";
import { CartProvider } from "@/components/utils/Context/CartContext";
import JsonLd from "@/components/utils/SEO/JsonLd";
import { SITE_URL, SITE_NAME, CONTACT, SOCIAL_LINKS, imageUrl } from "@/lib/site";

// Static pages (policies, about, grading) are rebuilt at most hourly so the
// footer's category links stay current.
export const revalidate = 3600;

// next/font self-hosts the fonts (no request to Google at runtime) and uses
// font-display: swap so text is visible immediately.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-accent",
  display: "swap",
  preload: false, // decorative accent only; don't compete with the main fonts
});

const DEFAULT_DESCRIPTION =
  "Buy certified pre-owned laptops, desktops, MacBooks and monitors in bulk, and recycle IT assets securely. CPCB-authorised, ISO 9001:2015 and NIST 800-88 data erasure. GoRevive, New Delhi.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GoRevive – Certified Pre-Owned Laptops & IT Asset Disposal in India",
    template: "%s | GoRevive",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "pre-owned laptops", "pre-owned laptops in bulk", "pre-owned desktops", "pre-owned MacBook",
    "IT asset disposition", "ITAD India", "e-waste recycling Delhi", "corporate laptop buyback", "B2B pre-owned IT hardware",
  ],
  // No canonical here: it would be inherited by every page. Each page sets its own.
  icons: { icon: "/favicon.ico", apple: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: "GoRevive – Certified Pre-Owned IT Hardware & IT Asset Disposal",
    description: DEFAULT_DESCRIPTION,
    // The image itself comes from app/opengraph-image.js.
  },
  twitter: {
    card: "summary_large_image",
    title: "GoRevive – Certified Pre-Owned IT Hardware & IT Asset Disposal",
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Set GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION to the codes from
  // Search Console / Bing Webmaster Tools to verify ownership with a meta tag.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B2136",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "GoRevive Private Limited",
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: imageUrl("images/brand_logo.png"),
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Second Floor, D-161, Okhla Phase I, Okhla Industrial Estate",
    addressLocality: "New Delhi",
    addressRegion: "Delhi",
    postalCode: "110020",
    addressCountry: "IN",
  },
  contactPoint: [{ "@type": "ContactPoint", telephone: CONTACT.phone, email: CONTACT.email, contactType: "customer support", areaServed: "IN", availableLanguage: ["en", "hi"] }],
  sameAs: SOCIAL_LINKS,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/products?search={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className="scroll-smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${jakarta.variable} ${dmSans.variable} ${playfair.variable} font-body text-primary overflow-x-hidden antialiased`}>
        <JsonLd data={[organizationSchema, websiteSchema]} />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow">
          Skip to content
        </a>
        <DashboardProvider>
          <AuthProvider>
            <CartProvider>
              <Header />
              <main id="main-content">{children}</main>
              <Footer />
              <Toaster position="top-left" />
            </CartProvider>
          </AuthProvider>
        </DashboardProvider>
      </body>
    </html>
  );
}
