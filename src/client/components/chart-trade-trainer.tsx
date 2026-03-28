import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate as useRouter } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useChart } from '@/context/ChartContext';
import { calculateRSI, calculateMACD } from '@/lib/indicators';
import { WalkthroughGuide } from './ui/walkthrough-guide';
import { TradePanel } from './trade-panel';
import { ChartHeader } from './chart/ChartHeader';
import { ChartMainArea } from './chart/ChartMainArea';
import { getWalkthroughSteps } from '@/constants/walkthrough-steps';
import { useFileLoader } from '@/hooks/use-file-loader';

export default function ChartTradeTrainer() {
  const { state, dispatch } = useChart();
  const { userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [chartKey, setChartKey] = useState(0);

  const { isLoading, handleFileChange, loadInitialDemoData } = useFileLoader();

  // ウォークスルーのステップ定義を外部から取得
  const steps = useMemo(() => getWalkthroughSteps({ dispatch, toast }), [dispatch, toast]);

  // 初期データの読み込み
  useEffect(() => {
    loadInitialDemoData();
  }, [loadInitialDemoData]);

  // プレミアム機能の制限（ユーザーの状態変更に合わせてリセット）
  useEffect(() => {
    if (userData && !userData.isPremium) {
      dispatch({ type: 'RESET_PREMIUM_FEATURES' });
    }
  }, [userData, dispatch]);

  const handleWalkthroughComplete = () => {
    dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: false });
    localStorage.setItem('hasSeenWalkthrough', 'true');
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      dispatch({ type: 'START_REPLAY', payload: date });
    }
  };

  const handleToggleWeeklyChart = () => {
    if (userData?.isPremium || state.isDemoData) {
      dispatch({ type: 'TOGGLE_WEEKLY_CHART' });
    } else {
      toast({
        title: 'プレミアム機能',
        description: '週足チャートの表示はプレミアムプランで利用できます。',
        action: (
          <button 
            className="px-3 py-1 bg-amber-500 text-white rounded-md text-sm font-medium" 
            onClick={() => router('/pricing')}
          >
            アップグレード
          </button>
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
    <div className="grid grid-cols-1 grid-rows-[55fr_45fr] lg:grid-rows-1 lg:grid-cols-[1fr_340px] h-full overflow-hidden">
      <WalkthroughGuide 
        steps={steps} 
        isOpen={state.isWalkthroughOpen} 
        onClose={() => dispatch({ type: 'TOGGLE_WALKTHROUGH', payload: false })}
        onComplete={handleWalkthroughComplete}
      />
      
      <div className="flex flex-col h-full min-h-0">
        <ChartHeader 
          title={state.chartTitle}
          fileLoaded={state.fileLoaded}
          currency={state.currency}
          originalCurrency={state.originalCurrency}
          exchangeRate={state.exchangeRate}
          isLoading={isLoading}
          onFileChange={handleFileChange}
          onToggleWeeklyChart={handleToggleWeeklyChart}
        />

        <ChartMainArea 
          isLoading={isLoading}
          fileLoaded={state.fileLoaded}
          isDemoData={state.isDemoData}
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
          showWeeklyChart={state.showWeeklyChart}
          weeklyData={state.weeklyData}
          chartKey={chartKey}
          onToggleWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
          onInteractionEnd={() => setChartKey(prev => prev + 1)}
        />
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
              onClosePosition={(type) => dispatch({ type: 'CLOSE_PARTIAL_POSITION', payload: { type } })}
              onCloseAllPositionsOfType={(type) => dispatch({ type: 'CLOSE_ALL_POSITIONS_OF_TYPE', payload: { type } })}
              onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
              onDateChange={handleDateChange}
              isDemoData={state.isDemoData}
            />
        </div>
      </aside>
    </div>
  );
}
