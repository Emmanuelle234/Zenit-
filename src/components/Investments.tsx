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
  DollarSign,
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

    const existingInv = investments.find(inv => inv.assetSymbol === asset.symbol);
    if (!isBuy && (!existingInv || existingInv.shares < shares)) {
      alert('Insufficient shares');
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
        const newTotalShares = existingInv.shares + shares;
        const newAvgPrice = ((existingInv.shares * existingInv.averagePrice) + totalCost) / newTotalShares;
        batch.update(invRef, {
          shares: newTotalShares,
          averagePrice: newAvgPrice,
          currentPrice: asset.price,
          lastUpdated: new Date().toISOString()
        });
      } else {
        const newInv: Investment = {
          id: invId,
          userId: profile.uid,
          assetName: asset.name,
          assetSymbol: asset.symbol,
          type: asset.type,
          shares: shares,
          averagePrice: asset.price,
          currentPrice: asset.price,
          lastUpdated: new Date().toISOString()
        };
        batch.set(invRef, newInv);
      }
    } else {
      const newShares = existingInv!.shares - shares;
      if (newShares === 0) {
        batch.delete(invRef);
      } else {
        batch.update(invRef, {
          shares: newShares,
          currentPrice: asset.price,
          lastUpdated: new Date().toISOString()
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
      status: 'completed'
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

  const totalPortfolioValue = investments.reduce((acc, inv) => acc + ((inv.shares ?? 0) * (inv.currentPrice ?? 0)), 0);
  const totalGainLoss = investments.reduce((acc, inv) => acc + ((inv.shares ?? 0) * ((inv.currentPrice ?? 0) - (inv.averagePrice ?? 0))), 0);

  const filteredMarket = MOCK_MARKET.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Premium Portfolio Header */}
      <div className="bg-blue-600 rounded-[3rem] p-12 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-blue-600/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Investments</h1>
            <p className="text-blue-100 text-xl font-medium max-w-lg opacity-90 leading-relaxed">
              Diversify your wealth with global assets. Track performance and trade in real-time.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-2xl px-10 py-8 rounded-[2.5rem] border border-white/20 flex items-center gap-12 shadow-2xl">
            <div>
              <p className="text-[10px] text-blue-200 uppercase font-black tracking-[0.2em] mb-2">Portfolio Value</p>
              <p className="text-4xl font-black tracking-tighter">${(totalPortfolioValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="w-px h-16 bg-white/10"></div>
            <div>
              <p className="text-[10px] text-blue-200 uppercase font-black tracking-[0.2em] mb-2">Total Return</p>
              <p className={`text-4xl font-black tracking-tighter ${totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalGainLoss >= 0 ? '+' : ''}${(totalGainLoss ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Market List */}
        <div className="lg:col-span-2 space-y-12">
          <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter">Market Overview</h4>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    <th className="px-10 py-6">Asset</th>
                    <th className="px-10 py-6 text-right">Price</th>
                    <th className="px-10 py-6 text-right">24h Change</th>
                    <th className="px-10 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-50">
                  {filteredMarket.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all group-hover:scale-110">
                            {asset.symbol[0]}
                          </div>
                          <div>
                            <p className="text-base font-black text-gray-900 tracking-tight">{asset.symbol}</p>
                            <p className="text-xs text-gray-400 font-bold">{asset.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right font-black text-gray-900 text-lg tracking-tight">
                        ${(asset.price ?? 0).toLocaleString()}
                      </td>
                      <td className={`px-10 py-6 text-right font-black ${asset.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {asset.change24h}%
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="px-8 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all active:scale-95"
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
          <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm overflow-hidden">
            <div className="p-10 border-b-2 border-gray-50">
              <h4 className="text-2xl font-black text-gray-900 tracking-tighter">Your Holdings</h4>
            </div>
            <div className="divide-y-2 divide-gray-50">
              {investments.length > 0 ? (
                investments.map((inv) => {
                  const currentValue = inv.shares * inv.currentPrice;
                  const gainLoss = currentValue - (inv.shares * inv.averagePrice);
                  const gainLossPercent = (gainLoss / (inv.shares * inv.averagePrice)) * 100;
                  
                  return (
                    <div key={inv.id} className="p-10 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center font-black text-blue-600 group-hover:scale-110 transition-transform">
                          {inv.assetSymbol[0]}
                        </div>
                        <div>
                          <p className="text-xl font-black text-gray-900 tracking-tight">{inv.assetSymbol}</p>
                          <p className="text-xs text-gray-400 font-bold">{inv.shares} shares @ ${inv.averagePrice.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900 tracking-tighter">${(currentValue ?? 0).toLocaleString()}</p>
                        <p className={`text-sm font-black ${gainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Activity className="text-gray-200 w-10 h-10" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No investments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="space-y-8">
          <div className="bg-white p-12 rounded-[3rem] border-2 border-gray-50 shadow-sm sticky top-28 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            
            <h4 className="text-2xl font-black text-gray-900 mb-10 tracking-tighter">Quick Trade</h4>
            
            {selectedAsset ? (
              <div className="space-y-10">
                <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[2rem] border-2 border-transparent hover:border-blue-100 transition-all">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Asset</p>
                    <p className="text-xl font-black text-gray-900 tracking-tight">{selectedAsset.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Price</p>
                    <p className="text-xl font-black text-blue-600 tracking-tight">${(selectedAsset.price ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Amount of Shares</label>
                  <div className="relative">
                    <Activity className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-16 pr-8 py-6 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-600 rounded-[2rem] text-3xl font-black outline-none transition-all"
                      value={sharesToBuy || ''}
                      onChange={e => setSharesToBuy(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="p-8 bg-gray-50 rounded-[2rem] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Estimated Cost</span>
                    <span className="text-xl font-black text-gray-900 tracking-tight">${((sharesToBuy ?? 0) * (selectedAsset?.price ?? 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Available</span>
                    <span className="text-lg font-black text-emerald-600 tracking-tight">${(profile?.balance ?? 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => handleTrade(selectedAsset, sharesToBuy, true)}
                    disabled={isSubmitting || sharesToBuy <= 0}
                    className="bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Buy'}
                  </button>
                  <button 
                    onClick={() => handleTrade(selectedAsset, sharesToBuy, false)}
                    disabled={isSubmitting || sharesToBuy <= 0}
                    className="bg-white border-2 border-gray-100 text-gray-900 py-6 rounded-[2rem] font-black text-xl hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    Sell
                  </button>
                </div>
                
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="w-full text-xs font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors"
                >
                  Cancel Trade
                </button>
              </div>
            ) : (
              <div className="text-center py-24 space-y-8">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <DollarSign className="text-gray-200 w-12 h-12" />
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
