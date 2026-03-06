import React from 'react';
import { useAuth } from './Auth';
import { BankDetails } from './BankDetails';
import { 
  User, 
  Mail, 
  Shield, 
  LogOut,
  Bell,
  Globe,
  Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';

export const Settings: React.FC = () => {
  const { profile, logout } = useAuth();

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-12">
      <div className="bg-blue-600 rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl shadow-blue-600/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Settings</h1>
            <p className="text-blue-100 text-lg font-medium max-w-md">
              Manage your account preferences and security settings.
            </p>
          </div>
          <button 
            onClick={logout}
            className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 flex items-center gap-3 font-bold hover:bg-white/20 transition-all text-white"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-4">
          <nav className="space-y-2">
            <button className="w-full flex items-center gap-4 px-6 py-4 bg-white text-blue-600 rounded-2xl font-bold border border-blue-100 shadow-sm shadow-blue-600/5 transition-all">
              <User className="w-6 h-6" /> Profile
            </button>
            <button className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:bg-gray-50 rounded-2xl font-bold transition-all">
              <Shield className="w-6 h-6" /> Security
            </button>
            <button className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:bg-gray-50 rounded-2xl font-bold transition-all">
              <Bell className="w-6 h-6" /> Notifications
            </button>
            <button className="w-full flex items-center gap-4 px-6 py-4 text-gray-400 hover:bg-gray-50 rounded-2xl font-bold transition-all">
              <Globe className="w-6 h-6" /> Language
            </button>
          </nav>
        </div>

        <div className="lg:col-span-3 space-y-10">
          {/* Profile Section */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm space-y-8">
            <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
            <div className="flex items-center gap-8">
              <div className="relative">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white shadow-xl"
                  referrerPolicy="no-referrer"
                />
                <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <Smartphone className="w-5 h-5" />
                </button>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-2xl">{profile?.displayName}</h4>
                <p className="text-gray-400 font-medium flex items-center gap-2 mt-1">
                  <Mail className="w-5 h-5" /> {profile?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                <input 
                  disabled
                  type="text" 
                  value={profile?.displayName}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-gray-500 font-bold cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input 
                  disabled
                  type="text" 
                  value={profile?.email}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-gray-500 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Bank Details Section */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm">
            <BankDetails />
          </section>

          {/* Account Security */}
          <section className="bg-white p-10 rounded-[2.5rem] border border-black/5 shadow-sm space-y-8">
            <h3 className="text-2xl font-bold text-gray-900">Account Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[1.5rem] border border-black/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-black/5 shadow-sm">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-lg">Two-Factor Authentication</h5>
                    <p className="text-sm text-gray-400 font-medium">Add an extra layer of security to your account.</p>
                  </div>
                </div>
                <div className="w-14 h-8 bg-gray-200 rounded-full relative cursor-pointer hover:bg-gray-300 transition-colors">
                  <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
