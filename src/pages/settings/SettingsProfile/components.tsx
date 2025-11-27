import React from 'react';
import { useProfileTheme } from '@/shared/ui/utils/ProfileThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  const { getThemeStyle } = useProfileTheme();
  const customStyle = getThemeStyle();

  const finalStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    ...customStyle,
  };

  return (
    <section
      className={`rounded-2xl border border-slate-800 backdrop-blur-md backdrop-saturate-150 p-4 shadow-[0_1px_0_#ffffff10_inset,0_20px_40px_-20px_#000] ${className}`}
      style={finalStyle}
    >
      {children}
    </section>
  );
}

interface InputRowProps {
  label: string;
  children: React.ReactNode;
}

export function InputRow({ label, children }: InputRowProps) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}

export function inp() {
  return 'w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-600';
}
