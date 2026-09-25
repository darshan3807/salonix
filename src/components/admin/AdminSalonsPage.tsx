import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Salon, SalonStatus } from '../../types';
import { StatusBadge } from '../common/Badge';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Store, Star, MapPin, Search, Filter, ShieldCheck, Check, X, AlertTriangle, Eye } from 'lucide-react';

export const AdminSalonsPage: React.FC = () => {
  const { salons, services, adminUpdateSalonStatus, navigate } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');

  const [actionTarget, setActionTarget] = useState<{ salon: Salon; status: SalonStatus } | null>(null);

  const filteredSalons = useMemo(() => {
    return salons.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (cityFilter !== 'all' && s.city !== cityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchOwner = s.ownerName.toLowerCase().includes(q);
        const matchCity = s.city.toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchCity) return false;
      }
      return true;
    });
  }, [salons, statusFilter, cityFilter, search]);

  const handleConfirmStatusChange = () => {
    if (actionTarget) {
      adminUpdateSalonStatus(actionTarget.salon.id, actionTarget.status);
      setActionTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Salon Partner Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Salons Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review onboarding applications, approve verified venues and monitor salon operations.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search salon name, owner or city..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved & Active</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
          >
            <option value="all">All Cities</option>
            <option value="Pune">Pune</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Nashik">Nashik</option>
            <option value="Jalgaon">Jalgaon</option>
            <option value="Navi Mumbai">Navi Mumbai</option>
          </select>
        </div>
      </div>

      {/* Salons Table (Spec #6) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Salon Name</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Active Services</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSalons.map((salon) => {
                const srvCount = services.filter((srv) => srv.salonId === salon.id).length;

                return (
                  <tr key={salon.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block font-display">
                        {salon.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {salon.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 font-medium block">{salon.ownerName}</span>
                      <span className="text-slate-400 text-[11px] block">{salon.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {salon.city}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums font-semibold text-slate-800">
                      {srvCount} services
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{salon.rating}</span>
                        <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{salon.createdAt}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={salon.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => navigate(`/salons/${salon.id}`)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-[11px] cursor-pointer"
                        title="View Public Profile"
                      >
                        View
                      </button>

                      {salon.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setActionTarget({ salon, status: 'approved' })}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setActionTarget({ salon, status: 'rejected' })}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {salon.status === 'approved' && (
                        <button
                          onClick={() => setActionTarget({ salon, status: 'suspended' })}
                          className="px-2 py-1 text-amber-700 hover:bg-amber-50 rounded text-[11px] cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}

                      {salon.status === 'suspended' && (
                        <button
                          onClick={() => setActionTarget({ salon, status: 'approved' })}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold cursor-pointer"
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!actionTarget}
        title={`Change Salon Status to ${actionTarget?.status.toUpperCase()}`}
        message={`Are you sure you want to change the status of ${actionTarget?.salon.name} to ${actionTarget?.status}?`}
        confirmLabel={`Yes, Confirm ${actionTarget?.status}`}
        variant={actionTarget?.status === 'approved' ? 'success' : 'danger'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  );
};
