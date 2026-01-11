'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowLeft, Scale } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LegalPage() {
  const { user, loading } = useAuth();

  const Content = () => (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">特定商取引法に基づく表記</h1>
        <p className="text-muted-foreground mt-2">
          特定商取引に関する法律に基づく表示事項です。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            表示事項
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold w-[200px]">販売事業者名</TableCell>
                <TableCell>（ここに応号または氏名を記入してください）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">代表者名</TableCell>
                <TableCell>（ここに代表者名を記入してください）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">所在地</TableCell>
                <TableCell>（ここに住所を記入してください）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">お問い合わせ先</TableCell>
                <TableCell>rising.stones13@gmail.com</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">販売価格</TableCell>
                <TableCell>各プランごとに表示（表示価格は消費税を含みます）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">対価以外に必要となる費用</TableCell>
                <TableCell>インターネット接続料金、通信料金等はお客様のご負担となります。</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">代金の支払時期</TableCell>
                <TableCell>クレジットカード決済：各クレジットカード会社の規定に基づきます。</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">代金の支払方法</TableCell>
                <TableCell>クレジットカード決済（Stripe）</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">サービス提供の時期</TableCell>
                <TableCell>お支払い完了後、直ちにご利用いただけます。</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">返品・キャンセルについて</TableCell>
                <TableCell>サービスの性質上、返品・返金は承っておりません。解約はいつでも設定画面から可能です。</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
         <header className="border-b p-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
            トップへ戻る
          </Link>
          <div className="flex gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">新規登録</Link>
            </Button>
          </div>
        </header>
        <main>
          <Content />
        </main>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}
