export interface Counts { today_hits: number; total_hits: number }
export const SESSION_SECONDS = 30 * 60;
const key = 'bazi_visit_v2';
interface SessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
// First-party, host-only cookie. No birth details or visitor identifier are stored.
export function cookieStore(cookies: Pick<Document, 'cookie'>): SessionStore {
  return {
    getItem(name) {
      const entry = cookies.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
      return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
    },
    setItem(name, value) {
      cookies.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${SESSION_SECONDS}; Path=/BaZi/; SameSite=Lax; Secure`;
    },
  };
}
export async function sessionCounts(storage: SessionStore, request: () => Promise<Counts>): Promise<Counts | null> {
  const saved = storage.getItem(key);
  if (saved) {
    // Sliding expiry: every page visit extends the session by 30 minutes.
    storage.setItem(key, saved);
    if (saved === 'pending') return null;
    const counts = JSON.parse(saved) as Counts;
    return valid(counts) ? counts : null;
  }
  // Reserve before sending, including when the server response may be lost.
  storage.setItem(key, 'pending');
  if (storage.getItem(key) !== 'pending') return null; // Cookies disabled.
  const counts = await request();
  if (!valid(counts)) return null;
  storage.setItem(key, JSON.stringify(counts));
  return counts;
}
function valid(counts: Counts): boolean {
  return !!counts && [counts.today_hits, counts.total_hits].every(value => Number.isSafeInteger(value) && value >= 0);
}
