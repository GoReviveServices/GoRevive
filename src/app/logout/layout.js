// Private / per-user page: keep it out of search results.
export const metadata = {
    title: 'Logging Out',
    robots: { index: false, follow: false },
};

export default function Layout({ children }) {
    return children;
}
