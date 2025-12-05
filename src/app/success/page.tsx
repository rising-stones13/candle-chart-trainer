'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function SuccessPage() {
  const router = useRouter();
  // reSyncUserを削除し、シンプルに
  const { userData, loading: authLoading } = useAuth();
  const [message, setMessage] = useState('決済情報を確認しています...');

  // isPremiumがtrueになったらリダイレクトするロジック（変更なし）
  useEffect(() => {
    if (!authLoading) {
      if (userData?.isPremium) {
        setMessage('ありがとうございます！ホーム画面に移動します...');
        const redirectTimeout = setTimeout(() => {
          router.push('/');
        }, 2000);
        return () => clearTimeout(redirectTimeout);
      }
    }
  }, [userData, authLoading, router]);

  // フォールバック用のタイムアウト処理のみ残す
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      // onSnapshotが機能しない場合に備えたフォールバックメッセージ
      setMessage('処理に時間がかかっています。お手数ですが、一度ホームに戻り、再ログインをお試しください。');
    }, 30000); // 30 seconds

    return () => clearTimeout(fallbackTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <Loader2 className="animate-spin text-primary w-24 h-24 mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-center">
        {message}
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        プレミアムプランへの登録処理を行っています。この処理は通常数秒で完了します。この画面を閉じないでください。
      </p>
      <Link href="/" passHref>
        <Button variant="outline" size="sm">ホームに戻る</Button>
      </Link>
    </div>
  );
}
