import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Search, Filter, UserCheck, Shield, Phone, Mail, Calendar, Eye, X } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { users, appointments, adminUpdateUserStatus } = useApp();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUserModal, setSelectedUserModal] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone.includes(q);
        const matchCity = u.city.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const getUserAppointmentsCount = (user: User) => {
    return appointments.filter(
      (a) => a.customerId === user.id || a.customerEmail.toLowerCase() === user.email.toLowerCase()
    ).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            User Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Registered Users & Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor and manage customer accounts, salon partner logins and platform administrators.
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, mobile or city..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="owner">Salon Owners</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* USERS TABLE (SPEC #5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name & Role</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Total Bookings</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map((u) => {
                const bookingCount = getUserAppointmentsCount(u);
                const isActive = u.status === 'active';

                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                      {u.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block font-display">
                        {u.name}
                      </span>
                      <span className="text-[11px] text-purple-700 font-medium uppercase tracking-wider">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 block">{u.email}</span>
                      <span className="text-slate-400 text-[11px]">{u.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{u.city}</td>
                    <td className="py-3.5 px-4 text-slate-500">{u.createdAt}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 tabular-nums">
                      {bookingCount}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedUserModal(u)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-[11px] cursor-pointer"
                        title="View details"
                      >
                        View
                      </button>
                      <button
                        onClick={() => adminUpdateUserStatus(u.id, isActive ? 'inactive' : 'active')}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAIL MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-display">
                User Account Overview
              </h3>
              <button
                onClick={() => setSelectedUserModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm font-display">
                  {selectedUserModal.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm font-display">
                    {selectedUserModal.name}
                  </h4>
                  <p className="text-slate-400">{selectedUserModal.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Email</span>
                  <p className="font-medium text-slate-800">{selectedUserModal.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone</span>
                  <p className="font-medium text-slate-800">{selectedUserModal.phone}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Role</span>
                  <p className="font-semibold text-purple-700 uppercase">
                    {selectedUserModal.role}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">City</span>
                  <p className="font-medium text-slate-800">{selectedUserModal.city}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">Account Status:</span>
                <StatusBadge status={selectedUserModal.status} />
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setSelectedUserModal(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
