import Hero from "@/components/module/Home/Pages/Hero";
import { pageMetadata } from "@/lib/site";
import { getBanners } from "@/lib/server/banners";

export const metadata = {
  ...pageMetadata({
    title: "Certified Refurbished Laptops & IT Asset Disposal in India",
    description:
      "Buy certified refurbished laptops, desktops, MacBooks and monitors in bulk, and recycle IT assets securely. CPCB-authorised, ISO 9001:2015, NIST 800-88 data erasure. GoRevive, New Delhi.",
    path: "/",
  }),
  // The homepage shows the full title without the "| GoRevive" suffix.
  title: { absolute: "GoRevive – Certified Refurbished Laptops & IT Asset Disposal in India" },
};

export default async function Home() {
  // Banners are fetched on the server so the first slide is in the initial
  // HTML and can start loading immediately (faster Largest Contentful Paint).
  const banners = await getBanners().catch(() => []);
  return <Hero initialBanners={banners} />;
}
