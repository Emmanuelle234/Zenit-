import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  writeBatch, 
  doc, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, SavingsGoal, Investment } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp, 
  Target,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  X,
  Coins,
  Building2,
  AlertCircle,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Zap,
  PieChart,
  ArrowUp,
  ArrowDown,
  Cpu,
  Settings as SettingsIcon,
  Calendar,
  Flag,
  MoreHorizontal,
  Activity,
  History,
  Wallet as WalletIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositTab, setDepositTab] = useState<'crypto' | 'bank'>('bank');
  const [walletAction, setWalletAction] = useState<'deposit' | 'withdrawal' | null>(null);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const qGoals = query(
      collection(db, 'savings_goals'),
      where('userId', '==', profile.uid),
      limit(3)
    );

    const qInvestments = query(
      collection(db, 'investments'),
      where('userId', '==', profile.uid),
      limit(3)
    );

    const qBanks = query(
      collection(db, 'bank_details'),
      where('userId', '==', profile.uid)
    );

    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const unsubGoals = onSnapshot(qGoals, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'savings_goals'));

    const unsubInvestments = onSnapshot(qInvestments, (snap) => {
      setInvestments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'investments'));

    const unsubBanks = onSnapshot(qBanks, (snap) => {
      const banks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDetails));
      setBankAccounts(banks);
      const defaultBank = banks.find(b => b.isDefault);
      if (defaultBank) setSelectedBankId(defaultBank.id);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bank_details'));

    return () => {
      unsubTransactions();
      unsubGoals();
      unsubInvestments();
      unsubBanks();
    };
  }, [profile]);

  const handleWalletAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !walletAction || walletAmount <= 0) return;

    if (walletAction === 'withdrawal') {
      if (profile.balance < walletAmount) {
        alert('Insufficient balance');
        return;
      }
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', profile.uid);
    const txRef = doc(collection(db, 'transactions'));

    const amount = walletAction === 'deposit' ? walletAmount : -walletAmount;
    const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

    batch.update(userRef, { balance: increment(amount) });
    
    const tx: Transaction = {
      id: txRef.id,
      userId: profile.uid,
      type: walletAction,
      amount: walletAmount,
      description: walletAction === 'withdrawal' 
        ? `Withdrawal to ${selectedBank?.bankName} (****${selectedBank?.accountNumber.slice(-4)})`
        : `Deposit to main balance`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    batch.set(txRef, tx);

    try {
      await batch.commit();
      setIsWalletModalOpen(false);
      setWalletAmount(0);
      setWalletAction(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'wallet_action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalInvested = investments.reduce((acc, inv) => acc + ((inv.shares ?? 0) * (inv.currentPrice ?? 0)), 0);
  const totalSavings = goals.reduce((acc, goal) => acc + (goal.currentAmount ?? 0), 0);

  useEffect(() => {
    if (!profile) return;

    // Simulate Interest Accrual
    const calculateInterest = async () => {
      const now = new Date();
      const lastPayout = profile.lastInterestPayout ? new Date(profile.lastInterestPayout) : new Date(profile.createdAt);
      const hoursSinceLastPayout = (now.getTime() - lastPayout.getTime()) / (1000 * 60 * 60);

      // If more than 1 hour has passed and user has investments
      if (hoursSinceLastPayout >= 1 && totalInvested > 0) {
        const interestRate = 0.0001; // 0.01% per hour
        const interestAmount = totalInvested * interestRate * Math.floor(hoursSinceLastPayout);

        if (interestAmount > 0) {
          const batch = writeBatch(db);
          const userRef = doc(db, 'users', profile.uid);
          const txRef = doc(collection(db, 'transactions'));

          batch.update(userRef, { 
            balance: increment(interestAmount),
            interestEarned: increment(interestAmount),
            lastInterestPayout: now.toISOString()
          });

          const tx: Transaction = {
            id: txRef.id,
            userId: profile.uid,
            type: 'interest_payout',
            amount: interestAmount,
            description: 'Investment Interest Payout',
            timestamp: now.toISOString(),
            status: 'completed'
          };
          batch.set(txRef, tx);

          try {
            await batch.commit();
            console.log(`Accrued ₦${interestAmount.toFixed(4)} in interest`);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'interest_accrual');
          }
        }
      }
    };

    calculateInterest();
  }, [profile, totalInvested]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section: Balance Card & Quick Actions */}
      <div className="space-y-6">
        <div className="relative h-64 w-full rounded-[2.5rem] overflow-hidden shadow-2xl shadow-brand-primary/20">
          {/* Card Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-secondary"></div>
          
          {/* Abstract Shapes */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-secondary/20 rounded-full blur-3xl"></div>

          <div className="relative h-full p-8 flex flex-col justify-between text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Total Balance</p>
                <h1 className="text-4xl font-black tracking-tighter">
                  ₦{(profile?.balance || 0).toLocaleString()}
                </h1>
              </div>
              <div className="w-12 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
                <div className="w-6 h-6 bg-white/40 rounded-full -mr-2"></div>
                <div className="w-6 h-6 bg-white/20 rounded-full"></div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-mono tracking-widest opacity-60 mb-2">**** **** **** {profile?.uid.slice(-4).toUpperCase()}</p>
                <p className="text-sm font-bold uppercase tracking-widest">{profile?.displayName || 'Card Holder'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Expiry</p>
                <p className="text-sm font-bold">12/28</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Deposit', icon: ArrowDownLeft, color: 'bg-white text-brand-primary', action: () => setIsDepositModalOpen(true) },
            { label: 'Withdraw', icon: ArrowUpRight, color: 'bg-white text-brand-danger', action: () => { setWalletAction('withdrawal'); setIsWalletModalOpen(true); } },
            { label: 'Transfer', icon: Zap, color: 'bg-white text-orange-500', action: () => {} },
            { label: 'History', icon: History, color: 'bg-white text-gray-400', action: () => {} },
          ].map((item, idx) => (
            <button 
              key={idx} 
              onClick={item.action}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 ${item.color} rounded-2xl shadow-sm border border-black/[0.02] flex items-center justify-center transition-all group-hover:shadow-md group-hover:-translate-y-1`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Financial Overview</h2>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outcome Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-6">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#ff9f43" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset="130" strokeLinecap="round" />
                </svg>
                <ArrowUpRight className="absolute w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outcome</p>
                <p className="text-xl font-black text-gray-900">₦460.00</p>
              </div>
            </div>

            {/* Income Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-6">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#0052FF" strokeWidth="4" strokeDasharray="175.9" strokeDashoffset="80" strokeLinecap="round" />
                </svg>
                <ArrowDownLeft className="absolute w-6 h-6 text-brand-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Income</p>
                <p className="text-xl font-black text-gray-900">₦840.00</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total net worth</p>
                <p className="text-lg font-black text-gray-900">₦{((profile?.balance || 0) + totalInvested + totalSavings).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total earnings</p>
                <p className="text-lg font-black text-gray-900">₦{(profile?.interestEarned ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Harvested losses</p>
                <p className="text-lg font-black text-gray-900">₦0.00</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-black/[0.02] flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total for all goals</p>
                <p className="text-lg font-black text-gray-900">₦{totalSavings.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Wallets Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Wallets</h2>
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[
              { symbol: 'BTC', percentage: 69, color: 'bg-orange-500', icon: '₿' },
              { symbol: 'ETH', percentage: 82, color: 'bg-blue-600', icon: 'Ξ' },
              { symbol: 'USDT', percentage: 99, color: 'bg-emerald-500', icon: '₮', active: true },
              { symbol: 'SOL', percentage: 45, color: 'bg-purple-600', icon: 'S' },
            ].map((wallet, idx) => (
              <div 
                key={idx}
                className={`flex-shrink-0 w-28 h-60 rounded-[2.5rem] flex flex-col items-center justify-between py-8 transition-all relative overflow-hidden group ${
                  wallet.active ? 'shadow-2xl shadow-brand-primary/30' : 'bg-white border border-black/[0.02]'
                }`}
              >
                {/* Background Accent for Active */}
                {wallet.active && (
                  <div className={`absolute inset-0 ${wallet.color} opacity-100 transition-opacity`}></div>
                )}
                
                <div className="relative z-10 flex flex-col items-center justify-between h-full">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${wallet.active ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-400'}`}>
                    {wallet.icon}
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-2xl font-black ${wallet.active ? 'text-white' : 'text-gray-900'}`}>
                      {wallet.percentage}%
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${wallet.active ? 'text-white/60' : 'text-gray-400'}`}>
                      {wallet.symbol}
                    </span>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${wallet.active ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-300 group-hover:bg-brand-primary/10 group-hover:text-brand-primary'}`}>
                    <ArrowUp className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
            
            <button className="flex-shrink-0 w-28 h-60 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 hover:border-brand-primary transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-brand-primary/10">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-brand-primary" />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest rotate-90 whitespace-nowrap">Add Asset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Mining Status */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Mining Status</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-success rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-brand-success uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'GPUs mining', status: 'Running...', color: 'bg-brand-secondary', icon: Cpu, value: '480 MH/s' },
              { label: 'CPUs mining', status: 'Running...', color: 'bg-orange-400', icon: Zap, value: '12.4 KH/s' },
              { label: 'Est. daily USD', status: '$125.03', color: 'bg-brand-primary', icon: WalletIcon, value: '+$12.40' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-black/[0.02] flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">{item.value}</p>
                  <div className="w-8 h-4 bg-gray-100 rounded-full relative p-0.5 mt-1">
                    <div className="w-3 h-3 bg-brand-success rounded-full shadow-sm ml-auto"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Transactions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Latest Activity</h3>
            <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-5 rounded-3xl shadow-sm border border-black/[0.02] flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                        ? 'bg-emerald-50 text-emerald-500' 
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                        ? <ArrowDownLeft className="w-6 h-6" /> 
                        : <ArrowUpRight className="w-6 h-6" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{tx.description}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${
                      tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                        ? 'text-emerald-500' 
                        : 'text-red-500'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout' ? '+' : '-'}
                      ₦{(tx.amount ?? 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Success</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center space-y-4 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">No recent activity found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Personal / Quick Links */}
        <div className="space-y-6">
          <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Personal</h3>
          <div className="space-y-4">
            {[
              { label: 'Savings Goals', icon: Target, color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Investment Portfolio', icon: TrendingUp, color: 'text-brand-primary', bg: 'bg-blue-50' },
              { label: 'Security Settings', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: 'Help & Support', icon: AlertCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map((item, idx) => (
              <button key={idx} className="w-full bg-white p-5 rounded-3xl shadow-sm border border-black/[0.02] flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modals remain the same but with updated styling */}
      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <button 
                onClick={() => setIsDepositModalOpen(false)}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
 
              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Add Money</h2>
                <p className="text-gray-500 font-medium mb-8">Choose your preferred deposit method.</p>
                
                <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                  <button 
                    onClick={() => setDepositTab('bank')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${depositTab === 'bank' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Bank Transfer
                  </button>
                  <button 
                    onClick={() => setDepositTab('crypto')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${depositTab === 'crypto' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Crypto (USDT)
                  </button>
                </div>

                <div className="space-y-6">
                  {depositTab === 'bank' ? (
                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Name</p>
                          <p className="text-lg font-bold text-gray-900">{profile?.nigeriaAccount?.bankName || 'Zenith Bank'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xl font-black text-brand-primary tracking-tight">{profile?.nigeriaAccount?.accountNumber || '1234567890'}</p>
                            <button 
                              onClick={() => copyToClipboard(profile?.nigeriaAccount?.accountNumber || '')}
                              className="p-2 text-gray-400 hover:text-brand-primary transition-colors"
                            >
                              {copied ? <CheckCircle2 className="w-5 h-5 text-brand-success" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                          <p className="text-sm font-bold text-gray-900">{profile?.nigeriaAccount?.accountName || 'ZENITH-USER-1234'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Deposit Address (USDT-TRC20)</label>
                        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-black/5 group">
                          <code className="flex-1 text-sm font-mono font-bold text-gray-900 break-all">
                            {profile?.depositAddress || '0x...'}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(profile?.depositAddress || '')}
                            className="p-2 text-gray-400 hover:text-brand-primary transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-5 h-5 text-brand-success" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
 
                  <button 
                    onClick={() => setIsDepositModalOpen(false)}
                    className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-primary/20"
                  >
                    I've made the payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wallet Modal */}
      <AnimatePresence>
        {isWalletModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative"
            >
              <button 
                onClick={() => { setIsWalletModalOpen(false); setWalletAction(null); }}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-extrabold text-gray-900 mb-8 capitalize tracking-tight">
                {walletAction}
              </h2>
              
              <form onSubmit={handleWalletAction} className="space-y-8">
                {walletAction === 'withdrawal' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Withdraw to</label>
                    {profile?.nigeriaAccount ? (
                      <div className="p-6 bg-gray-50 rounded-2xl border border-black/5 space-y-2">
                        <p className="text-sm font-bold text-gray-900">{profile.nigeriaAccount.bankName}</p>
                        <p className="text-xs text-gray-400 font-bold">{profile.nigeriaAccount.accountNumber}</p>
                        <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">{profile.nigeriaAccount.accountName}</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium leading-relaxed">
                          No bank accounts linked. Please update your profile.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">₦</div>
                      <input 
                        required
                        type="number"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="w-full pl-14 pr-6 py-6 bg-gray-50 border-none rounded-[1.5rem] text-3xl font-bold focus:ring-2 focus:ring-brand-primary outline-none"
                        value={walletAmount || ''}
                        onChange={e => setWalletAmount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || walletAmount <= 0}
                  className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-brand-primary/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Confirm ${walletAction}`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
