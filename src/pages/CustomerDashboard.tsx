import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Appointment } from '../types/index.ts';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, Plus, Scissors, UserCheck } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user, navigateTo } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments?userEmail=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error('Error fetching appointments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCancelAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'Cancelled by customer' }),
      });

      if (res.ok) {
        setMessage('Appointment has been cancelled.');
        setTimeout(() => setMessage(null), 4000);
        fetchAppointments();
      }
    } catch (e) {
      console.error('Cancel appointment error:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Welcome & Profile Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Account</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">
            Welcome back, {user?.name || 'Customer'}!
          </h1>
          <p className="text-sm text-slate-300 max-w-md">
            Manage your booked salon appointments, check upcoming time slots, and explore premier stylists near you.
          </p>
        </div>

        <button
          onClick={() => navigateTo('salons')}
          className="self-start sm:self-center px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Appointment</span>
        </button>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-300 rounded-xl text-purple-900 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Appointments Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            My Appointments
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            {appointments.length} appointment(s)
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-slate-900">
              No Appointments Yet
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              You don't have any booked appointments. Browse our top-rated verified salons and schedule your next makeover today!
            </p>
            <button
              onClick={() => navigateTo('salons')}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
            >
              Explore Salons
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{apt.salon_name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{apt.salon_city} {apt.salon_address && `• ${apt.salon_address}`}</span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'completed'
                          ? 'bg-indigo-100 text-indigo-800'
                          : apt.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-200/60">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-500">Service:</span>
                      <span className="text-slate-900">{apt.service_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-medium text-slate-800">{apt.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Time Slot:</span>
                      <span className="font-mono font-medium text-purple-800">{apt.start_time}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                      <span className="text-slate-700">Estimated Price:</span>
                      <span className="text-slate-900">₹{apt.price}</span>
                    </div>
                  </div>
                </div>

                {apt.status === 'confirmed' && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleCancelAppointment(apt.id)}
                      className="w-full py-2 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
