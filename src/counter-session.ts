export interface Counts { today_hits: number; total_hits: number }
const key = 'bazi:visit-count:v1';
export async function sessionCounts(storage: Storage, request: () => Promise<Counts>): Promise<Counts | null> {
  const saved = storage.getItem(key);
  if (saved === 'pending') return null;
  if (saved) return JSON.parse(saved) as Counts;
  // Reserve before sending: even a reload or ambiguous network failure must not
  // send another increment in this tab. Storage failure also skips counting.
  storage.setItem(key, 'pending');
  const counts = await request();
  if (![counts.today_hits, counts.total_hits].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  storage.setItem(key, JSON.stringify(counts));
  return counts;
}
