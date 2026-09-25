import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { 
  User, Store, Mail, Lock, Phone, MapPin, 
  Sparkles, ShieldCheck, ArrowRight, AlertCircle, Building2, Scissors
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { register, navigateTo } = useApp();
  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Pune');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Salon Owner specific fields
  const [salonName, setSalonName] = useState('');
  const [salonAddress, setSalonAddress] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00 AM');
  const [closingTime, setClosingTime] = useState('08:00 PM');
  const [startingPrice, setStartingPrice] = useState('250');
  const [aboutSalon, setAboutSalon] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !email || !password) {
      setErrorMsg('Please complete all required fields (Name, Email, Password).');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    if (role === 'owner' && !salonName) {
      setErrorMsg('Please enter your Salon business name.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      city,
      password,
      role,
      ...(role === 'owner'
        ? {
            salonName: salonName.trim(),
            salonAddress: salonAddress.trim(),
            openingTime,
            closingTime,
            startingPrice,
            aboutSalon,
          }
        : {}),
    };

    const res = await register(payload);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Registration failed. Please check your information and try again.');
    }
  };

  return (
    <div className="min-h-[90vh] py-12 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA] flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white p-6 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50 text-purple-600 mb-3 border border-purple-200">
            <Scissors className="w-6 h-6 -rotate-45" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">
            Create Your Salonix Account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Join Salonix to book appointments, find certified stylists, or list your salon business.
          </p>
        </div>

        {/* Account Type Selector */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl mb-8 border border-slate-200">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'customer'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-purple-600" />
            <span>Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'owner'
                ? 'bg-white text-purple-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-purple-600" />
            <span>Salon Owner / Partner</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-medium">{errorMsg}</span>
              {errorMsg.includes('already exists') && (
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="block mt-1 font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Click here to Sign In →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* General Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                {role === 'owner' ? 'Owner Full Name' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Darshan Fulpagar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white cursor-pointer"
              >
                <option value="Pune">Pune</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Nashik">Nashik</option>
                <option value="Jalgaon">Jalgaon</option>
                <option value="Navi Mumbai">Navi Mumbai</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Delhi">Delhi NCR</option>
              </select>
            </div>
          </div>

          {/* Salon Owner Specific Section */}
          {role === 'owner' && (
            <div className="p-4 sm:p-5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-purple-200 pb-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Salon Business Details</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Salon Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="e.g. Royal Touch Unisex Studio & Spa"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Salon Address & Landmark
                </label>
                <input
                  type="text"
                  value={salonAddress}
                  onChange={(e) => setSalonAddress(e.target.value)}
                  placeholder="Shop 4, MG Road, Near Phoenix Mall"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="text"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="text"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    placeholder="08:30 PM"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Starting Price (₹)
                  </label>
                  <input
                    type="number"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="250"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  About the Salon / Specialties
                </label>
                <textarea
                  rows={2}
                  value={aboutSalon}
                  onChange={(e) => setAboutSalon(e.target.value)}
                  placeholder="Specialists in precision haircuts, bridal packages, and skin treatments..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 resize-none focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Create Account & Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100 text-center mt-6">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <button
              onClick={() => navigateTo('login')}
              className="font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
