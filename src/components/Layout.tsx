import React from 'react';
import { useAuth } from './Auth';
import { 
  LayoutDashboard, 
  PiggyBank, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  Bell,
  Gift,
  Search,
  History,
  Globe,
  Wallet as WalletIcon,
  User,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'investments', label: 'Invest', icon: TrendingUp },
    { id: 'settings', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-bg-main flex flex-col font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl z-50 px-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900 uppercase">GND Crypt</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-brand-primary transition-all relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-danger rounded-full border-2 border-white"></span>
          </button>
          <img 
            src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-32 px-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-8 py-4 flex items-center justify-between z-50">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={activeTab === item.id ? 'nav-item-active' : 'nav-item'}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        
        {/* Central Plus Button for Quick Actions */}
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-primary/30 -mt-12 border-4 border-bg-main active:scale-90 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </button>

        {navItems.slice(2).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={activeTab === item.id ? 'nav-item-active' : 'nav-item'}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar (Optional, but keeping it simple for now) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-100 p-8 flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <TrendingUp className="text-white w-7 h-7" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase">GND Crypt</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${
                activeTab === item.id 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-lg tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-gray-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-brand-danger hover:bg-red-50 transition-all font-bold"
          >
            <LogOut className="w-6 h-6" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
