import { SettingsPanel } from '@/components/settings-panel';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="mb-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1 pl-0">
              <ChevronLeft className="h-4 w-4" />
              ホームに戻る
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold">アカウント設定</h1>
        <p className="text-muted-foreground">アカウント情報、プラン、その他の設定を管理します。</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
