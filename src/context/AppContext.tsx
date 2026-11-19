import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Salon, Category, PlatformNotification } from '../types/index.ts';
import { getAuthToken, setAuthToken, apiFetch } from '../lib/api.ts';

export type ViewType =
  | 'home'
  | 'salons'
  | 'salon-detail'
  | 'login'
  | 'signup'
  | 'customer-dashboard'
  | 'owner-dashboard'
  | 'admin-dashboard';

export interface DiscoveryFilters {
  search: string;
  city: string;
  categoryId: string;
}

interface AppContextType {
  user: User | null;
  currentView: ViewType;
  selectedSalonId: string | null;
  salons: Salon[];
  categories: Category[];
  notifications: PlatformNotification[];
  unreadNotificationsCount: number;
  discoveryFilters: DiscoveryFilters;
  isLoading: boolean;
  pendingApprovalsCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; status?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string; status?: string }>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  navigateTo: (view: ViewType, salonId?: string) => void;
  navigateToSalonsWithFilters: (filters: Partial<DiscoveryFilters>) => void;
  setDiscoveryFilters: React.Dispatch<React.SetStateAction<DiscoveryFilters>>;
  refreshSalons: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilters>({
    search: '',
    city: 'All',
    categoryId: 'all',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const fetchSalons = useCallback(async () => {
    try {
      const res = await fetch('/api/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data.salons || []);
      }
    } catch (e) {
      console.error('Error fetching salons:', e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setPendingApprovalsCount(data.pendingApprovals || 0);
      }
    } catch {
      // quiet catch
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotificationsCount(data.unreadCount || 0);
      }
    } catch {
      // quiet catch
    }
  }, []);

  const markNotificationRead = async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Mark notification read error:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadNotificationsCount(0);
      }
    } catch (e) {
      console.error('Mark all notifications read error:', e);
    }
  };

  // Restore authenticated session from backend via GET /api/auth/me using stored JWT
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      const token = getAuthToken();
      if (token) {
        try {
          const meRes = await apiFetch('/api/auth/me');
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.success && meData.user) {
              setUser(meData.user);
              await fetchNotifications();
              if (meData.user.role === 'admin') {
                await fetchPendingCount();
              }
            } else {
              setAuthToken(null);
              setUser(null);
            }
          } else {
            setAuthToken(null);
            setUser(null);
          }
        } catch {
          setAuthToken(null);
          setUser(null);
        }
      }

      await Promise.all([fetchSalons(), fetchCategories()]);
      setIsLoading(false);
    };

    init();
  }, [fetchSalons, fetchCategories, fetchNotifications, fetchPendingCount]);

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

      if (data.success && data.user && data.token) {
        setAuthToken(data.token);
        setUser(data.user);
        fetchNotifications();

        if (data.user.role === 'customer') {
          setCurrentView('customer-dashboard');
        } else if (data.user.role === 'owner') {
          setCurrentView('owner-dashboard');
        } else if (data.user.role === 'admin') {
          setCurrentView('admin-dashboard');
          fetchPendingCount();
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

      if (data.token) {
        setAuthToken(data.token);
      }

      if (data.user) {
        setUser(data.user);
        fetchNotifications();

        if (data.user.role === 'customer') {
          setCurrentView('customer-dashboard');
        } else if (data.user.role === 'owner') {
          setCurrentView('owner-dashboard');
        } else {
          setCurrentView('home');
        }
      }

      fetchSalons();

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
    setAuthToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadNotificationsCount(0);
    setPendingApprovalsCount(0);
    setCurrentView('home');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const navigateTo = (view: ViewType, salonId?: string) => {
    if (salonId) {
      setSelectedSalonId(salonId);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSalonsWithFilters = (filters: Partial<DiscoveryFilters>) => {
    setDiscoveryFilters({
      search: filters.search ?? '',
      city: filters.city ?? 'All',
      categoryId: filters.categoryId ?? 'all',
    });
    setCurrentView('salons');
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
        notifications,
        unreadNotificationsCount,
        discoveryFilters,
        isLoading,
        pendingApprovalsCount,
        login,
        register,
        logout,
        updateUser,
        navigateTo,
        navigateToSalonsWithFilters,
        setDiscoveryFilters,
        refreshSalons: fetchSalons,
        refreshCategories: fetchCategories,
        refreshPendingCount: fetchPendingCount,
        refreshNotifications: fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
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
