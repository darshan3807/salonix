import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Salon, Service, Appointment } from '../types/index.ts';
import { 
  Store, Clock, MapPin, Calendar, Scissors, Plus, CheckCircle, 
  XCircle, Check, X, AlertTriangle, ShieldCheck, DollarSign
} from 'lucide-react';

export const SalonOwnerDashboard: React.FC = () => {
  const { user } = useApp();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddService, setShowAddService] = useState<boolean>(false);

  // New Service form state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceCategory, setNewServiceCategory] = useState('cat-hair');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSalonData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Find salon for this owner
      const salonsRes = await fetch('/api/salons?all=true');
      if (salonsRes.ok) {
        const data = await salonsRes.json();
        const found = (data.salons || []).find(
          (s: Salon) => s.owner_id === user.uid || s.id === user.salon_id
        ) || data.salons[0];

        if (found) {
          setSalon(found);

          // Fetch services for this salon
          const detailsRes = await fetch(`/api/salons/${found.id}`);
          if (detailsRes.ok) {
            const details = await detailsRes.json();
            setServices(details.services || []);
          }

          // Fetch appointments for this salon
          const aptRes = await fetch(`/api/appointments?salonId=${found.id}`);
          if (aptRes.ok) {
            const aptData = await aptRes.json();
            setAppointments(aptData.appointments || []);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching salon owner data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalonData();
  }, [user]);

  const handleUpdateStatus = async (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setFeedback(`Appointment status updated to ${status}.`);
        setTimeout(() => setFeedback(null), 4000);
        fetchSalonData();
      }
    } catch (e) {
      console.error('Update appointment status error:', e);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !newServiceName || !newServicePrice) return;

    setIsAddingService(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          name: newServiceName,
          price: newServicePrice,
          duration: newServiceDuration,
          categoryId: newServiceCategory,
          description: newServiceDesc,
        }),
      });

      if (res.ok) {
        setFeedback('New service added successfully!');
        setShowAddService(false);
        setNewServiceName('');
        setNewServicePrice('');
        setNewServiceDesc('');
        setTimeout(() => setFeedback(null), 4000);
        fetchSalonData();
      }
    } catch (e) {
      console.error('Add service error:', e);
    } finally {
      setIsAddingService(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header & Salon Details */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
              Salon Partner Hub
            </span>
            {salon?.status === 'approved' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                ✓ Approved & Live
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                ⏳ Pending Admin Approval
              </span>
            )}
          </div>

          <h1 className="text-3xl font-serif font-bold text-slate-900">
            {salon ? salon.name : 'My Salon Business'}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{salon?.address || 'City Center'}, {salon?.city || 'Pune'}</span>
            <span className="mx-2">•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{salon?.opening_time || '09:00 AM'} - {salon?.closing_time || '08:00 PM'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddService(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Appointments Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-slate-900">
            Customer Booking Requests
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {appointments.length} total request(s)
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm shadow-xs">
            No booking requests at the moment. As customers schedule slots, they will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-500">
                      {apt.date} • {apt.start_time}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'completed'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900">{apt.customer_name}</h4>
                    <p className="text-xs text-slate-500">📞 {apt.customer_phone}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200/60">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-500">Service:</span>
                      <span className="text-slate-900">{apt.service_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price:</span>
                      <span className="font-bold text-slate-900">₹{apt.price}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {apt.status === 'confirmed' ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'completed')}
                        className="flex-1 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                        className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No further actions</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-900">
          Services Menu & Pricing
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => (
            <div key={srv.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{srv.name}</h4>
                <p className="text-xs text-slate-500">{srv.duration} mins • {srv.description}</p>
              </div>
              <span className="font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                ₹{srv.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Salon Service</h3>
              <button onClick={() => setShowAddService(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Keratin Treatment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="450"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Details regarding the treatment or cut..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isAddingService}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-xs"
                >
                  Save Service
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
