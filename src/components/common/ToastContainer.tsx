import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium bg-white text-slate-800 transition-all transform animate-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'border-emerald-200'
                : isError
                ? 'border-rose-200'
                : isWarning
                ? 'border-amber-200'
                : 'border-purple-200'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-purple-600 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{toast.text}</span>
          </div>
        );
      })}
    </div>
  );
};

