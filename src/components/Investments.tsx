import React, { useState, useEffect } from 'react';
import { useAuth } from './Auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  writeBatch,
  increment,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Investment, Transaction, MarketData } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Coins,
  Activity,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_MARKET: MarketData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change24h: 1.2, type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', price: 64231.50, change24h: -2.4, type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', price: 3452.10, change24h: 0.8, type: 'crypto' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 175.34, change24h: -3.1, type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change24h: 4.5, type: 'stock' },
  { symbol: 'US10Y', name: 'US 10Y Treasury', price: 4.25, change24h: 0.1, type: 'bond' },
];

export const Investments: React.FC = () => {
  const { profile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MarketData | null>(null);
  const [sharesToBuy, setSharesToBuy] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'investments'),
      where('userId', '==', profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setInvestments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'investments'));

    return () => unsub();
  }, [profile]);

  const handleTrade = async (asset: MarketData, shares: number, isBuy: boolean) => {
    if (!profile) return;
    const totalCost = asset.price * shares;

    if (isBuy && profile.balance < totalCost) {
      alert('Insufficient balance');
      return;
    }

    const existingInv = investments.find(inv => inv.assetId === asset.symbol);
    if (!isBuy && (!existingInv || existingInv.amount < shares)) {
      // Handle insufficient shares (maybe with a toast later)
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);

    const userRef = doc(db, 'users', profile.uid);
    batch.update(userRef, { 
      balance: increment(isBuy ? -totalCost : totalCost),
      totalInvested: increment(isBuy ? totalCost : -totalCost)
    });

    const invId = existingInv?.id || `${profile.uid}_${asset.symbol}`;
    const invRef = doc(db, 'investments', invId);

    if (isBuy) {
      if (existingInv) {
        const newTotalAmount = existingInv.amount + shares;
        const newAvgPrice = ((existingInv.amount * existingInv.purchasePrice) + totalCost) / newTotalAmount;
        batch.update(invRef, {
          amount: newTotalAmount,
          purchasePrice: newAvgPrice,
          currentPrice: asset.price,
          timestamp: new Date().toISOString()
        });
      } else {
        const newInv: Investment = {
          id: invId,
          userId: profile.uid,
          assetId: asset.symbol,
          assetName: asset.name,
          amount: shares,
          purchasePrice: asset.price,
          currentPrice: asset.price,
          timestamp: new Date().toISOString()
        };
        batch.set(invRef, newInv);
      }
    } else {
      const newAmount = existingInv!.amount - shares;
      if (newAmount === 0) {
        batch.delete(invRef);
      } else {
        batch.update(invRef, {
          amount: newAmount,
          currentPrice: asset.price,
          timestamp: new Date().toISOString()
        });
      }
    }

    const txRef = doc(collection(db, 'transactions'));
    const tx: Transaction = {
      id: txRef.id,
      userId: profile.uid,
      type: isBuy ? 'investment_buy' : 'investment_sell',
      amount: totalCost,
      description: `${isBuy ? 'Bought' : 'Sold'} ${shares} ${asset.symbol}`,
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    batch.set(txRef, tx);

    try {
      await batch.commit();
      setSharesToBuy(0);
      setSelectedAsset(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPortfolioValue = investments.reduce((acc, inv) => acc + (inv.amount * inv.currentPrice), 0);
  const totalGainLoss = investments.reduce((acc, inv) => acc + (inv.amount * (inv.currentPrice - inv.purchasePrice)), 0);

  const filteredMarket = MOCK_MARKET.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Premium Portfolio Header */}
      <div className="bg-brand-primary rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl shadow-brand-primary/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/20 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Investments</h1>
            <p className="text-white/80 text-lg font-medium max-w-lg leading-relaxed">
              Diversify your wealth with global assets. Track performance and trade in real-time.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl px-8 py-6 rounded-[2rem] border border-white/20 flex items-center gap-8 shadow-2xl">
            <div>
              <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em] mb-1">Portfolio</p>
              <p className="text-3xl font-black tracking-tighter">₦{(totalPortfolioValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div>
              <p className="text-[10px] text-white/60 uppercase font-black tracking-[0.2em] mb-1">Return</p>
              <p className={`text-3xl font-black tracking-tighter ${totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalGainLoss >= 0 ? '+' : ''}₦{(totalGainLoss ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-black/[0.02] shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <h4 className="text-xl font-black text-gray-900 tracking-tighter">Market Overview</h4>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    <th className="px-8 py-4">Asset</th>
                    <th className="px-8 py-4 text-right">Price</th>
                    <th className="px-8 py-4 text-right">24h Change</th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t border-gray-50">
                  {filteredMarket.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-brand-primary group-hover:text-white transition-all group-hover:scale-110">
                            {asset.symbol[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">{asset.symbol}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{asset.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right font-black text-gray-900 text-base tracking-tight">
                        ₦{(asset.price ?? 0).toLocaleString()}
                      </td>
                      <td className={`px-8 py-4 text-right font-black ${asset.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        <div className="flex items-center justify-end gap-1 text-sm">
                          {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {asset.change24h}%
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="px-6 py-2 bg-gray-50 text-brand-primary rounded-xl font-bold text-xs hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Holdings */}
          <div className="bg-white rounded-[2.5rem] border border-black/[0.02] shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50">
              <h4 className="text-xl font-black text-gray-900 tracking-tighter">Your Holdings</h4>
            </div>
            <div className="divide-y border-t border-gray-50">
              {investments.length > 0 ? (
                investments.map((inv) => {
                  const currentValue = inv.amount * inv.currentPrice;
                  const gainLoss = currentValue - (inv.amount * inv.purchasePrice);
                  const gainLossPercent = (gainLoss / (inv.amount * inv.purchasePrice)) * 100;
                  
                  return (
                    <div key={inv.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-brand-primary group-hover:scale-110 transition-transform">
                          {inv.assetId[0]}
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900 tracking-tight">{inv.assetId}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{inv.amount} units @ ₦{inv.purchasePrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-gray-900 tracking-tighter">₦{(currentValue ?? 0).toLocaleString()}</p>
                        <p className={`text-xs font-black ${gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-16 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="text-gray-200 w-8 h-8" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No investments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-black/[0.02] shadow-sm sticky top-28 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            
            <h4 className="text-xl font-black text-gray-900 mb-8 tracking-tighter">Quick Trade</h4>
            
            {selectedAsset ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-transparent hover:border-brand-primary/10 transition-all">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Asset</p>
                    <p className="text-lg font-black text-gray-900 tracking-tight">{selectedAsset.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Price</p>
                    <p className="text-lg font-black text-brand-primary tracking-tight">₦{(selectedAsset.price ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Amount to Trade</label>
                  <div className="relative">
                    <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-primary rounded-2xl text-2xl font-black outline-none transition-all"
                      value={sharesToBuy || ''}
                      onChange={e => setSharesToBuy(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-6 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Est. Cost</span>
                    <span className="text-lg font-black text-gray-900 tracking-tight">₦{((sharesToBuy ?? 0) * (selectedAsset?.price ?? 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Available</span>
                    <span className="text-base font-black text-emerald-600 tracking-tight">₦{(profile?.balance ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleTrade(selectedAsset, sharesToBuy, true)}
                    disabled={isSubmitting || sharesToBuy <= 0}
                    className="bg-brand-primary text-white py-5 rounded-2xl font-bold text-lg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy'}
                  </button>
                  <button 
                    onClick={() => handleTrade(selectedAsset, sharesToBuy, false)}
                    disabled={isSubmitting || sharesToBuy <= 0}
                    className="bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    Sell
                  </button>
                </div>
                
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="w-full text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors"
                >
                  Cancel Trade
                </button>
              </div>
            ) : (
              <div className="text-center py-16 space-y-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Coins className="text-gray-200 w-8 h-8" />
                </div>
                <p className="text-gray-300 font-black uppercase tracking-[0.2em] text-[10px]">Select an asset to trade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
