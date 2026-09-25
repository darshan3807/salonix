import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Salon, Category } from '../types/index.ts';

export type ViewType = 
  | 'home' 
  | 'salons' 
  | 'salon-detail' 
  | 'login' 
  | 'signup' 
  | 'customer-dashboard' 
  | 'owner-dashboard' 
  | 'admin-dashboard';

interface AppContextType {
  user: User | null;
  currentView: ViewType;
  selectedSalonId: string | null;
  salons: Salon[];
  categories: Category[];
  isLoading: boolean;
  pendingApprovalsCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; status?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string; status?: string }>;
  logout: () => void;
  navigateTo: (view: ViewType, salonId?: string) => void;
  refreshSalons: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // IMPORTANT: Default state is unauthenticated (null), landing on the main home page!
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('salonix_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data.salons || []);
      }
    } catch (e) {
      console.error('Error fetching salons:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalsCount(data.pendingApprovals || 0);
      }
    } catch (e) {
      // quiet catch
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchSalons(), fetchCategories(), fetchPendingCount()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          status: data.error || 'error',
          message: data.message || data.error || 'Login failed. Please verify credentials.',
        };
      }

      if (data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('salonix_auth_user', JSON.stringify(data.user));
        } catch {}

        // Route to the dashboard respect to login role
        if (data.user.role === 'customer') {
          setCurrentView('customer-dashboard');
        } else if (data.user.role === 'owner') {
          setCurrentView('owner-dashboard');
        } else if (data.user.role === 'admin') {
          setCurrentView('admin-dashboard');
        } else {
          setCurrentView('home');
        }

        return { success: true };
      }

      return { success: false, message: 'Invalid server response' };
    } catch (err: any) {
      return { success: false, message: 'Connection error: ' + err.message };
    }
  };

  const register = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.error || 'Registration failed',
        };
      }

      if (data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('salonix_auth_user', JSON.stringify(data.user));
        } catch {}

        if (data.user.role === 'customer') {
          setCurrentView('customer-dashboard');
        } else if (data.user.role === 'owner') {
          setCurrentView('owner-dashboard');
        } else {
          setCurrentView('home');
        }
      }

      // Refresh data
      fetchSalons();
      fetchPendingCount();

      return {
        success: true,
        user: data.user,
        message: data.message,
      };
    } catch (err: any) {
      return { success: false, message: 'Registration network error: ' + err.message };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('salonix_auth_user');
    } catch {}
    setCurrentView('home');
  };

  const navigateTo = (view: ViewType, salonId?: string) => {
    if (salonId) {
      setSelectedSalonId(salonId);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        currentView,
        selectedSalonId,
        salons,
        categories,
        isLoading,
        pendingApprovalsCount,
        login,
        register,
        logout,
        navigateTo,
        refreshSalons: fetchSalons,
        refreshPendingCount: fetchPendingCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
