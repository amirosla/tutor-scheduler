import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string; // HSL or hex
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, color, className = '', size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${className}`}
      style={
        color
          ? { backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }
          : {}
      }
    >
      {children}
    </span>
  );
}

export function SubjectTag({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
      {tag}
    </span>
  );
}
