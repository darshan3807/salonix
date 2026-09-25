import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { formatINR } from '../../utils/slotUtils';
import { BookingModal } from './BookingModal';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  Scale,
  Heart,
  Clock,
  Sparkles,
  ArrowUpDown,
  Check,
  RotateCcw,
} from 'lucide-react';

export const FindSalonsPage: React.FC = () => {
  const { salons, categories, services, navigate, favorites, toggleFavorite, addToCompare, compareSalonIds } = useApp();

  // URL Query param parsing
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const initialQ = urlParams.get('q') || '';
  const initialCity = urlParams.get('city') || '';
  const initialCat = urlParams.get('cat') || '';

  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [maxPrice, setMaxPrice] = useState(4000);
  const [minRating, setMinRating] = useState(0);
  const [availableTodayOnly, setAvailableTodayOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high' | 'rating'>('recommended');

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSalonIdForBooking, setSelectedSalonIdForBooking] = useState<string | undefined>();

  // Filter salons
  const filteredSalons = useMemo(() => {
    return salons
      .filter((s) => s.status === 'approved')
      .filter((salon) => {
        // Query search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = salon.name.toLowerCase().includes(q);
          const matchDesc = salon.description.toLowerCase().includes(q);
          const matchCity = salon.city.toLowerCase().includes(q);
          // Check if any service of this salon matches query
          const matchService = services.some(
            (srv) => srv.salonId === salon.id && srv.name.toLowerCase().includes(q)
          );
          if (!matchName && !matchDesc && !matchCity && !matchService) return false;
        }

        // City filter
        if (selectedCity && salon.city !== selectedCity) return false;

        // Category filter
        if (selectedCategory) {
          const hasCategoryService = services.some(
            (srv) => srv.salonId === salon.id && srv.categoryId === selectedCategory && srv.status === 'active'
          );
          if (!hasCategoryService) return false;
        }

        // Price filter
        if (salon.startingPrice > maxPrice) return false;

        // Rating filter
        if (salon.rating < minRating) return false;

        // Available today filter
        if (availableTodayOnly) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const todayName = days[new Date().getDay()];
          if (!salon.workingDays.includes(todayName)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_low') return a.startingPrice - b.startingPrice;
        if (sortBy === 'price_high') return b.startingPrice - a.startingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.rating * b.reviewCount - a.rating * a.reviewCount; // Recommended
      });
  }, [salons, services, searchQuery, selectedCity, selectedCategory, maxPrice, minRating, availableTodayOnly, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedCategory('');
    setMaxPrice(4000);
    setMinRating(0);
    setAvailableTodayOnly(false);
    setSortBy('recommended');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Discovery Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Find & Compare Salons
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse {filteredSalons.length} verified salon partners across Maharashtra.
          </p>
        </div>

        {compareSalonIds.length > 0 && (
          <button
            onClick={() => navigate('/compare')}
            className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold rounded-xl flex items-center gap-2 hover:bg-purple-100 transition-colors shadow-xs cursor-pointer"
          >
            <Scale className="w-4 h-4 text-purple-700" />
            <span>Compare Selected Salons ({compareSalonIds.length}/3)</span>
          </button>
        )}
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search salons, services or location (e.g. Haircut, Koregaon Park, Beard)..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer min-w-[130px]"
            >
              <option value="">All Locations</option>
              <option value="Pune">Pune</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Nashik">Nashik</option>
              <option value="Jalgaon">Jalgaon</option>
              <option value="Navi Mumbai">Navi Mumbai</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer min-w-[140px]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer min-w-[140px]"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Price slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Max Starting Price:</span>
              <input
                type="range"
                min="150"
                max="3000"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 accent-purple-700"
              />
              <span className="font-semibold text-slate-800 font-display">
                {formatINR(maxPrice)}
              </span>
            </div>

            {/* Minimum rating */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Min Rating:</span>
              <div className="flex items-center gap-1">
                {[0, 4.0, 4.5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMinRating(val)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      minRating === val
                        ? 'bg-purple-100 text-purple-800 font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {val === 0 ? 'All' : `${val}+ ★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Today toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={availableTodayOnly}
                onChange={(e) => setAvailableTodayOnly(e.target.checked)}
                className="rounded text-purple-700 focus:ring-purple-700 w-3.5 h-3.5"
              />
              <span className="text-slate-600">Open Today Only</span>
            </label>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-500 hover:text-purple-700 text-xs font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* SALONS GRID */}
      {filteredSalons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">
            No salons match your search criteria
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, changing the city filter, or relaxing the price/rating slider.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSalons.map((salon) => {
            const isFav = favorites.includes(salon.id);
            const isCompared = compareSalonIds.includes(salon.id);

            // Get salon services
            const salonServices = services.filter(
              (s) => s.salonId === salon.id && s.status === 'active'
            );

            // Check if open today
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const todayName = days[new Date().getDay()];
            const isOpenToday = salon.workingDays.includes(todayName);

            return (
              <div
                key={salon.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  <div className="relative">
                    <SalonVisual
                      name={salon.name}
                      city={salon.city}
                      accentColor={salon.accentColor}
                      aspect="16:9"
                    />

                    {/* Floating pill indicators */}
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                      {isOpenToday ? (
                        <span className="bg-emerald-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                          Open Today
                        </span>
                      ) : (
                        <span className="bg-slate-700/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                          Closed Today
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                      <button
                        onClick={() => toggleFavorite(salon.id)}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          isFav
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/80 text-slate-700 hover:bg-white'
                        }`}
                        aria-label="Save to favorites"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{salon.city} · {salon.address.split(',')[0]}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{salon.rating}</span>
                        <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/salons/${salon.id}`)}
                      className="font-bold text-lg text-slate-900 font-display group-hover:text-purple-700 transition-colors cursor-pointer line-clamp-1"
                    >
                      {salon.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>

                    {/* Popular Services Preview */}
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {salonServices.slice(0, 3).map((srv) => (
                        <span
                          key={srv.id}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                        >
                          {srv.name.split(' ')[0]} {srv.name.split(' ')[1] || ''}
                        </span>
                      ))}
                      {salonServices.length > 3 && (
                        <span className="text-[11px] text-slate-400 px-1 py-0.5">
                          +{salonServices.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
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
                            ? 'bg-purple-100 text-purple-800 border-purple-300 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isCompared ? 'In comparison' : 'Compare salon'}
                      >
                        <Scale className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/salons/${salon.id}`)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guided Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedSalonId={selectedSalonIdForBooking}
      />
    </div>
  );
};
