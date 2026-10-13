// Private / per-user page: keep it out of search results.
export const metadata = {
    title: 'Business Login',
    robots: { index: false, follow: false },
};

export default function Layout({ children }) {
    return children;
}
