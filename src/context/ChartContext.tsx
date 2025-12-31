'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CandleData, MAConfig, RSIConfig, MACDConfig, VolumeConfig, Position, Trade } from '@/types';
import { generateWeeklyData } from '@/lib/data-helpers';

// Define the shape of the state
interface AppState {
  chartData: CandleData[];
  weeklyData: CandleData[];
  chartTitle: string;
  fileLoaded: boolean;
  replayIndex: number | null;
  isReplay: boolean;
  positions: Position[];
  tradeHistory: Trade[];
  realizedPL: number;
  unrealizedPL: number;
  maConfigs: Record<string, MAConfig>;
  rsiConfig: RSIConfig;
  macdConfig: MACDConfig;
  volumeConfig: VolumeConfig;
  showWeeklyChart: boolean;
  upColor: string;
  downColor: string;
}

// Define the actions
type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: Date }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_PARTIAL_POSITION'; payload: { type: 'long' | 'short' } }
  | { type: 'CLOSE_ALL_POSITIONS_OF_TYPE'; payload: { type: 'long' | 'short' } }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_RSI' }
  | { type: 'TOGGLE_MACD' }
  | { type: 'TOGGLE_VOLUME' }
  | { type: 'RESET_PREMIUM_FEATURES' }
  | { type: 'TOGGLE_WEEKLY_CHART' }
  | { type: 'SET_CANDLE_COLOR'; payload: { target: 'upColor' | 'downColor'; color: string } };

// Initial state values
const initialMAConfigs: Record<string, MAConfig> = {
  '5': { period: 5, color: '#FF5252', visible: true },
  '10': { period: 10, color: '#4CAF50', visible: true },
  '20': { period: 20, color: '#2196F3', visible: true },
  '50': { period: 50, color: '#9C27B0', visible: true },
  '100': { period: 100, color: '#FF9800', visible: true },
};

