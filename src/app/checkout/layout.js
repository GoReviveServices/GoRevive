// Private / per-user page: keep it out of search results.
export const metadata = {
    title: 'Secure Checkout',
    robots: { index: false, follow: false },
};

export default function Layout({ children }) {
    return children;
}
