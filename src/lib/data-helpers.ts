import type { CandleData, LineData } from '@/types';
import { Time } from 'lightweight-charts';

// This is a simplified interface for what we expect from the Yahoo Finance v7 API response
interface YahooFinanceChartResult {
  chart: {
    result: {
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        longName?: string;
        shortName?: string;
      };
      timestamp: number[];
      indicators: {
        quote: {
          high: (number | null)[];
          close: (number | null)[];
          low: (number | null)[];
          volume: (number | null)[];
          open: (number | null)[];
        }[];
      };
    }[];
    error: any;
  };
}


export function parseStockData(jsonText: string): { data: CandleData[], meta: YahooFinanceChartResult['chart']['result'][0]['meta'] } {
  const jsonData: YahooFinanceChartResult = JSON.parse(jsonText);
  
  if (jsonData.chart.error) {
    throw new Error(`Chart data error: ${jsonData.chart.error.description}`);
  }
  
  if (!jsonData.chart.result || jsonData.chart.result.length === 0) {
    throw new Error('No chart data found in the file.');
  }

  const result = jsonData.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  if (!timestamps || !quote) {
    throw new Error('Invalid data format: timestamps or quotes are missing.');
  }
  
  const candleData: CandleData[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    // Skip if any of the crucial values are null or missing
    if (
      timestamps[i] == null ||
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null ||
      quote.volume[i] == null
    ) {
      continue;
    }
    
    // Convert UNIX timestamp (seconds) to YYYY-MM-DD string
    const date = new Date(timestamps[i] * 1000);
    const year = date.getUTCFullYear();
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    const day = ('0' + date.getUTCDate()).slice(-2);
    const timeStr = `${year}-${month}-${day}`;

    candleData.push({
      time: timeStr as Time,
      open: quote.open[i]!,
      high: quote.high[i]!,
      low: quote.low[i]!,
      close: quote.close[i]!,
      volume: quote.volume[i]!,
    });
  }

  // Sort just in case and remove duplicates
  const uniqueData = Array.from(new Map(candleData.map(item => [item.time, item])).values())
    .sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());

  return { data: uniqueData, meta: result.meta };
}


export function generateWeeklyData(dailyData: CandleData[]): CandleData[] {
  if (dailyData.length === 0) return [];

  const weeklyDataMap = new Map<string, CandleData>();

  for (const day of dailyData) {
    const date = new Date(day.time as string);
    // Adjust for timezone offset to prevent day-of-week errors
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    const dayOfWeek = adjustedDate.getUTCDay();
    const weekStartDate = new Date(adjustedDate);
    weekStartDate.setUTCDate(adjustedDate.getUTCDate() - dayOfWeek);
    const weekStartString = weekStartDate.toISOString().split('T')[0];

    if (!weeklyDataMap.has(weekStartString)) {
      weeklyDataMap.set(weekStartString, {
        time: day.time,
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
      // Also update time to be the last day of the week so far
      week.time = day.time;
    }
  }

  return Array.from(weeklyDataMap.values()).sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());
}

export function calculateMA(data: CandleData[], period: number): LineData[] {
  const result: LineData[] = [];
  if (!data || data.length < period) {
    return [];
  }
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: NaN });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({
        time: data[i].time,
        value: parseFloat((sum / period).toFixed(2)),
      });
    }
  }
  return result;
}
