import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { User, Store, Mail, Phone, Lock, MapPin, Building, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerCustomer, registerSalonOwner, navigate } = useApp();

  const [role, setRole] = useState<'customer' | 'owner'>('customer');

  // Customer fields
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState('Pune');
  const [custPassword, setCustPassword] = useState('');
  const [custConfirmPassword, setCustConfirmPassword] = useState('');

  // Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerSalonName, setOwnerSalonName] = useState('');
  const [ownerCity, setOwnerCity] = useState('Pune');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  const cities = ['Pune', 'Mumbai', 'Nashik', 'Jalgaon', 'Navi Mumbai', 'Thane', 'Nagpur'];

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (custPassword !== custConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (custPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const res = registerCustomer({
      name: custName,
      email: custEmail,
      phone: custPhone,
      city: custCity,
      password: custPassword,
    });

    if (!res.success) {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleSubmitOwner = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (ownerPassword !== ownerConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (ownerPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const res = registerSalonOwner({
      ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      salonName: ownerSalonName,
      city: ownerCity,
      password: ownerPassword,
    });

    if (!res.success) {
      setError(res.error || 'Salon Owner registration failed.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-700 text-white rounded-xl mx-auto flex items-center justify-center font-bold text-2xl shadow-sm mb-3">
            S
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">
            Create your account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Join Salonix to discover top salons or grow your business.
          </p>
        </div>

        {/* Account Type Selector */}
        <div className="mt-6 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === 'customer'
                ? 'bg-white text-purple-800 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('owner');
              setError(null);
            }}
            className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === 'owner'
                ? 'bg-white text-purple-800 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Salon Owner</span>
          </button>
        </div>

        {role === 'owner' && (
          <div className="mt-4 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-2.5 text-xs text-purple-900">
            <AlertCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Salon Verification:</strong> After registration, your salon listing will enter a pending approval state awaiting administrative validation.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {role === 'customer' ? (
          <form onSubmit={handleSubmitCustomer} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="aditi@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City
                </label>
                <select
                  value={custCity}
                  onChange={(e) => setCustCity(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700 bg-white"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={custConfirmPassword}
                    onChange={(e) => setCustConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Register as Customer
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitOwner} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Owner Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh S. Shinde"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Salon / Business Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={ownerSalonName}
                  onChange={(e) => setOwnerSalonName(e.target.value)}
                  placeholder="e.g. Royal Touch Unisex Studio"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Business Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="contact@royaltouch.in"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  City
                </label>
                <select
                  value={ownerCity}
                  onChange={(e) => setOwnerCity(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700 bg-white"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={ownerConfirmPassword}
                    onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Register Salon (Submit for Approval)
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-purple-700 font-semibold hover:underline cursor-pointer"
          >
            Log in instead
          </button>
        </div>
      </div>
    </div>
  );
};
