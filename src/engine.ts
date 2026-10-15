import termRows from './terms.json';

export const STEMS: string[] = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const BRANCHES: string[] = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const ELEMENTS: string[] = ['木','火','土','金','水'];
export const STAGES: string[] = ['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'];
const HIDDEN: number[][] = [[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,4,6],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]];
const DAY: number = 86_400_000;
const MINUTE: number = 60_000;
export interface BirthInput { date: string; time: string | null; longitude: number; sex: 'male' | 'female' }
export interface Pillar { stem: number; branch: number; label: string; star: string; stage: string; hidden: string[] }
export interface Term { instant: number; year: number; month: number }
export interface Luck { pillar: Pillar; age: number; year: number }
export interface Reading {
  pillars: Pillar[]; counts: number[]; corrected: string | null; correction: number;
  warnings: string[]; alternatives: string[]; forward: boolean;
  startAge: number; startRange: [number, number]; luck: Luck[]; annual: {year: number; pillar: Pillar}[];
  currentYear: number; dayStem: number; birthYear: number;
}
export const terms: Term[] = termRows.map((row: number[]): Term => ({instant: row[0], year: row[1], month: row[2]}));
export function mod(value: number, divisor: number): number { return ((value % divisor) + divisor) % divisor; }
export function cycle(index: number): {stem: number; branch: number} { return {stem: mod(index, 10), branch: mod(index, 12)}; }
export function cycleIndex(stem: number, branch: number): number {
  for (let index: number = 0; index < 60; index++) { if (index % 10 === stem && index % 12 === branch) return index; }
  throw new Error('干支の組み合わせを計算できませんでした。');
}
export function tenStar(dayStem: number, otherStem: number): string {
  const relation: number = mod(Math.floor(otherStem / 2) - Math.floor(dayStem / 2), 5);
  const same: boolean = dayStem % 2 === otherStem % 2;
  const names: string[][] = [['比肩','劫財'],['食神','傷官'],['偏財','正財'],['偏官','正官'],['偏印','印綬']];
  return names[relation][same ? 0 : 1];
}
export function pillar(stem: number, branch: number, dayStem: number): Pillar {
  const starts: number[] = [11,6,2,9,2,9,5,0,8,3];
  const step: number = dayStem % 2 === 0 ? 1 : -1;
  return {stem, branch, label: STEMS[stem] + BRANCHES[branch], star: tenStar(dayStem, stem),
    stage: STAGES[mod((branch - starts[dayStem]) * step, 12)], hidden: HIDDEN[branch].map((hidden: number): string => STEMS[hidden])};
}
export function japanDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * MINUTE).toISOString().slice(0, 10);
}
function wallStamp(instant: number): string {
  const formatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  return formatter.format(new Date(instant)).replace(' ', 'T');
}
export function birthInstant(date: string, time: string): number {
  const wall: number = Date.parse(`${date}T${time}:00Z`);
  const expected: string = `${date}T${time}`;
  const candidates: number[] = [wall - 9 * 60 * MINUTE, wall - 10 * 60 * MINUTE].filter((instant: number): boolean => wallStamp(instant) === expected);
  if (candidates.length === 0) throw new Error('夏時間の開始で存在しない時刻です。出生記録の時刻をご確認ください。');
  if (candidates.length > 1) throw new Error('夏時間終了時に二度現れる時刻のため、この時刻には対応していません。「出生時刻がわからない」を選択できます。');
  return candidates[0];
}
function neighboringTerms(instant: number): {before: Term; after: Term} {
  const index: number = terms.findIndex((term: Term): boolean => term.instant > instant);
  if (index < 1) throw new Error('節入り時刻の収録範囲外です。');
  return {before: terms[index - 1], after: terms[index]};
}
function calendar(instant: number, longitude: number): {yearStem: number; yearBranch: number; monthStem: number; monthBranch: number; dayStem: number; dayBranch: number; hourBranch: number; local: Date} {
  const term: Term = neighboringTerms(instant).before;
  const year: number = term.month === 0 ? term.year - 1 : term.year;
  const yearCycle: {stem: number; branch: number} = cycle(year - 4);
  const monthIndex: number = mod(term.month - 1, 12);
  // 地方平均太陽時。節入りは世界共通の瞬間のため経度で動かさない。
  const local: Date = new Date(instant + (9 * 60 + (longitude - 135) * 4) * MINUTE);
  const localDay: number = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const dayIndex: number = Math.round((localDay - Date.UTC(2000, 0, 7)) / DAY);
  const dayCycle: {stem: number; branch: number} = cycle(dayIndex);
  return {yearStem: yearCycle.stem, yearBranch: yearCycle.branch,
    monthStem: mod(yearCycle.stem * 2 + 2 + monthIndex, 10), monthBranch: mod(monthIndex + 2, 12),
    dayStem: dayCycle.stem, dayBranch: dayCycle.branch, hourBranch: Math.floor((local.getUTCHours() + 1) / 2) % 12, local};
}
export function calculate(input: BirthInput, now: Date = new Date()): Reading {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('生年月日を年月日で入力してください。');
  const date: Date = new Date(`${input.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== input.date) throw new Error('存在する日付を入力してください。');
  if (input.date < '1900-01-01' || input.date > japanDate(now) || input.date > '2099-12-31') throw new Error('生年月日は1900年1月1日から今日までで入力してください（収録範囲は2099年まで）。');
  if (!Number.isFinite(input.longitude) || input.longitude < 122 || input.longitude > 154) throw new Error('日本国内の出生地を選択してください。');
  if (input.sex !== 'male' && input.sex !== 'female') throw new Error('性別を選択してください。');
  if (input.time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('出生時刻を00:00〜23:59で入力してください。');
  const known: boolean = input.time !== null;
  const instant: number = birthInstant(input.date, input.time === null ? '12:00' : input.time);
  const cal: ReturnType<typeof calendar> = calendar(instant, input.longitude);
  const pillars: Pillar[] = [pillar(cal.yearStem, cal.yearBranch, cal.dayStem), pillar(cal.monthStem, cal.monthBranch, cal.dayStem), pillar(cal.dayStem, cal.dayBranch, cal.dayStem)];
  if (known) pillars.push(pillar(mod(cal.dayStem * 2 + cal.hourBranch, 10), cal.hourBranch, cal.dayStem));
  const counts: number[] = [0,0,0,0,0];
  pillars.forEach((item: Pillar): void => { counts[Math.floor(item.stem / 2)]++; counts[Math.floor(HIDDEN[item.branch][0] / 2)]++; });
  const forward: boolean = (cal.yearStem % 2 === 0) === (input.sex === 'male');
  const neighbors: ReturnType<typeof neighboringTerms> = neighboringTerms(instant);
  const ageAt: (moment: number) => number = (moment: number): number => {
    const bounds: ReturnType<typeof neighboringTerms> = neighboringTerms(moment);
    const momentCalendar: ReturnType<typeof calendar> = calendar(moment, input.longitude);
    const momentForward: boolean = (momentCalendar.yearStem % 2 === 0) === (input.sex === 'male');
    return Math.abs((momentForward ? bounds.after.instant : bounds.before.instant) - moment) / DAY / 3;
  };
  const startAge: number = ageAt(instant);
  const warnings: string[] = [];
  const alternatives: string[] = [];
  const correction: number = (input.longitude - 135) * 4;
  let startRange: [number, number] = [startAge, startAge];
  if (!known) {
    warnings.push('出生時刻が不明のため、時柱を省いています。年柱と月柱は出生日の正午を仮の基準にしています。');
    let start: number;
    try { start = birthInstant(input.date, '00:00'); }
    catch { start = birthInstant(input.date, '01:00'); }
    const end: number = birthInstant(input.date, '23:59');
    const edges: number[] = [start, end];
    const crossed: Term[] = terms.filter((term: Term): boolean => term.instant >= start && term.instant <= end);
    if (crossed.length > 0) {
      warnings.push('出生日は節入り日です。出生時刻によって年柱または月柱が変わります。下の命式は確定していません。');
      crossed.forEach((term: Term): void => { edges.push(term.instant - 1, term.instant + 1); });
    }
    edges.forEach((edge: number): void => {
      const variant: ReturnType<typeof calendar> = calendar(edge, input.longitude);
      const label: string = `${STEMS[variant.yearStem]}${BRANCHES[variant.yearBranch]}年 ／ ${STEMS[variant.monthStem]}${BRANCHES[variant.monthBranch]}月 ／ ${STEMS[variant.dayStem]}${BRANCHES[variant.dayBranch]}日`;
      if (!alternatives.includes(label)) alternatives.push(label);
    });
    const ages: number[] = edges.map(ageAt);
    startRange = [Math.min(...ages), Math.max(...ages)];
    warnings.push('出生地の時刻補正によって日付が変わる可能性もあります。鑑定文と大運の開始年齢は参考値としてお読みください。');
  }
  if (known && cal.local.toISOString().slice(0,10) !== input.date) warnings.push('出生地の経度補正で日付が変わったため、補正後の日付から日柱を計算しています。');
  if (known && Math.min(Math.abs(instant - neighbors.before.instant), Math.abs(neighbors.after.instant - instant)) < 5 * MINUTE) warnings.push('出生時刻が節入りの前後5分以内です。暦の計算方式による差で年柱や月柱が変わる可能性があります。');
  if (wallStamp(instant) !== new Date(instant + 9 * 60 * MINUTE).toISOString().slice(0,16)) warnings.push('出生時の日本の夏時間を考慮し、1時間を差し引いてから経度を補正しています。');
  const birthYear: number = date.getUTCFullYear();
  const monthCycle: number = cycleIndex(cal.monthStem, cal.monthBranch);
  const luck: Luck[] = Array.from({length: 10}, (_: unknown, index: number): Luck => {
    const item: {stem: number; branch: number} = cycle(monthCycle + (index + 1) * (forward ? 1 : -1));
    return {pillar: pillar(item.stem, item.branch, cal.dayStem), age: startAge + index * 10, year: birthYear + startAge + index * 10};
  });
  const japanYear: number = Number(japanDate(now).slice(0,4));
  const spring: Term | undefined = terms.find((term: Term): boolean => term.year === japanYear && term.month === 1);
  if (spring === undefined) throw new Error('現在の年運が収録範囲外です。');
  const currentYear: number = now.getTime() < spring.instant ? japanYear - 1 : japanYear;
  const annual: Reading['annual'] = Array.from({length: 10}, (_: unknown, index: number): Reading['annual'][number] => {
    const year: number = currentYear + index;
    const item: {stem: number; branch: number} = cycle(year - 4);
    return {year, pillar: pillar(item.stem, item.branch, cal.dayStem)};
  });
  return {pillars, counts, corrected: known ? cal.local.toISOString().slice(0,16).replace('T',' ') : null,
    correction, warnings, alternatives, forward, startAge, startRange, luck, annual, currentYear, dayStem: cal.dayStem, birthYear};
}