const initialRsiConfig: RSIConfig = { visible: false, period: 14 };
const initialMacdConfig: MACDConfig = { visible: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
const initialVolumeConfig: VolumeConfig = { visible: true };

const initialState: AppState = {
  chartData: [],
  weeklyData: [],
  chartTitle: 'ChartTrade Trainer',
  fileLoaded: false,
  replayIndex: null,
  isReplay: false,
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  rsiConfig: initialRsiConfig,
  macdConfig: initialMacdConfig,
  volumeConfig: initialVolumeConfig,
  showWeeklyChart: false,
  upColor: '#ef5350',
  downColor: '#26a69a',
};

// Reducer function
function chartReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title } = action.payload;
      return {
        ...state, // ユーザーが設定したインジケーターや色などの設定を維持
        chartData: data,
        weeklyData: generateWeeklyData(data),
        chartTitle: title,
        fileLoaded: true,
        // セッション固有の状態のみリセット
        replayIndex: null,
        isReplay: false,
        positions: [],
        tradeHistory: [],
        realizedPL: 0,
        unrealizedPL: 0,
      };
    }
    case 'START_REPLAY': {
      const date = action.payload as Date;
      const startIndex = state.chartData.findIndex(d => new Date((d.time as number) * 1000) >= date);
      if (startIndex === -1) return state;
      return { ...state, replayIndex: startIndex, isReplay: true, positions: [], tradeHistory: [], realizedPL: 0, unrealizedPL: 0 };
    }
    case 'NEXT_DAY': {
      if (state.replayIndex === null || state.replayIndex >= state.chartData.length - 1) {
        return { ...state, isReplay: false };
      }
      const newIndex = state.replayIndex + 1;
      const currentPrice = state.chartData[newIndex].close;
      const unrealizedPL = state.positions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.avgPrice) * pos.totalSize : (pos.avgPrice - currentPrice) * pos.totalSize;
        return acc + pl;
      }, 0);
      return { ...state, replayIndex: newIndex, unrealizedPL };
    }
    case 'TRADE': {
      if (state.replayIndex === null) return state;
      const type = action.payload;
      const currentPrice = state.chartData[state.replayIndex].close;
      const currentTime = state.chartData[state.replayIndex].time;

      const existingPosIndex = state.positions.findIndex(p => p.type === type);
      let newPositions = [...state.positions];

      const newEntry: PositionEntry = {
        id: Math.random().toString(36).substring(2, 9),
        price: currentPrice,
        size: 1, // 1単位ずつ取引
        date: currentTime,
      };

      if (existingPosIndex >= 0) {
        // 既存ポジションの更新
        const pos = newPositions[existingPosIndex];
        const newEntries = [...pos.entries, newEntry];
        const newSize = newEntries.reduce((sum, e) => sum + e.size, 0);
        const newAvgPrice = newEntries.reduce((sum, e) => sum + (e.price * e.size), 0) / newSize;
        
        newPositions[existingPosIndex] = {
          ...pos,
          entries: newEntries,
          totalSize: newSize,
          avgPrice: newAvgPrice
        };
      } else {
        // 新規ポジションの作成
        newPositions.push({
          type,
          entries: [newEntry],
          totalSize: newEntry.size,
          avgPrice: newEntry.price,
        });
      }

      const unrealizedPL = newPositions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.avgPrice) * pos.totalSize : (pos.avgPrice - currentPrice) * pos.totalSize;
        return acc + pl;
      }, 0);

      return { ...state, positions: newPositions, unrealizedPL };
    }
    case 'CLOSE_PARTIAL_POSITION': {
      if (state.replayIndex === null) return state;
      const { type } = action.payload; // amount is ignored, we close one entry (FIFO)
      const currentPrice = state.chartData[state.replayIndex].close;
      const currentTime = state.chartData[state.replayIndex].time;

      const posIndex = state.positions.findIndex(p => p.type === type);
      if (posIndex === -1 || state.positions[posIndex].entries.length === 0) return state;

      const pos = state.positions[posIndex];
      // FIFO: oldest entry is closed
      const entryToClose = pos.entries[0];
      const closeAmount = entryToClose.size;

      const profit = pos.type === 'long'
        ? (currentPrice - entryToClose.price) * closeAmount
        : (entryToClose.price - currentPrice) * closeAmount;

      const newTrade: Trade = {
        id: entryToClose.id,
        type,
        entryPrice: entryToClose.price,
        exitPrice: currentPrice,
        size: closeAmount,
        entryDate: entryToClose.date,
        exitDate: currentTime,
        profit,
      };

      const remainingEntries = pos.entries.slice(1);
      let newPositions = [...state.positions];

      if (remainingEntries.length === 0) {
        // Position fully closed
        newPositions.splice(posIndex, 1);
      } else {
        // Position partially closed
        const newSize = remainingEntries.reduce((sum, e) => sum + e.size, 0);
        const newAvgPrice = remainingEntries.reduce((sum, e) => sum + (e.price * e.size), 0) / newSize;
        newPositions[posIndex] = {
          ...pos,
          entries: remainingEntries,
          totalSize: newSize,
          avgPrice: newAvgPrice,
        };
      }
      
      const unrealizedPL = newPositions.reduce((acc, p) => {
        const pl = p.type === 'long' ? (currentPrice - p.avgPrice) * p.totalSize : (p.avgPrice - currentPrice) * p.totalSize;
        return acc + pl;
      }, 0);

      return {
        ...state,
        positions: newPositions,
        tradeHistory: [newTrade, ...state.tradeHistory],
        realizedPL: state.realizedPL + profit,
        unrealizedPL
      };
    }
    case 'CLOSE_ALL_POSITIONS_OF_TYPE': {
      const { type } = action.payload;
      if (state.replayIndex === null) return state;
      
      const posToClose = state.positions.find(p => p.type === type);
      if (!posToClose) return state;

      const currentPrice = state.chartData[state.replayIndex].close;
      const currentTime = state.chartData[state.replayIndex].time;
      let realizedPLUpdate = 0;
      const newTrades: Trade[] = [];

      for (const entry of posToClose.entries) {
        const profit = posToClose.type === 'long'
          ? (currentPrice - entry.price) * entry.size
          : (entry.price - currentPrice) * entry.size;
        
        realizedPLUpdate += profit;

        newTrades.push({
          id: entry.id,
          type: posToClose.type,
          entryPrice: entry.price,
          exitPrice: currentPrice,
          size: entry.size,
          entryDate: entry.date,
          exitDate: currentTime,
          profit,
        });
      }

      const newPositions = state.positions.filter(p => p.type !== type);
      const newUnrealizedPL = newPositions.reduce((acc, p) => {
        const pl = p.type === 'long' ? (currentPrice - p.avgPrice) * p.totalSize : (p.avgPrice - currentPrice) * p.totalSize;
        return acc + pl;
      }, 0);

      return {
        ...state,
        positions: newPositions,
        tradeHistory: [...newTrades, ...state.tradeHistory],
        realizedPL: state.realizedPL + realizedPLUpdate,
        unrealizedPL: newUnrealizedPL,
      };
    }
    case 'TOGGLE_WEEKLY_CHART':
      return { ...state, showWeeklyChart: !state.showWeeklyChart };
    case 'TOGGLE_MA': {
      const id = action.payload;
      if (!state.maConfigs[id]) return state;
      return {
        ...state,
        maConfigs: {
          ...state.maConfigs,
          [id]: { ...state.maConfigs[id], visible: !state.maConfigs[id].visible },
        },
      };
    }
    case 'TOGGLE_RSI':
      return { ...state, rsiConfig: { ...state.rsiConfig, visible: !state.rsiConfig.visible } };
    case 'TOGGLE_MACD':
      return { ...state, macdConfig: { ...state.macdConfig, visible: !state.macdConfig.visible } };
    case 'TOGGLE_VOLUME':
      return { ...state, volumeConfig: { ...state.volumeConfig, visible: !state.volumeConfig.visible } };
    case 'SET_CANDLE_COLOR': {
      const { target, color } = action.payload;
      return { ...state, [target]: color };
    }
    case 'RESET_PREMIUM_FEATURES':
      return {
        ...state,
        rsiConfig: { ...state.rsiConfig, visible: false },
        macdConfig: { ...state.macdConfig, visible: false },
      };
    default:
      return state;
  }
}

// Create the context
const ChartContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

// Create a provider component
export function ChartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chartReducer, initialState);

  return (
    <ChartContext.Provider value={{ state, dispatch }}>
      {children}
    </ChartContext.Provider>
  );
}

// Create a custom hook to use the context
export function useChart() {
  const context = useContext(ChartContext);
  if (context === undefined) {
    throw new Error('useChart must be used within a ChartProvider');
  }
  return context;
}
