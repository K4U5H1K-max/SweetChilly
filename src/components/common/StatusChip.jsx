import React from 'react';

/**
 * Universal Operational Status Chip Component
 * Directly aligns with Reference Color Semantics
 * Variants: success | warning | critical | info | ai | neutral
 */
export default function StatusChip({
  variant = 'neutral',
  label,
  children,
  size = 'md',
  solid = false,
  className = '',
}) {
  const text = label || children;
  const normalizedVariant = String(variant).toLowerCase();

  // Color Mapping based on Reference Design Tokens
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['success', 'nominal', 'safe', 'available', 'depot ready', 'ready', 'verified', 'on route', 'completed', 'online', 'healthy', 'idle', 'resolved'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-[#16A34A] text-white border-[#16A34A]'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['warning', 'caution', 'delayed', 'needs attention', 'watch', 'maintenance'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-[#F59E0B] text-white border-[#F59E0B]'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['critical', 'blocked', 'flagged', 'emergency', 'danger', 'assistance_required', 'breakdown', 'cancelled', 'hazard'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['info', 'active', 'deployed', 'moving', 'in-transit', 'in_transit', 'in transit', 'planned', 'dispatched'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-[#2563EB] text-white border-[#2563EB]'
      : 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (['ai', 'ai verified', 'ai analysis', 'smart', 'optimal'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
      : 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (['neutral', 'unknown', 'not_checked', 'offline', 'unavailable'].includes(normalizedVariant)) {
    colorStyles = solid
      ? 'bg-slate-600 text-white border-slate-600'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-1.5 py-0.2 text-[10px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold border leading-tight whitespace-nowrap transition-colors ${sizeStyles} ${colorStyles} ${className}`}
    >
      {text}
    </span>
  );
}
