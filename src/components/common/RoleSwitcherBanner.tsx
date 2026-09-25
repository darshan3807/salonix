import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, Shield, Store, User as UserIcon, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentUser, quickLoginAs, resetDemoData, navigate, currentPath } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Role Switcher"
      className="bg-slate-900 text-white text-xs border-b border-slate-800 sticky top-0 z-50 transition-all shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-purple-600/30 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono font-medium tracking-tight">
            PROTOTYPE SWITCHER
          </span>
          {!collapsed && (
            <span className="text-slate-400 hidden sm:inline">
              Active Persona: <strong className="text-white font-medium">{currentUser ? currentUser.name : 'Guest'}</strong> ({currentUser?.role.toUpperCase() || 'PUBLIC'})
            </span>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Switch Role:</span>
            
            <button
              onClick={() => quickLoginAs('customer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                currentUser?.role === 'customer'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              onClick={() => quickLoginAs('owner')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                currentUser?.role === 'owner'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Salon Owner</span>
            </button>

            <button
              onClick={() => quickLoginAs('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-600 text-white font-medium shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

            <button
              onClick={resetDemoData}
              title="Reset initial demo appointments, salons and mock data"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors ml-auto sm:ml-0"
          aria-label={collapsed ? "Expand demo switcher" : "Collapse demo switcher"}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
