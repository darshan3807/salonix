import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';
import { 
  Users, Store, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Shield, Calendar, Search, Filter, RefreshCw, ChevronRight, Check, X, Sparkles
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, refreshPendingCount } = useApp();
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'salons' | 'appointments'>('pending');

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
  const [userFilter, setUserFilter] = useState<'all' | 'customer' | 'owner'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');

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

      if (res.ok) {
        setActionSuccess(
          `Success: Account for ${userName} has been ${
            action === 'approve' ? 'APPROVED & ACTIVATED' : 'REJECTED'
          }.`
        );
        setTimeout(() => setActionSuccess(null), 5000);
        fetchAdminData();
      }
    } catch (e) {
      console.error('Admin action error:', e);
    }
  };

  const handleSalonAction = async (salonId: string, action: 'approve' | 'reject', salonName: string) => {
    try {
      const res = await apiFetch(`/api/admin/salons/${salonId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setActionSuccess(`Salon "${salonName}" has been ${action === 'approve' ? 'APPROVED' : 'REJECTED'}.`);
        setTimeout(() => setActionSuccess(null), 5000);
        fetchAdminData();
      }
    } catch (e) {
      console.error('Salon action error:', e);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (userFilter !== 'all' && u.role !== userFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-500">• Salonix Management</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Platform Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve customer and salon partner registrations, audit active salons, and oversee bookings.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-purple-500 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="my-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-900 text-sm shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button 
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <div className={`p-2 rounded-xl ${pendingUsers.length > 0 ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3">
            {pendingUsers.length}
          </p>
          <p className="text-xs text-purple-700 font-semibold mt-1">
            {pendingUsers.length > 0 ? 'Action required: users waiting' : 'All caught up!'}
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Users
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3">
            {stats.activeUsers}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Customers & salon owners
          </p>
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved Salons
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3">
            {stats.approvedSalons}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            Verified service providers
          </p>
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Platform Bookings
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-3">
            {stats.totalAppointments}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Total appointments logged
          </p>
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
            <span className="px-2 py-0.5 text-xs font-extrabold bg-purple-600 text-white rounded-full">
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
          <span>All Registered Users ({allUsers.length})</span>
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
          <span>Platform Appointments ({allAppointments.length})</span>
        </button>
      </div>

      {/* Tab 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Pending Verification Queue
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                New customers and salon owners require admin approval before they can sign in to their dashboard.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
              {pendingUsers.length} Registrations Awaiting Decision
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900">
                No Pending Registrations
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                All submitted customer and salon owner registrations have been reviewed and approved!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingUsers.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm p-6 hover:border-purple-400 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Row: Role badge & time */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          item.role === 'owner'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        {item.role === 'owner' ? (
                          <>
                            <Store className="w-3.5 h-3.5 text-purple-700" />
                            <span>Salon Owner</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5 text-indigo-700" />
                            <span>Customer</span>
                          </>
                        )}
                      </span>

                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span>Pending</span>
                      </span>
                    </div>

                    {/* Applicant Information */}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.email}</p>
                      {item.phone && (
                        <p className="text-xs text-slate-600 mt-1 font-medium">📞 {item.phone}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-0.5">📍 City: {item.city || 'Pune'}</p>
                    </div>

                    {/* Salon specifics if owner */}
                    {item.role === 'owner' && (
                      <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200 text-xs space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-purple-600" />
                          <span>Salon: {item.salon_name || 'New Salon Listing'}</span>
                        </div>
                        {item.salon_address && (
                          <p className="text-slate-600 text-[11px]">Address: {item.salon_address}</p>
                        )}
                        <p className="text-[11px] text-purple-800 font-medium">
                          ⚡ Approving will also verify and activate this salon in public listings!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleUserAction(item.id, 'approve', item.name)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Account</span>
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
          {/* Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase text-slate-500">Filter Role:</span>
              <select
                value={userFilter}
                onChange={(e: any) => setUserFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="owner">Salon Owners</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase text-slate-500">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active / Approved</option>
                <option value="pending">Pending Approval</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Salon Association</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        u.role === 'admin' 
                          ? 'bg-rose-100 text-rose-800' 
                          : u.role === 'owner' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                      {u.city || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {u.salon_name || (u.salon_id ? u.salon_id : '—')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.status === 'pending'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status === 'active' && '✓ Active'}
                        {u.status === 'pending' && '⏳ Pending Approval'}
                        {u.status === 'rejected' && '✕ Rejected'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
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
                      ) : (
                        <span className="text-xs text-slate-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: ALL SALONS */}
      {activeTab === 'salons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allSalons.map((salon) => (
            <div key={salon.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{salon.name}</h3>
                  <p className="text-xs text-slate-500">{salon.city} • {salon.address}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  salon.status === 'approved' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : salon.status === 'pending'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {salon.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>Owner: <strong className="text-slate-800">{salon.owner_name || 'Partner'}</strong></p>
                <p>Hours: {salon.opening_time} - {salon.closing_time}</p>
                <p>Starting Price: ₹{salon.starting_price}</p>
              </div>

              {salon.status === 'pending' && (
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleSalonAction(salon.id, 'approve', salon.name)}
                    className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Approve Salon
                  </button>
                  <button
                    onClick={() => handleSalonAction(salon.id, 'reject', salon.name)}
                    className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: ALL APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">All Appointments Across Platform</h3>
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
              <tbody className="divide-y divide-slate-100">
                {allAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-xs font-medium text-slate-900">
                      <div>{apt.date}</div>
                      <div className="text-slate-500 font-mono">{apt.start_time}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-bold text-slate-900">{apt.customer_name}</div>
                      <div className="text-slate-500">{apt.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                      {apt.salon_name}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-800">
                      {apt.service_name}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-900">
                      ₹{apt.price}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-bold capitalize bg-slate-100 text-slate-800">
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
