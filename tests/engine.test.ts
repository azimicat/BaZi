import test from 'node:test';
import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { calculate, birthInstant, tenStar, japanDate, terms, type BirthInput, type Reading, type Term } from '../src/engine.ts';
const now: Date = new Date('2026-10-15T00:00:00Z');
const base: BirthInput = { date: '2000-01-07', time: '12:00', longitude: 135, sex: 'male' };
function reading(overrides: Partial<BirthInput> = {}): Reading { return calculate({...base, ...overrides}, now); }

test('甲子の日を基準に、年月日時の四柱が表示される', (): void => {
  const result: Reading = reading();
  assert.equal(result.pillars[2].label, '甲子');
  assert.equal(result.pillars[3].label, '庚午');
  assert.equal(result.pillars.length, 4);
  assert.equal(result.counts.reduce((sum: number, count: number): number => sum + count, 0), 8);
});
test('立春の時刻をまたぐと年柱と月柱が変わる', (): void => {
  const before: Reading = reading({date:'2026-02-04', time:'05:02'});
  const after: Reading = reading({date:'2026-02-04', time:'05:03'});
  assert.equal(before.pillars[0].label, '乙巳');
  assert.equal(after.pillars[0].label, '丙午');
  assert.equal(before.pillars[1].label, '己丑');
  assert.equal(after.pillars[1].label, '庚寅');
  assert.equal(before.warnings.length, 1);
});
test('1月の小寒では年柱を変えずに月柱を切り替える', (): void => {
  const before: Reading = reading({date:'2026-01-05',time:'17:23'});
  const after: Reading = reading({date:'2026-01-05',time:'17:24'});
  assert.equal(before.pillars[0].label, '乙巳');
  assert.equal(after.pillars[0].label, '乙巳');
  assert.equal(before.pillars[1].label, '戊子');
  assert.equal(after.pillars[1].label, '己丑');
});
test('午前0時で日柱が変わり、23時には子刻の時柱に変わる', (): void => {
  const late: Reading = reading({time:'23:30'});
  const next: Reading = reading({date:'2000-01-08',time:'00:00'});
  assert.equal(late.pillars[2].label, '甲子');
  assert.equal(late.pillars[3].label, '甲子');
  assert.equal(next.pillars[2].label, '乙丑');
  assert.equal(next.pillars[3].label, '丙子');
});
test('経度補正で前日と翌日に移ると、日柱も移る', (): void => {
  const west: Reading = reading({time:'00:10',longitude:130});
  const east: Reading = reading({time:'23:50',longitude:140});
  assert.equal(west.pillars[2].label, '癸亥');
  assert.equal(west.corrected, '2000-01-06 23:50');
  assert.equal(east.pillars[2].label, '乙丑');
  assert.equal(east.corrected, '2000-01-08 00:10');
});
test('出生時刻が不明なら時柱を省き、五行は6文字で数える', (): void => {
  const result: Reading = reading({time:null});
  assert.equal(result.pillars.length, 3);
  assert.equal(result.corrected, null);
  assert.equal(result.counts.reduce((sum: number, count: number): number => sum + count, 0), 6);
  assert.ok(result.startRange[1] > result.startRange[0]);
});
test('節入り日の時刻が不明なら、命式が変わる候補を示す', (): void => {
  const result: Reading = reading({date:'2026-02-04',time:null,longitude:139.7});
  assert.ok(result.alternatives.length > 1);
  assert.ok(result.warnings.some((text: string): boolean => text.includes('確定していません')));
});
test('陰年生まれでは女性が順行、男性が逆行する', (): void => {
  const male: Reading = reading({sex:'male'});
  const female: Reading = reading({sex:'female'});
  assert.equal(male.forward, false);
  assert.equal(female.forward, true);
  assert.equal(male.luck[0].pillar.label, '丙子');
  assert.equal(female.luck[0].pillar.label, '戊寅');
});
test('1948年の夏時間を差し引き、時刻不明でも夏時間開始日を鑑定できる', (): void => {
  assert.equal(birthInstant('1948-07-01','12:00'),Date.parse('1948-07-01T02:00:00Z'));
  const summer: Reading = reading({date:'1948-07-01'});
  const unknown: Reading = reading({date:'1948-05-02',time:null});
  assert.equal(summer.corrected, '1948-07-01 11:00');
  assert.equal(unknown.pillars.length, 3);
});
test('存在しない日付、未来の日付、範囲外の時刻を受け付けない', (): void => {
  assert.throws((): Reading => reading({date:'2001-02-29'}), /存在する日付/);
  assert.throws((): Reading => reading({date:'2027-01-01'}), /今日まで/);
  assert.throws((): Reading => reading({time:'24:00'}), /00:00〜23:59/);
  assert.throws((): Reading => reading({longitude:0}), /日本国内/);
});
test('立春前の1月には前年の年運から表示する', (): void => {
  const result: Reading = calculate(base, new Date('2026-01-01T00:00:00Z'));
  assert.equal(result.currentYear, 2025);
  assert.equal(result.annual[0].pillar.label, '乙巳');
  assert.equal(result.annual[9].year, 2034);
});
test('閲覧端末の地域に依存せず、日本の日付を使う', (): void => {
  assert.equal(japanDate(new Date('2026-10-14T15:00:00Z')), '2026-10-15');
});
test('1900年から2101年の節入りを順番に収録している', (): void => {
  assert.equal(terms.length, 2436);
  assert.ok(terms.every((term: Term, index: number): boolean => index === 0 ? true : term.instant > terms[index - 1].instant));
  const spring: Term | undefined = terms.find((term: Term): boolean => term.year === 2026 && term.month === 1);
  assert.ok(spring);
  assert.equal(new Date(spring.instant).toISOString(), '2026-02-03T20:02:08.000Z');
});
test('通変星は日干との五行と陰陽の関係から求める', (): void => {
  assert.equal(tenStar(0,0), '比肩');
  assert.equal(tenStar(0,1), '劫財');
  assert.equal(tenStar(0,4), '偏財');
  assert.equal(tenStar(0,7), '正官');
  assert.equal(tenStar(0,9), '印綬');
});
test('時刻不明の日柱候補に、経度補正による前日も含まれる', (): void => {
  const result: Reading = reading({time:null,longitude:130});
  assert.ok(result.alternatives.some((text: string): boolean => text.includes('癸亥日')));
  assert.ok(result.alternatives.some((text: string): boolean => text.includes('甲子日')));
});
// 独立した日付の干支参照と照合し、基準日だけに合う計算を防ぐ。
const dates: string[] = ['1900-01-01','1948-07-01','1960-02-29','1984-02-04','1990-06-15','2000-02-29','2010-12-31','2024-02-04','2026-10-15'];
dates.forEach((value: string): void => {
  test(`${value}の日柱を暦ライブラリの参照値と照合する`, (): void => {
    const parts: number[] = value.split('-').map(Number);
    const expected: string = Solar.fromYmd(parts[0],parts[1],parts[2]).getLunar().getDayInGanZhiExact2();
    const result: Reading = reading({date:value});
    assert.equal(result.pillars[2].label, expected);
  });
});
