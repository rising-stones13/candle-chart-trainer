'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const { user, loading } = useAuth();

  const Content = () => (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">プライバシーポリシー</h1>
        <p className="text-muted-foreground mt-2">
          ユーザーの皆様の個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            プライバシーポリシー
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
            <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                    <section>
                        <h3 className="font-bold text-lg mb-2">第1条（個人情報の収集方法）</h3>
                        <p>当サービスは，ユーザーが利用登録をする際に氏名，生年月日，住所，電話番号，メールアドレス，銀行口座番号，クレジットカード番号などの個人情報をお尋ねすることがあります。</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第2条（個人情報を収集・利用する目的）</h3>
                        <p>当サービスが個人情報を収集・利用する目的は，以下のとおりです。</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>当サービスの提供・運営のため</li>
                            <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                            <li>ユーザーが利用中のサービスの新機能，更新情報，キャンペーン等及び当サービスが提供する他のサービスの案内のメールを送付するため</li>
                            <li>メンテナンス，重要なお知らせなど必要に応じたご連絡のため</li>
                            <li>利用規約に違反したユーザーや，不正・不当な目的でサービスを利用しようとするユーザーの特定をし，ご利用をお断りするため</li>
                            <li>ユーザーにご自身の登録情報の閲覧や変更，削除，ご利用状況の閲覧を行っていただくため</li>
                            <li>有料サービスにおいて，ユーザーに利用料金を請求するため</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第3条（個人情報の第三者提供）</h3>
                        <p>当サービスは，次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。ただし，個人情報保護法その他の法令で認められる場合を除きます。</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第4条（アクセス解析ツールについて）</h3>
                        <p>当サービスでは、Googleによるアクセス解析ツール「Googleアナリティクス」を利用しています。このGoogleアナリティクスはトラフィックデータの収集のためにクッキー（Cookie）を使用しています。トラフィックデータは匿名で収集されており、個人を特定するものではありません。</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-lg mb-2">第5条（お問い合わせ窓口）</h3>
                        <p>個人情報の取扱いに関するお問い合わせは，以下のメールアドレスまでお願いいたします。</p>
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
