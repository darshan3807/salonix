import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Phone, Mail, Store, Lock, LogOut, CheckCircle2 } from 'lucide-react';

export const OwnerProfilePage: React.FC = () => {
  const { currentUser, salons, updateUserProfile, logout } = useApp();
  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, phone });
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(true);
    setNewPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Account & Security
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Salon Owner Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal credentials, contact info and access credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 font-bold text-xl mx-auto flex items-center justify-center font-display border border-purple-200">
            {currentUser?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">{currentUser?.name}</h2>
            <p className="text-xs text-slate-500">{currentUser?.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-semibold">
              Verified Partner
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 text-left text-xs space-y-2 text-slate-600">
            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span>{mySalon.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentUser?.phone}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Personal Information
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Save Info
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Update Password
            </h2>
            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Password changed successfully!</span>
              </div>
            )}
            <form onSubmit={handlePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
