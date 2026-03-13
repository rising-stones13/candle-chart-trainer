import React, { Suspense, lazy } from 'react';

// Toasterコンポーネントをクライアントサイドのみで動的にインポート
const Toaster = lazy(() => import('@/components/ui/toaster').then(mod => ({ default: mod.Toaster })));

/**
 * クライアントサイドでのみ実行されるべきプロバイダーをまとめるコンポーネント。
 */
export function ClientProviders() {
  return (
    <Suspense fallback={null}>
      <Toaster />
    </Suspense>
  );
}
