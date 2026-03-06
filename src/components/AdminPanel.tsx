import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, Transaction } from '../types';
import { 
  Users, 
  Activity, 
  Shield, 
  Search, 
  MoreVertical,
  ArrowUpRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { profile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPlatformBalance = users.reduce((acc, u) => acc + (u.balance ?? 0), 0);
  const totalVolume = allTransactions.reduce((acc, tx) => acc + (tx.amount ?? 0), 0);

  const toggleAdmin = async (user: UserProfile) => {
    if (user.uid === adminProfile?.uid) return; // Don't demote self
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
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
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
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
          { label: 'Total Users', value: users.length, icon: Users, color: 'blue' },
          { label: 'Platform Balance', value: `$${totalPlatformBalance.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
          { label: 'Total Volume', value: `$${totalVolume.toLocaleString()}`, icon: Activity, color: 'purple' },
          { label: 'Transactions', value: allTransactions.length, icon: CreditCard, color: 'red' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`text-${stat.color}-600 w-7 h-7`} />
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
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
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
                      ${(user.balance ?? 0).toLocaleString()}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button 
                        onClick={() => toggleAdmin(user)}
                        className={`p-3 rounded-2xl transition-all ${
                          user.role === UserRole.ADMIN 
                            ? 'bg-purple-50 text-purple-600' 
                            : 'bg-gray-50 text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <Shield className="w-6 h-6" />
                      </button>
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
                <p className="text-lg font-black text-gray-900 tracking-tight">${(tx.amount ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="p-8 bg-gray-50/50 text-center">
            <button className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline underline-offset-4">View All Transactions</button>
          </div>
        </div>
      </div>
    </div>
  );
};
