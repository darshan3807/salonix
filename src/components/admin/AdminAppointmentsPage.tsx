import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { Calendar, Search, Filter, Clock, MapPin, Store, User } from 'lucide-react';

export const AdminAppointmentsPage: React.FC = () => {
  const { appointments, salons } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [salonFilter, setSalonFilter] = useState('all');

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (salonFilter !== 'all' && a.salonId !== salonFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCustomer = a.customerName.toLowerCase().includes(q);
        const matchService = a.serviceName.toLowerCase().includes(q);
        const matchSalon = a.salonName.toLowerCase().includes(q);
        const matchId = a.id.toLowerCase().includes(q);
        if (!matchCustomer && !matchService && !matchSalon && !matchId) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, salonFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Platform Master Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            All Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global record of all {appointments.length} appointments booked on the Salonix network.
          </p>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, salon, service, ID..."
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
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>

          <select
            value={salonFilter}
            onChange={(e) => setSalonFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
          >
            <option value="all">All Salons</option>
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Salon Venue</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                    #{apt.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 block">
                      {apt.customerName}
                    </span>
                    <span className="text-[11px] text-slate-400">{apt.customerPhone}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-purple-900 block font-display">
                      {apt.salonName}
                    </span>
                    <span className="text-[11px] text-slate-400">{apt.salonCity}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-800 block">
                      {apt.serviceName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {apt.durationMinutes} mins
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 block">{apt.date}</span>
                    <span className="text-purple-700 font-mono text-[11px]">
                      {apt.startTime}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 font-display">
                    {formatINR(apt.price)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={apt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
