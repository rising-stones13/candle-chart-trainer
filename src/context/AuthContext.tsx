'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState,
  useMemo,
  useCallback,
  ReactNode 
} from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signOut, 
  deleteUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signInWithPopup,
  reauthenticateWithPopup
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface UserData {
  isPremium: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);

    let unsubscribe: (() => void) | undefined;

    const onAuthChange = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      setUser(currentUser);

      if (currentUser) {
        // Securely sync Stripe status using the ID Token
        currentUser.getIdToken().then(async (token) => {
          console.log(`[AuthContext] currentUser found: ${currentUser.uid}. Attempting to sync Stripe status...`);
          
          // サーバー側の反映待ちやレースコンディションを回避するため、わずかに待機
          await new Promise(resolve => setTimeout(resolve, 1000));

          fetch('/api/sync-stripe-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: currentUser.uid }),
          })
          .then(response => {
              console.log(`[AuthContext] Sync API response status: ${response.status}`);
              if (!response.ok) {
                if (response.status === 404) {
                  console.warn("[AuthContext] Sync API endpoint not found (404). Skipping.");
                  return null;
                }
                throw new Error(`Sync failed with status: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              if (data) {
                console.log(`[AuthContext] Sync API response data:`, data);
              }
          })
          .catch(err => {
            console.error("[AuthContext] Error fetching sync-stripe-status:", err);
          });
        }).catch(err => {
          console.error("[AuthContext] Error getting ID token:", err);
        });

        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          } else {
            setUserData(null); 
          }
          setLoading(false);
        }, (error) => {
          console.error("Error in snapshot listener:", error);
          setUserData(null);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      onAuthChange();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // ユーザーデータの初期化ロジックを共通化
  const ensureUserDoc = useCallback(async (user: User) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        isPremium: false,
        createdAt: new Date(),
      });
      return true;
    }
    return false;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(result.user);
      
      toast({ 
        title: "アカウントを作成しました",
        description: "Candle Chart Trainerへようこそ！"
      });
    } catch (error: any) {
      let message = 'アカウントの作成に失敗しました。';
      if (error.code === 'auth/email-already-in-use') {
        message = 'このメールアドレスは既に使用されています。';
      } else if (error.code === 'auth/invalid-email') {
        message = 'メールアドレスの形式が正しくありません。';
      } else if (error.code === 'auth/weak-password') {
        message = 'パスワードが短すぎます（6文字以上必要です）。';
      }

      // Reduce console noise for expected user errors
      if (error.code === 'auth/email-already-in-use') {
        console.warn('Signup Attempt: Email already in use');
      } else {
        console.error('Signup Error:', error);
      }

      toast({
        variant: "destructive",
        title: "サインアップエラー",
        description: message
      });
      throw new Error(message);
    }
  }, [toast]);

  const logIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "ログインしました" });
    } catch (error: any) {
      let message = "ログインに失敗しました。";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "メールアドレスまたはパスワードが正しくありません。";
      }
      toast({ 
        variant: "destructive", 
        title: "ログインエラー", 
        description: message 
      });
      throw error;
    }
  }, [toast]);

  const logInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const isNewUser = await ensureUserDoc(result.user);

      if (isNewUser) {
        toast({ 
          title: "アカウントを作成しました",
          description: "Candle Chart Trainerへようこそ！"
        });
      } else {
        toast({ title: "ログインしました" });
      }
    } catch (error: any) {
      console.error("Google Login Error:", error);
      toast({ 
        variant: "destructive", 
        title: "ログインエラー", 
        description: "Googleアカウントでのログインに失敗しました。"
      });
    }
  }, [toast]);

  const logOut = useCallback(async () => {
    try {
      await signOut(auth);
      toast({ title: "ログアウトしました" });
    } catch (error: any) {
      console.error('Logout Error:', error);
      toast({ variant: "destructive", title: "エラー", description: "ログアウトに失敗しました。" });
    }
  }, [toast]);

  const deleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ variant: "destructive", title: "エラー", description: "再ログインが必要です。" });
      return;
    }
    
    try {
      const uid = currentUser.uid;
      const userDocRef = doc(db, 'users', uid);

      // 1. 先にFirestoreのデータを削除（認証が有効なうちに実行）
      await deleteDoc(userDocRef);
      console.log(`[AuthContext] Firestore document for user ${uid} deleted.`);

      // 2. 次にFirebase Authユーザーを削除
      // ※ セッションが古い場合はここで 'auth/requires-recent-login' がスローされます
      await deleteUser(currentUser);
      console.log(`[AuthContext] Firebase Auth user ${uid} deleted.`);

      toast({ title: "アカウントが正常に削除されました" });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        const isGoogle = currentUser.providerData.some(
          (p) => p.providerId === GoogleAuthProvider.PROVIDER_ID
        );

        if (isGoogle) {
          try {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(currentUser, provider);
            
            // Re-authentication successful, try deleting again.
            await deleteUser(currentUser);
            toast({ title: "アカウントが正常に削除されました" });
            return;
          } catch (reAuthError: any) {
            console.error("Re-authentication failed:", reAuthError);
            let message = "再認証に失敗しました。";
            if (reAuthError.code === 'auth/popup-blocked') {
              message = "再認証ポップアップがブロックされました。ブラウザの設定を確認し、ポップアップを許可してから再度お試しください。";
            } else if (reAuthError.code === 'auth/cancelled-popup-request') {
              message = "再認証がキャンセルされました。";
            }
            
            toast({ 
              variant: "destructive", 
              title: "再認証エラー", 
              description: message
            });
            return;
          }
        }
      }

      let message = "アカウントの削除に失敗しました。";
      if (error.code === 'auth/requires-recent-login') {
        message = "セキュリティ保護のため、アカウント削除には再ログインが必要です。一度ログアウトしてから再度ログインし、直後に削除をお試しください。";
      }

      toast({ 
        variant: "destructive", 
        title: "アカウント削除エラー", 
        description: message
      });
      throw error;
    }
  }, [toast]);

  const value = useMemo(() => ({ 
    user, 
    userData, 
    loading, 
    logIn, 
    signUp, 
    logInWithGoogle, 
    logOut, 
    deleteAccount 
  }), [
    user, userData, loading, logIn, signUp, logInWithGoogle, logOut, deleteAccount
  ]);

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="h-screen w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
