// Fixed URL: never include form values, query strings or the referrer.
const publicUrl = new URL('https://www.azimicat.dev/BaZi/');
const counter = document.querySelector<HTMLAnchorElement>('.visit-counter');
const text = document.querySelector<HTMLElement>('#visit-counter-text');

if (counter && text) {
  if (location.origin === publicUrl.origin && location.pathname === publicUrl.pathname) {
    const endpoint = new URL('https://hitscounter.dev/api/hit');
    endpoint.search = new URLSearchParams({ url: publicUrl.href, output: 'json', tz: 'Asia/Tokyo' }).toString();
    void fetch(endpoint, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then(async response => {
        if (!response.ok) throw new Error('Counter unavailable');
        const counts = await response.json();
        if (![counts.today_hits, counts.total_hits].every(value => Number.isSafeInteger(value) && value >= 0)) return;
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
