'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  UserCredential,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

interface UserData {
    email: string | null;
    isPremium: boolean;
}

// reSyncUserを削除
interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  logIn: (email: string, password: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 認証とデータ取得のロジックを1つのuseEffectに統合
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // ユーザーがログインしている場合、FirestoreのonSnapshotリスナーを設定
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            // ドキュメントが存在しない場合は作成
            try {
              await setDoc(userDocRef, { email: user.email, isPremium: false });
            } catch (error) {
              console.error("Failed to create user document:", error);
            }
          }
        });

        if (pathname === '/login') {
          router.push('/');
        }

        setLoading(false);
        return () => unsubscribeSnapshot(); // クリーンアップ時にonSnapshotを解除

      } else {
        // ユーザーがログアウトしている場合
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe(); // クリーンアップ時にonAuthStateChangedを解除
  }, [pathname, router]);


  const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const signUpWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const sendPasswordReset = (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await deleteDoc(userDocRef);
        await deleteUser(currentUser);
      } catch (error: any) {
        console.error("Error deleting user account:", error);
        if (error.code === 'auth/requires-recent-login') {
          throw new Error("auth/requires-recent-login");
        }
        throw error;
      }
    } else {
      throw new Error("No user signed in.");
    }
  };

  // reSyncUserをvalueから削除
  const value = {
    user,
    userData,
    loading,
    signUp,
    logIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    logOut: () => signOut(auth),
    sendPasswordReset,
    logInWithGoogle,
    signUpWithGoogle,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
