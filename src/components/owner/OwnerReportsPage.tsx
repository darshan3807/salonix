import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/slotUtils';
import { BarChart3, TrendingUp, Users, CheckCircle2, Calendar } from 'lucide-react';

export const OwnerReportsPage: React.FC = () => {
  const { currentUser, salons, appointments, services } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.salonId === mySalon?.id);
  }, [appointments, mySalon]);

  // Overall calculations
  const totalRevenue = useMemo(() => {
    return salonAppointments
      .filter((a) => ['COMPLETED', 'CONFIRMED'].includes(a.status))
      .reduce((sum, a) => sum + a.price, 0);
  }, [salonAppointments]);

  const completedCount = salonAppointments.filter((a) => a.status === 'COMPLETED').length;
  const confirmedCount = salonAppointments.filter((a) => a.status === 'CONFIRMED').length;
  const cancelledCount = salonAppointments.filter((a) => a.status === 'CANCELLED' || a.status === 'REJECTED').length;

  // Service distribution
  const serviceStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    salonAppointments.forEach((apt) => {
      const existing = map.get(apt.serviceName) || { name: apt.serviceName, count: 0, revenue: 0 };
      existing.count += 1;
      if (['COMPLETED', 'CONFIRMED'].includes(apt.status)) {
        existing.revenue += apt.price;
      }
      map.set(apt.serviceName, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [salonAppointments]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Analytics & Performance
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Salon Business Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review salon earnings, booking fulfillment rates and popular treatment services.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Realized Revenue</span>
          <p className="text-2xl font-bold text-purple-900 font-display mt-1 tabular-nums">
            {formatINR(totalRevenue)}
          </p>
          <span className="text-[11px] text-emerald-600 block mt-1">From all salon bookings</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Completed Appointments</span>
          <p className="text-2xl font-bold text-slate-900 font-display mt-1 tabular-nums">
            {completedCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">Successfully fulfilled</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Confirmed In Queue</span>
          <p className="text-2xl font-bold text-emerald-700 font-display mt-1 tabular-nums">
            {confirmedCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">Upcoming sessions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Cancellation / Rejection</span>
          <p className="text-2xl font-bold text-rose-600 font-display mt-1 tabular-nums">
            {cancelledCount}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">Total dropped slots</span>
        </div>
      </div>

      {/* Popular Treatments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          Top Performing Services
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Service Name</th>
                <th className="py-2.5 px-3">Total Requests</th>
                <th className="py-2.5 px-3">Revenue Generated</th>
                <th className="py-2.5 px-3">Share of Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {serviceStats.map((item) => {
                const percentage = Math.round((item.count / (salonAppointments.length || 1)) * 100);
                return (
                  <tr key={item.name} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900 font-display">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 tabular-nums font-medium text-slate-800">
                      {item.count}
                    </td>
                    <td className="py-3 px-3 font-bold text-purple-900 font-display">
                      {formatINR(item.revenue)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-700 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {percentage}%
                        </span>
                      </div>
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
