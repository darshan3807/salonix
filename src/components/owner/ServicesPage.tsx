import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Service } from '../../types';
import { formatINR } from '../../utils/slotUtils';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  IndianRupee,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const {
    currentUser,
    salons,
    services,
    categories,
    addService,
    updateService,
    deleteService,
    toggleServiceStatus,
  } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];
  const salonServices = useMemo(() => {
    return services.filter((s) => s.salonId === mySalon?.id);
  }, [services, mySalon]);

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-hair');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(350);
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const filteredServices = useMemo(() => {
    return salonServices.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCat && s.categoryId !== selectedCat) return false;
      return true;
    });
  }, [salonServices, search, selectedCat]);

  const handleOpenAdd = () => {
    setEditingServiceId(null);
    setName('');
    setCategoryId(categories[0]?.id || 'cat-hair');
    setDescription('');
    setPrice(350);
    setDuration(30);
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEdit = (srv: Service) => {
    setEditingServiceId(srv.id);
    setName(srv.name);
    setCategoryId(srv.categoryId);
    setDescription(srv.description);
    setPrice(srv.price);
    setDuration(srv.duration);
    setStatus(srv.status);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingServiceId) {
      updateService(editingServiceId, {
        name,
        categoryId,
        description,
        price: Number(price),
        duration: Number(duration),
        status,
      });
    } else {
      addService({
        salonId: mySalon.id,
        name,
        categoryId,
        description,
        price: Number(price),
        duration: Number(duration),
        status,
      });
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, srvName: string) => {
    if (confirm(`Are you sure you want to remove "${srvName}" from your service catalog?`)) {
      deleteService(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Catalog Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Services & Pricing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your salon treatments, service prices, duration estimates and active availability.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service name..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 w-full sm:w-auto cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No services found matching filters.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => {
                  const cat = categories.find((c) => c.id === srv.categoryId);
                  const isActive = srv.status === 'active';

                  return (
                    <tr key={srv.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block font-display">
                          {srv.name}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {srv.description}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {cat?.name || 'General'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{srv.duration} mins</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-display text-sm">
                        {formatINR(srv.price)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleServiceStatus(srv.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{isActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(srv)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-purple-700 transition-colors cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(srv.id, srv.name)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingServiceId ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Signature Precision Haircut & Styling"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white"
                  >
                    <option value="active">Active (Visible to customers)</option>
                    <option value="inactive">Disabled (Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail what is included in this treatment..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingServiceId ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
