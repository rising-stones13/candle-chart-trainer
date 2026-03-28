import React from 'react';
import { LineChart, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StockChart } from './StockChart';
import { WeeklyChart } from './WeeklyChart';
import { FloatingWindow } from '../floating-window';
import { CandleData, Trade, MAConfig, RSIConfig, MACDConfig, VolumeConfig } from '@shared/types';

interface ChartMainAreaProps {
  isLoading: boolean;
  fileLoaded: boolean;
  isDemoData: boolean;
  chartData: CandleData[];
  positions: any[];
  tradeHistory: Trade[];
  maConfigs: Record<string, MAConfig>;
  rsiData: any[];
  macdData: any[];
  replayIndex: number | null;
  upColor: string;
  downColor: string;
  volumeConfig: VolumeConfig;
  isPremium: boolean;
  chartTitle: string;
  showWeeklyChart: boolean;
  weeklyData: CandleData[];
  chartKey: number;
  onToggleWeeklyChart: () => void;
  onInteractionEnd: () => void;
}

export const ChartMainArea: React.FC<ChartMainAreaProps> = ({
  isLoading,
  fileLoaded,
  isDemoData,
  chartData,
  positions,
  tradeHistory,
  maConfigs,
  rsiData,
  macdData,
  replayIndex,
  upColor,
  downColor,
  volumeConfig,
  isPremium,
  chartTitle,
  showWeeklyChart,
  weeklyData,
  chartKey,
  onToggleWeeklyChart,
  onInteractionEnd
}) => {
  return (
    <div className="flex flex-col h-full min-h-0 border-r">
      {fileLoaded && isDemoData && (
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-16 h-16 mb-4 animate-spin" />
              <p>データを読み込んでいます...</p>
            </div>
          ) : fileLoaded ? (
            <>
              <div className="flex-1 relative">
                <div className="absolute inset-0">
                  <StockChart
                    key={`${chartTitle}-${upColor}-${downColor}-daily`}
                    chartData={chartData}
                    positions={positions}
                    tradeHistory={tradeHistory}
                    maConfigs={maConfigs}
                    rsiData={rsiData}
                    macdData={macdData}
                    replayIndex={replayIndex}
                    upColor={upColor}
                    downColor={downColor}
                    volumeConfig={volumeConfig}
                    isPremium={isPremium}
                    chartTitle={chartTitle}
                  />
                </div>
              </div>
              {showWeeklyChart && (
                <FloatingWindow 
                  title="週足チャート (フローティング)" 
                  isOpen={showWeeklyChart} 
                  onClose={onToggleWeeklyChart}
                  onInteractionEnd={onInteractionEnd}
                >
                  {(size: { width: number, height: number }) => (
                    <WeeklyChart
                      key={`${chartTitle}-weekly-floating-${chartKey}`}
                      data={weeklyData}
                      upColor={upColor}
                      downColor={downColor}
                      maConfigs={maConfigs}
                      isPremium={isPremium}
                      replayIndex={replayIndex}
                      dailyChartData={chartData}
                    />
                  )}
                </FloatingWindow>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <LineChart className="w-24 h-24 mb-4" />
              <h2 className="text-2xl font-semibold">ChartTrade Trainer</h2>
              <p>「ファイルを開く」から株価データ(JSON)を読み込みます。</p>
            </div>
          )}
      </main>
    </div>
  );
};
