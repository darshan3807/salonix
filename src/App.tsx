import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SalonsPage } from './pages/SalonsPage.tsx';
import { SalonDetailPage } from './pages/SalonDetailPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SignupPage } from './pages/SignupPage.tsx';
import { CustomerDashboard } from './pages/CustomerDashboard.tsx';
import { SalonOwnerDashboard } from './pages/SalonOwnerDashboard.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';

const AppContent: React.FC = () => {
  const { currentView, user, navigateTo } = useApp();

  // Route protection
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'salons':
        return <SalonsPage />;
      case 'salon-detail':
        return <SalonDetailPage />;
      case 'login':
        return <LoginPage />;
      case 'signup':
        return <SignupPage />;
      case 'customer-dashboard':
        if (!user) {
          return <LoginPage />;
        }
        return <CustomerDashboard />;
      case 'owner-dashboard':
        if (!user) {
          return <LoginPage />;
        }
        return <SalonOwnerDashboard />;
      case 'admin-dashboard':
        if (!user) {
          return <LoginPage />;
        }
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      <Navbar />
      <main className="flex-1">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
