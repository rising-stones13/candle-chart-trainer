'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
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
  signInWithPopup 
} from 'firebase/auth';
// ▼▼▼ 【修正】deleteDocを追加 ▼▼▼
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
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const onAuthChange = onAuthStateChanged(auth, (currentUser) => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      setUser(currentUser);

      if (currentUser) {
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

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      email: user.email,
      isPremium: false,
      createdAt: new Date(),
    });
    toast({ 
      title: "アカウントを作成しました",
      description: "Candle Chart Trainerへようこそ！"
    });
  };

  const logIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          isPremium: false,
          createdAt: new Date(),
        });
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
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "ログアウトしました" });
    } catch (error: any) {
      console.error('Logout Error:', error);
      toast({ variant: "destructive", title: "エラー", description: "ログアウトに失敗しました。" });
    }
  };

  // ▼▼▼ 【修正】アカウント削除関数 ▼▼▼
  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast({ variant: "destructive", title: "エラー", description: "再ログインが必要です。" });
      return;
    }
    
    try {
      // 1. Firestoreのユーザーデータを削除
      const userDocRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userDocRef);
      console.log(`Firestore document for user ${currentUser.uid} deleted.`);

      // 2. Firebase Authenticationのユーザーを削除
      await deleteUser(currentUser);
      console.log(`Firebase Auth user ${currentUser.uid} deleted.`);

      toast({ title: "アカウントが正常に削除されました" });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      // エラーコードに応じて、より具体的なメッセージを表示することも可能
      toast({ 
        variant: "destructive", 
        title: "アカウント削除エラー", 
        description: "アカウントの削除に失敗しました。再ログインしてもう一度お試しください。"
      });
      throw error;
    }
  };

  const value = { user, userData, loading, logIn, signUp, logInWithGoogle, logOut, deleteAccount };

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
