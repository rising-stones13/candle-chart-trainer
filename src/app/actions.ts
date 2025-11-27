'use server';

import { identifyStockDetailsFromFilename } from '@/ai/flows/identify-stock-details-from-filename';
import yahooFinance from 'yahoo-finance2';
import type { CandleData } from '@/types';

export async function getStockInfoFromFilename(filename: string): Promise<{ tickerSymbol: string; companyNameJapanese: string } | { error: string }> {
  if (!filename) {
    return { error: 'ファイル名がありません。' };
  }

  try {
    const result = await identifyStockDetailsFromFilename({ filename });
    if (!result.tickerSymbol || !result.companyNameJapanese) {
      throw new Error("AI did not return expected fields.");
    }
    return result;
  } catch (error) {
    console.error('Error identifying stock details:', error);
    return { error: 'ファイル名から銘柄情報を特定できませんでした。' };
  }
}

export async function getStockData(ticker: string): Promise<{ data: CandleData[], info: any } | { error: string }> {
  if (!ticker) {
    return { error: '銘柄コードがありません。' };
  }

  try {
    const query = `${ticker}.T`;
    const [quote, historical] = await Promise.all([
        yahooFinance.quote(query),
        yahooFinance.historical(query, {
            period1: '2010-01-01',
            interval: '1d'
        })
    ]);

    if (!historical || historical.length === 0) {
      return { error: '株価データを取得できませんでした。' };
    }

    const data: CandleData[] = historical.map(d => ({
        time: d.date.toISOString().split('T')[0],
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume ?? 0
    }));

    const info = {
        companyNameJapanese: quote.longName || ticker
    };
    
    return { data, info };

  } catch (error) {
    console.error('Error fetching stock data from Yahoo Finance:', error);
    if (error instanceof Error && error.message.includes('404')) {
        return { error: `銘柄コード "${ticker}" が見つかりませんでした。` };
    }
    return { error: 'Yahoo Financeからのデータ取得に失敗しました。' };
  }
}
