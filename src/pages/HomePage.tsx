import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  Search, MapPin, Scissors, Sparkles, Star, Clock, 
  ShieldCheck, ArrowRight, CheckCircle2, Heart, Award, Users, Store
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { salons, categories, navigateTo } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');

  const filteredSalons = salons.filter((salon) => {
    const matchCity = selectedCity === 'All' || salon.city.toLowerCase() === selectedCity.toLowerCase();
    const matchSearch = !searchTerm || 
      salon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salon.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      salon.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="space-y-16 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Discover Verified Salons & Stylists</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-white leading-tight">
            Book Confirmed Salon Slots. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-200 to-indigo-300">
              No Waiting. No Hassle.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            Browse top-rated unisex salons, luxury spas, and barbershops. Compare verified prices, select your preferred time slot, and walk in like a VIP.
          </p>

          {/* Search & Location Bar */}
          <div className="max-w-3xl mx-auto mt-8 bg-white p-2.5 sm:p-3 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 text-slate-800 border border-slate-200">
            
            {/* City selector */}
            <div className="flex items-center gap-2 px-3 py-2 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-slate-200">
              <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Cities</option>
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Nashik">Nashik</option>
                <option value="Jalgaon">Jalgaon</option>
                <option value="Navi Mumbai">Navi Mumbai</option>
              </select>
            </div>

            {/* Keyword search input */}
            <div className="flex items-center gap-2 px-3 py-2 flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by salon name or area..."
                className="w-full text-sm placeholder-slate-400 focus:outline-hidden text-slate-900"
              />
            </div>

            {/* Action button */}
            <button
              onClick={() => navigateTo('salons')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              Find Salons
            </button>
          </div>

          {/* Quick Stats Banner */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Admin-Verified Partners</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Real-Time Slot Confirmation</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Transparent Service Rates</span>
            </span>
          </div>

        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
              Popular Grooming Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a category to view specialized salons and certified experts
            </p>
          </div>
          <button
            onClick={() => navigateTo('salons')}
            className="text-xs sm:text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigateTo('salons')}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-36"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 group-hover:bg-purple-600 text-purple-700 group-hover:text-white flex items-center justify-center transition-colors">
                <Scissors className="w-5 h-5 -rotate-45" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {cat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured & Approved Salons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Admin Approved Listings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
              Featured Salons & Studios
            </h2>
          </div>

          {/* Quick city filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['All', 'Pune', 'Mumbai', 'Nashik', 'Jalgaon'].map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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

        {filteredSalons.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No salons found for "{selectedCity}". Try selecting "All Cities".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon) => (
              <div
                key={salon.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-purple-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Cover Header with stylized banner */}
                  <div className="h-40 bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950 relative p-4 flex flex-col justify-between text-white">
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

                  {/* Card Body */}
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

                {/* Card Footer Button */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => navigateTo('salon-detail', salon.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Services & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-100/80 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Simple 4-Step Process</span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 mt-1">
              How Salonix Works
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              From finding top stylists to confirmed chair appointments in under 2 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center mx-auto">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Find Verified Salons</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Filter by city, ratings, and services. Only admin-approved salons are shown.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center mx-auto">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Choose Service & Slot</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Browse exact prices and pick your exact time slot without waiting.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center mx-auto">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Instant Confirmation</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your chair is reserved. Salon owner receives the notification instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-bold text-base flex items-center justify-center mx-auto">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base">Walk In & Relax</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enjoy your haircut, spa, or makeover with zero waiting queues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Salon Owner Partner Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-800">
          <div className="space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              For Salon Owners
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Are You a Salon or Spa Owner?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              List your salon on Salonix. Manage customer bookings, showcase services, eliminate empty chairs, and grow your revenue. All new salon partner applications are reviewed and approved by our admin team.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigateTo('signup')}
              className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/30 transition-all cursor-pointer whitespace-nowrap text-center"
            >
              Partner With Us
            </button>
            <button
              onClick={() => navigateTo('login')}
              className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer whitespace-nowrap text-center"
            >
              Partner Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 border-t border-slate-200 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-600 text-white flex items-center justify-center font-bold">
            <Scissors className="w-3.5 h-3.5 -rotate-45" />
          </div>
          <span className="font-serif font-bold text-slate-800 text-sm">Salonix</span>
          <span>© {new Date().getFullYear()} Salonix Platform. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <button onClick={() => navigateTo('home')} className="hover:text-purple-600 cursor-pointer">Home</button>
          <button onClick={() => navigateTo('salons')} className="hover:text-purple-600 cursor-pointer">Salons</button>
          <button onClick={() => navigateTo('login')} className="hover:text-purple-600 cursor-pointer">Login</button>
          <button onClick={() => navigateTo('signup')} className="hover:text-purple-600 cursor-pointer">Register</button>
        </div>
      </footer>

    </div>
  );
};
