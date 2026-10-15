import './style.css';
import './typography.css';
import './print.css';
import './counter';
import { printSheet, fitPrintSheet } from './print';
import cities from './cities.json';
import { calculate, ELEMENTS, STEMS, japanDate, type BirthInput, type Reading, type Pillar, type Luck } from './engine';
import { natures, starMeanings, type Nature, type StarMeaning } from './content';
interface City { prefecture: string; name: string; longitude: number }
function element<T extends HTMLElement>(selector: string): T {
  const match: T | null = document.querySelector<T>(selector);
  if (match === null) throw new Error(`画面の要素が見つかりません: ${selector}`);
  return match;
}
const form: HTMLFormElement = element('#birth-form');
const date: HTMLInputElement = element('#birth-date');
const time: HTMLInputElement = element('#birth-time');
const unknown: HTMLInputElement = element('#unknown-time');
const prefecture: HTMLSelectElement = element('#prefecture');
const city: HTMLSelectElement = element('#city');
const error: HTMLParagraphElement = element('#form-error');
const result: HTMLElement = element('#result');
const cityRows: City[] = cities;
const prefectures: string[] = [...new Set(cityRows.map((item: City): string => item.prefecture))];
date.max = japanDate(new Date());
prefectures.forEach((name: string): void => { prefecture.add(new Option(name, name)); });
prefecture.addEventListener('change', (): void => {
  city.replaceChildren(new Option(prefecture.value === '' ? '都道府県を選択' : '選択してください', ''));
  city.disabled = prefecture.value === '';
  cityRows.filter((item: City): boolean => item.prefecture === prefecture.value).forEach((item: City): void => { city.add(new Option(item.name, item.name)); });
});
unknown.addEventListener('change', (): void => {
  time.disabled = unknown.checked;
  time.required = !unknown.checked;
  time.removeAttribute('aria-invalid');
  element('#time-hint').textContent = unknown.checked ? '時柱を省いて鑑定します。命式と運勢は参考値になります。' : '母子手帳などに記載された時刻を入力してください。';
});
function escapeHtml(value: string | number): string { return String(value).replace(/[&<>"']/g, (char: string): string => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] as string)); }
function ageLabel(age: number): string {
  const totalMonths: number = Math.round(age * 12);
  return `${Math.floor(totalMonths / 12)}歳${totalMonths % 12}か月`;
}
function pillarTable(reading: Reading): string {
  const titles: string[] = ['年柱', '月柱', '日柱', '時柱'];
  const rows: {label: string; render: (item: Pillar, index: number) => string}[] = [
    {label:'天干',render:(item: Pillar): string => `<span class="kanji">${STEMS[item.stem]}</span>`},
    {label:'地支',render:(item: Pillar): string => `<span class="kanji">${item.label.slice(1)}</span>`},
    {label:'通変星',render:(item: Pillar, index: number): string => index === 2 ? '日主（自分）' : item.star},
    {label:'十二運',render:(item: Pillar): string => item.stage},
    {label:'蔵干',render:(item: Pillar): string => item.hidden.join(' ')}
  ];
  return `<table class="pillar-table"><caption class="sr-only">生年月日時から算出した命式</caption><thead><tr><th scope="col">命式</th>${titles.map((title: string, index: number): string => `<th scope="col" class="${index === 2 ? 'day-column' : ''}">${title}</th>`).join('')}</tr></thead><tbody>${rows.map((row: typeof rows[number]): string => `<tr><th scope="row">${row.label}</th>${titles.map((_: string, index: number): string => `<td class="${index === 2 ? 'day-column' : ''}">${index < reading.pillars.length ? row.render(reading.pillars[index], index) : '不明'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderReading(reading: Reading, input: BirthInput, birthplace: City): void {
  const nature: Nature = natures[reading.dayStem];
  const monthMeaning: StarMeaning = starMeanings[reading.pillars[1].star];
  const annual: Reading['annual'][number] = reading.annual[0];
  const yearMeaning: StarMeaning = starMeanings[annual.pillar.star];
  const maxCount: number = Math.max(...reading.counts, 1);
  const colors: string[] = ['#8d9a7f','#c69080','#c5af7f','#b2a793','#88a0aa'];
  const largest: string[] = ELEMENTS.filter((_: string, index: number): boolean => reading.counts[index] === maxCount);
  const currentAge: number = (Date.now() - Date.parse(`${input.date}T12:00:00+09:00`)) / 86_400_000 / 365.2425;
  const sexLabel: string = input.sex === 'male' ? '男性' : '女性';
  const timeLabel: string = input.time === null ? '出生時刻不明' : `${input.time} 生まれ`;
  result.innerHTML = `
    <header class="result-heading"><p class="eyebrow">YOUR PERSONAL READING</p><h2 id="result-heading">あなたの命式が<br>ひらきました。</h2><p class="birth-summary">${escapeHtml(input.date.replaceAll('-',' / '))}　${escapeHtml(timeLabel)}<br>${escapeHtml(birthplace.prefecture)} ${escapeHtml(birthplace.name)}　／　${sexLabel}</p><div class="result-toolbar"><button type="button" class="text-button" id="edit-reading">入力を見直す ↑</button><button type="button" class="text-button" id="print-reading">結果を印刷する ↗</button></div></header>
    ${reading.warnings.length > 0 ? `<aside class="warning-box"><strong>鑑定の前にご確認ください</strong>${reading.warnings.map((warning: string): string => `<p>${escapeHtml(warning)}</p>`).join('')}${reading.alternatives.length > 1 ? `<p>出生時刻によって考えられる命式：</p><ul>${reading.alternatives.map((label: string): string => `<li>${label}</li>`).join('')}</ul><p>日干が変わる候補では、性格と運勢の説明も変わります。</p>` : ''}</aside>` : ''}
    <div class="nature-panel"><span class="nature-symbol" aria-hidden="true">${nature.symbol}</span><p class="eyebrow">YOUR NATURE — ${STEMS[reading.dayStem]}</p><h3>${nature.title}</h3><p>${nature.lead}<br>あなたの日干は「${STEMS[reading.dayStem]}」。五行では「${ELEMENTS[Math.floor(reading.dayStem / 2)]}」にあたります。</p></div>
    <nav class="result-nav" aria-label="鑑定結果の目次"><a href="#chart">命式</a><a href="#personality">性格</a><a href="#work">仕事</a><a href="#love">恋愛</a><a href="#fortune">運勢</a></nav>
    <section class="reading-block" id="chart"><h3><span>01.</span>あなたを映す命式。</h3>${pillarTable(reading)}<p class="table-note">日干は「自分」を表す天干。通変星は日干と各天干の関係、十二運は日干と地支の関係を示します。蔵干は地支に含まれる天干で、本気から順に表示しています。</p>${reading.corrected !== null ? `<p class="table-note">経度補正：${reading.correction >= 0 ? '+' : ''}${reading.correction.toFixed(1)}分 ／ 補正後：${reading.corrected}（地方平均太陽時）</p>` : ''}<div class="elements" aria-label="五行の構成">${ELEMENTS.map((name: string, index: number): string => `<div class="element-item"><span>${name}</span><div class="element-track"><div class="element-fill" style="--element:${colors[index]};height:${reading.counts[index] / maxCount * 65}px" aria-hidden="true"></div></div><small>${reading.counts[index]} / ${reading.pillars.length * 2}</small></div>`).join('')}</div><p class="table-note">天干と地支の本気を各1として数えています。${largest.join('、')}の数が最多です。数だけで五行の強さや吉凶は決まりません。${input.time === null ? '時柱の2文字は含みません。' : ''}</p></section>
    <section class="reading-block" id="personality"><h3><span>02.</span>あなたらしさの芽。</h3><p>${nature.personality}</p><div class="practice"><span aria-hidden="true">✳</span><div>${nature.practice}</div></div></section>
    <section class="reading-block" id="work"><h3><span>03.</span>持ち味が育つ働き方。</h3><p>${nature.work}</p><p>月干の通変星は「${reading.pillars[1].star}」。${monthMeaning.work}</p></section>
    <section class="reading-block" id="love"><h3><span>04.</span>心地よくつながる。</h3><p>${nature.love}</p><p>${reading.currentYear}年の年運のテーマからは${yearMeaning.love}</p></section>
    <section class="reading-block" id="fortune"><h3><span>05.</span>これからの季節。</h3><div class="annual-lead"><span class="year-kicker">${reading.currentYear} — YEARLY THEME ／ ${annual.pillar.label}・${annual.pillar.star}</span><h4>${yearMeaning.theme}</h4><p>${yearMeaning.text}</p></div><p class="table-note">年運は各年の立春から翌年の立春まで。現在の年運から10年分を表示しています。年を開くと、その年のテーマを読めます。</p><div class="year-list">${reading.annual.map((item: Reading['annual'][number]): string => `<details><summary><b>${item.year}</b>${item.pillar.label}　${starMeanings[item.pillar.star].theme}</summary><p>${item.pillar.star} ／ ${starMeanings[item.pillar.star].text}</p></details>`).join('')}</div></section>
    <section class="reading-block" id="long-fortune"><h3><span>06.</span>10年ごとの運の流れ。</h3><p class="luck-intro">${reading.forward ? '順行' : '逆行'} ／ 大運の開始は約${ageLabel(reading.startAge)}。${input.time === null ? `時刻不明による範囲は約${ageLabel(reading.startRange[0])}〜${ageLabel(reading.startRange[1])}です。節入りで順逆が変わる候補では、大運の並び自体も変わります。` : ''}</p><p class="table-note">開始年齢から10年間ずつのテーマです。西暦は生年に開始年齢を足した概算で、誕生日や交運日とは一致しないことがあります。開始前の年齢には、大運はまだ割り当てていません。</p><ol class="luck-list">${reading.luck.map((item: Luck): string => { const current: boolean = currentAge >= item.age && currentAge < item.age + 10; return `<li class="${current ? 'current' : ''}"><span class="luck-kanji">${item.pillar.label}</span><div><p>約${ageLabel(item.age)}から${current ? '<span class="current-label">いまの大運</span>' : ''}</p><small>西暦 約${Math.floor(item.year)}年〜 ／ ${item.pillar.star}</small><p>${starMeanings[item.pillar.star].theme}</p></div></li>`; }).join('')}</ol></section>
    <p class="reading-footnote">鑑定文は日干と通変星を中心にした説明です。命式全体の吉凶や未来の出来事を確定するものではありません。<a href="#methods">計算方法と鑑定の範囲</a></p>`;
  result.insertAdjacentHTML('beforeend', printSheet(reading, input, `${birthplace.prefecture} ${birthplace.name}`));
  result.hidden = false;
  element('#edit-reading').addEventListener('click', (): void => { form.scrollIntoView({block:'start'}); date.focus({preventScroll:true}); });
  element('#print-reading').addEventListener('click', (): void => { fitPrintSheet(element('.print-sheet')); window.print(); });
  result.focus({preventScroll:true});
  result.scrollIntoView({block:'start'});
}
function invalid(field: HTMLElement, message: string): never {
  field.setAttribute('aria-invalid','true');
  field.focus();
  throw new Error(message);
}
form.addEventListener('submit', (event: SubmitEvent): void => {
  event.preventDefault();
  error.hidden = true;
  form.querySelectorAll('[aria-invalid]').forEach((field: Element): void => { field.removeAttribute('aria-invalid'); });
  try {
    if (!date.value || !date.validity.valid) invalid(date, '生年月日を1900年1月1日から今日までの範囲で入力してください。');
    const sex: HTMLInputElement | null = form.querySelector<HTMLInputElement>('input[name=sex]:checked');
    if (sex === null) invalid(element('input[name=sex]'), '性別を選択してください。');
    if (!unknown.checked && (!time.value || !time.validity.valid)) invalid(time, '出生時刻を入力するか、「出生時刻がわからない」を選択してください。');
    if (!prefecture.value) invalid(prefecture,'出生地の都道府県を選択してください。');
    const birthplace: City | undefined = cityRows.find((item: City): boolean => item.prefecture === prefecture.value && item.name === city.value);
    if (birthplace === undefined) invalid(city,'出生地の市区町村を選択してください。');
    const input: BirthInput = {date: date.value, time: unknown.checked ? null : time.value, longitude: birthplace.longitude, sex: sex.value as BirthInput['sex']};
    renderReading(calculate(input), input, birthplace);
  } catch (reason: unknown) {
    error.textContent = reason instanceof Error ? reason.message : '鑑定を表示できませんでした。入力内容をご確認ください。';
    error.hidden = false;
  }
});

window.addEventListener('beforeprint', (): void => {
  const sheet: HTMLElement | null = result.querySelector('.print-sheet');
  if (sheet !== null && !result.hidden) fitPrintSheet(sheet);
});
