import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BankDetails as BankDetailsType, Transaction } from '../types';
import { 
  Plus, 
  Trash2, 
  Building2, 
  CreditCard, 
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  DollarSign,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { increment } from 'firebase/firestore';

export const BankDetails: React.FC = () => {
  const { profile } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankDetailsType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'bank' | 'crypto'>('bank');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: ''
  });

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'bank_details'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const banks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankDetailsType));
      setBankAccounts(banks);
      const defaultBank = banks.find(b => b.isDefault);
      if (defaultBank) setSelectedBankId(defaultBank.id);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bank_details'));

    return () => unsub();
  }, [profile]);

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const bankRef = doc(collection(db, 'bank_details'));
      const bankData: BankDetailsType = {
        id: bankRef.id,
        userId: profile.uid,
        bankName: newBank.bankName,
        accountName: newBank.accountName,
        accountNumber: newBank.accountNumber,
        routingNumber: newBank.routingNumber || undefined,
        swiftCode: newBank.swiftCode || undefined,
        isDefault: bankAccounts.length === 0,
        createdAt: new Date().toISOString()
      };

      await setDoc(bankRef, bankData);
      setIsModalOpen(false);
      setNewBank({ bankName: '', accountName: '', accountNumber: '', routingNumber: '', swiftCode: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'bank_details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;
    try {
      await deleteDoc(doc(db, 'bank_details', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'bank_details');
    }
  };

  const handleSetDefault = async (id: string) => {
    const batch = writeBatch(db);
    bankAccounts.forEach(acc => {
      batch.update(doc(db, 'bank_details', acc.id), { isDefault: acc.id === id });
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'bank_details');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || withdrawAmount <= 0) return;

    if (profile.balance < withdrawAmount) {
      alert('Insufficient balance');
      return;
    }

    if (withdrawType === 'bank' && !selectedBankId) {
      alert('Please select a bank account');
      return;
    }

    if (withdrawType === 'crypto' && !cryptoAddress) {
      alert('Please enter a crypto address');
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', profile.uid);
    const txRef = doc(collection(db, 'transactions'));

    const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
    
    batch.update(userRef, { balance: increment(-withdrawAmount) });

    const tx: Transaction = {
      id: txRef.id,
      userId: profile.uid,
      type: 'withdrawal',
      amount: withdrawAmount,
      description: withdrawType === 'bank' 
        ? `Withdrawal to ${selectedBank?.bankName} (****${selectedBank?.accountNumber.slice(-4)})`
        : `Crypto Withdrawal to ${cryptoAddress.slice(0, 6)}...${cryptoAddress.slice(-4)}`,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    batch.set(txRef, tx);

    try {
      await batch.commit();
      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
      setCryptoAddress('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'withdrawal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Accounts</h2>
          <p className="text-gray-400 font-medium text-sm">Manage your linked accounts for withdrawals.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="flex items-center gap-2 bg-white border-2 border-gray-100 text-gray-900 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all text-sm font-bold"
          >
            <ArrowUpRight className="w-5 h-5" /> Withdraw
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" /> Add Bank
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bankAccounts.length > 0 ? (
          bankAccounts.map((bank) => (
            <div 
              key={bank.id} 
              className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${
                bank.isDefault ? 'border-blue-500 bg-blue-50/30' : 'border-black/5 bg-white hover:border-black/10'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-black/5 shadow-sm">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex gap-3">
                  {!bank.isDefault && (
                    <button 
                      onClick={() => handleSetDefault(bank.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
                    >
                      Set Default
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteBank(bank.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-gray-900">{bank.bankName}</h4>
                  {bank.isDefault && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{bank.accountName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-900 font-bold font-mono mt-4 bg-white/50 py-2 px-4 rounded-xl border border-black/5 w-fit">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span>**** **** **** {bank.accountNumber.slice(-4)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-16 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-bold text-xl">No bank accounts linked</h3>
            <p className="text-gray-400 font-medium mt-2">Link a bank account to start withdrawing your funds.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Withdraw Funds</h2>
                <p className="text-gray-400 font-medium mb-10">Choose your withdrawal method and amount.</p>
                
                <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                  <button 
                    onClick={() => setWithdrawType('bank')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${withdrawType === 'bank' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Bank Transfer
                  </button>
                  <button 
                    onClick={() => setWithdrawType('crypto')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${withdrawType === 'crypto' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Crypto (USDT)
                  </button>
                </div>

                <form onSubmit={handleWithdraw} className="space-y-8">
                  {withdrawType === 'bank' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Select Bank Account</label>
                      {bankAccounts.length > 0 ? (
                        <select 
                          required
                          className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                            No bank accounts linked. Please link a bank account first.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">USDT (TRC20) Address</label>
                      <div className="relative">
                        <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                        <input 
                          required
                          type="text"
                          placeholder="Enter your TRC20 address"
                          className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          value={cryptoAddress}
                          onChange={e => setCryptoAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-4">Amount to Withdraw</label>
                    <div className="relative">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                      <input 
                        required
                        type="number"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        className="w-full pl-14 pr-6 py-6 bg-gray-50 border-none rounded-[1.5rem] text-3xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={withdrawAmount || ''}
                        onChange={e => setWithdrawAmount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-[1.5rem] space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Available Balance</span>
                      <span className="text-gray-900">${(profile?.balance ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Remaining</span>
                      <span className="text-emerald-600">${((profile?.balance || 0) - withdrawAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || withdrawAmount <= 0 || (withdrawType === 'bank' && bankAccounts.length === 0)}
                    className="w-full bg-black text-white py-6 rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-black/10"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : `Confirm Withdrawal`}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="relative z-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Link Bank Account</h2>
                <p className="text-gray-400 font-medium mb-10">Add your bank details for secure withdrawals.</p>
                
                <form onSubmit={handleAddBank} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                      <input 
                        required
                        type="text"
                        placeholder="e.g. Chase Bank"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newBank.bankName}
                        onChange={e => setNewBank({...newBank, bankName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Holder</label>
                      <input 
                        required
                        type="text"
                        placeholder="Full Name"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newBank.accountName}
                        onChange={e => setNewBank({...newBank, accountName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                    <input 
                      required
                      type="text"
                      placeholder="Account Number"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newBank.accountNumber}
                      onChange={e => setNewBank({...newBank, accountNumber: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Routing Number</label>
                      <input 
                        type="text"
                        placeholder="Optional"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newBank.routingNumber}
                        onChange={e => setNewBank({...newBank, routingNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SWIFT/BIC</label>
                      <input 
                        type="text"
                        placeholder="Optional"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newBank.swiftCode}
                        onChange={e => setNewBank({...newBank, swiftCode: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-blue-50 rounded-[1.5rem] border border-blue-100">
                    <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700 font-medium leading-relaxed">
                      By linking your account, you agree to our terms of service. We use industry-standard encryption to protect your data.
                    </p>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-black text-white py-6 rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 shadow-xl shadow-black/10"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Link Bank Account'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
