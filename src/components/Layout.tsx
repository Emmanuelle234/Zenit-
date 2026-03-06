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
  Bell
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'savings', label: 'Savings', icon: PiggyBank },
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-80 bg-white border-r border-black/[0.03] p-8 h-screen sticky top-0 shadow-sm">
        <div className="flex items-center gap-4 mb-14 px-2">
          <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-600/20">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">Zenith</span>
        </div>

        <nav className="flex-1 space-y-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-6 h-6 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-base tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-black/[0.03]">
          <div className="flex items-center gap-4 px-2 mb-8 group cursor-pointer" onClick={() => setActiveTab('settings')}>
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
              alt="Profile" 
              className="w-12 h-12 rounded-2xl border-2 border-white shadow-md group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{profile?.displayName}</p>
              <p className="text-xs text-gray-400 font-medium truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold group"
          >
            <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-black/[0.03] h-24 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <Menu className="w-7 h-7 text-gray-900" />
            </button>
            <span className="text-2xl font-bold tracking-tight text-gray-900">Zenith</span>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900 capitalize tracking-tight">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative group">
              <Bell className="w-7 h-7 transition-transform group-hover:rotate-12" />
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-10 w-px bg-black/[0.03] mx-2"></div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Available Balance</p>
                <p className="text-lg font-black text-blue-600 tracking-tight">
                  ${(profile?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 md:p-14 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-white z-[70] md:hidden p-8 flex flex-col shadow-2xl rounded-r-[3rem]"
            >
              <div className="flex items-center justify-between mb-14">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-600/20">
                    <ShieldCheck className="text-white w-7 h-7" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight text-gray-900">Zenith</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-7 h-7 text-gray-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${
                      activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-base tracking-wide">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-black/[0.03]">
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold"
                >
                  <LogOut className="w-6 h-6" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
