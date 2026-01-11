'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Code, ArrowLeft } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HelpPage() {
  const { user, loading } = useAuth();

  const sampleJson = `{
  "chart": {
    "result": [
      {
        "meta": {
          "currency": "JPY",
          "symbol": "7203.T",
          "exchangeName": "JPX",
          "instrumentType": "EQUITY",
          "firstTradeDate": 1609459200,
          "regularMarketTime": 1609459200,
          "gmtoffset": 32400,
          "timezone": "JST",
          "exchangeTimezoneName": "Asia/Tokyo",
          "regularMarketPrice": 2000,
          "chartPreviousClose": 1950,
          "previousClose": 1950,
          "scale": 3,
          "priceHint": 2
        },
        "timestamp": [1672531200, 1672617600],
        "indicators": {
          "quote": [
            {
              "open": [100.5, 102.0],
              "high": [105.0, 103.5],
              "low": [99.0, 101.0],
              "close": [102.0, 103.0],
              "volume": [10000, 15000]
            }
          ]
        }
      }
    ],
    "error": null
  }
}`;

  const Content = () => (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ヘルプ & ドキュメント</h1>
        <p className="text-muted-foreground mt-2">
          ChartTrade Trainerで使用するカスタムデータの形式について説明します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            データ入力フォーマット
          </CardTitle>
          <CardDescription>
            本アプリケーションは、以下の構造を持つJSON形式のデータに対応しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">必須項目</h3>
            <p className="text-sm text-muted-foreground mb-4">
              以下の項目を含むJSONファイルが必要です。すべての配列は同じ長さである必要があります。
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">項目名 (JSON Path)</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].timestamp</TableCell>
                  <TableCell>取引日時のUNIXタイムスタンプ（秒）</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].indicators.quote[0].open</TableCell>
                  <TableCell>始値</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].indicators.quote[0].high</TableCell>
                  <TableCell>高値</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].indicators.quote[0].low</TableCell>
                  <TableCell>安値</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].indicators.quote[0].close</TableCell>
                  <TableCell>終値</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].indicators.quote[0].volume</TableCell>
                  <TableCell>出来高</TableCell>
                  <TableCell>number[]</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">メタデータ (meta)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              銘柄に関する情報を含めることができます。これらはチャートのタイトル表示に使用されます。
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">項目名 (JSON Path)</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].meta.longName</TableCell>
                  <TableCell>銘柄の正式名称（例: "トヨタ自動車株式会社"）</TableCell>
                  <TableCell>string</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">chart.result[0].meta.symbol</TableCell>
                  <TableCell>銘柄コードやシンボル（例: "7203.T"）</TableCell>
                  <TableCell>string</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="sample-json">
              <AccordionTrigger>サンプルJSONを表示</AccordionTrigger>
              <AccordionContent>
                <div className="bg-muted p-4 rounded-md overflow-x-auto">
                  <pre className="text-xs font-mono">{sampleJson}</pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg text-sm border border-blue-200 dark:border-blue-900">
            <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">ヒント</p>
            <p className="text-blue-700 dark:text-blue-400">
              外部から取得したデータをこの形式に整形して保存することで、本アプリケーションで読み込むことができます。
              メタデータ（currency, symbolなど）は必須ではありませんが、含まれているとチャート上に表示されます。
            </p>
          </div>
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
