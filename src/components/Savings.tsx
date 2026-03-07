import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  deleteDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SavingsGoal, Transaction } from '../types';
import { 
  Plus, 
  Target, 
  Calendar, 
  Trash2, 
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Savings: React.FC = () => {
  const { profile } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: 0,
    deadline: '',
    category: 'other' as any
  });

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'savings_goals'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'savings_goals'));

    return () => unsub();
  }, [profile]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const goalRef = doc(collection(db, 'savings_goals'));
      const goalData: SavingsGoal = {
        id: goalRef.id,
        userId: profile.uid,
        name: newGoal.name,
        targetAmount: Number(newGoal.targetAmount),
        currentAmount: 0,
        deadline: new Date(newGoal.deadline).toISOString(),
        category: newGoal.category,
        createdAt: new Date().toISOString()
      };

      await setDoc(goalRef, goalData);
      setIsModalOpen(false);
      setNewGoal({ name: '', targetAmount: 0, deadline: '', category: 'other' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'savings_goals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFunds = async (goal: SavingsGoal, amount: number) => {
    if (!profile || profile.balance < amount) {
      alert('Insufficient balance');
      return;
    }

    const batch = writeBatch(db);
    
    // Update goal
    const goalRef = doc(db, 'savings_goals', goal.id);
    batch.update(goalRef, { currentAmount: increment(amount) });

    // Update user balance
    const userRef = doc(db, 'users', profile.uid);
    batch.update(userRef, { balance: increment(-amount) });

    // Create transaction
    const txRef = doc(collection(db, 'transactions'));
    const tx: Transaction = {
      id: txRef.id,
      userId: profile.uid,
      type: 'withdrawal',
      amount: amount,
      description: `Transfer to savings goal: ${goal.name}`,
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    batch.set(txRef, tx);

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_savings');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'savings_goals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `savings_goals/${id}`);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="bg-brand-primary rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl shadow-brand-primary/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/20 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Savings Goals</h1>
            <p className="text-white/80 text-lg font-medium max-w-lg leading-relaxed">
              Plan for your future milestones and watch your wealth grow with GND Crypt's automated tracking.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-brand-primary px-8 py-5 rounded-2xl font-bold text-base flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5 group"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            Create New Goal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <motion.div 
              layout
              key={goal.id} 
              className="bg-white p-8 rounded-[2.5rem] border border-black/[0.02] shadow-sm space-y-8 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="text-brand-primary w-7 h-7" />
                </div>
                <button 
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-3 text-gray-200 hover:text-brand-danger hover:bg-red-50 rounded-2xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{goal.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{goal.category}</p>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saved</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tighter">₦{(goal.currentAmount ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</p>
                    <p className="text-lg font-black text-gray-300 tracking-tighter">₦{(goal.targetAmount ?? 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="h-4 bg-gray-50 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      className="h-full bg-brand-primary rounded-full shadow-lg shadow-brand-primary/20"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</p>
                    <p className="text-xs font-black text-brand-primary">{Math.round(progress)}% Complete</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold bg-gray-50 p-4 rounded-2xl border border-gray-100 uppercase tracking-widest">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <span>Target: {new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAddFunds(goal, 5000)}
                  className="py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-xs hover:bg-gray-100 transition-all active:scale-95"
                >
                  Add ₦5k
                </button>
                <button 
                  onClick={() => handleAddFunds(goal, 10000)}
                  className="py-4 bg-brand-primary text-white rounded-2xl font-bold text-xs hover:opacity-90 transition-all shadow-lg shadow-brand-primary/10 active:scale-95"
                >
                  Add ₦10k
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full -mr-24 -mt-24 blur-3xl opacity-50"></div>
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tighter">New Goal</h2>
              
              <form onSubmit={handleCreateGoal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Goal Name</label>
                  <input 
                    required
                    type="text"
                    placeholder="e.g., Summer Vacation"
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-primary outline-none font-bold text-gray-900 transition-all"
                    value={newGoal.name}
                    onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Target (₦)</label>
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-primary outline-none font-bold text-gray-900 transition-all"
                      value={newGoal.targetAmount || ''}
                      onChange={e => setNewGoal({...newGoal, targetAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Category</label>
                    <select 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-primary outline-none font-bold text-gray-900 transition-all appearance-none"
                      value={newGoal.category}
                      onChange={e => setNewGoal({...newGoal, category: e.target.value as any})}
                    >
                      <option value="travel">Travel</option>
                      <option value="emergency">Emergency</option>
                      <option value="education">Education</option>
                      <option value="home">Home</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Target Date</label>
                  <input 
                    required
                    type="date"
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-primary outline-none font-bold text-gray-900 transition-all"
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-primary text-white py-5 rounded-2xl font-bold text-lg mt-4 hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Plus className="w-6 h-6" />
                      <span>Create Goal</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
