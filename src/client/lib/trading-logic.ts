import { Time } from 'lightweight-charts';
import { Position, PositionEntry, Trade } from '@shared/types';

/**
 * 未実現損益を計算する
 */
export function calculateUnrealizedPL(
  positions: Position[],
  currentPrice: number,
  conversionFactor: number
): number {
  return positions.reduce((acc, pos) => {
    const pl = pos.type === 'long' 
      ? (currentPrice - pos.avgPrice) * pos.totalSize 
      : (pos.avgPrice - currentPrice) * pos.totalSize;
    return acc + (pl * conversionFactor);
  }, 0);
}

/**
 * 新規トレード（エントリー）を処理する
 */
export function processTrade(
  positions: Position[],
  type: 'long' | 'short',
  currentPrice: number,
  currentTime: Time,
  conversionFactor: number
): { positions: Position[]; unrealizedPL: number } {
  const newPositions = [...positions];
  const existingPosIndex = newPositions.findIndex(p => p.type === type);

  const newEntry: PositionEntry = {
    id: Math.random().toString(36).substring(2, 9),
    price: currentPrice,
    size: 100, // 100単位ずつ取引
    date: currentTime,
  };

  if (existingPosIndex >= 0) {
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
    newPositions.push({
      type,
      entries: [newEntry],
      totalSize: newEntry.size,
      avgPrice: newEntry.price,
    });
  }

  const unrealizedPL = calculateUnrealizedPL(newPositions, currentPrice, conversionFactor);
  return { positions: newPositions, unrealizedPL };
}

/**
 * 一部決済（FIFO）を処理する
 */
export function processClosePartial(
  positions: Position[],
  type: 'long' | 'short',
  currentPrice: number,
  currentTime: Time,
  conversionFactor: number
): { positions: Position[]; newTrade: Trade; profit: number; unrealizedPL: number } | null {
  const posIndex = positions.findIndex(p => p.type === type);
  if (posIndex === -1 || positions[posIndex].entries.length === 0) return null;

  const pos = positions[posIndex];
  // FIFO: 最も古いエントリーを決済
  const entryToClose = pos.entries[0];
  const closeAmount = entryToClose.size;

  const profit_original = pos.type === 'long'
    ? (currentPrice - entryToClose.price) * closeAmount
    : (entryToClose.price - currentPrice) * closeAmount;

  const profit = profit_original * conversionFactor;

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
  const newPositions = [...positions];

  if (remainingEntries.length === 0) {
    newPositions.splice(posIndex, 1);
  } else {
    const newSize = remainingEntries.reduce((sum, e) => sum + e.size, 0);
    const newAvgPrice = remainingEntries.reduce((sum, e) => sum + (e.price * e.size), 0) / newSize;
    newPositions[posIndex] = {
      ...pos,
      entries: remainingEntries,
      totalSize: newSize,
      avgPrice: newAvgPrice,
    };
  }
  
  const unrealizedPL = calculateUnrealizedPL(newPositions, currentPrice, conversionFactor);

  return {
    positions: newPositions,
    newTrade,
    profit,
    unrealizedPL
  };
}

/**
 * 特定の種別の全ポジションを決済する
 */
export function processCloseAll(
  positions: Position[],
  type: 'long' | 'short',
  currentPrice: number,
  currentTime: Time,
  conversionFactor: number
): { positions: Position[]; newTrades: Trade[]; realizedPLUpdate: number; unrealizedPL: number } {
  const posToClose = positions.find(p => p.type === type);
  if (!posToClose) {
    return {
      positions,
      newTrades: [],
      realizedPLUpdate: 0,
      unrealizedPL: calculateUnrealizedPL(positions, currentPrice, conversionFactor)
    };
  }

  let realizedPLUpdate = 0;
  const newTrades: Trade[] = [];

  for (const entry of posToClose.entries) {
    const profit_original = posToClose.type === 'long'
      ? (currentPrice - entry.price) * entry.size
      : (entry.price - currentPrice) * entry.size;
    
    const profit = profit_original * conversionFactor;
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

  const newPositions = positions.filter(p => p.type !== type);
  const unrealizedPL = calculateUnrealizedPL(newPositions, currentPrice, conversionFactor);

  return {
    positions: newPositions,
    newTrades,
    realizedPLUpdate,
    unrealizedPL,
  };
}
