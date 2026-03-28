import { useState, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import { useToast } from '@/hooks/use-toast';
import { parseStockData } from '@/lib/data-parsing';
import { fetchExchangeRate } from '@/lib/exchange-rate';

export function useFileLoader() {
  const { state, dispatch } = useChart();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loadFileData = useCallback(async (fileContent: string, fileName: string) => {
    setIsLoading(true);
    try {
      let { data, meta } = parseStockData(fileContent);
      
      const originalCurrency = meta?.currency;
      const currency = originalCurrency;
      let exchangeRate: number | undefined;
      let conversionFactor = 1;

      if (currency && currency !== 'JPY') {
        const baseCurrency = currency === 'USX' ? 'USD' : currency;
        const rate = await fetchExchangeRate(baseCurrency, 'JPY');
        exchangeRate = rate;
        conversionFactor = currency === 'USX' ? rate / 100 : rate;
      }

      const displayName = meta?.longName || meta?.shortName;
      let title = fileName;
      
      if (displayName && meta?.symbol) {
        title = `${displayName} (${meta.symbol})`;
      } else if (displayName) {
        title = displayName;
      } else if (meta?.symbol) {
        title = meta.symbol;
      }

      if (originalCurrency && originalCurrency !== 'JPY') {
        title += ' [損益のみ円換算]';
      }

      dispatch({ 
        type: 'SET_CHART_DATA', 
        payload: { data, title, currency, originalCurrency, exchangeRate, conversionFactor } 
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの処理中にエラーが発生しました。';
      toast({ variant: 'destructive', title: 'エラー', description: errorMessage });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, toast]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileContent = await file.text();
    await loadFileData(fileContent, file.name);
    
    // Reset input
    event.target.value = '';
  }, [loadFileData]);

  const loadInitialDemoData = useCallback(async () => {
    if (state.fileLoaded) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/data/dummy-stock-data.json');
      if (!response.ok) throw new Error('Failed to fetch dummy data');
      const fileContent = await response.text();
      await loadFileData(fileContent, 'dummy-stock-data.json');
      
      // 初回のみウォークスルーを自動表示
      const hasSeenWalkthrough = localStorage.getItem('hasSeenWalkthrough');
      if (!hasSeenWalkthrough) {
          setTimeout(() => dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: true }), 1000);
      }
    } catch (error) {
      console.error('Error loading initial dummy data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [state.fileLoaded, loadFileData, dispatch]);

  return {
    isLoading,
    handleFileChange,
    loadInitialDemoData
  };
}
