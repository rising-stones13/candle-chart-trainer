import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, TimeChartOptions } from 'lightweight-charts';

export function useLwcChart(options: Partial<TimeChartOptions>) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isChartInitialized, setIsChartInitialized] = useState(false);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) {
        if (!chartRef.current) {
          const chart = createChart(container, options as TimeChartOptions);
          chartRef.current = chart;
          setIsChartInitialized(true);
        }
        chartRef.current.resize(width, height);
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

  return {
    chartContainerRef,
    chartRef,
    isChartInitialized
  };
}
