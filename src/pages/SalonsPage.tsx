import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Search, MapPin, Star, Clock, ArrowRight, ArrowLeft } from 'lucide-react';

export const SalonsPage: React.FC = () => {
  const { salons, navigateTo } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  const filtered = salons.filter((s) => {
    const matchCity = selectedCity === 'All' || s.city.toLowerCase() === selectedCity.toLowerCase();
    const matchSearch = !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Browse Verified Salons
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Discover verified salons, compare reviews, and book available appointment slots.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by salon name or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Pune', 'Mumbai', 'Nashik', 'Jalgaon'].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCity === city
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Salons Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 space-y-3">
          <p className="font-semibold text-slate-800">No salons found matching your criteria</p>
          <p className="text-xs text-slate-400">Try changing your search keywords or selecting "All" cities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((salon) => (
            <div
              key={salon.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-purple-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="h-44 bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950 p-5 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 text-white">
                      {salon.city}
                    </span>
                    <div className="flex items-center gap-1 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-xs">
                      <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                      <span>{salon.rating || 4.8}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-bold text-white group-hover:text-purple-300 transition-colors">
                      {salon.name}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                      {salon.tagline || salon.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{salon.address}</span>
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>{salon.opening_time || '09:00 AM'} - {salon.closing_time || '08:00 PM'}</span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      Starts <span className="text-purple-700 font-bold">₹{salon.starting_price || 250}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => navigateTo('salon-detail', salon.id)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Select & Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
