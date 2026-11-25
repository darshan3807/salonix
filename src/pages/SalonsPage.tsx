import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Salon } from '../types/index.ts';
import {
  Search,
  MapPin,
  Star,
  Clock,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Scale,
  Check,
  X,
  Scissors,
  Phone,
  RotateCcw,
} from 'lucide-react';

type SortOption = 'rating' | 'price_asc' | 'price_desc';

function formatWorkingDays(raw?: string | string[]): string {
  if (!raw) return 'Mon - Sun';
  if (Array.isArray(raw)) return raw.join(', ');
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export const SalonsPage: React.FC = () => {
  const { salons, categories, discoveryFilters, setDiscoveryFilters, navigateTo, goBack } = useApp();

  const [searchTerm, setSearchTerm] = useState(discoveryFilters.search || '');
  const [selectedCity, setSelectedCity] = useState(discoveryFilters.city || 'All');
  const [selectedCategory, setSelectedCategory] = useState(discoveryFilters.categoryId || 'all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  // Side-by-side comparison state (max 3 salons)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Sync if user navigated from HomePage with preset filters
  useEffect(() => {
    setSearchTerm(discoveryFilters.search || '');
    setSelectedCity(discoveryFilters.city || 'All');
    setSelectedCategory(discoveryFilters.categoryId || 'all');
  }, [discoveryFilters]);

  const availableCities = useMemo(() => {
    return Array.from(new Set(['All', ...salons.map((s) => s.city).filter(Boolean)]));
  }, [salons]);

  const filteredAndSorted = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = salons.filter((s) => {
      const matchCity =
        selectedCity === 'All' || s.city.toLowerCase() === selectedCity.toLowerCase();

      const matchCategory =
        selectedCategory === 'all' ||
        (Array.isArray(s.category_ids) && s.category_ids.includes(selectedCategory)) ||
        (Array.isArray(s.services) && s.services.some((sv) => sv.category_id === selectedCategory));

      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.city.toLowerCase().includes(query) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (Array.isArray(s.services) &&
          s.services.some((sv) => sv.name.toLowerCase().includes(query)));

      return matchCity && matchCategory && matchSearch;
    });

    return [...list].sort((a, b) => {
      const priceA = Number(a.min_service_price ?? a.starting_price ?? 0);
      const priceB = Number(b.min_service_price ?? b.starting_price ?? 0);
      const ratingA = Number(a.rating ?? 0);
      const ratingB = Number(b.rating ?? 0);

      if (sortBy === 'price_asc') return priceA - priceB || ratingB - ratingA;
      if (sortBy === 'price_desc') return priceB - priceA || ratingB - ratingA;
      return ratingB - ratingA || Number(b.review_count ?? 0) - Number(a.review_count ?? 0);
    });
  }, [salons, searchTerm, selectedCity, selectedCategory, sortBy]);

  const compareSalons: Salon[] = useMemo(() => {
    return compareIds
      .map((id) => salons.find((s) => s.id === id))
      .filter((s): s is Salon => Boolean(s));
  }, [compareIds, salons]);

  const toggleCompare = (salonId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(salonId)) {
        return prev.filter((id) => id !== salonId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), salonId];
      }
      return [...prev, salonId];
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCity('All');
    setSelectedCategory('all');
    setSortBy('rating');
    setDiscoveryFilters({ search: '', city: 'All', categoryId: 'all' });
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' || selectedCity !== 'All' || selectedCategory !== 'all' || sortBy !== 'rating';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Discover & Compare Verified Salons
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Filter by city or service category, sort by price or rating, and select up to 3 salons to compare prices side by side.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-600 tabular-nums">
          Showing <span className="font-bold text-slate-900">{filteredAndSorted.length}</span> of{' '}
          <span className="font-bold text-slate-900">{salons.length}</span> verified salons
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search salon, area, or service (e.g. Keratin, Facial)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-4">
            <div className="relative">
              <Scissors className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by Service Category"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="all">All Service Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <SlidersHorizontal className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort salons"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="rating">Sort: Highest Rated</option>
                <option value="price_asc">Sort: Price Low to High</option>
                <option value="price_desc">Sort: Price High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* City Tabs & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">
              City:
            </span>
            {availableCities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCity === city
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-purple-700 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Salons Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 space-y-4">
          <p className="font-semibold text-slate-800 text-base">No salons found matching your criteria</p>
          <p className="text-xs text-slate-500">
            Try clearing your search term, picking another category, or switching back to All cities.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer"
          >
            Show All Verified Salons
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((salon) => {
            const isCompared = compareIds.includes(salon.id);
            const displayStartPrice = salon.min_service_price ?? salon.starting_price ?? 250;
            const previewServices = (salon.services || []).slice(0, 3);

            return (
              <div
                key={salon.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group ${
                  isCompared ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div>
                  {/* Cover Banner */}
                  <div className="h-44 bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950 p-5 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white/15 border border-white/25 text-white">
                        {salon.city}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCompare(salon.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                            isCompared
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                          }`}
                        >
                          {isCompared ? <Check className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                          <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                        </button>

                        <div className="flex items-center gap-1 bg-purple-600 text-white px-2 py-0.5 rounded-md text-xs font-bold tabular-nums">
                          <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>{salon.rating ?? '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-serif font-bold text-white group-hover:text-purple-200 transition-colors">
                        {salon.name}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                        {salon.tagline || salon.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 space-y-3.5">
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{salon.address}</span>
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                        <span>
                          {salon.opening_time || '09:00'} - {salon.closing_time || '20:00'}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 tabular-nums">
                        From <span className="text-purple-700 font-bold">₹{displayStartPrice}</span>
                      </div>
                    </div>

                    {/* Real service price preview */}
                    {previewServices.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <span>Popular Services</span>
                          <span className="tabular-nums">{salon.service_count || previewServices.length} total</span>
                        </div>
                        {previewServices.map((srv) => (
                          <div key={srv.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 truncate pr-2">{srv.name}</span>
                            <span className="font-bold text-slate-900 tabular-nums shrink-0">
                              ₹{srv.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center gap-2">
                  <button
                    onClick={() => navigateTo('salon-detail', salon.id)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>View Services & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Compare Bar */}
      {compareSalons.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider whitespace-nowrap">
              <Scale className="w-4 h-4" />
              <span>Compare ({compareSalons.length}/3)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {compareSalons.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold border border-white/15"
                >
                  <span className="max-w-[140px] truncate">{s.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(s.id)}
                    aria-label={`Remove ${s.name} from comparison`}
                    className="text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={compareSalons.length < 2}
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {compareSalons.length < 2 ? 'Select 1 More Salon' : 'Compare Side-by-Side'}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && compareSalons.length >= 2 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                  <Scale className="w-4 h-4" />
                  <span>Side-by-Side Salon Comparison</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-0.5">
                  Compare Prices, Hours & Services
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto p-6">
              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns: `repeat(${compareSalons.length}, minmax(240px, 1fr))`,
                }}
              >
                {compareSalons.map((salon) => {
                  const minPrice = salon.min_service_price ?? salon.starting_price ?? 0;
                  return (
                    <div
                      key={salon.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between bg-white"
                    >
                      <div>
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-tr from-slate-950 via-slate-900 to-purple-950 text-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">
                              {salon.city}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600 text-xs font-bold tabular-nums">
                              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                              {salon.rating ?? '—'} ({salon.review_count ?? 0})
                            </span>
                          </div>
                          <h3 className="text-lg font-serif font-bold leading-snug">{salon.name}</h3>
                          <p className="text-xs text-slate-300 line-clamp-2">{salon.address}</p>
                        </div>

                        {/* Key Specs */}
                        <div className="p-4 space-y-2.5 text-xs border-b border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Lowest Price</span>
                            <span className="font-bold text-purple-700 text-sm tabular-nums">₹{minPrice}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Hours</span>
                            <span className="font-semibold text-slate-800 tabular-nums text-right">
                              {salon.opening_time || '09:00'} – {salon.closing_time || '20:00'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Working Days</span>
                            <span className="font-medium text-slate-700 text-right">
                              {formatWorkingDays(salon.working_days)}
                            </span>
                          </div>
                          {salon.phone && (
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Contact
                              </span>
                              <span className="font-medium text-slate-700 tabular-nums">{salon.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Full Services Menu */}
                        <div className="p-4 space-y-2">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Services & Pricing ({(salon.services || []).length})
                          </h4>
                          {!salon.services || salon.services.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No active services listed.</p>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {salon.services.map((srv) => (
                                <div key={srv.id} className="py-2 flex items-start justify-between gap-2 text-xs">
                                  <div>
                                    <p className="font-semibold text-slate-800">{srv.name}</p>
                                    <p className="text-[11px] text-slate-400 tabular-nums">
                                      {srv.duration} mins{srv.category_name ? ` • ${srv.category_name}` : ''}
                                    </p>
                                  </div>
                                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                                    ₹{srv.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCompareModal(false);
                            navigateTo('salon-detail', salon.id);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
          </div>
        </div>
      )}
    </div>
  );
};
