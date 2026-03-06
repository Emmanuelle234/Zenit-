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
import { Transaction, SavingsGoal, Investment, BankDetails } from '../types';
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
  DollarSign,
  Building2,
  AlertCircle,
  Copy,
  CheckCircle2,
  Zap,
  PieChart
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
      if (!selectedBankId) {
        alert('Please select a bank account for withdrawal');
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
            console.log(`Accrued $${interestAmount.toFixed(4)} in interest`);
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
      {/* PocketApp Style Header Card */}
      <div className="bg-black rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-black/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full -ml-48 -mb-48 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm uppercase tracking-widest">
              <Zap className="w-4 h-4 fill-emerald-400" />
              <span>Total Net Worth</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              ${((profile?.balance || 0) + totalInvested + totalSavings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h1>
            <div className="flex items-center gap-4 text-gray-400 font-medium">
              <div className="flex items-center gap-1 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
                <span>+4.2%</span>
              </div>
              <span>vs last month</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setIsDepositModalOpen(true)}
              className="px-6 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg shadow-white/5"
            >
              <Plus className="w-5 h-5" />
              Add Money
            </button>
            <button 
              onClick={() => { setWalletAction('withdrawal'); setIsWalletModalOpen(true); }}
              className="px-6 py-4 bg-white/10 text-white border border-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <ArrowUpRight className="w-5 h-5" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Wallet className="text-emerald-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Wallet Balance</p>
            <h3 className="text-2xl font-bold text-gray-900">
              ${(profile?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <TrendingUp className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Investments</p>
            <h3 className="text-2xl font-bold text-gray-900">
              ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Target className="text-purple-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Savings</p>
            <h3 className="text-2xl font-bold text-gray-900">
              ${totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-3xl text-white space-y-4 shadow-lg shadow-emerald-600/20">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <PieChart className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-emerald-100 font-medium">Interest Earned</p>
            <h3 className="text-2xl font-bold">
              ${(profile?.interestEarned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-black/5 flex items-center justify-between">
            <h4 className="text-xl font-bold text-gray-900">Recent Activity</h4>
            <button className="text-sm text-emerald-600 font-bold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-black/5">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                        ? <ArrowDownLeft className="w-6 h-6" /> 
                        : <ArrowUpRight className="w-6 h-6" />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500 font-medium">{new Date(tx.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${
                    tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout'
                      ? 'text-emerald-600' 
                      : 'text-gray-900'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'investment_sell' || tx.type === 'interest_payout' ? '+' : '-'}
                    ${(tx.amount ?? 0).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400 font-medium">
                No transactions yet.
              </div>
            )}
          </div>
        </div>

        {/* Savings Goals Summary */}
        <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-black/5 flex items-center justify-between">
            <h4 className="text-xl font-bold text-gray-900">Goals</h4>
            <button className="text-sm text-emerald-600 font-bold hover:underline flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="p-8 space-y-8">
            {goals.length > 0 ? (
              goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-bold text-gray-900">{goal.name}</p>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{goal.category}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {Math.round(progress)}%
                      </p>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>${(goal.currentAmount ?? 0).toLocaleString()}</span>
                      <span>${(goal.targetAmount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-gray-400 font-medium">
                Start saving for your dreams.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16"></div>
              
              <button 
                onClick={() => setIsDepositModalOpen(false)}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
 
              <div className="relative z-10">
                <div className="w-16 h-16 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center mb-8">
                  <Zap className="text-emerald-600 w-8 h-8 fill-emerald-600" />
                </div>
 
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Add Money</h2>
                <p className="text-gray-500 font-medium mb-8">Choose your preferred deposit method to fund your account.</p>
                
                {/* Tabs */}
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
                            <p className="text-xl font-black text-blue-600 tracking-tight">{profile?.nigeriaAccount?.accountNumber || '1234567890'}</p>
                            <button 
                              onClick={() => copyToClipboard(profile?.nigeriaAccount?.accountNumber || '')}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                          <p className="text-sm font-bold text-gray-900">{profile?.nigeriaAccount?.accountName || 'ZENITH-USER-1234'}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-800 font-medium leading-relaxed">
                          Transfer to this virtual account and your balance will be updated instantly.
                        </p>
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
                            className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
 
                      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="flex gap-3">
                          <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                            Funds will be credited to your balance automatically after 1 network confirmation. Usually takes 2-5 minutes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
 
                  <button 
                    onClick={() => setIsDepositModalOpen(false)}
                    className="w-full bg-black text-white py-5 rounded-2xl font-bold hover:bg-gray-900 transition-all shadow-xl shadow-black/10"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative"
            >
              <button 
                onClick={() => { setIsWalletModalOpen(false); setWalletAction(null); }}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-bold text-gray-900 mb-8 capitalize">
                {walletAction}
              </h2>
              
              <form onSubmit={handleWalletAction} className="space-y-8">
                {walletAction === 'withdrawal' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Withdraw to</label>
                    {bankAccounts.length > 0 ? (
                      <select 
                        required
                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold"
                        value={selectedBankId}
                        onChange={e => setSelectedBankId(e.target.value)}
                      >
                        {bankAccounts.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} (****{bank.accountNumber.slice(-4)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-6 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium leading-relaxed">
                          No bank accounts linked. Please go to <strong>Settings</strong> to link one before withdrawing.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="w-full pl-14 pr-6 py-6 bg-gray-50 border-none rounded-[1.5rem] text-3xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={walletAmount || ''}
                      onChange={e => setWalletAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-[1.5rem] space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-500">Available</span>
                    <span className="text-gray-900">${(profile?.balance ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-500">New Balance</span>
                    <span className="font-bold text-emerald-600">
                      ${((profile?.balance || 0) + (walletAction === 'deposit' ? walletAmount : -walletAmount)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || walletAmount <= 0}
                  className="w-full bg-black text-white py-5 rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-black/10"
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
