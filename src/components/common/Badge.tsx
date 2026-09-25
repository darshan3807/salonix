import React from 'react';
import { AppointmentStatus, SalonStatus } from '../../types';

interface BadgeProps {
  status: AppointmentStatus | SalonStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const normalized = status.toUpperCase();

  const config: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    PENDING: {
      label: 'Pending',
      dot: 'bg-amber-500',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'text-amber-800',
    },
    CONFIRMED: {
      label: 'Confirmed',
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      text: 'text-emerald-800',
    },
    APPROVED: {
      label: 'Approved',
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      text: 'text-emerald-800',
    },
    COMPLETED: {
      label: 'Completed',
      dot: 'bg-purple-600',
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      text: 'text-purple-800',
    },
    REJECTED: {
      label: 'Rejected',
      dot: 'bg-rose-500',
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      text: 'text-rose-800',
    },
    CANCELLED: {
      label: 'Cancelled',
      dot: 'bg-slate-400',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      text: 'text-slate-700',
    },
    NO_SHOW: {
      label: 'No Show',
      dot: 'bg-zinc-500',
      bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
      text: 'text-zinc-700',
    },
    SUSPENDED: {
      label: 'Suspended',
      dot: 'bg-red-500',
      bg: 'bg-red-50 text-red-800 border-red-200',
      text: 'text-red-800',
    },
    ACTIVE: {
      label: 'Active',
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      text: 'text-emerald-800',
    },
    INACTIVE: {
      label: 'Inactive',
      dot: 'bg-slate-400',
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      text: 'text-slate-600',
    },
  };

  const current = config[normalized] || {
    label: status,
    dot: 'bg-slate-400',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${current.bg} ${sizeClasses} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
