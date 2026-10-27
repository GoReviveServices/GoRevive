import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
    title: 'Pre-Owned Device Grading – Grade A, B, C & D Explained',
    description: 'How GoRevive grades pre-owned laptops, MacBooks, phones, desktops and monitors. See exactly what Grade A, B, C and D mean for cosmetic and functional condition.',
    path: '/grading',
});

export default function GradingLayout({ children }) {
    return children;
}
