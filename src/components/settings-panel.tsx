'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function SettingsPanel() {
  const { user, userData, loading, deleteAccount } = useAuth(); 
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (isCanceling && userData && !userData.isPremium) {
      toast({
        title: "プランが正常に解除されました",
        description: "設定情報を更新しました。",
      });
      setIsCanceling(false);
    }
  }, [userData, isCanceling, toast]);

  const handleDeleteAccount = async () => {
    if (userData?.isPremium) {
      toast({
        variant: "destructive",
        title: "アカウントを削除できません",
        description: "プレミアムプランを解除してからアカウントを削除してください。",
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteAccount();
      toast({
        title: "アカウントが削除されました",
        description: "ご利用ありがとうございました。",
      });
      router.push('/');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: error.message === 'auth/requires-recent-login'
          ? "セキュリティのため、再ログインが必要です。一度ログアウトしてから再度お試しください。"
          : "アカウントの削除に失敗しました。",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    setIsCanceling(true);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'プランの解除に失敗しました。');
      }

    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message,
      });
      setIsCanceling(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>アカウント情報</CardTitle>
          <CardDescription>登録されているアカウント情報を確認できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">メールアドレス:</p>
            <p className="text-base sm:text-lg break-words">{user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium">現在のプラン:</p>
            {userData?.isPremium ? (
              <Badge variant="premium" className="text-base px-3 py-1">プレミアムプラン</Badge>
            ) : (
              <Badge variant="secondary" className="text-base px-3 py-1">フリープラン</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {userData?.isPremium && userData.stripeSubscriptionId && (
        <Card>
          <CardHeader>
            <CardTitle>プレミアムプラン管理</CardTitle>
            <CardDescription>
              現在のプレミアムプランの状況を確認し、必要に応じて解除できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {userData.currentPeriodEnd && (
                <div>
                  <p className="text-sm font-medium">現在の契約期間終了日:</p>
                  <p className="text-lg">
                    {new Date(userData.currentPeriodEnd * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                {/* ▼▼▼ 【修正】ボタンのvariantを`destructive`に変更 ▼▼▼ */}
                <Button variant="destructive" disabled={isCanceling}>
                  {isCanceling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 解除処理中...</> : 'プレミアムプランを解除する'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当にプレミアムプランを解除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作を行うと、現在の契約期間の終了をもってサブスクリプションが停止されます。期間終了までは引き続きプレミアム機能をご利用いただけます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelSubscription} disabled={isCanceling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    解除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>アカウント削除</CardTitle>
          <CardDescription>
            この操作は元に戻せません。アカウントに関連するすべてのデータが完全に削除されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">アカウントを削除する</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当にアカウントを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。現在アクティブなサブスクリプションがある場合、まずそちらを解除してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
