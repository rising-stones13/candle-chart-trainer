import { ColorType, LineStyle, CrosshairMode, TimeChartOptions, DeepPartial } from 'lightweight-charts';

export const getChartOptions = (upColor: string, downColor: string, title: string): DeepPartial<TimeChartOptions> => ({
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
    fontFamily: 'Inter, sans-serif',
    fontStyle: '',
  },
  grid: {
    vertLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
    horzLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
  },
  crosshair: { 
    mode: CrosshairMode.Magnet,
    vertLine: { labelVisible: true },
    horzLine: { labelVisible: true },
  },
  rightPriceScale: { 
    borderColor: '#3a3e4a',
    visible: true,
  },
  timeScale: {
    visible: true,
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#3a3e4a',
    rightBarStaysOnScroll: true,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: true,
    axisDoubleClickReset: true,
  },
});

export const getCandleSeriesOptions = (upColor: string, downColor: string) => ({
  upColor: upColor,
  downColor: downColor,
  borderDownColor: downColor,
  borderUpColor: upColor,
  wickDownColor: downColor,
  wickUpColor: upColor,
});
