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
  | { type: 'CLOSE_PARTIAL_POSITION'; payload: { type: 'long' | 'short'; amount: number } }
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

      if (existingPosIndex >= 0) {
        const pos = newPositions[existingPosIndex];
        const newSize = pos.totalSize + 1;
        const newAvgPrice = (pos.avgPrice * pos.totalSize + currentPrice) / newSize;
        newPositions[existingPosIndex] = { ...pos, totalSize: newSize, avgPrice: newAvgPrice };
      } else {
        newPositions.push({
          id: Math.random().toString(36).substring(2, 9),
          type,
          entryPrice: currentPrice,
          avgPrice: currentPrice,
          totalSize: 1,
          entryTime: currentTime as number,
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
      const { type, amount } = action.payload;
      const currentPrice = state.chartData[state.replayIndex].close;
      const currentTime = state.chartData[state.replayIndex].time;

      const posIndex = state.positions.findIndex(p => p.type === type);
      if (posIndex === -1) return state;

      const pos = state.positions[posIndex];
      const closeAmount = Math.min(amount, pos.totalSize);
      const profit = type === 'long' ? (currentPrice - pos.avgPrice) * closeAmount : (pos.avgPrice - currentPrice) * closeAmount;

      let newPositions = [...state.positions];
      if (pos.totalSize === closeAmount) {
        newPositions.splice(posIndex, 1);
      } else {
        newPositions[posIndex] = { ...pos, totalSize: pos.totalSize - closeAmount };
      }

      const newTrade: Trade = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        entryPrice: pos.avgPrice,
        exitPrice: currentPrice,
        size: closeAmount,
        pl: profit,
        time: currentTime as number,
      };

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
