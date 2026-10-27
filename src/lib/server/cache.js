import 'server-only';

// Small in-process TTL cache with in-flight de-duplication.
// - Repeated calls within `ttlMs` return the cached value (no PHP round trip).
// - Concurrent calls while a fetch is running share the same promise.
// - On upstream failure, the last good value is served (stale-if-error).
// Each server instance keeps its own copy; behind a load balancer that is fine
// for short TTLs. For a shared cache across instances, swap this for Redis.
const store = new Map();

export async function cached(key, ttlMs, loader) {
    const now = Date.now();
    const entry = store.get(key);

    if (entry?.value !== undefined && entry.expires > now) return entry.value;
    if (entry?.pending) return entry.pending;

    const pending = loader()
        .then((value) => {
            store.set(key, { value, expires: Date.now() + ttlMs });
            return value;
        })
        .catch((err) => {
            if (entry?.value !== undefined) {
                store.set(key, { value: entry.value, expires: Date.now() + Math.min(ttlMs, 30000) });
                return entry.value;
            }
            store.delete(key);
            throw err;
        });

    store.set(key, { ...entry, pending });
    return pending;
}

export function invalidate(key) {
    store.delete(key);
}
