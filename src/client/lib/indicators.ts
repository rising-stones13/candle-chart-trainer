import type { CandleData, LineData, MacdData } from '@shared/types';

export function calculateMA(data: CandleData[], period: number): LineData[] {
  const result: LineData[] = [];
  if (!data || data.length < period) {
    return [];
  }
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: NaN });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({
        time: data[i].time,
        value: parseFloat((sum / period).toFixed(2)),
      });
    }
  }
  return result;
}

export function calculateRSI(data: CandleData[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (!data || data.length < period) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
    result.push({ time: data[i].time, value: NaN });
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  result[period-1] = { time: data[period-1].time, value: 100 - (100 / (1 + rs)) };

  for (let i = period; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    let gain = 0;
    let loss = 0;
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result[i] = { time: data[i].time, value: 100 - (100 / (1 + rs)) };
  }
  
  const rsiData = data.map((d, i) => {
    const rsiPoint = result.find(r => r.time === d.time);
    return {
      time: d.time,
      value: rsiPoint ? rsiPoint.value : NaN,
    };
  });

  return rsiData;
}

function calculateEMA(data: number[], period: number): (number | undefined)[] {
  const k = 2 / (period + 1);
  const emaArray: (number | undefined)[] = new Array(data.length);
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  emaArray[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    emaArray[i] = (data[i] * k) + (emaArray[i - 1]! * (1 - k));
  }
  return emaArray;
}

export function calculateMACD(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdData[] {
  if (data.length < slowPeriod) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  const fastEMAs = calculateEMA(closePrices, fastPeriod);
  const slowEMAs = calculateEMA(closePrices, slowPeriod);

  const macdLine: (number | undefined)[] = [];
  for (let i = 0; i < data.length; i++) {
    const fast = fastEMAs[i];
    const slow = slowEMAs[i];
    if (fast !== undefined && slow !== undefined) {
      macdLine.push(fast - slow);
    } else {
      macdLine.push(undefined);
    }
  }

  const macdResult: MacdData[] = data.map(d => ({
    time: d.time,
    macd: undefined,
    signal: undefined,
    histogram: undefined,
  }));

  const firstMacdIndex = macdLine.findIndex(v => v !== undefined);
  if (firstMacdIndex !== -1) {
    const validMacdLine = macdLine.slice(firstMacdIndex) as number[];
    const signalLine = calculateEMA(validMacdLine, signalPeriod);

    for (let i = 0; i < signalLine.length; i++) {
      const targetIndex = firstMacdIndex + i;
      const macdValue = macdLine[targetIndex]!;
      const signalValue = signalLine[i];
      
      macdResult[targetIndex].macd = macdValue;
      macdResult[targetIndex].signal = signalValue;
      if (signalValue !== undefined) {
        macdResult[targetIndex].histogram = macdValue - signalValue;
      }
    }
  }

  return macdResult;
}
