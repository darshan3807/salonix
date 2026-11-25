import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { isDatePassed } from '../lib/slotUtils.ts';
import {
  Users,
  Store,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  RefreshCw,
  Check,
  X,
  Tag,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

type AdminTab = 'pending' | 'users' | 'salons' | 'appointments' | 'categories';

export const AdminDashboard: React.FC = () => {
  const { user, categories, refreshPendingCount, refreshCategories, refreshSalons, goBack } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');

  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allSalons, setAllSalons] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeUsers: 0,
    approvedSalons: 0,
    totalAppointments: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'customer' | 'owner'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [salonSearch, setSalonSearch] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('all');

  // Categories form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  const showSuccess = (msg: string) => {
    setActionError(null);
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const showError = (msg: string) => {
    setActionSuccess(null);
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, usersRes, salonsRes, appointmentsRes, statsRes] = await Promise.all([
        apiFetch('/api/admin/pending'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/salons?all=true'),
        apiFetch('/api/appointments?all=true'),
        apiFetch('/api/admin/stats'),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingUsers(data.pendingUsers || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data.users || []);
      }
      if (salonsRes.ok) {
        const data = await salonsRes.json();
        setAllSalons(data.salons || []);
      }
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        setAllAppointments(data.appointments || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      refreshPendingCount();
      refreshCategories();
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUserAction = async (userId: number, action: 'approve' | 'reject', userName: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showSuccess(
          `Account for ${userName} has been ${action === 'approve' ? 'activated' : 'deactivated'}.`
        );
        await Promise.all([fetchAdminData(), refreshSalons()]);
      } else {
        showError(data.error || 'Could not update user status.');
      }
    } catch (e: any) {
      showError('Network error: ' + e.message);
    }
  };

  const handleSalonAction = async (salonId: string, action: 'approve' | 'reject', salonName: string) => {
    try {
      const res = await apiFetch(`/api/admin/salons/${salonId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showSuccess(`Salon "${salonName}" has been ${action === 'approve' ? 'approved' : 'rejected'}.`);
        await Promise.all([fetchAdminData(), refreshSalons()]);
      } else {
        showError(data.error || 'Could not update salon status.');
      }
    } catch (e: any) {
      showError('Network error: ' + e.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const res = await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || 'Category created.');
        setNewCatName('');
        setNewCatDesc('');
        await refreshCategories();
      } else {
        showError(data.error || 'Could not create category.');
      }
    } catch (e: any) {
      showError('Network error: ' + e.message);
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    try {
      const res = await apiFetch(`/api/admin/categories/${catId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Category "${catName}" deleted.`);
        await refreshCategories();
      } else {
        showError(data.error || 'Cannot delete category.');
      }
    } catch (e: any) {
      showError('Network error: ' + e.message);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (userFilter !== 'all' && u.role !== userFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allUsers, userFilter, statusFilter, userSearch]);

  const filteredSalons = useMemo(() => {
    const q = salonSearch.trim().toLowerCase();
    return allSalons.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.owner_name && s.owner_name.toLowerCase().includes(q))
    );
  }, [allSalons, salonSearch]);

  const filteredAppointments = useMemo(() => {
    return allAppointments.filter((apt) => {
      if (aptStatusFilter === 'all') return true;
      return String(apt.status || '').toLowerCase() === aptStatusFilter;
    });
  }, [allAppointments, aptStatusFilter]);

  const getAptBadge = (raw: string) => {
    const st = String(raw || '').toLowerCase();
    if (st === 'pending') return 'bg-amber-100 text-amber-800';
    if (st === 'confirmed') return 'bg-emerald-100 text-emerald-800';
    if (st === 'completed') return 'bg-indigo-100 text-indigo-800';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-500">• Salonix Management</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Platform Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage users, salon partners, service categories, and monitor platform-wide bookings.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-purple-500 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Action Notifications */}
      {actionSuccess && (
        <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 text-sm shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="my-6 p-4 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-rose-900 text-sm shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Approvals</span>
            <div className={`p-2 rounded-xl ${pendingUsers.length > 0 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3 tabular-nums">{pendingUsers.length}</p>
          <p className="text-xs text-purple-700 font-semibold mt-1">
            {pendingUsers.length > 0 ? 'Action required' : 'All caught up'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('users')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Users</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3 tabular-nums">{stats.activeUsers}</p>
          <p className="text-xs text-slate-500 mt-1">Customers & salon owners</p>
        </div>

        <div
          onClick={() => setActiveTab('salons')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'salons'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Salons</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3 tabular-nums">{stats.approvedSalons}</p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Verified service providers</p>
        </div>

        <div
          onClick={() => setActiveTab('appointments')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'appointments'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Bookings</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3 tabular-nums">{stats.totalAppointments}</p>
          <p className="text-xs text-slate-500 mt-1">Total appointments logged</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pending'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingUsers.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-extrabold bg-purple-600 text-white rounded-full tabular-nums">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('salons')}
          className={`pb-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'salons'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Salons ({allSalons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'appointments'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments ({allAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* Tab 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">Pending Verification Queue</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Review pending user and salon partner registrations before granting full listing visibility.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-md border border-purple-300 tabular-nums">
              {pendingUsers.length} Pending
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900">No Pending Registrations</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                All submitted user and salon applications have been reviewed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingUsers.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm p-6 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-purple-100 text-purple-900">
                        {item.role === 'owner' ? 'Salon Owner' : 'Customer'}
                      </span>
                      <span className="text-xs font-semibold text-amber-700">Pending</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.email}</p>
                      {item.phone && <p className="text-xs text-slate-600 mt-1">{item.phone}</p>}
                      <p className="text-xs text-slate-600 mt-0.5">City: {item.city || 'Pune'}</p>
                    </div>
                    {item.role === 'owner' && (
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
                        <p className="font-bold text-slate-900">Salon: {item.salon_name || 'New Salon'}</p>
                        {item.salon_address && <p className="text-slate-600 mt-0.5">{item.salon_address}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-5 mt-5 border-t border-slate-100">
                    <button
                      onClick={() => handleUserAction(item.id, 'approve', item.name)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleUserAction(item.id, 'reject', item.name)}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: ALL USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={userFilter}
                onChange={(e: any) => setUserFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="owner">Salon Owners</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Salon</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = String(u.id) === String(user?.id);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-rose-100 text-rose-800'
                              : u.role === 'owner'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{u.city || '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {u.salon_name || (u.salon_id ? u.salon_id : '—')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold capitalize ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-xs text-slate-400">Current Admin</span>
                        ) : u.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleUserAction(u.id, 'approve', u.name)}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUserAction(u.id, 'reject', u.name)}
                              className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : u.status === 'active' ? (
                          <button
                            onClick={() => handleUserAction(u.id, 'reject', u.name)}
                            className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 cursor-pointer"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(u.id, 'approve', u.name)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: ALL SALONS */}
      {activeTab === 'salons' && (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={salonSearch}
              onChange={(e) => setSalonSearch(e.target.value)}
              placeholder="Search salons by name, city, or owner..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon) => (
              <div key={salon.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-snug">{salon.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{salon.city} • {salon.address}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold capitalize shrink-0 ${
                      salon.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : salon.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {salon.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 tabular-nums">
                  <p>Owner: <strong className="text-slate-800">{salon.owner_name || 'Partner'}</strong></p>
                  <p>Hours: {salon.opening_time} – {salon.closing_time}</p>
                  <p>Services: {salon.service_count ?? (salon.services?.length || 0)} • Starting ₹{salon.starting_price}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  {salon.status !== 'approved' && (
                    <button
                      onClick={() => handleSalonAction(salon.id, 'approve', salon.name)}
                      className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve Salon
                    </button>
                  )}
                  {salon.status !== 'rejected' && (
                    <button
                      onClick={() => handleSalonAction(salon.id, 'reject', salon.name)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: ALL APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800">All Platform Appointments ({filteredAppointments.length})</h3>
            <select
              value={aptStatusFilter}
              onChange={(e) => setAptStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Salon</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-xs font-medium text-slate-900">
                      <div>{apt.date}</div>
                      <div className="text-slate-500 font-mono">{apt.start_time}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-bold text-slate-900">{apt.customer_name}</div>
                      <div className="text-slate-500">{apt.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">{apt.salon_name}</td>
                    <td className="py-3 px-4 text-xs text-slate-800">{apt.service_name}</td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">₹{apt.price}</td>
                    <td className="py-3 px-4">
                      {isDatePassed(apt.date) && String(apt.status).toLowerCase() !== 'cancelled' && String(apt.status).toLowerCase() !== 'rejected' ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Appointment Completed
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold capitalize ${getAptBadge(apt.status)}`}>
                          {apt.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: SERVICE CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 h-fit">
            <h3 className="font-serif font-bold text-lg text-slate-900">Add Service Category</h3>
            <p className="text-xs text-slate-500">
              Categories organize services across discovery filters and salon menus.
            </p>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Nail Art & Manicure"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description shown on the home page..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingCat}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingCat ? 'Adding...' : 'Create Category'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-start justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {cat.description || 'Salon service category.'}
                  </p>
                  <span className="inline-block mt-2 text-[11px] font-mono text-slate-400">{cat.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  title="Delete Category"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
