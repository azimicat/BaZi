import { ELEMENTS, STEMS, type Reading, type BirthInput, type Pillar, type Luck } from './engine';
import { natures, starMeanings, type Nature } from './content';
export function printSheet(reading: Reading, input: BirthInput, place: string): string {
  const nature: Nature = natures[reading.dayStem];
  const escape: (value: string) => string = (value: string): string => value.replace(/[&<>"']/g, (character: string): string => `&#${character.charCodeAt(0)};`);
  const age: (value: number) => string = (value: number): string => `${Math.floor(Math.round(value * 12) / 12)}歳${Math.round(value * 12) % 12}か月`;
  const year: Reading['annual'][number] = reading.annual[0];
  const titles: string[] = ['年柱','月柱','日柱','時柱'];
  const rows: [string, (item: Pillar, index: number) => string][] = [
    ['干支', (item: Pillar): string => item.label],
    ['通変星', (item: Pillar, index: number): string => index === 2 ? '日主' : item.star],
    ['十二運', (item: Pillar): string => item.stage],
    ['蔵干', (item: Pillar): string => item.hidden.join(' ')]
  ];
  return `<article class="print-sheet"><header class="print-header"><div><h1>四季の命式</h1><p>生まれた日からあなたを知る。</p></div><p>${escape(input.date)}　${input.time === null ? '出生時刻不明' : escape(input.time)}<br>${escape(place)} ／ ${input.sex === 'male' ? '男性' : '女性'}</p></header>
  <div class="print-nature"><span>${STEMS[reading.dayStem]}</span><div><small>あなたの日干 ／ ${ELEMENTS[Math.floor(reading.dayStem / 2)]}</small><h2>${nature.title}</h2><p>${nature.lead}</p></div></div>
  ${reading.warnings.length > 0 ? `<aside class="print-warning"><b>命式が確定しない可能性があります</b><p>${reading.warnings.map(escape).join(' ')}</p>${reading.alternatives.length > 1 ? `<p>候補：${reading.alternatives.map(escape).join(' ／ ')}</p>` : ''}</aside>` : ''}
  <div class="print-columns"><div><section><h3>01　命式と五行</h3><table class="print-chart"><thead><tr><th>命式</th>${titles.map((title: string): string => `<th>${title}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, render]: [string, (item: Pillar, index: number) => string]): string => `<tr><th>${label}</th>${titles.map((_: string, index: number): string => `<td>${index < reading.pillars.length ? render(reading.pillars[index], index) : '不明'}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="print-elements">${ELEMENTS.map((name: string, index: number): string => `${name} ${reading.counts[index]}`).join('　／　')}</p><p class="print-note">天干と地支の本気を各1で集計。数だけで強弱や吉凶は決まりません。</p>${reading.corrected !== null ? `<p class="print-note">補正後 ${reading.corrected}（地方平均太陽時）</p>` : ''}</section>
  <section><h3>02　性格</h3><p>${nature.personality}</p><p class="print-practice">${nature.practice}</p></section>
  <section><h3>03　仕事</h3><p>${nature.work}</p><p>月干「${reading.pillars[1].star}」：${starMeanings[reading.pillars[1].star].work}</p></section>
  <section><h3>04　恋愛</h3><p>${nature.love}</p><p>${reading.currentYear}年：${starMeanings[year.pillar.star].love}</p></section></div>
  <div><section><h3>05　${reading.currentYear}年のテーマ</h3><h4>${starMeanings[year.pillar.star].theme}</h4><p>${year.pillar.label} ／ ${year.pillar.star}</p><p>${starMeanings[year.pillar.star].text}</p></section>
  <section><h3>これから10年の年運</h3><table class="print-luck"><thead><tr><th>年</th><th>干支／通変星</th><th>テーマ</th></tr></thead><tbody>${reading.annual.map((item: Reading['annual'][number]): string => `<tr><td>${item.year}</td><td>${item.pillar.label}／${item.pillar.star}</td><td>${starMeanings[item.pillar.star].theme}</td></tr>`).join('')}</tbody></table><p class="print-note">各年の立春から翌年の立春までのテーマです。</p></section>
  <section><h3>06　10年ごとの大運</h3><p>${reading.forward ? '順行' : '逆行'} ／ 開始は約${age(reading.startAge)}${input.time === null ? `（約${age(reading.startRange[0])}〜${age(reading.startRange[1])}）` : ''}</p><table class="print-luck"><thead><tr><th>開始年齢（約）</th><th>干支／通変星</th><th>テーマ</th></tr></thead><tbody>${reading.luck.map((item: Luck): string => `<tr><td>${age(item.age)}</td><td>${item.pillar.label}／${item.pillar.star}</td><td>${starMeanings[item.pillar.star].theme}</td></tr>`).join('')}</tbody></table><p class="print-note">各期は開始年齢から10年間。開始年齢は近似値です。${input.time === null ? '出生時刻によって大運の並びも変わる可能性があります。' : ''}</p></section></div></div>
  <footer class="print-footer"><p>日干と通変星を中心にした解釈です。未来の出来事や吉凶を確定するものではありません。</p><p>計算方法と詳しい鑑定　www.azimicat.dev/BaZi/</p></footer></article>`;
}

/** 注意文がある鑑定も、内容を切り捨てずにA4の印刷範囲へ収める。 */
export function fitPrintSheet(sheet: HTMLElement): void {
  sheet.style.zoom = '1';
  const previousStyle: string = sheet.style.cssText;
  sheet.style.display = 'block';
  sheet.style.position = 'absolute';
  sheet.style.visibility = 'hidden';
  const height: number = sheet.scrollHeight;
  const width: number = sheet.getBoundingClientRect().width;
  const availableHeight: number = width / 190 * 273;
  const scale: number = Math.min(1, availableHeight / height);
  sheet.style.cssText = previousStyle;
  sheet.style.zoom = String(scale);
}
