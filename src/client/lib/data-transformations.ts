import { CandleData } from '@shared/types';
import { Time } from 'lightweight-charts';

/**
 * 日足データから週足データを生成する
 */
export function generateWeeklyData(dailyData: CandleData[]): CandleData[] {
  if (dailyData.length === 0) return [];

  const weeklyDataMap = new Map<string, CandleData>();

  for (const day of dailyData) {
    const date = new Date((day.time as number) * 1000);
    const dayOfWeek = date.getUTCDay();
    const weekStartDate = new Date(date.getTime());
    
    // 週の開始日（日曜日）を計算
    weekStartDate.setUTCDate(date.getUTCDate() - dayOfWeek);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    const weekStartString = weekStartDate.toISOString().split('T')[0];

    if (!weeklyDataMap.has(weekStartString)) {
      weeklyDataMap.set(weekStartString, {
        time: (weekStartDate.getTime() / 1000) as Time,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume || 0,
      });
    } else {
      const week = weeklyDataMap.get(weekStartString)!;
      week.high = Math.max(week.high, day.high);
      week.low = Math.min(week.low, day.low);
      week.close = day.close;
      week.volume = (week.volume || 0) + (day.volume || 0);
    }
  }

  return Array.from(weeklyDataMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
}
