import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/slotUtils';
import { Users, Phone, Mail, Search, Calendar, Star } from 'lucide-react';

export const OwnerCustomersPage: React.FC = () => {
  const { currentUser, salons, appointments, users } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.salonId === mySalon?.id);
  }, [appointments, mySalon]);

  const [search, setSearch] = useState('');

  // Extract distinct customers from salon appointments
  const customerMap = useMemo(() => {
    const map = new Map<string, {
      name: string;
      email: string;
      phone: string;
      totalBookings: number;
      completedBookings: number;
      totalSpend: number;
      lastVisit: string;
    }>();

    salonAppointments.forEach((apt) => {
      const key = apt.customerEmail.toLowerCase();
      const existing = map.get(key) || {
        name: apt.customerName,
        email: apt.customerEmail,
        phone: apt.customerPhone,
        totalBookings: 0,
        completedBookings: 0,
        totalSpend: 0,
        lastVisit: apt.date,
      };

      existing.totalBookings += 1;
      if (apt.status === 'COMPLETED') {
        existing.completedBookings += 1;
        existing.totalSpend += apt.price;
      }
      if (new Date(apt.date) > new Date(existing.lastVisit)) {
        existing.lastVisit = apt.date;
      }

      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [salonAppointments]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customerMap;
    const q = search.toLowerCase();
    return customerMap.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [customerMap, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Client Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Salon Customers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View booking history, spending metrics and contact information for your clientele.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email or mobile..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:block">
          {filteredCustomers.length} total clients
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Total Bookings</th>
                <th className="py-3 px-4">Completed Visits</th>
                <th className="py-3 px-4">Total Spend</th>
                <th className="py-3 px-4">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.email} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 font-display">
                      {cust.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 block">{cust.phone}</span>
                      <span className="text-slate-400 text-[11px] block">{cust.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums">
                      {cust.totalBookings}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-purple-700 tabular-nums">
                      {cust.completedBookings}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-display">
                      {formatINR(cust.totalSpend)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {cust.lastVisit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
