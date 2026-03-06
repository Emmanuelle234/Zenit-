import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { LogIn, LogOut, Shield, User as UserIcon, Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Use onSnapshot for real-time profile updates (like balance)
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
              role: firebaseUser.email === 'kenwayeabraham234@gmail.com' ? UserRole.ADMIN : UserRole.USER,
              balance: 1000, // Starting balance for demo
              interestEarned: 0,
              totalInvested: 0,
              depositAddress: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
              nigeriaAccount: {
                bankName: 'Zenith Bank',
                accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                accountName: `ZENITH-${firebaseUser.displayName?.split(' ')[0].toUpperCase() || 'USER'}-${firebaseUser.uid.slice(0, 4).toUpperCase()}`
              },
              createdAt: new Date().toISOString(),
            };
            setDoc(userDocRef, newProfile).catch(err => handleFirestoreError(err, OperationType.CREATE, 'users'));
            setProfile(newProfile);
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAdmin = profile?.role === UserRole.ADMIN;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);

export const LoginView: React.FC = () => {
  const { signIn, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8f9fa]">
      {/* Left Side - Branding & Features */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-blue-600 p-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-64 -mt-64 blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full -ml-64 -mb-64 blur-[120px]"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/10">
            <Shield className="text-blue-600 w-7 h-7" />
          </div>
          <span className="text-3xl font-black tracking-tighter">Zenith</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-7xl font-black leading-[0.95] tracking-tighter mb-8">
            The future of <span className="text-blue-200">wealth</span> is here.
          </h1>
          <p className="text-xl text-blue-100 leading-relaxed mb-14 font-medium opacity-90">
            Join over 50,000 users building their financial legacy with automated savings, smart investments, and institutional-grade security.
          </p>
          
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-3">
              <h4 className="font-black text-4xl tracking-tighter">$2.4B+</h4>
              <p className="text-[10px] text-blue-200 uppercase tracking-[0.2em] font-black opacity-80">Assets Managed</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-black text-4xl tracking-tighter">99.9%</h4>
              <p className="text-[10px] text-blue-200 uppercase tracking-[0.2em] font-black opacity-80">Uptime Guarantee</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-xs text-blue-200 font-black uppercase tracking-widest opacity-60">
          <span>Trusted by industry leaders</span>
          <div className="flex gap-6 grayscale brightness-200 opacity-40">
            <div className="w-10 h-10 bg-white/20 rounded-xl"></div>
            <div className="w-10 h-10 bg-white/20 rounded-xl"></div>
            <div className="w-10 h-10 bg-white/20 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-24 bg-white">
        <div className="max-w-md w-full space-y-10">
          <div className="md:hidden flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
              <Shield className="text-white w-7 h-7" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-gray-900">Zenith</span>
          </div>

          <div>
            <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-4">Welcome back</h2>
            <p className="text-gray-400 font-bold text-lg">Please enter your details to access your account.</p>
          </div>

          <div className="space-y-6">
            <button
              onClick={signIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-[2rem] font-black text-lg hover:border-blue-600 hover:bg-blue-50 transition-all duration-300 shadow-sm disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            
            <div className="relative flex items-center justify-center py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-50"></div>
              </div>
              <span className="relative bg-white px-6 text-xs text-gray-300 font-black uppercase tracking-[0.3em]">or</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-300"
                />
              </div>
              <button className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-600/30">
                Sign in with Email
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 font-bold">
            Don't have an account? <button className="text-blue-600 font-black hover:underline underline-offset-4">Create one for free</button>
          </p>

          <div className="pt-16 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-300 font-black uppercase tracking-widest">
            <span>© 2026 Zenith Finance Inc.</span>
            <div className="flex gap-8">
              <button className="hover:text-blue-600 transition-colors">Privacy Policy</button>
              <button className="hover:text-blue-600 transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
