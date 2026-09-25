import React from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { formatINR } from '../../utils/slotUtils';
import { Heart, MapPin, Star, Trash2, ArrowRight } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const { salons, favorites, toggleFavorite, navigate } = useApp();

  const favoriteSalons = salons.filter((s) => favorites.includes(s.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Saved Salons
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          My Favorite Salons
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quickly access and book from your bookmarked salons.
        </p>
      </div>

      {favoriteSalons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 font-display">
            No favorite salons saved yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click the heart icon on any salon card to save it for quick rebooking.
          </p>
          <button
            onClick={() => navigate('/salons')}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Discover Salons
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteSalons.map((salon) => (
            <div
              key={salon.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative">
                  <SalonVisual
                    name={salon.name}
                    city={salon.city}
                    accentColor={salon.accentColor}
                    aspect="16:9"
                  />
                  <button
                    onClick={() => toggleFavorite(salon.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-rose-500 text-white shadow-xs cursor-pointer"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{salon.city}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{salon.rating}</span>
                      <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                    </span>
                  </div>

                  <h3
                    onClick={() => navigate(`/salons/${salon.id}`)}
                    className="font-bold text-base text-slate-900 font-display hover:text-purple-700 transition-colors cursor-pointer line-clamp-1"
                  >
                    {salon.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {salon.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Starting from</span>
                    <span className="text-sm font-bold text-slate-900 font-display">
                      {formatINR(salon.startingPrice)}
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/salons/${salon.id}`)}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    View & Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
