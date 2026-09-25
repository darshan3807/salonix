import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Shield, Bell, CheckCircle2, Save } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useApp();

  const [platformFeePercent, setPlatformFeePercent] = useState('2.5');
  const [autoApproveSalons, setAutoApproveSalons] = useState(false);
  const [requirePhoneVerification, setRequirePhoneVerification] = useState(true);
  const [defaultSlotDuration, setDefaultSlotDuration] = useState('30');
  const [supportEmail, setSupportEmail] = useState('support@salonix.com');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Platform operational settings saved successfully.', 'success');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
          Governance & Configuration
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
          Platform Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure marketplace fees, partner verification requirements and system defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Onboarding & Verification Rules
          </h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApproveSalons}
                onChange={(e) => setAutoApproveSalons(e.target.checked)}
                className="rounded text-purple-700 focus:ring-purple-700 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Automatic Salon Approval
                </span>
                <span className="text-slate-500">
                  When enabled, newly registered salon owners will be approved automatically without manual review.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                checked={requirePhoneVerification}
                onChange={(e) => setRequirePhoneVerification(e.target.checked)}
                className="rounded text-purple-700 focus:ring-purple-700 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-900 block">
                  Mandatory Phone Verification (OTP)
                </span>
                <span className="text-slate-500">
                  Enforce Indian mobile verification for new customer bookings.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Marketplace Economics & Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Platform Commission Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={platformFeePercent}
                onChange={(e) => setPlatformFeePercent(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Slot Duration (Minutes)
              </label>
              <select
                value={defaultSlotDuration}
                onChange={(e) => setDefaultSlotDuration(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Platform Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
