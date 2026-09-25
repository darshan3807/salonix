import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { Search, Store, Phone, Mail, MapPin } from 'lucide-react';

export const AdminOwnersPage: React.FC = () => {
  const { users, salons } = useApp();
  const [search, setSearch] = useState('');

  const owners = useMemo(() => {
    return users.filter((u) => u.role === 'owner');
  }, [users]);

  const filtered = useMemo(() => {
    if (!search.trim()) return owners;
    const q = search.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.phone.includes(q)
    );
  }, [owners, search]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Partner Accounts
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Salon Owners Directory
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Registered business owners and salon managers operating on the Salonix platform.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners by name, email or city..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:block">
          {filtered.length} salon owners
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Associated Salon</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((owner) => {
                const salon = salons.find((s) => s.ownerId === owner.id || s.id === owner.salonId);

                return (
                  <tr key={owner.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-display">
                      {owner.name}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-purple-900">
                      {salon?.name || 'Unlinked Salon'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 block">{owner.phone}</span>
                      <span className="text-slate-400 text-[11px] block">{owner.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{owner.city}</td>
                    <td className="py-3.5 px-4 text-slate-500">{owner.createdAt}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={owner.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
