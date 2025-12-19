import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function Card({ children, className, style }: Props) {
  const cls = ['card', 'backdrop-blur-md', 'backdrop-saturate-150', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
