'use client';

import React, { useReducer, useCallback, useMemo } from 'react';
import { getStockInfoFromFilename } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { parseCSV, generateWeeklyData, calculateMA } from '@/lib/data-helpers';
import type { AppState, CandleData, MAConfig, Position, Trade } from '@/types';
import { StockChart } from './stock-chart';
import { ControlPanel } from './control-panel';
import { TradePanel } from './trade-panel';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PackageOpen, LineChart } from 'lucide-react';

type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: number }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_POSITION'; payload: string }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_WEEKLY_CHART' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_SCALE' };

const initialMAConfigs: Record<string, MAConfig> = {
  '5': { period: 5, color: '#2962FF', visible: true },
  '10': { period: 10, color: '#C2185B', visible: false },
  '20': { period: 20, color: '#FF6D00', visible: true },
  '50': { period: 50, color: '#00897B', visible: true },
  '100': { period: 100, color: '#FDD835', visible: false },
};

const initialState: AppState & { replayDate: Date | null, unrealizedPL: number, realizedPL: number, isLogScale: boolean } = {
  chartData: [],
  weeklyData: [],
  maData: {},
  chartTitle: 'ChartTrade Trainer',
  fileLoaded: false,
  replayIndex: null,
  isReplay: false,
  replayDate: null,
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  showWeeklyChart: false,
  isLogScale: false,
};

function reducer(state: typeof initialState, action: Action & { payload?: any }): typeof initialState {
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title } = action.payload;
      const maData = Object.fromEntries(
        Object.values(initialMAConfigs).map(config => [
          config.period,
          calculateMA(data, config.period),
        ])
      );
      return {
        ...initialState,
        chartData: data,
        weeklyData: generateWeeklyData(data),
        maData,
        chartTitle: title,
        fileLoaded: true,
      };
    }
    case 'START_REPLAY': {
      const date = action.payload as Date;
      const startIndex = state.chartData.findIndex(d => new Date(d.time as string) >= date);
      if (startIndex === -1) return state; // Or show error
      return { ...state, replayIndex: startIndex, isReplay: true, replayDate: date };
    }
    case 'NEXT_DAY': {
      if (state.replayIndex === null || state.replayIndex >= state.chartData.length - 1) {
        return { ...state, isReplay: false }; // End of data
      }
      const newIndex = state.replayIndex + 1;
      const currentPrice = state.chartData[newIndex].close;
      const unrealizedPL = state.positions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.entryPrice) * pos.size : (pos.entryPrice - currentPrice) * pos.size;
        return acc + pl;
      }, 0);
      return { ...state, replayIndex: newIndex, unrealizedPL };
    }
    case 'TRADE': {
      if (state.replayIndex === null) return state;
      const type = action.payload as 'long' | 'short';
      const currentData = state.chartData[state.replayIndex];
      const newPosition: Position = {
        id: crypto.randomUUID(),
        type,
        entryPrice: currentData.close,
        size: 100, // Fixed size
        entryDate: currentData.time,
        entryIndex: state.replayIndex,
      };
      return { ...state, positions: [...state.positions, newPosition] };
    }
    case 'CLOSE_POSITION': {
      if (state.replayIndex === null) return state;
      const positionId = action.payload;
      const positionToClose = state.positions.find(p => p.id === positionId);
      if (!positionToClose) return state;

      const currentPrice = state.chartData[state.replayIndex].close;
      const profit = positionToClose.type === 'long'
        ? (currentPrice - positionToClose.entryPrice) * positionToClose.size
        : (positionToClose.entryPrice - currentPrice) * positionToClose.size;
      
      const newTrade: Trade = {
        ...positionToClose,
        exitPrice: currentPrice,
        exitDate: state.chartData[state.replayIndex].time,
        profit,
      };

      const newRealizedPL = state.realizedPL + profit;
      const newPositions = state.positions.filter(p => p.id !== positionId);
      
      const newUnrealizedPL = newPositions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.entryPrice) * pos.size : (pos.entryPrice - currentPrice) * pos.size;
        return acc + pl;
      }, 0);

      return {
        ...state,
        positions: newPositions,
        tradeHistory: [...state.tradeHistory, newTrade],
        realizedPL: newRealizedPL,
        unrealizedPL: newUnrealizedPL,
      };
    }
    case 'TOGGLE_MA':
      const period = action.payload;
      return {
        ...state,
        maConfigs: {
          ...state.maConfigs,
          [period]: { ...state.maConfigs[period], visible: !state.maConfigs[period].visible },
        },
      };
    case 'TOGGLE_WEEKLY_CHART':
      return { ...state, showWeeklyChart: !state.showWeeklyChart };
    case 'TOGGLE_SCALE':
      return { ...state, isLogScale: !state.isLogScale };
    case 'SET_REPLAY_DATE':
      return { ...state, replayDate: action.payload };
    default:
      return state;
  }
}

