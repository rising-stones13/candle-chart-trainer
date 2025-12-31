'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // <-- 1. Import Badge
import { useAuth } from '@/context/AuthContext';
import { Home, LineChart, Settings, SlidersHorizontal, LogOut, Menu } from 'lucide-react';
import { ControlPanel, ControlPanelProps } from './control-panel';
import { SettingsPanel } from './settings-panel';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { MailCheck } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  controlPanelProps?: ControlPanelProps;
}

export default function DashboardLayout({ children, controlPanelProps }: DashboardLayoutProps) {
  const { user, userData, logOut } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isChartSettingsDrawerOpen, setIsChartSettingsDrawerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const showChartSettings = pathname === '/';

  if (!user) return null;

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      };
      await sendEmailVerification(user, actionCodeSettings);
      toast({
        title: "確認メールを再送信しました",
        description: "メールボックスをご確認ください。",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "メールの送信に失敗しました。時間をおいてから再度お試しください。",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!user.emailVerified) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <MailCheck className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-2xl font-bold">メール認証が必要です</h1>
          <p className="mt-2 text-muted-foreground">
            ご登録いただいたメールアドレスに確認メールを送信しました。<br />
            メール内のリンクをクリックして、アカウントの認証を完了してください。
          </p>
          <div className="mt-6 flex flex-col gap-2">
             <Button onClick={handleResendVerification} disabled={isResending}>
              {isResending ? '送信中...' : '確認メールを再送信'}
            </Button>
            <Button variant="outline" onClick={logOut}>ログアウト</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>
      </div>
    );
  }

  const handleChartSettingsOpen = () => {
    setIsMobileNavOpen(false);
    setIsChartSettingsDrawerOpen(true);
  }

  const NavContent = () => (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      <Link
        href="/"
        onClick={() => setIsMobileNavOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname === '/' ? 'bg-muted' : ''}`}>
        <Home className="h-4 w-4" />
        ホーム
      </Link>
      <Link
        href="/settings"
        onClick={() => setIsMobileNavOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname === '/settings' ? 'bg-muted' : ''}`}>
        <Settings className="h-4 w-4" />
        アカウント設定
      </Link>
      {showChartSettings && controlPanelProps && (
         <Button variant="ghost" onClick={handleChartSettingsOpen} className="flex items-center gap-3 justify-start rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            チャート設定
        </Button>
      )}
    </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <LineChart className="h-6 w-6" />
              <span className="">ChartTrade Trainer</span>
            </Link>
          </div>
          <div className="flex-1">
            <NavContent />
          </div>
           <div className="mt-auto p-4">
             {!userData?.isPremium && (
               <div className="p-4 mb-4 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">プレミアムにアップグレード</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">全ての機能にアクセスしましょう。</p>
                    <Button size="sm" className="w-full mt-4" asChild>
                       <Link href="/pricing">アップグレード</Link>
                    </Button>
               </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">ナビゲーションメニューを開閉</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-[280px]">
                <SheetHeader className="p-4 border-b text-left">
                    <SheetTitle>ナビゲーション</SheetTitle>
                </SheetHeader>
                <div className="flex-1 py-2">
                    <NavContent />
                </div>
                <div className="mt-auto p-4 border-t">
                    {!userData?.isPremium && (
                       <div className="p-4 bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-xl">
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">プレミアムへ</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">全機能にアクセス</p>
                            <Button size="sm" className="w-full mt-4" asChild>
                               <Link href="/pricing" onClick={() => setIsMobileNavOpen(false)}>アップグレード</Link>
                            </Button>
                       </div>
                    )}
                </div>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1"></div>

          {/* 2. Add Plan Badge */}
          {userData && (
            <Badge variant={userData.isPremium ? 'premium' : 'secondary'} className="hidden sm:inline-flex items-center">
                {userData.isPremium ? 'プレミアムプラン' : 'フリープラン'}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                  <AvatarFallback>{user.email ? user.email.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">ユーザーメニューを開閉</span>
              </Button>
            </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings" passHref>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4"/>
                  <span>アカウント設定</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logOut}><LogOut className="mr-2 h-4 w-4"/>ログアウト</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col bg-background">
            {children}
        </main>
      </div>

      {showChartSettings && controlPanelProps && (
        <Sheet open={isChartSettingsDrawerOpen} onOpenChange={setIsChartSettingsDrawerOpen}>
          <SheetContent side="left" className="p-0 w-[320px] flex flex-col">
              <SheetHeader className="p-4 border-b text-left">
                  <SheetTitle>チャート設定</SheetTitle>
                  <SheetDescription>インジケーターの表示や色を切り替えます。</SheetDescription>
              </SheetHeader>
              <div className="p-4 flex-grow overflow-y-auto">
                  <ControlPanel {...controlPanelProps} />
              </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
