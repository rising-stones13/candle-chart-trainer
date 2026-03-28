
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CandleData, MAConfig, RSIConfig, MACDConfig, VolumeConfig, Position, Trade } from '@shared/types';
import { generateWeeklyData } from '@/lib/data-transformations';
import { 
  calculateUnrealizedPL, 
  processTrade, 
  processClosePartial, 
  processCloseAll 
} from '@/lib/trading-logic';

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
  isDemoData: boolean;
  isWalkthroughOpen: boolean;
  currency: string;
  originalCurrency?: string;
  exchangeRate?: number;
  conversionFactor: number;
}

// Define the actions
type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string; currency?: string; originalCurrency?: string; exchangeRate?: number; conversionFactor?: number } }
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
  | { type: 'SET_CANDLE_COLOR'; payload: { target: 'upColor' | 'downColor'; color: string } }
  | { type: 'TOGGLE_WALKTHROUGH'; payload?: boolean };

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
  isDemoData: false,
  isWalkthroughOpen: false,
  currency: 'JPY',
  conversionFactor: 1,
};

// Reducer function
function chartReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title, currency, originalCurrency, exchangeRate, conversionFactor } = action.payload;
      const isDemoData = title.includes('デモ株式会社') || title.includes('サンプルデータ');
      return {
        ...state,
        chartData: data,
        weeklyData: generateWeeklyData(data),
        chartTitle: title,
        fileLoaded: true,
        isDemoData,
        currency: currency || 'JPY',
        originalCurrency,
        exchangeRate,
        conversionFactor: conversionFactor || 1,
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
      const unrealizedPL = calculateUnrealizedPL(state.positions, currentPrice, state.conversionFactor);
      return { ...state, replayIndex: newIndex, unrealizedPL };
    }
    case 'TRADE': {
      if (state.replayIndex === null) return state;
      const { positions, unrealizedPL } = processTrade(
        state.positions,
        action.payload,
        state.chartData[state.replayIndex].close,
        state.chartData[state.replayIndex].time,
        state.conversionFactor
      );
      return { ...state, positions, unrealizedPL };
    }
    case 'CLOSE_PARTIAL_POSITION': {
      if (state.replayIndex === null) return state;
      const result = processClosePartial(
        state.positions,
        action.payload.type,
        state.chartData[state.replayIndex].close,
        state.chartData[state.replayIndex].time,
        state.conversionFactor
      );
      if (!result) return state;
      return {
        ...state,
        positions: result.positions,
        tradeHistory: [result.newTrade, ...state.tradeHistory],
        realizedPL: state.realizedPL + result.profit,
        unrealizedPL: result.unrealizedPL
      };
    }
    case 'CLOSE_ALL_POSITIONS_OF_TYPE': {
      if (state.replayIndex === null) return state;
      const result = processCloseAll(
        state.positions,
        action.payload.type,
        state.chartData[state.replayIndex].close,
        state.chartData[state.replayIndex].time,
        state.conversionFactor
      );
      return {
        ...state,
        positions: result.positions,
        tradeHistory: [...result.newTrades, ...state.tradeHistory],
        realizedPL: state.realizedPL + result.realizedPLUpdate,
        unrealizedPL: result.unrealizedPL,
      };
    }
    case 'TOGGLE_WEEKLY_CHART':
      return { ...state, showWeeklyChart: !state.showWeeklyChart };
    case 'TOGGLE_WALKTHROUGH':
      return { ...state, isWalkthroughOpen: action.payload !== undefined ? action.payload : !state.isWalkthroughOpen };
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
