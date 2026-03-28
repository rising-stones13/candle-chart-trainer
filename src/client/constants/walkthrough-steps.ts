import { WalkthroughStep } from '@/components/ui/walkthrough-guide';
import { Dispatch } from 'react';

interface GetWalkthroughStepsParams {
  dispatch: Dispatch<any>;
  toast: (params: any) => void;
}

export const getWalkthroughSteps = ({ dispatch, toast }: GetWalkthroughStepsParams): WalkthroughStep[] => [
  {
    target: '#wt-file-open',
    title: 'データを読み込む',
    content: 'まずはここから株価データ(JSON)を読み込みます。現在はデモデータが表示されています。',
    position: 'bottom',
  },
  {
    target: '#wt-chart-area',
    title: 'チャート操作',
    content: '読み込んだデータのローソク足チャートが表示されます。マウスホイールでズーム、ドラッグで移動が可能です。',
    position: 'top',
  },
  {
    target: '#wt-weekly-chart',
    title: '週足チャート（プレミアム）',
    content: 'プレミアムプランでは、日足と同時に週足チャートをフローティングウィンドウで表示し、マルチタイムフレーム分析が可能です。',
    position: 'bottom',
  },
  {
    target: '#wt-date-picker',
    title: 'リプレイ開始日の選択',
    content: 'まずはデモトレードを開始する日付を選択します。ここでは例として2025年4月25日にセットしました。この時点より未来のチャートが隠され、リプレイモードが始まります。',
    position: 'left',
    onEnter: () => {
      // デモデータの開始日時から少し進んだ日付を計算してセット
      const startTimestamp = 1744115277;
      const targetTimestamp = startTimestamp + (14 * 24 * 60 * 60); // 14日後
      const demoDate = new Date(targetTimestamp * 1000);
      
      dispatch({ type: 'START_REPLAY', payload: demoDate });
      toast({ title: "ガイド: リプレイモードを開始しました", description: "「翌日へ進む」ボタンが有効になりました。" });
    }
  },
  {
    target: '#wt-next-day',
    title: '翌日へ進む',
    content: '「翌日へ進む」ボタンをクリックしてみてください。チャートが1日分進み、さらに自動で数日分進行します。',
    position: 'left',
    advanceOnClick: true,
    onTargetClick: () => {
      // クリックをトリガーに数日分進める
      let count = 0;
      const interval = setInterval(() => {
        if (count < 5) {
          dispatch({ type: 'NEXT_DAY' });
          count++;
        } else {
          clearInterval(interval);
        }
      }, 200); // 速めのペースで進める
    }
  },
  {
    target: '#wt-trade-long',
    title: 'エントリー（買い）',
    content: '上昇を予想したら「買い」ボタンをクリックしてエントリーしましょう。',
    position: 'left',
    advanceOnClick: true
  },
  {
    target: '#wt-positions',
    title: 'ポジションの確認と決済',
    content: 'ポジションを持つとここに情報が表示されます。チャート上の「E」マークがエントリーポイントです。最後に「決済」ボタン（全決済など）をクリックして、この練習を終了しましょう。',
    position: 'left',
    advanceOnClick: true
  },
];
