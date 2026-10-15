import { Solar } from 'lunar-javascript';
import { writeFileSync } from 'node:fs';
const names: string[] = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];
const rows: [number, number, number][] = [];
for (let year: number = 1899; year <= 2101; year++) {
  const table: Record<string, {toYmdHms(): string}> = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  for (let index: number = 0; index < names.length; index++) {
    const text: string = table[names[index]].toYmdHms();
    const instant: number = Date.parse(text.replace(' ', 'T') + '+08:00');
    rows.push([instant, year, index]);
  }
}
writeFileSync(new URL('../src/terms.json', import.meta.url), JSON.stringify(rows));
console.log(`${rows.length}件の節入り時刻を生成しました。`);
