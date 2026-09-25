import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { formatINR, generateSalonSlots } from '../../utils/slotUtils';
import { BookingModal } from './BookingModal';
import {
  Scale,
  Plus,
  Trash2,
  Star,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const CompareSalonsPage: React.FC = () => {
  const { salons, services, appointments, compareSalonIds, removeFromCompare, addToCompare, clearCompare, navigate } = useApp();

  const approvedSalons = useMemo(() => salons.filter((s) => s.status === 'approved'), [salons]);

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Selected salons for comparison (up to 3)
  const comparedSalons = useMemo(() => {
    return approvedSalons.filter((s) => compareSalonIds.includes(s.id));
  }, [approvedSalons, compareSalonIds]);

  // Service keywords for comparison across salons
  const comparisonServices = [
    { label: 'Precision Haircut & Styling', keyword: 'haircut' },
    { label: 'Hair Spa & Scalp Therapy', keyword: 'spa' },
    { label: 'Facial & Skin Glow', keyword: 'facial' },
    { label: 'Beard Trimming & Grooming', keyword: 'beard' },
    { label: 'Manicure / Pedicure', keyword: 'pedicure' },
    { label: 'Hair Coloring', keyword: 'color' },
  ];

  const [selectedComparisonCategory, setSelectedComparisonCategory] = useState(comparisonServices[0].keyword);

  // Booking modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [targetSalonId, setTargetSalonId] = useState<string | undefined>();
  const [targetServiceId, setTargetServiceId] = useState<string | undefined>();

  // Add salon dropdown modal/selector
  const availableToAdd = approvedSalons.filter((s) => !compareSalonIds.includes(s.id));

  // Find matching service for a salon
  const getMatchingService = (salonId: string, keyword: string) => {
    const salonSrvs = services.filter((s) => s.salonId === salonId && s.status === 'active');
    // First try keyword match in name
    const match = salonSrvs.find((s) => s.name.toLowerCase().includes(keyword.toLowerCase()));
    if (match) return match;
    // Otherwise return first available active service
    return salonSrvs[0] || null;
  };

  const handleBook = (salonId: string, serviceId?: string) => {
    setTargetSalonId(salonId);
    setTargetServiceId(serviceId);
    setBookingModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Unbiased Comparison Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Compare Salons & Prices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Evaluate prices, service durations, ratings, and slot availability across up to 3 salons side-by-side to make the best decision for your budget and schedule.
          </p>
        </div>

        {comparedSalons.length > 0 && (
          <button
            onClick={clearCompare}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer self-start md:self-auto"
          >
            Clear comparison ({comparedSalons.length})
          </button>
        )}
      </div>

      {/* SERVICE FILTER TABS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-medium text-slate-500 mb-2">
          Compare Based on Service:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {comparisonServices.map((cat) => (
            <button
              key={cat.keyword}
              onClick={() => setSelectedComparisonCategory(cat.keyword)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedComparisonCategory === cat.keyword
                  ? 'bg-purple-700 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* COMPARISON SLOTS SELECTION & MATRIX */}
      {comparedSalons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center">
            <Scale className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              No Salons Selected for Comparison
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Select salons from our directory or add them from the list below to compare their prices, ratings and timings.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            {approvedSalons.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => addToCompare(s.id)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                + Add {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Add more salon button */}
          {comparedSalons.length < 3 && availableToAdd.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Add another salon to compare ({comparedSalons.length}/3 selected):</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addToCompare(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-900 font-medium cursor-pointer"
              >
                <option value="">+ Choose Salon to Add</option>
                {availableToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SIDE-BY-SIDE MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparedSalons.map((salon) => {
              const matchedService = getMatchingService(salon.id, selectedComparisonCategory);
              const slots = generateSalonSlots(salon, todayStr, appointments);
              const availableSlotCount = slots.filter((s) => s.status === 'available').length;

              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const todayName = days[new Date().getDay()];
              const isOpenToday = salon.workingDays.includes(todayName);

              return (
                <div
                  key={salon.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Top Salon Card Header */}
                  <div>
                    <div className="relative">
                      <SalonVisual
                        name={salon.name}
                        city={salon.city}
                        accentColor={salon.accentColor}
                        aspect="16:9"
                      />
                      <button
                        onClick={() => removeFromCompare(salon.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Remove from comparison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{salon.city}</span>
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{salon.rating}</span>
                            <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                          </span>
                        </div>

                        <h3
                          onClick={() => navigate(`/salons/${salon.id}`)}
                          className="font-bold text-lg text-slate-900 font-display hover:text-purple-700 transition-colors cursor-pointer line-clamp-1"
                        >
                          {salon.name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {salon.address}
                        </p>
                      </div>

                      {/* Comparative Service Match Box */}
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                          Matched Service
                        </span>

                        {matchedService ? (
                          <>
                            <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">
                              {matchedService.name}
                            </h4>

                            <div className="flex items-baseline justify-between pt-1">
                              <div>
                                <span className="text-[11px] text-slate-400 block">Service Price</span>
                                <span className="text-lg font-bold text-slate-900 font-display">
                                  {formatINR(matchedService.price)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] text-slate-400 block">Duration</span>
                                <span className="text-xs font-semibold text-slate-800">
                                  {matchedService.duration} minutes
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">
                            No exact match. Starting at {formatINR(salon.startingPrice)}.
                          </p>
                        )}
                      </div>

                      {/* Schedule & Availability Breakdown */}
                      <div className="space-y-2 text-xs divide-y divide-slate-100">
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-slate-500">Today's Status:</span>
                          {isOpenToday ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Open ({salon.openingTime} - {salon.closingTime})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Closed Today</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-slate-500">Available Slots Today:</span>
                          <span className="font-semibold text-purple-700 font-mono">
                            {isOpenToday ? `${availableSlotCount} slots open` : 'None'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-slate-500">Slot Duration:</span>
                          <span className="text-slate-800 font-medium">
                            {salon.slotDurationMinutes} mins
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-slate-500">Contact:</span>
                          <span className="text-slate-700">{salon.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Book Button */}
                  <div className="p-5 pt-0">
                    <button
                      onClick={() => handleBook(salon.id, matchedService?.id)}
                      className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Book at {salon.name.split(' ')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedSalonId={targetSalonId}
        preselectedServiceId={targetServiceId}
      />
    </div>
  );
};
