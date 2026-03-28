import type { CandleData } from '@shared/types';
import { Time } from 'lightweight-charts';

// This is a simplified interface for what we expect from the Yahoo Finance v7 API response
export interface YahooFinanceChartResult {
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
    
    candleData.push({
      time: timestamps[i] as Time,
      open: quote.open[i]!,
      high: quote.high[i]!,
      low: quote.low[i]!,
      close: quote.close[i]!,
      volume: quote.volume[i]!,
    });
  }

  // Sort just in case and remove duplicates
  const uniqueData = Array.from(new Map(candleData.map(item => [item.time, item])).values())
    .sort((a, b) => (a.time as number) - (b.time as number));

  return { data: uniqueData, meta: result.meta };
}
