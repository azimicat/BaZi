import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionCounts } from '../src/counter-session';
function storage(): Storage {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); }, clear: () => data.clear(), key: index => [...data.keys()][index] ?? null, get length() { return data.size; } };
}
test('reloads reuse counts; a new tab counts again', async () => {
  let hits = 0;
  const request = async () => ({ today_hits: ++hits, total_hits: hits });
  const tab = storage();
  assert.deepEqual(await sessionCounts(tab, request), { today_hits: 1, total_hits: 1 });
  assert.deepEqual(await sessionCounts(tab, request), { today_hits: 1, total_hits: 1 });
  assert.equal(hits, 1);
  await sessionCounts(storage(), request);
  assert.equal(hits, 2);
});
test('reload during a pending request does not increment twice', async () => {
  const tab = storage();
  let resolve!: (value: { today_hits: number; total_hits: number }) => void;
  const first = sessionCounts(tab, () => new Promise(done => { resolve = done; }));
  assert.equal(await sessionCounts(tab, async () => { throw new Error('duplicate request'); }), null);
  resolve({ today_hits: 1, total_hits: 1 });
  await first;
});
test('ambiguous failure does not retry an increment', async () => {
  const tab = storage();
  await assert.rejects(sessionCounts(tab, async () => { throw new Error('timeout after increment'); }));
  assert.equal(await sessionCounts(tab, async () => { throw new Error('duplicate request'); }), null);
});
test('unavailable storage never sends an increment', async () => {
  const tab = storage();
  tab.setItem = () => { throw new Error('blocked'); };
  let requested = false;
  await assert.rejects(sessionCounts(tab, async () => { requested = true; return { today_hits: 1, total_hits: 1 }; }));
  assert.equal(requested, false);
});
