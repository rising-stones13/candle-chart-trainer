'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const { user, loading } = useAuth();

  const Content = () => (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">利用規約</h1>
        <p className="text-muted-foreground mt-2">
          この利用規約（以下，「本規約」といいます。）は，ChartTrade Trainer（以下，「当サービス」といいます。）の利用条件を定めるものです。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            利用規約
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                    <section>
                        <h3 className="font-bold text-lg mb-2">第1条（適用）</h3>
                        <p>本規約は，ユーザーと当サービス運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第2条（サービスの内容と制限）</h3>
                        <p>当サービスは，ユーザーが自ら用意した株価データファイルをブラウザ上で可視化し，それを用いたデモトレード（シミュレーション）機能を提供するツールです。</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>当サービスは，現実の株式市場への注文発注や売買執行など，現実の投資機能を提供するものではありません。</li>
                            <li>当サービスの一部機能は有料であり，サブスクリプション（定額制プラン）を購入することにより利用可能となります。有料機能の具体的な内容は，<Link href="/pricing" className="underline hover:text-primary">プレミアムプラン購入画面</Link>に記載の通りとします。</li>
                            <li>当サービスは，ユーザーに対し株価データそのものを提供することはありません。</li>
                            <li>本アプリで利用可能な株価データの形式は，当サービス内の<Link href="/help" className="underline hover:text-primary">ヘルプページ</Link>に記載されている仕様に準拠している必要があります。</li>
                            <li>ユーザーが読み込んだ株価データファイルはブラウザのメモリ上でのみ処理され，当サービスのサーバーにアップロードまたは保存されることはありません。</li>
                            <li>データのバックアップや管理はユーザー自身の責任において行うものとします。</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第3条（禁止事項）</h3>
                        <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>法令または公序良俗に違反する行為</li>
                            <li>犯罪行為に関連する行為</li>
                            <li>本サービスの内容等，本サービスに含まれる著作権，商標権ほか知的財産権を侵害する行為</li>
                            <li>本サービスのサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                            <li>不正な目的を持って本サービスを利用する行為</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第4条（本サービスの提供の停止等）</h3>
                        <p>運営者は，以下のいずれかの事由があると判断した場合，ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                            <li>地震，落雷，火災，停電または天災などの不可抗力により，本サービスの提供が困難となった場合</li>
                            <li>その他，運営者が本サービスの提供が困難と判断した場合</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第5条（免責事項）</h3>
                        <p>運営者は，本サービスに事実上または法律上の瑕疵（安全性，信頼性，正確性，完全性，有効性，特定の目的への適合性，セキュリティなどに関する欠陥，エラーやバグ，権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</p>
                        <p className="mt-2 text-red-500 font-bold">
                            本サービスが提供する情報は投資助言を目的としたものではありません。ユーザーが用意したデータの正確性、整合性、およびそのデータを使用したデモトレードの結果やそれに基づく現実の投資結果について、当サービスは一切の責任を負いません。
                        </p>
                        <p className="mt-2 text-red-500 font-bold">
                            現実の投資は、リスクを十分にご理解の上、ユーザー自身の責任と判断において行ってください。
                        </p>
                        <p className="mt-2">運営者は，本サービスに起因してユーザーに生じたあらゆる損害について、故意または重過失による場合を除き、一切の責任を負いません。</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第6条（有料サービスおよび利用料金）</h3>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>ユーザーは，当サービスの有料サービスを利用する対価として，別途定める利用料金を，運営者が指定する方法により支払うものとします。</li>
                            <li>利用料金の支払いには，Stripe, Inc.が提供する決済サービスを利用します。</li>
                            <li>サブスクリプションは期間の経過により自動的に更新されます。更新を希望しない場合は，次回の更新日までに所定の手続きに従って解約を行う必要があります。</li>
                            <li className="text-red-500 font-bold">ユーザーがサブスクリプションの解約手続きを行った場合，有効期間が残っている場合であっても，解約完了後直ちに有料機能は利用不可となります。これに伴う日割り計算による返金は行いません。</li>
                            <li>利用料金の支払いを遅滞した場合，ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</li>
                            <li>当サービスは，理由の如何を問わず，一度支払われた利用料金の返金には応じないものとします。</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第7条（お問い合わせ）</h3>
                        <p>本規約または当サービスに関するお問い合わせは，以下のメールアドレスまでお願いいたします。</p>
                        <p className="mt-2 font-mono">rising.stones13@gmail.com</p>
                    </section>
                </div>
            </ScrollArea>
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
