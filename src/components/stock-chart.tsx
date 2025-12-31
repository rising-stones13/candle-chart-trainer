'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CrosshairMode, 
  TimeChartOptions,
  LineData as LWCLineData, 
  HistogramData, 
  LineStyle, 
  ColorType,
  PriceScaleMode,
  Time,
  SeriesMarker
} from 'lightweight-charts';
import { calculateMA } from '@/lib/data-helpers';
import type { CandleData, Trade, MAConfig, MacdData, LineData, PositionEntry, VolumeConfig } from '@/types';

const getChartOptions = (upColor: string, downColor: string, title: string) => ({
  layout: {
    background: { type: ColorType.Solid, color: '#15191E' },
    textColor: 'rgba(230, 230, 230, 0.9)',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
  },
  watermark: {
    visible: true,
    fontSize: 16,
    horzAlign: 'left',
    vertAlign: 'top',
    color: 'rgba(255, 255, 255, 0.5)',
    text: title,
  },
  grid: {
    vertLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
    horzLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
  },
  crosshair: { 
    mode: CrosshairMode.Magnet,
  },
  rightPriceScale: { 
    borderColor: '#3a3e4a',
  },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#3a3e4a',
        height: 30,
        rightBarStaysOnScroll: true,
      },  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
  },
});

const getCandleSeriesOptions = (upColor: string, downColor: string) => ({
  upColor: upColor,
  downColor: downColor,
  borderDownColor: downColor,
  borderUpColor: upColor,
  wickDownColor: downColor,
  wickUpColor: upColor,
});

export interface WeeklyChartProps {
  data: CandleData[];
  upColor: string;
  downColor: string;
  maConfigs: Record<string, MAConfig>;
  isPremium: boolean;
  replayIndex: number | null;
  dailyChartData: CandleData[];
}

export function WeeklyChart({ data, upColor, downColor, maConfigs, isPremium, replayIndex, dailyChartData }: WeeklyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRef = useRef<Record<string, ISeriesApi<any>>>({});
  const [isChartInitialized, setIsChartInitialized] = useState(false);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) {
        if (!chartRef.current) {
          const chartOptions = {
            ...getChartOptions(upColor, downColor, '週足チャート'),
          };
          const chart = createChart(container, chartOptions as TimeChartOptions);
          chartRef.current = chart;
          
          candleSeriesRef.current = chart.addCandlestickSeries(getCandleSeriesOptions(upColor, downColor));

          Object.values(maConfigs).forEach(config => {
            maSeriesRef.current[`ma${config.period}`] = chart.addLineSeries({ 
              color: config.color, 
              lineWidth: 2, 
              lastValueVisible: false, 
              priceLineVisible: false 
            });
          });
          setIsChartInitialized(true);
        }
        chartRef.current.resize(width, height);
        chartRef.current.timeScale().applyOptions({
          visible: true,
          timeVisible: true,
          secondsVisible: false,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isChartInitialized || !chartRef.current || !candleSeriesRef.current) return;
    
    candleSeriesRef.current.applyOptions(getCandleSeriesOptions(upColor, downColor));
    candleSeriesRef.current.setData(data);

    Object.values(maConfigs).forEach(config => {
      const series = maSeriesRef.current[`ma${config.period}`];
      if (series) {
        const maData = calculateMA(data, config.period);
        series.setData(maData);
        series.applyOptions({ visible: isPremium && config.visible });
      }
    });
    const dataSize = data.length;
    if (dataSize > 0) {
      const to = dataSize - 1;
      const from = Math.max(0, dataSize - 100); // 直近100件を表示
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    } else {
      chartRef.current.timeScale().fitContent();
    }
  }, [isChartInitialized, data, upColor, downColor, maConfigs, isPremium]);

  useEffect(() => {
    if (!chartRef.current || replayIndex === null || !dailyChartData[replayIndex]) return;

    // 現在の日付に対応する週を検索
    const dailyDate = new Date((dailyChartData[replayIndex].time as number) * 1000);
    const dayOfWeek = dailyDate.getUTCDay();
    const weekStartDate = new Date(dailyDate.getTime());
    weekStartDate.setUTCDate(dailyDate.getUTCDate() - dayOfWeek);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    const weekStartTime = weekStartDate.getTime() / 1000;

    const weeklyIndex = data.findIndex(d => d.time === weekStartTime);

    if (weeklyIndex !== -1) {
      const to = weeklyIndex;
      const from = Math.max(0, to - 99); // 常に100件のデータを表示
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    }
  }, [replayIndex, data, dailyChartData]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}

export interface StockChartProps {
  chartData: CandleData[];
  positions: (PositionEntry & { type: 'long' | 'short' })[];
  tradeHistory: Trade[];
  replayIndex: number | null;
  maConfigs: Record<string, MAConfig>;
  rsiData: LineData[];
  macdData: MacdData[];
  upColor: string;
  downColor: string;
  volumeConfig: VolumeConfig;
  isPremium: boolean;
  chartTitle: string;
}

