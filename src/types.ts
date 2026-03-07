export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  balance: number;
  interestEarned: number;
  totalInvested: number;
  depositAddress?: string;
  nigeriaAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  lastInterestPayout?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  amount: number;
  purchasePrice: number;
  currentPrice: number;
  timestamp: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment_buy' | 'investment_sell' | 'interest_payout';
  amount: number;
  description: string;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'stock' | 'crypto' | 'bond';
}
