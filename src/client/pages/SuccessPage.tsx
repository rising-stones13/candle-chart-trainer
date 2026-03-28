import { useNavigate as useRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function SuccessPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [message, setMessage] = useState('決済情報を確認しています...');

  // 決済完了の同期処理
  useEffect(() => {
    const syncStatus = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/sync-stripe-status', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('[SuccessPage] Stripe status synced successfully');
        }
      } catch (error) {
        console.error('[SuccessPage] Error syncing status:', error);
      }
    };

    if (user && !authLoading) {
      syncStatus();
    }
  }, [user, authLoading]);

  // isPremiumがtrueになったらリダイレクトするロジック
  useEffect(() => {
    if (!authLoading) {
      if (userData?.isPremium) {
        setMessage('ありがとうございます！ホーム画面に移動します...');
        const redirectTimeout = setTimeout(() => {
          router('/');
        }, 2000);
        return () => clearTimeout(redirectTimeout);
      }
    }
  }, [userData, authLoading, router]);

  // フォールバック用のタイムアウト処理
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!userData?.isPremium) {
        setMessage('処理に時間がかかっています。お手数ですが、一度ホームに戻り、再ログインをお試しください。');
      }
    }, 15000); // 15 seconds (reduced from 30)

    return () => clearTimeout(fallbackTimeout);
  }, [userData]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <Loader2 className="animate-spin text-primary w-24 h-24 mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-center">
        {message}
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        プレミアムプランへの登録処理を行っています。この処理は通常数秒で完了します。この画面を閉じないでください。
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button variant="outline" size="sm">ホームに戻る</Button>
        </Link>
      </div>
    </div>
  );
}

