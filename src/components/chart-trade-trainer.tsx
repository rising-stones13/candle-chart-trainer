'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useChart } from '@/context/ChartContext'; // Import the new context
import { generateWeeklyData, parseStockData, calculateRSI, calculateMACD } from '@/lib/data-helpers';
import { StockChart } from './stock-chart';
import { TradePanel } from './trade-panel';
import { LineChart, Loader2, FolderOpen, AreaChart } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export default function ChartTradeTrainer() {
  const { state, dispatch } = useChart();
  const { userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData && !userData.isPremium) {
      dispatch({ type: 'RESET_PREMIUM_FEATURES' });
    }
  }, [userData, dispatch]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileContent = await file.text();
      const { data, meta } = parseStockData(fileContent);
      const title = meta.longName ? `${meta.longName} (${meta.symbol})` : file.name;
      dispatch({ type: 'SET_CHART_DATA', payload: { data, title } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの処理中にエラーが発生しました。';
      toast({ variant: 'destructive', title: 'エラー', description: errorMessage });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      dispatch({ type: 'START_REPLAY', payload: date });
    }
  };

  const handlePartialClose = (type: 'long' | 'short') => {
    dispatch({ type: 'CLOSE_PARTIAL_POSITION', payload: { type, amount: 100 } });
  };

  const handleToggleWeeklyChart = () => {
    if (userData?.isPremium) {
      dispatch({ type: 'TOGGLE_WEEKLY_CHART' });
    } else {
      toast({
        title: 'プレミアム機能',
        description: '週足チャートの表示はプレミアムプランで利用できます。',
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push('/pricing')}>
            アップグレード
          </Button>
        ),
      });
    }
  };

  const displayedChartData = useMemo(() => {
      if (state.isReplay && state.replayIndex !== null) {
        return state.chartData.slice(0, state.replayIndex + 1);
      }
      return state.chartData;
  }, [state.isReplay, state.replayIndex, state.chartData]);
  
  const rsiData = useMemo(() => {
    if (!state.rsiConfig.visible) return [];
    return calculateRSI(state.chartData, state.rsiConfig.period);
  }, [state.chartData, state.rsiConfig.visible, state.rsiConfig.period]);

  const macdData = useMemo(() => {
    if (!state.macdConfig.visible) return [];
    return calculateMACD(state.chartData, state.macdConfig.fastPeriod, state.macdConfig.slowPeriod, state.macdConfig.signalPeriod);
  }, [state.chartData, state.macdConfig.visible, state.macdConfig.fastPeriod, state.macdConfig.slowPeriod, state.macdConfig.signalPeriod]);

  const allEntries = useMemo(() => state.positions.flatMap(p => 
      p.entries.map(e => ({
          ...e,
          type: p.type,
      }))
  ), [state.positions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] h-full overflow-hidden">
      <div className="flex flex-col h-full min-h-0 border-r">
        <header className="p-2 border-b flex items-center gap-2 flex-shrink-0">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={handleToggleWeeklyChart}
                            disabled={!state.fileLoaded}
                        >
                            <AreaChart />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>週足</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <div className="border-l h-6 mx-2"></div>
            <h1 className="text-lg font-bold truncate">{state.chartTitle}</h1>
            <div className="flex items-center gap-2 ml-auto">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} disabled={isLoading} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                    {isLoading ? '読込中...' : 'ファイルを開く'}
                </Button>
            </div>
        </header>
        <main className="relative flex-1 min-w-0 min-h-0 bg-background">
            <div className="absolute inset-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Loader2 className="w-16 h-16 mb-4 animate-spin" /><p>データを読み込んでいます...</p></div>
                ) : state.fileLoaded ? (
                  <StockChart
                    key={`${state.chartTitle}-${state.upColor}-${state.downColor}`}
                    chartData={displayedChartData}
                    weeklyData={state.weeklyData}
                    positions={allEntries}
                    tradeHistory={state.tradeHistory}
                    maConfigs={state.maConfigs}
                    rsiData={rsiData}
                    macdData={macdData}
                    showWeeklyChart={state.showWeeklyChart}
                    onCloseWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                    replayIndex={state.replayIndex}
                    upColor={state.upColor}
                    downColor={state.downColor}
                    volumeConfig={state.volumeConfig}
                    isPremium={!!userData?.isPremium}
                    chartTitle={state.chartTitle}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><LineChart className="w-24 h-24 mb-4" /><h2 className="text-2xl font-semibold">ChartTrade Trainer</h2><p>「ファイルを開く」から株価データ(JSON)を読み込みます。</p></div>
                )}
            </div>
        </main>
      </div>

      <aside className="relative h-full overflow-y-auto">
         <div className="absolute inset-0">
            <TradePanel
              fileLoaded={state.fileLoaded}
              isReplay={state.isReplay}
              replayDate={state.isReplay && state.replayIndex !== null ? new Date((state.chartData[state.replayIndex].time as number) * 1000) : null}
              positions={state.positions}
              realizedPL={state.realizedPL}
              unrealizedPL={state.unrealizedPL}
              onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
              onClosePosition={handlePartialClose}
              onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
              onDateChange={handleDateChange}
            />
        </div>
      </aside>
    </div>
  );
}
