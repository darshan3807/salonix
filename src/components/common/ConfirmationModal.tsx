import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  reasonRequired?: boolean;
  reasonValue?: string;
  onReasonChange?: (val: string) => void;
  reasonPlaceholder?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  reasonRequired = false,
  reasonValue = '',
  onReasonChange,
  reasonPlaceholder = 'Please specify reason...',
}) => {
  if (!isOpen) return null;

  const confirmBg =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
      : 'bg-purple-700 hover:bg-purple-800 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-600'
                : variant === 'success'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {variant === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 font-display">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>

            {reasonRequired && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason / Notes:
                </label>
                <textarea
                  value={reasonValue}
                  onChange={(e) => onReasonChange?.(e.target.value)}
                  placeholder={reasonPlaceholder}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 resize-none"
                />
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={onCancel}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${confirmBg}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
