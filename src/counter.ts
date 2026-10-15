import { cookieStore, sessionCounts } from './counter-session';
// Fixed URL: never include form values, query strings or the referrer.
const publicUrl = new URL('https://www.azimicat.dev/BaZi/');
const counter = document.querySelector<HTMLAnchorElement>('.visit-counter');
const text = document.querySelector<HTMLElement>('#visit-counter-text');

if (counter && text) {
  if (location.origin === publicUrl.origin && location.pathname === publicUrl.pathname) {
    const endpoint = new URL('https://hitscounter.dev/api/hit');
    endpoint.search = new URLSearchParams({ url: publicUrl.href, output: 'json', tz: 'Asia/Tokyo' }).toString();
    const loadCounts = () => sessionCounts(cookieStore(document), async () => {
        const response = await fetch(endpoint, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Counter unavailable');
        return response.json();
      });
    // Serialize simultaneous tab openings so only one sends the increment.
    void Promise.resolve().then(() => navigator.locks
      ? navigator.locks.request('bazi-visit-counter', loadCounts)
      : loadCounts())
      .then(counts => {
        if (!counts) return;
        text.textContent = `views ${counts.today_hits.toLocaleString()} / ${counts.total_hits.toLocaleString()}`;
        counter.setAttribute('aria-label', `アクセス数：今日 ${counts.today_hits}、累計 ${counts.total_hits}`);
        counter.hidden = false;
      })
      .catch(() => { counter.hidden = true; });
  } else if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    text.textContent = 'views 12 / 345 · sample';
    counter.title = '表示サンプルです。実際のアクセス数ではありません。';
    counter.hidden = false;
  }
}
