'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useChart } from '@/context/ChartContext'; // Import the new context
import { generateWeeklyData, parseStockData, calculateRSI, calculateMACD } from '@/lib/data-helpers';
import { StockChart, WeeklyChart } from './stock-chart';
import { FloatingWindow } from './floating-window';
import { TradePanel } from './trade-panel';
import { LineChart, Loader2, FolderOpen, AreaChart, Info, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WalkthroughGuide, WalkthroughStep } from './ui/walkthrough-guide';

export default function ChartTradeTrainer() {
  const { state, dispatch } = useChart();
  const { userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chartKey, setChartKey] = useState(0);

  // Define walkthrough steps
  const steps: WalkthroughStep[] = useMemo(() => [
    {
      target: '#wt-file-open',
      title: 'データを読み込む',
      content: 'まずはここから株価データ(JSON)を読み込みます。現在はデモデータが表示されています。',
      position: 'bottom',
    },
    {
      target: '#wt-chart-area',
      title: 'チャート操作',
      content: '読み込んだデータのローソク足チャートが表示されます。マウスホイールでズーム、ドラッグで移動が可能です。',
      position: 'top',
    },
    {
      target: '#wt-weekly-chart',
      title: '週足チャート（プレミアム）',
      content: 'プレミアムプランでは、日足と同時に週足チャートをフローティングウィンドウで表示し、マルチタイムフレーム分析が可能です。',
      position: 'bottom',
    },
    {
      target: '#wt-date-picker',
      title: 'リプレイ開始日の選択',
      content: 'まずはデモトレードを開始する日付を選択します。ここでは例として2025年4月25日にセットしました。この時点より未来のチャートが隠され、リプレイモードが始まります。',
      position: 'left',
      onEnter: () => {
        // デモデータの開始日時から少し進んだ日付を計算してセット
        // 最初のデータは 1744115277
        const startTimestamp = 1744115277;
        const targetTimestamp = startTimestamp + (14 * 24 * 60 * 60); // 14日後
        const demoDate = new Date(targetTimestamp * 1000);
        
        dispatch({ type: 'START_REPLAY', payload: demoDate });
        toast({ title: "ガイド: リプレイモードを開始しました", description: "「翌日へ進む」ボタンが有効になりました。" });
      }
    },
    {
      target: '#wt-next-day',
      title: '翌日へ進む',
      content: '「翌日へ進む」ボタンをクリックしてみてください。チャートが1日分進み、さらに自動で数日分進行します。',
      position: 'left',
      advanceOnClick: true,
      onTargetClick: () => {
        // クリックをトリガーに数日分進める
        let count = 0;
        const interval = setInterval(() => {
          if (count < 5) {
            dispatch({ type: 'NEXT_DAY' });
            count++;
          } else {
            clearInterval(interval);
          }
        }, 200); // 速めのペースで進める
      }
    },
    {
      target: '#wt-trade-long',
      title: 'エントリー（買い）',
      content: '上昇を予想したら「買い」ボタンをクリックしてエントリーしましょう。',
      position: 'left',
      advanceOnClick: true
    },
    {
      target: '#wt-positions',
      title: 'ポジションの確認と決済',
      content: 'ポジションを持つとここに情報が表示されます。チャート上の「E」マークがエントリーポイントです。最後に「決済」ボタン（全決済など）をクリックして、この練習を終了しましょう。',
      position: 'left',
      advanceOnClick: true
    },
  ], [dispatch, toast]); // stateを含めないことで無限ループを回避

  const handleInteractionEnd = () => {
    setChartKey(prevKey => prevKey + 1);
  };

  // Initial dummy data load
  useEffect(() => {
    const loadInitialData = async () => {
      if (state.fileLoaded) return;
      
      setIsLoading(true);
      try {
        const response = await fetch('/data/dummy-stock-data.json');
        if (!response.ok) throw new Error('Failed to fetch dummy data');
        const fileContent = await response.text();
        const { data, meta } = parseStockData(fileContent);
        const title = meta.longName ? `${meta.longName} (${meta.symbol})` : 'サンプルデータ';
        dispatch({ type: 'SET_CHART_DATA', payload: { data, title } });
        
        // 初回のみウォークスルーを自動表示（ローカルストレージ確認）
        const hasSeenWalkthrough = localStorage.getItem('hasSeenWalkthrough');
        if (!hasSeenWalkthrough) {
            // 少し待ってから表示
            setTimeout(() => dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: true }), 1000);
        }

      } catch (error) {
        console.error('Error loading initial dummy data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleWalkthroughComplete = () => {
      dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: false });
      localStorage.setItem('hasSeenWalkthrough', 'true');
  };

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
      
      const displayName = meta?.longName || meta?.shortName;
      let title = file.name;
      
      if (displayName && meta?.symbol) {
        title = `${displayName} (${meta.symbol})`;
      } else if (displayName) {
        title = displayName;
      } else if (meta?.symbol) {
        title = meta.symbol;
      }

      const weeklyData = generateWeeklyData(data);
      if (data[0]) {
        console.log('Daily data[0].time:', data[0].time, 'Type:', typeof data[0].time);
      }
      if (weeklyData[0]) {
        console.log('Weekly data[0].time:', weeklyData[0].time, 'Type:', typeof weeklyData[0].time);
      }

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
    dispatch({ type: 'CLOSE_PARTIAL_POSITION', payload: { type } });
  };

  const handleCloseAllPositionsOfType = (type: 'long' | 'short') => {
    dispatch({ type: 'CLOSE_ALL_POSITIONS_OF_TYPE', payload: { type } });
  };

  const handleToggleWeeklyChart = () => {
    if (userData?.isPremium || state.isDemoData) {
      dispatch({ type: 'TOGGLE_WEEKLY_CHART' });
    } else {
      toast({
        title: 'プレミアム機能',
        description: '週足チャートの表示はプレミアムプランで利用できます。',
        action: (
          <Button variant="premium" size="sm" onClick={() => router.push('/pricing')}>
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

  const isDemoData = useMemo(() => {
    return state.chartTitle.includes('デモ株式会社') || state.chartTitle.includes('サンプルデータ');
  }, [state.chartTitle]);
  return (
    <div className="grid grid-cols-1 grid-rows-[55fr_45fr] lg:grid-rows-1 lg:grid-cols-[1fr_340px] h-full overflow-hidden">
      <WalkthroughGuide 
        steps={steps} 
        isOpen={state.isWalkthroughOpen} 
        onClose={() => dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: false })}
        onComplete={handleWalkthroughComplete}
      />
      <div className="flex flex-col h-full min-h-0 border-r border-b lg:border-b-0">
        <header className="p-2 border-b flex items-center gap-2 flex-shrink-0">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            id="wt-weekly-chart"
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
                <Button id="wt-file-open" onClick={() => fileInputRef.current?.click()} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                    {isLoading ? '読込中...' : 'ファイルを開く'}
                </Button>
            </div>
        </header>
        {state.fileLoaded && isDemoData && (
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b">
            <Alert variant="default" className="bg-transparent border-blue-200 dark:border-blue-900">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">デモデータを表示しています</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                「ファイルを開く」から実際に使用したい株価データファイルを読み込んでください。
              </AlertDescription>
            </Alert>
          </div>
        )}
        <main id="wt-chart-area" className="flex-1 min-w-0 min-h-0 bg-background flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Loader2 className="w-16 h-16 mb-4 animate-spin" /><p>データを読み込んでいます...</p></div>
            ) : state.fileLoaded ? (
              <>
                <div className="flex-1 relative">
                  <div className="absolute inset-0">
                    <StockChart
                      key={`${state.chartTitle}-${state.upColor}-${state.downColor}-daily`}
                      chartData={displayedChartData}
                      positions={allEntries}
                      tradeHistory={state.tradeHistory}
                      maConfigs={state.maConfigs}
                      rsiData={rsiData}
                      macdData={macdData}
                      replayIndex={state.replayIndex}
                      upColor={state.upColor}
                      downColor={state.downColor}
                      volumeConfig={state.volumeConfig}
                      isPremium={!!userData?.isPremium || state.isDemoData}
                      chartTitle={state.chartTitle}
                    />
                  </div>
                </div>
                {state.showWeeklyChart && (
                  <FloatingWindow 
                    title="週足チャート (フローティング)" 
                    isOpen={state.showWeeklyChart} 
                    onClose={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                    onInteractionEnd={handleInteractionEnd}
                  >
                    {(size) => (
                      <WeeklyChart
                        key={`${state.chartTitle}-weekly-floating-${chartKey}`}
                        data={state.weeklyData}
                        upColor={state.upColor}
                        downColor={state.downColor}
                        maConfigs={state.maConfigs}
                        isPremium={!!userData?.isPremium || state.isDemoData}
                        replayIndex={state.replayIndex}
                        dailyChartData={state.chartData}
                      />
                    )}
                  </FloatingWindow>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><LineChart className="w-24 h-24 mb-4" /><h2 className="text-2xl font-semibold">ChartTrade Trainer</h2><p>「ファイルを開く」から株価データ(JSON)を読み込みます。</p></div>
            )}
        </main>
      </div>

      <aside id="wt-trade-panel" className="relative h-full overflow-y-auto">
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
              onCloseAllPositionsOfType={handleCloseAllPositionsOfType}
              onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
              onDateChange={handleDateChange}
              isDemoData={state.isDemoData}
            />
        </div>
      </aside>
    </div>
  );
}
