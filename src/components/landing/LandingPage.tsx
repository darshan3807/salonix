import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { formatINR } from '../../utils/slotUtils';
import {
  Search,
  MapPin,
  Star,
  Scissors,
  Sparkles,
  Smile,
  UserCheck,
  Hand,
  Palette,
  Heart,
  ArrowRight,
  ShieldCheck,
  Clock,
  CalendarCheck,
  CheckCircle,
  Store,
  ChevronRight,
  Scale,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { salons, categories, navigate, favorites, toggleFavorite, addToCompare, compareSalonIds } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const approvedSalons = salons.filter((s) => s.status === 'approved');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/salons?q=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(selectedCity)}`);
  };

  const serviceIcons: Record<string, React.ElementType> = {
    'cat-hair': Scissors,
    'cat-spa': Sparkles,
    'cat-facial': Smile,
    'cat-beard': UserCheck,
    'cat-hands-feet': Hand,
    'cat-color': Palette,
    'cat-bridal': Heart,
  };

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-purple-50/50 via-white to-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-3 py-1 rounded-full inline-block mb-3">
              India's Modern Salon Marketplace
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 font-display text-balance leading-tight">
              Find the right salon. <br className="hidden sm:block" />
              <span className="text-purple-700">Book the right time.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Discover salons, compare prices, check available slots and book your appointment effortlessly.
            </p>

            {/* Quick Search Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-8 p-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2 max-w-2xl mx-auto"
            >
              <div className="flex-1 flex items-center gap-2 px-3 w-full">
                <Search className="w-5 h-5 text-purple-700 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search salons, services or treatments..."
                  className="w-full text-xs sm:text-sm py-2 bg-transparent focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2 px-3 w-full sm:w-auto">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs sm:text-sm py-2 bg-transparent text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="">All Cities</option>
                  <option value="Pune">Pune</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Jalgaon">Jalgaon</option>
                  <option value="Navi Mumbai">Navi Mumbai</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>Find Salons</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Verified Salon Partners</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Real-Time Slot Availability</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>Side-by-Side Price Comparison</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
              Curated Treatments
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-1">
              Popular Services
            </h2>
          </div>
          <button
            onClick={() => navigate('/salons')}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore all services</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories.map((cat) => {
            const IconComponent = serviceIcons[cat.id] || Sparkles;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/salons?cat=${cat.id}`)}
                className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all text-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-700 group-hover:text-white transition-colors flex items-center justify-center mx-auto mb-2.5">
                  <IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-semibold text-slate-800 line-clamp-1 group-hover:text-purple-700">
                  {cat.name}
                </h3>
              </button>
            );
          })}
        </div>
      </section>

      {/* POPULAR SALONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
              Top Rated
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-1">
              Popular Salons
            </h2>
          </div>
          <button
            onClick={() => navigate('/salons')}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
          >
            <span>View all salons</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvedSalons.slice(0, 6).map((salon) => {
            const isFav = favorites.includes(salon.id);
            const isCompared = compareSalonIds.includes(salon.id);

            return (
              <div
                key={salon.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col group"
              >
                {/* Visual Artwork */}
                <div className="relative">
                  <SalonVisual
                    name={salon.name}
                    city={salon.city}
                    accentColor={salon.accentColor}
                    aspect="16:9"
                  />
                  {/* Floating Action Buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(salon.id);
                      }}
                      className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                        isFav
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                      aria-label="Add to favorites"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{salon.city}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-900 font-semibold">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{salon.rating}</span>
                        <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/salons/${salon.id}`)}
                      className="font-display font-bold text-lg text-slate-900 group-hover:text-purple-700 transition-colors cursor-pointer leading-snug line-clamp-1"
                    >
                      {salon.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Starting from</span>
                      <span className="text-base font-bold text-slate-900 font-display">
                        {formatINR(salon.startingPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToCompare(salon.id)}
                        className={`p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isCompared
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isCompared ? 'In comparison list' : 'Add to compare'}
                      >
                        <Scale className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/salons/${salon.id}`)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        View Salon
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW SALONIX WORKS */}
      <section id="how-it-works" className="bg-purple-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Effortless Booking
            </span>
            <h2 className="text-3xl font-bold font-display mt-1 text-white">
              How Salonix Works
            </h2>
            <p className="text-xs sm:text-sm text-purple-200 mt-2">
              Four simple steps from discovery to confirmed salon appointment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left">
              <span className="text-2xl font-bold text-purple-300 font-display">01</span>
              <h3 className="text-lg font-bold mt-2 font-display text-white">Discover</h3>
              <p className="text-xs text-purple-100/80 mt-1.5 leading-relaxed">
                Browse verified salons in your city with ratings, genuine customer reviews, photos and service menus.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left">
              <span className="text-2xl font-bold text-purple-300 font-display">02</span>
              <h3 className="text-lg font-bold mt-2 font-display text-white">Compare</h3>
              <p className="text-xs text-purple-100/80 mt-1.5 leading-relaxed">
                Compare up to 3 salons side-by-side for haircuts, spa treatments and bridal packages to get the best value.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left">
              <span className="text-2xl font-bold text-purple-300 font-display">03</span>
              <h3 className="text-lg font-bold mt-2 font-display text-white">Choose Slot</h3>
              <p className="text-xs text-purple-100/80 mt-1.5 leading-relaxed">
                Pick your preferred service, check real-time open slots, and choose a time that fits your exact schedule.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left">
              <span className="text-2xl font-bold text-purple-300 font-display">04</span>
              <h3 className="text-lg font-bold mt-2 font-display text-white">Instant Confirmation</h3>
              <p className="text-xs text-purple-100/80 mt-1.5 leading-relaxed">
                Send your booking request directly to the salon owner and receive rapid confirmation with zero phone calls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOR SALON OWNERS SECTION */}
      <section id="for-owners" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              For Salon Owners
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mt-2 leading-tight">
              Manage your salon appointments digitally.
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/90 mt-3 leading-relaxed">
              Eliminate double-bookings, automate your slot availability, accept customer requests on any device, and grow your salon revenue with Salonix.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <div className="flex items-center gap-2.5 text-xs text-purple-100">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Manage bookings & incoming requests</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-purple-100">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Custom service catalog & dynamic pricing</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-purple-100">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Configurable slots & working hours</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-purple-100">
                <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Customer history & analytics reports</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Register Your Salon
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-white/20 cursor-pointer"
              >
                Owner Portal Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 pt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-sm">
                  S
                </span>
                <span className="text-base font-bold text-slate-900 font-display">
                  Salonix
                </span>
              </div>
              <p className="leading-relaxed">
                Discover salons, compare prices, check available slots, and book your appointments effortlessly across India.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-3">
                Top Cities
              </h4>
              <ul className="space-y-1.5">
                <li><button onClick={() => navigate('/salons?city=Pune')} className="hover:text-purple-700">Salons in Pune</button></li>
                <li><button onClick={() => navigate('/salons?city=Mumbai')} className="hover:text-purple-700">Salons in Mumbai</button></li>
                <li><button onClick={() => navigate('/salons?city=Nashik')} className="hover:text-purple-700">Salons in Nashik</button></li>
                <li><button onClick={() => navigate('/salons?city=Jalgaon')} className="hover:text-purple-700">Salons in Jalgaon</button></li>
                <li><button onClick={() => navigate('/salons?city=Navi+Mumbai')} className="hover:text-purple-700">Salons in Navi Mumbai</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-3">
                Quick Links
              </h4>
              <ul className="space-y-1.5">
                <li><button onClick={() => navigate('/salons')} className="hover:text-purple-700">Find Salons</button></li>
                <li><button onClick={() => navigate('/compare')} className="hover:text-purple-700">Compare Salons</button></li>
                <li><button onClick={() => navigate('/register')} className="hover:text-purple-700">For Salon Owners</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-purple-700">Partner Login</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider mb-3">
                Demo Accounts
              </h4>
              <p className="mb-2 leading-relaxed">
                Quick prototype access:
              </p>
              <p>Admin: admin@salonix.com</p>
              <p>Owner: owner@salonix.com</p>
              <p>User: user@salonix.com</p>
            </div>
          </div>

          <div className="border-t border-slate-200 py-6 flex items-center justify-between flex-wrap gap-4 text-[11px]">
            <p>© 2026 Salonix Platform Inc. All rights reserved.</p>
            <p>Crafted for modern salon discovery & appointment operations.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
