'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignUpPage() {
  // ▼▼▼ 【修正】AuthContextから必要な関数を取得 ▼▼▼
  const { signUp, logInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ▼▼▼ 【修正】メール・パスワードでの登録処理 ▼▼▼
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password);
      router.push('/'); // 登録成功後、ホームページにリダイレクト
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive",
        title: "登録エラー", 
        description: error.message || "アカウントの作成に失敗しました。"
      });
      setLoading(false);
    }
  };

  // ▼▼▼ 【修正】Googleでの登録処理 ▼▼▼
  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await logInWithGoogle();
      router.push('/'); // 成功後、ホームページにリダイレクト
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive",
        title: "登録エラー", 
        description: error.message || "Googleアカウントでの登録に失敗しました。"
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">新規登録</CardTitle>
          <CardDescription>メールアドレスとパスワードを入力してアカウントを作成します。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">パスワード</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登録中...' : 'アカウントを作成'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
