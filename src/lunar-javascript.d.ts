declare module 'lunar-javascript' {
  interface SolarDate {
    toYmdHms(): string;
    getYear(): number;
    getLunar(): { getJieQiTable(): Record<string, SolarDate>; getDayInGanZhiExact2(): string; getEightChar(): {setSect(sect: number): void; getYear(): string; getMonth(): string; getDay(): string; getTime(): string} };
  }
  export const Solar: {fromYmd(year: number, month: number, day: number): SolarDate; fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): SolarDate};
}
