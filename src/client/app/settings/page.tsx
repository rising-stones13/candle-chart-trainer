import { SettingsPanel } from '@/components/settings-panel';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'アカウント設定',
};

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
       <div className="mb-6">
        <h1 className="text-2xl font-bold">アカウント設定</h1>
        <p className="text-muted-foreground">アカウント情報、プラン、その他の設定を管理します。</p>
       </div>
       <SettingsPanel />
    </div>
  );
}