export function StockChart({
  chartData,
  positions,
  tradeHistory,
  replayIndex,
  maConfigs,
  rsiData,
  macdData,
  upColor,
  downColor,
  volumeConfig,
  isPremium,
  chartTitle,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Record<string, ISeriesApi<any>>>({});
  const [isChartInitialized, setIsChartInitialized] = useState(false);
  
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) {
        if (!chartRef.current) {
          const chart = createChart(container, {
            ...getChartOptions(upColor, downColor, chartTitle),
          } as TimeChartOptions);
          chartRef.current = chart;
          
          seriesRef.current.candle = chart.addCandlestickSeries(getCandleSeriesOptions(upColor, downColor));
          seriesRef.current.volume = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            priceLineVisible: false,
          });
          chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
          Object.values(maConfigs).forEach(config => {
              const period = config.period.toString();
              seriesRef.current[`ma${period}`] = chart.addLineSeries({ color: config.color, lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          });
          seriesRef.current.rsi = chart.addLineSeries({ priceScaleId: 'rsi', color: '#FFC107', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });
          seriesRef.current.macdLine = chart.addLineSeries({ priceScaleId: 'macd', color: '#2196F3', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          seriesRef.current.macdSignal = chart.addLineSeries({ priceScaleId: 'macd', color: '#FF5252', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          seriesRef.current.macdHistogram = chart.addHistogramSeries({ priceScaleId: 'macd', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
          chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
          setIsChartInitialized(true);
        }
        chartRef.current.resize(width, height);
        chartRef.current.timeScale().applyOptions({
          visible: true,
          timeVisible: true,
          secondsVisible: false,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (!isChartInitialized || !chartRef.current || !seriesRef.current.candle) return;
    
    seriesRef.current.candle.applyOptions(getCandleSeriesOptions(upColor, downColor));

    const currentData = replayIndex === null ? chartData : chartData.slice(0, replayIndex + 1);

    seriesRef.current.candle.setData(currentData);
    const volumeData = currentData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(8, 153, 129, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
    seriesRef.current.volume.setData(volumeData as HistogramData[]);

    if (seriesRef.current.volume && chartRef.current) {
      seriesRef.current.volume.applyOptions({ visible: volumeConfig.visible });
      chartRef.current.priceScale('volume').applyOptions({ visible: volumeConfig.visible });
    }

    Object.values(maConfigs).forEach(config => {
        const period = config.period.toString();
        const series = seriesRef.current[`ma${period}`];
        if (series) {
            const maData = calculateMA(currentData, config.period);
            series.setData(maData);
            series.applyOptions({ visible: isPremium && config.visible });
        }
    });

    if (seriesRef.current.rsi) {
        const rsiSlice = rsiData.slice(0, currentData.length);
        seriesRef.current.rsi.setData(rsiSlice);
        chartRef.current.priceScale('rsi').applyOptions({ visible: rsiData.length > 0 });
    }
    
    if (seriesRef.current.macdLine && seriesRef.current.macdSignal && seriesRef.current.macdHistogram) {
        const macdSlice = macdData.slice(0, currentData.length);
        const macdLine = macdSlice.map(d => ({ time: d.time, value: d.macd })).filter(d => d.value !== undefined);
        const signalLine = macdSlice.map(d => ({ time: d.time, value: d.signal })).filter(d => d.value !== undefined);
        const histogramData = macdSlice.map(d => ({ time: d.time, value: d.histogram, color: d.histogram && d.histogram > 0 ? upColor : downColor })).filter(d => d.value !== undefined);

        seriesRef.current.macdLine.setData(macdLine as LWCLineData[]);
        seriesRef.current.macdSignal.setData(signalLine as LWCLineData[]);
        seriesRef.current.macdHistogram.setData(histogramData as HistogramData[]);

        const isVisible = macdData.length > 0;
        chartRef.current.priceScale('macd').applyOptions({ visible: isVisible });
    }

    const dataSize = currentData.length;
    if (dataSize > 0) {
      const to = dataSize - 1;
      const from = Math.max(0, dataSize - 100); // 直近100件を表示
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    } else {
      chartRef.current.timeScale().fitContent();
    }

  }, [isChartInitialized, chartData, replayIndex, maConfigs, rsiData, macdData, upColor, downColor, volumeConfig, isPremium]);
  
  useEffect(() => {
    if (!seriesRef.current.candle) return;
    
    const tradeMarkers = tradeHistory.flatMap(trade => [
        { time: trade.entryDate, position: 'belowBar' as const, color: '#2196F3', shape: 'arrowUp' as const, text: `E` },
        { time: trade.exitDate, position: 'aboveBar' as const, color: trade.profit > 0 ? '#4CAF50' : '#F44336', shape: 'arrowDown' as const, text: `X` },
    ]);
    
    const positionMarkers = positions.map(p => ({ 
        time: p.date, 
        position: (p.type === 'long' ? 'belowBar' : 'aboveBar'), 
        color: p.type === 'long' ? '#2196F3' : '#F44336', 
        shape: 'circle' as const, 
        text: `${p.type.charAt(0).toUpperCase()}` 
    }));

    const allMarkers: SeriesMarker<Time>[] = [...tradeMarkers, ...positionMarkers];
    const sortedMarkers = allMarkers.sort((a, b) => {
        const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() / 1000 : a.time as number;
        const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() / 1000 : b.time as number;
        return timeA - timeB;
    });
    
    seriesRef.current.candle.setMarkers(sortedMarkers);
    
  }, [positions, tradeHistory, upColor, downColor]);

  return (
    <div ref={chartContainerRef} className="w-full h-full" />
  );
}
