'use client';

import { useAuth } from '@/context/AuthContext';
import { useChart } from '@/context/ChartContext'; // Import the context
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import ChartTradeTrainer from '@/components/chart-trade-trainer';

export default function Home() {
  const { user, loading } = useAuth();
  const { state, dispatch } = useChart(); // Use the chart context

  // Props for the ControlPanel, to be passed to DashboardLayout
  const controlPanelProps = {
    fileLoaded: state.fileLoaded,
    upColor: state.upColor,
    downColor: state.downColor,
    onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => {
      dispatch({ type: 'SET_CANDLE_COLOR', payload: { target, color } });
    },
    maConfigs: state.maConfigs,
    onMaToggle: (period: string) => dispatch({ type: 'TOGGLE_MA', payload: period }),
    rsiConfig: state.rsiConfig,
    onRsiToggle: () => dispatch({ type: 'TOGGLE_RSI' }),
    macdConfig: state.macdConfig,
    onMacdToggle: () => dispatch({ type: 'TOGGLE_MACD' }),
    volumeConfig: state.volumeConfig,
    onVolumeToggle: () => dispatch({ type: 'TOGGLE_VOLUME' }),
    isDemoData: state.isDemoData,
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {user ? (
        // ChartTradeTrainer no longer needs props, it gets them from the context
        <DashboardLayout controlPanelProps={controlPanelProps}>
          <ChartTradeTrainer />
        </DashboardLayout>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold mb-4">ChartTrade Trainerへようこそ</h1>
          <p className="mb-8">ログインまたは新規登録して、トレーディングの練習を始めましょう。</p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">新規登録</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/help" className="hover:text-primary underline underline-offset-4">ヘルプ</Link>
              <Link href="/terms" className="hover:text-primary underline underline-offset-4">利用規約</Link>
              <Link href="/privacy" className="hover:text-primary underline underline-offset-4">プライバシーポリシー</Link>
              <Link href="/legal" className="hover:text-primary underline underline-offset-4">特定商取引法に基づく表記</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ChartTrade Trainer. All rights reserved.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
