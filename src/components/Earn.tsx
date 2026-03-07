import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  doc, 
  updateDoc, 
  arrayUnion, 
  increment, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EarnTask, Transaction } from '../types';
import { 
  Gift, 
  Video, 
  ClipboardCheck, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Star,
  Award,
  BookOpen,
  Share2,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TASKS: EarnTask[] = [
  {
    id: 'daily_checkin',
    title: 'Daily Check-in',
    description: 'Claim your daily reward for being active today.',
    reward: 50,
    type: 'daily',
    icon: 'Zap'
  },
  {
    id: 'watch_intro_video',
    title: 'Watch Intro Video',
    description: 'Learn how to use the platform and earn your first reward.',
    reward: 200,
    type: 'video',
    icon: 'Video'
  },
  {
    id: 'first_survey',
    title: 'Financial Goals Survey',
    description: 'Tell us about your financial goals to help us improve.',
    reward: 500,
    type: 'survey',
    icon: 'ClipboardCheck'
  },
  {
    id: 'read_investing_101',
    title: 'Investing 101',
    description: 'Read our guide on how to start investing safely.',
    reward: 300,
    type: 'content',
    icon: 'BookOpen'
  }
];

export const Earn: React.FC = () => {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompleteTask = async (task: EarnTask) => {
    if (!profile || profile.completedTasks?.includes(task.id)) return;
    
    setIsSubmitting(task.id);
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', profile.uid);
    const txRef = doc(collection(db, 'transactions'));

    batch.update(userRef, {
      balance: increment(task.reward),
      completedTasks: arrayUnion(task.id)
    });

    const tx: Transaction = {
      id: txRef.id,
      userId: profile.uid,
      type: 'deposit',
      amount: task.reward,
      description: `Reward: ${task.title}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    batch.set(txRef, tx);

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setIsSubmitting(null);
    }
  };

  const copyReferral = () => {
    const code = profile?.referralCode || profile?.uid.slice(0, 8).toUpperCase() || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Video': return <Video className="w-6 h-6" />;
      case 'ClipboardCheck': return <ClipboardCheck className="w-6 h-6" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Card */}
      <div className="relative overflow-hidden bg-black rounded-[3rem] p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full border border-emerald-500/30">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Learn & Earn</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-none">
              Get Rewarded for <br />
              <span className="text-emerald-400">Growing Your Knowledge.</span>
            </h1>
            <p className="text-gray-400 font-medium max-w-md">
              Complete simple tasks, learn about finance, and invite friends to earn real cash rewards.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] text-center min-w-[240px]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Earned</p>
            <p className="text-5xl font-black text-white">₦{profile?.interestEarned?.toLocaleString() || '0'}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <Zap className="w-4 h-4 fill-emerald-400" />
              <span>Keep it up!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Available Tasks</h2>
            <span className="px-4 py-1.5 bg-gray-100 rounded-full text-xs font-black text-gray-500 uppercase tracking-widest">
              {TASKS.length} Tasks
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {TASKS.map((task) => {
              const isCompleted = profile?.completedTasks?.includes(task.id);
              return (
                <motion.div 
                  key={task.id}
                  whileHover={{ y: -4 }}
                  className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${
                    isCompleted 
                      ? 'bg-gray-50 border-black/5 opacity-70' 
                      : 'bg-white border-black/5 shadow-sm hover:shadow-xl hover:border-emerald-500/20'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {getIcon(task.icon)}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{task.title}</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">{task.description}</p>
                  </div>

                  <div className="text-right space-y-2">
                    <p className="text-lg font-black text-emerald-600">₦{task.reward}</p>
                    {isCompleted ? (
                      <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4" />
                        Done
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleCompleteTask(task)}
                        disabled={!!isSubmitting}
                        className="px-4 py-2 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
                      >
                        {isSubmitting === task.id ? '...' : 'Claim'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Referral Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Invite Friends</h2>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              
              <div>
                <h3 className="text-xl font-black leading-tight">Earn ₦1,000 for every friend</h3>
                <p className="text-blue-100 text-sm font-medium mt-2">
                  Share your code and get rewarded when they make their first investment.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center justify-between">
                <code className="text-lg font-black tracking-widest">
                  {profile?.referralCode || profile?.uid.slice(0, 8).toUpperCase()}
                </code>
                <button 
                  onClick={copyReferral}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <button className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share Link
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Your Progress</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Tasks Done</p>
                    <p className="text-xs text-gray-400 font-bold">{profile?.completedTasks?.length || 0} / {TASKS.length}</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-gray-100 flex items-center justify-center text-[10px] font-black">
                  {Math.round(((profile?.completedTasks?.length || 0) / TASKS.length) * 100)}%
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Referrals</p>
                    <p className="text-xs text-gray-400 font-bold">0 Friends</p>
                  </div>
                </div>
                <p className="text-sm font-black text-gray-900">₦0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
