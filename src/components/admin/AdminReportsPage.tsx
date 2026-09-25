import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/slotUtils';
import { BarChart3, TrendingUp, MapPin, Store, CheckCircle, Users } from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const { salons, appointments, users } = useApp();

  // Metrics by city (Pune, Mumbai, Nashik, Jalgaon, Navi Mumbai)
  const cityMetrics = useMemo(() => {
    const cities = ['Pune', 'Mumbai', 'Nashik', 'Jalgaon', 'Navi Mumbai'];
    return cities.map((city) => {
      const citySalons = salons.filter((s) => s.city.toLowerCase() === city.toLowerCase());
      const salonIds = new Set(citySalons.map((s) => s.id));
      const cityAppointments = appointments.filter((a) => salonIds.has(a.salonId));
      const cityRevenue = cityAppointments
        .filter((a) => ['COMPLETED', 'CONFIRMED'].includes(a.status))
        .reduce((sum, a) => sum + a.price, 0);

      return {
        city,
        salonCount: citySalons.length,
        appointmentCount: cityAppointments.length,
        revenue: cityRevenue,
      };
    });
  }, [salons, appointments]);

  const grossBookingValue = useMemo(() => {
    return appointments
      .filter((a) => ['COMPLETED', 'CONFIRMED'].includes(a.status))
      .reduce((sum, a) => sum + a.price, 0);
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Executive Intelligence
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Platform Reports & City Growth
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Marketplace booking volume, salon network expansion and revenue distribution across Maharashtra.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Gross Booking Value (GBV)</span>
          <p className="text-2xl font-bold text-purple-900 font-display mt-1 tabular-nums">
            {formatINR(grossBookingValue)}
          </p>
          <span className="text-[11px] text-emerald-600 block mt-1">Confirmed + Completed transactions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Platform Fulfillment Rate</span>
          <p className="text-2xl font-bold text-slate-900 font-display mt-1 tabular-nums">
            {Math.round(
              (appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'CONFIRMED').length /
                (appointments.length || 1)) *
                100
            )}%
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">Appointments accepted & served</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Salon Network</span>
          <p className="text-2xl font-bold text-slate-900 font-display mt-1 tabular-nums">
            {salons.filter((s) => s.status === 'approved').length} / {salons.length}
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">Approved partner capacity</span>
        </div>
      </div>

      {/* City Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          Geographic Growth Breakdown (By City)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">City Region</th>
                <th className="py-2.5 px-3">Partner Salons</th>
                <th className="py-2.5 px-3">Total Appointments</th>
                <th className="py-2.5 px-3">Gross Booking Value</th>
                <th className="py-2.5 px-3">Market Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cityMetrics.map((cm) => {
                const share = Math.round((cm.appointmentCount / (appointments.length || 1)) * 100);

                return (
                  <tr key={cm.city} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900 font-display flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-700" />
                      <span>{cm.city}</span>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-medium text-slate-800">
                      {cm.salonCount} salons
                    </td>
                    <td className="py-3 px-3 tabular-nums font-semibold text-purple-900">
                      {cm.appointmentCount} bookings
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-display">
                      {formatINR(cm.revenue)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-700 h-2 rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-500">{share}%</span>
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
