import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/slotUtils';
import { Layers, Sparkles, Store, Scissors, Smile, Hand, Palette, Heart } from 'lucide-react';

export const AdminServicesCategoriesPage: React.FC = () => {
  const { categories, services, salons } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Taxonomy & Catalogs
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Service Categories & Catalog Oversight
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Master categories defined for customer discovery and service mapping across all salons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const matchingServices = services.filter((s) => s.categoryId === cat.id);
          const avgPrice = matchingServices.length
            ? Math.round(matchingServices.reduce((sum, s) => sum + s.price, 0) / matchingServices.length)
            : 0;

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">
                  {cat.id}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold">
                  {matchingServices.length} Treatments
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 font-display">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Avg Market Price:</span>
                <span className="font-bold text-slate-900 font-display">
                  {formatINR(avgPrice)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Salon Service Catalog Snapshot */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          All Registered Salon Services ({services.length} Total)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Salon Offering</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Listed Price</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {services.map((srv) => {
                const salon = salons.find((s) => s.id === srv.salonId);
                const cat = categories.find((c) => c.id === srv.categoryId);

                return (
                  <tr key={srv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900 font-display">
                      {srv.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{cat?.name || 'General'}</td>
                    <td className="py-3 px-3 text-purple-900 font-medium">
                      {salon?.name || 'Unknown Salon'}
                    </td>
                    <td className="py-3 px-3">{srv.duration} mins</td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-display">
                      {formatINR(srv.price)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {srv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
