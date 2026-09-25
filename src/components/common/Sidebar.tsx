import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Store,
  Calendar,
  Sparkles,
  Layers,
  BarChart3,
  Settings,
  LogOut,
  UserCheck,
  Clock,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'owner';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { currentPath, navigate, logout, appointments, salons } = useApp();

  const isOwner = role === 'owner';

  // Badge counts
  const pendingRequestsCount = appointments.filter(
    (a) => a.status === 'PENDING'
  ).length;

  const pendingSalonsCount = salons.filter((s) => s.status === 'pending').length;

  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Salon Owners', path: '/admin/owners', icon: UserCheck },
    {
      label: 'Salons',
      path: '/admin/salons',
      icon: Store,
      badge: pendingSalonsCount > 0 ? `${pendingSalonsCount} Pending` : undefined,
    },
    { label: 'Appointments', path: '/admin/appointments', icon: Calendar },
    { label: 'Services', path: '/admin/services', icon: Sparkles },
    { label: 'Categories', path: '/admin/categories', icon: Layers },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const ownerNav = [
    { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'My Salon', path: '/owner/salon', icon: Store },
    { label: 'Services', path: '/owner/services', icon: Sparkles },
    {
      label: 'Appointments',
      path: '/owner/appointments',
      icon: Clock,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} New` : undefined,
    },
    { label: 'Calendar', path: '/owner/calendar', icon: Calendar },
    { label: 'Customers', path: '/owner/customers', icon: Users },
    { label: 'Reports', path: '/owner/reports', icon: BarChart3 },
    { label: 'Profile', path: '/owner/profile', icon: UserIcon },
    { label: 'Settings', path: '/owner/settings', icon: Settings },
  ];

  const items = isOwner ? ownerNav : adminNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {isOwner ? 'Salon Partner Portal' : 'Platform Administration'}
        </p>
        <h2 className="text-sm font-semibold text-slate-800 font-display mt-0.5">
          {isOwner ? 'Manager Console' : 'Master Control'}
        </h2>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                active
                  ? 'bg-purple-50 text-purple-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    active ? 'text-purple-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge ? (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                  {item.badge}
                </span>
              ) : active ? (
                <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
