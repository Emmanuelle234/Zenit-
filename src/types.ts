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
  category: 'travel' | 'emergency' | 'education' | 'home' | 'other';
  createdAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  assetName: string;
  assetSymbol: string;
  type: 'stock' | 'crypto' | 'bond';
  shares: number;
  averagePrice: number;
  currentPrice: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment_buy' | 'investment_sell' | 'savings_transfer' | 'interest_payout';
  amount: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  type: 'stock' | 'crypto' | 'bond';
}

export interface BankDetails {
  id: string;
  userId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  isDefault: boolean;
  createdAt: string;
}
