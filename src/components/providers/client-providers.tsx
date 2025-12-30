'use client';

import dynamic from 'next/dynamic';

// Toasterコンポーネントをクライアントサイドのみで動的にインポート
// パスを 'sonner' から 'toaster' に修正
const Toaster = dynamic(
  () => import('@/components/ui/toaster').then(mod => mod.Toaster),
  {
    ssr: false,
  }
);

/**
 * クライアントサイドでのみ実行されるべきプロバイダーをまとめるコンポーネント。
 * 現在はToaster（通知）のみを管理。
 */
export function ClientProviders() {
  // ここに将来的に他のクライアント専用プロバイダーを追加できる
  return <Toaster />;
}
