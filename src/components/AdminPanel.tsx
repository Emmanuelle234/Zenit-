import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, Transaction, SavingsGoal, Investment } from '../types';
import { 
  Users, 
  Activity, 
  Shield, 
  Search, 
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  X,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPanel: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userSavings, setUserSavings] = useState<SavingsGoal[]>([]);
  const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'savings' | 'investments' | 'transactions'>('overview');

  useEffect(() => {
    if (adminProfile?.role !== UserRole.ADMIN) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('timestamp', 'desc')), (snap) => {
      setAllTransactions(snap.docs.map(doc => doc.data() as Transaction));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    return () => {
      unsubUsers();
      unsubTransactions();
    };
  }, [adminProfile]);

  useEffect(() => {
    if (!selectedUser || !isManageModalOpen) return;

    const unsubSavings = onSnapshot(query(collection(db, 'savings_goals'), where('userId', '==', selectedUser.uid)), (snap) => {
      setUserSavings(snap.docs.map(doc => doc.data() as any));
    });

    const unsubInvestments = onSnapshot(query(collection(db, 'investments'), where('userId', '==', selectedUser.uid)), (snap) => {
      setUserInvestments(snap.docs.map(doc => doc.data() as any));
    });

    const unsubUserTx = onSnapshot(query(collection(db, 'transactions'), where('userId', '==', selectedUser.uid), orderBy('timestamp', 'desc')), (snap) => {
      setUserTransactions(snap.docs.map(doc => doc.data() as Transaction));
    });

    return () => {
      unsubSavings();
      unsubInvestments();
      unsubUserTx();
    };
  }, [selectedUser, isManageModalOpen]);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPlatformBalance = users.reduce((acc, u) => acc + (u.balance ?? 0), 0);
  const totalVolume = allTransactions.reduce((acc, tx) => acc + (tx.amount ?? 0), 0);

  const toggleAdmin = async (user: UserProfile) => {
    if (user.uid === adminProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAdjustBalance = async (type: 'add' | 'subtract') => {
    if (!selectedUser || !adjustAmount || isNaN(Number(adjustAmount))) return;
    
    setIsProcessing(true);
    const amount = Number(adjustAmount);
    const newBalance = type === 'add' ? selectedUser.balance + amount : selectedUser.balance - amount;

    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        balance: newBalance
      });
      
      // Update local state for modal
      setSelectedUser({ ...selectedUser, balance: newBalance });
      setAdjustAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${selectedUser.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.uid === adminProfile?.uid) return;
    if (!window.confirm(`Are you sure you want to delete ${user.displayName}? This action cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid));
      setIsManageModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Admin Dashboard</h1>
          <p className="text-gray-400 font-bold text-lg">Platform-wide overview and user management.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border-2 border-gray-50 shadow-sm">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div className="pr-6">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Admin Access</p>
            <p className="text-sm font-black text-gray-900">Verified Administrator</p>
          </div>
        </div>
      </div>

      {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'brand-primary' },
          { label: 'Platform Balance', value: `₦${totalPlatformBalance.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
          { label: 'Total Volume', value: `₦${totalVolume.toLocaleString()}`, icon: Activity, color: 'purple' },
          { label: 'Transactions', value: allTransactions.length, icon: CreditCard, color: 'red' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`text-${stat.color === 'brand-primary' ? 'brand-primary' : stat.color + '-600'} w-7 h-7`} />
              </div>
              <span className="text-xs text-gray-400 font-black uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* User Management */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm overflow-hidden">
          <div className="p-10 border-b-2 border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <h4 className="text-2xl font-black text-gray-900 tracking-tighter">User Management</h4>
                <div className="relative w-full sm:w-72">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <th className="px-10 py-6">User</th>
                  <th className="px-10 py-6">Role</th>
                  <th className="px-10 py-6 text-right">Balance</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <img 
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                          alt="" 
                          className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-base font-black text-gray-900 tracking-tight">{user.displayName}</p>
                          <p className="text-xs text-gray-400 font-bold">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        user.role === UserRole.ADMIN 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-gray-900 text-lg tracking-tight">
                      ₦{(user.balance ?? 0).toLocaleString()}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setIsManageModalOpen(true);
                          }}
                          className="p-3 bg-gray-50 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-2xl transition-all"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => toggleAdmin(user)}
                          className={`p-3 rounded-2xl transition-all ${
                            user.role === UserRole.ADMIN 
                              ? 'bg-purple-50 text-purple-600' 
                              : 'bg-gray-50 text-gray-300 hover:text-brand-primary hover:bg-brand-primary/5'
                          }`}
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Activity */}
        <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-10 border-b-2 border-gray-50">
            <h4 className="text-2xl font-black text-gray-900 tracking-tighter">Global Activity</h4>
          </div>
          <div className="divide-y-2 divide-gray-50 flex-1 overflow-y-auto">
            {allTransactions.slice(0, 15).map((tx, idx) => (
              <div key={idx} className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 tracking-tight">{tx.description}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <p className="text-lg font-black text-gray-900 tracking-tight">₦{(tx.amount ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="p-8 bg-gray-50/50 text-center">
            <button className="text-xs font-black text-brand-primary uppercase tracking-widest hover:underline underline-offset-4">View All Transactions</button>
          </div>
        </div>
      </div>

      {/* Manage User Modal */}
      <AnimatePresence>
        {isManageModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManageModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10 border-b-2 border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <img 
                    src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}&background=random`} 
                    alt="" 
                    className="w-20 h-20 rounded-[2rem] border-4 border-gray-50 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{selectedUser.displayName}</h3>
                    <p className="text-gray-400 font-bold">{selectedUser.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-4 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-10 border-b-2 border-gray-50 bg-gray-50/30">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'savings', label: 'Savings' },
                  { id: 'investments', label: 'Investments' },
                  { id: 'transactions', label: 'Activity' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                      activeModalTab === tab.id 
                        ? 'border-brand-primary text-brand-primary' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-10 max-h-[60vh] overflow-y-auto">
                {activeModalTab === 'overview' && (
                  <div className="space-y-10">
                    {/* Balance Adjustment */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h5 className="text-lg font-black text-gray-900 tracking-tight">Adjust Balance</h5>
                        <p className="text-2xl font-black text-brand-primary tracking-tighter">₦{selectedUser.balance.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">₦</span>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full pl-12 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-brand-primary outline-none transition-all font-black text-xl"
                            value={adjustAmount}
                            onChange={e => setAdjustAmount(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={() => handleAdjustBalance('add')}
                          disabled={isProcessing || !adjustAmount}
                          className="px-8 bg-emerald-500 text-white rounded-[2rem] font-black hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-6 h-6" />
                          <span>Add</span>
                        </button>
                        <button 
                          onClick={() => handleAdjustBalance('subtract')}
                          disabled={isProcessing || !adjustAmount}
                          className="px-8 bg-red-500 text-white rounded-[2rem] font-black hover:bg-red-600 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                          <Minus className="w-6 h-6" />
                          <span>Sub</span>
                        </button>
                      </div>
                    </div>

                    {/* User Info Grid */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-gray-50 rounded-3xl">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Role</p>
                        <p className="font-black text-gray-900 capitalize">{selectedUser.role}</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-3xl">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Joined</p>
                        <p className="font-black text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-3xl">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Interest Earned</p>
                        <p className="font-black text-emerald-600">₦{(selectedUser.interestEarned || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-3xl">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Total Invested</p>
                        <p className="font-black text-brand-primary">₦{(selectedUser.totalInvested || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-10 border-t-2 border-gray-50">
                      <div className="flex items-center justify-between p-6 bg-red-50 rounded-3xl border-2 border-red-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                            <AlertCircle className="text-red-600 w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-black text-red-900">Danger Zone</p>
                            <p className="text-xs text-red-600 font-bold">Irreversible account actions</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteUser(selectedUser)}
                          className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all flex items-center gap-2"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === 'savings' && (
                  <div className="space-y-4">
                    {userSavings.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 font-bold">No savings goals found.</p>
                    ) : (
                      userSavings.map((goal: any) => (
                        <div key={goal.id} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                          <div>
                            <p className="font-black text-gray-900">{goal.name}</p>
                            <p className="text-xs text-gray-400 font-bold capitalize">{goal.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-brand-primary">₦{goal.currentAmount.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">of ₦{goal.targetAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModalTab === 'investments' && (
                  <div className="space-y-4">
                    {userInvestments.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 font-bold">No investments found.</p>
                    ) : (
                      userInvestments.map((inv: any) => (
                        <div key={inv.id} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                          <div>
                            <p className="font-black text-gray-900">{inv.assetName}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase">{inv.assetId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-900">{inv.amount} Units</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Avg: ₦{inv.purchasePrice.toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModalTab === 'banks' && (
                  <div className="space-y-4">
                    {userBanks.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 font-bold">No bank accounts linked.</p>
                    ) : (
                      userBanks.map((bank: any) => (
                        <div key={bank.id} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-2 border-gray-100">
                              <CreditCard className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-black text-gray-900">{bank.bankName}</p>
                              <p className="text-xs text-gray-400 font-bold">{bank.accountNumber}</p>
                            </div>
                          </div>
                          {bank.isDefault && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">Default</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModalTab === 'transactions' && (
                  <div className="space-y-4">
                    {userTransactions.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 font-bold">No transactions found.</p>
                    ) : (
                      userTransactions.map((tx: any) => (
                        <div key={tx.id} className="p-6 bg-gray-50 rounded-3xl flex items-center justify-between">
                          <div>
                            <p className="font-black text-gray-900">{tx.description}</p>
                            <p className="text-xs text-gray-400 font-bold capitalize">{tx.type.replace('_', ' ')} • {new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-gray-900">₦{tx.amount.toLocaleString()}</p>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                              tx.status === 'success' ? 'text-emerald-500' : tx.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
