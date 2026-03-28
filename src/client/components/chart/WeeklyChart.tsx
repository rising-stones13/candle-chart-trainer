import React, { useEffect, useRef } from 'react';
import { ISeriesApi, TimeChartOptions } from 'lightweight-charts';
import { calculateMA } from '@/lib/indicators';
import { useChart } from '@/context/ChartContext';
import { useLwcChart } from '@/hooks/use-lwc-chart';
import { getChartOptions, getCandleSeriesOptions } from './chart-utils';
import type { CandleData, MAConfig } from '@shared/types';

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
  const { state } = useChart();
  const { chartContainerRef, chartRef, isChartInitialized } = useLwcChart(
    getChartOptions(upColor, downColor, '週足チャート') as TimeChartOptions
  );
  
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeriesRef = useRef<Record<string, ISeriesApi<any>>>({});

  useEffect(() => {
    if (!isChartInitialized || !chartRef.current) return;

    const chart = chartRef.current;
    candleSeriesRef.current = chart.addCandlestickSeries(getCandleSeriesOptions(upColor, downColor));

    Object.values(maConfigs).forEach(config => {
      maSeriesRef.current[`ma${config.period}`] = chart.addLineSeries({ 
        color: config.color, 
        lineWidth: 2, 
        lastValueVisible: false, 
        priceLineVisible: false 
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChartInitialized]);

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
      const from = Math.max(0, dataSize - 100);
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    } else {
      chartRef.current.timeScale().fitContent();
    }
  }, [isChartInitialized, data, upColor, downColor, maConfigs, isPremium, chartRef]);

  useEffect(() => {
    if (!chartRef.current || replayIndex === null || !dailyChartData[replayIndex]) return;

    const dailyDate = new Date((dailyChartData[replayIndex].time as number) * 1000);
    const dayOfWeek = dailyDate.getUTCDay();
    const weekStartDate = new Date(dailyDate.getTime());
    weekStartDate.setUTCDate(dailyDate.getUTCDate() - dayOfWeek);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    const weekStartTime = weekStartDate.getTime() / 1000;

    const weeklyIndex = data.findIndex(d => d.time === weekStartTime);

    if (weeklyIndex !== -1) {
      const to = weeklyIndex;
      const from = Math.max(0, to - 99);
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to });
    }
  }, [replayIndex, data, dailyChartData, chartRef]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
