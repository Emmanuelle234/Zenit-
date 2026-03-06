import React, { useState } from 'react';
import { AuthProvider, useAuth, LoginView } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Savings } from './components/Savings';
import { Investments } from './components/Investments';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
          <p className="text-gray-500 font-medium">Initializing Zenith Finance...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'savings':
        return <Savings />;
      case 'investments':
        return <Investments />;
      case 'admin':
        return <AdminPanel />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