function reducerWithDate(state: typeof initialState, action: Action & { payload?: any }): typeof initialState {
    if (action.type === 'SET_REPLAY_DATE') {
        return { ...state, replayDate: action.payload };
    }
    return reducer(state, action);
}


export default function ChartTradeTrainer() {
  const [state, dispatch] = useReducer(reducerWithDate, initialState);
  const { toast } = useToast();

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (data.length === 0) {
        throw new Error("ファイルに有効なデータが含まれていません。");
      }
      
      const stockInfo = await getStockInfoFromFilename(file.name);
      if ('error' in stockInfo) {
        toast({ variant: 'destructive', title: 'エラー', description: stockInfo.error });
        dispatch({ type: 'SET_CHART_DATA', payload: { data, title: file.name } });
      } else {
        const title = `${stockInfo.companyNameJapanese} (${stockInfo.tickerSymbol})`;
        dispatch({ type: 'SET_CHART_DATA', payload: { data, title } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。';
      toast({ variant: 'destructive', title: 'エラー', description: errorMessage });
    }
  }, [toast]);

  const handleStartReplay = () => {
    if(state.replayDate) {
        dispatch({ type: 'START_REPLAY', payload: state.replayDate });
    }
  }

  const chartComponent = useMemo(() => (
    <StockChart
      dailyData={state.chartData}
      weeklyData={state.weeklyData}
      maData={state.maData}
      positions={state.positions}
      tradeHistory={state.tradeHistory}
      replayIndex={state.replayIndex}
      maConfigs={state.maConfigs}
      showWeeklyChart={state.showWeeklyChart}
      onCloseWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
      isLogScale={state.isLogScale}
    />
  ), [state.chartData, state.weeklyData, state.maData, state.positions, state.tradeHistory, state.replayIndex, state.maConfigs, state.showWeeklyChart, state.isLogScale]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[320px_1fr_300px] h-screen max-h-screen overflow-hidden font-body">
      <aside className="border-r border-border flex flex-col h-screen">
        <ControlPanel
          fileLoaded={state.fileLoaded}
          isReplay={state.isReplay}
          replayDate={state.replayDate}
          maConfigs={state.maConfigs}
          showWeeklyChart={state.showWeeklyChart}
          isLogScale={state.isLogScale}
          onFileChange={handleFileChange}
          onStartReplay={handleStartReplay}
          onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
          onDateChange={(date) => dispatch({ type: 'SET_REPLAY_DATE', payload: date })}
          onMaToggle={(period) => dispatch({ type: 'TOGGLE_MA', payload: period })}
          onWeeklyChartToggle={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
          onScaleToggle={() => dispatch({ type: 'TOGGLE_SCALE' })}
        />
      </aside>

      <main className="flex flex-col h-screen bg-background">
        <header className="p-4 border-b border-border">
          <h1 className="text-xl font-bold truncate">{state.chartTitle}</h1>
        </header>
        <div className="flex-grow relative">
            {state.fileLoaded ? (
                chartComponent
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <LineChart className="w-24 h-24 mb-4" />
                    <h2 className="text-2xl font-semibold">ChartTrade Trainer</h2>
                    <p>左のパネルからCSVファイルをアップロードして開始します。</p>
                </div>
            )}
        </div>
      </main>

      <aside className="border-l border-border flex-col h-screen hidden lg:flex">
         <TradePanel
            isReplay={state.isReplay}
            positions={state.positions}
            realizedPL={state.realizedPL}
            unrealizedPL={state.unrealizedPL}
            onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
            onClosePosition={(id) => dispatch({ type: 'CLOSE_POSITION', payload: id })}
        />
      </aside>
    </div>
  );
}
