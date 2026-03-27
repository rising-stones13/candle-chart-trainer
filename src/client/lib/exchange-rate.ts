
/**
 * 最新の為替レートを取得するユーティリティ
 */

export async function fetchExchangeRate(base: string = 'USD', target: string = 'JPY'): Promise<number> {
  try {
    // 無料の公開APIを使用 (Open Access, no API key required for basic usage)
    const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    const data = await response.json();
    return data.rates[target] || 150.0; // フォールバック値として150円を設定
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return 150.0; // エラー時のフォールバック
  }
}

/**
 * 価格データを換算する
 */
export function convertPrices<T extends { open: number; high: number; low: number; close: number }>(
  data: T[],
  rate: number
): T[] {
  return data.map(item => ({
    ...item,
    open: item.open * rate,
    high: item.high * rate,
    low: item.low * rate,
    close: item.close * rate,
  }));
}
