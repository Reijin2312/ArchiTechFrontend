import React from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function I({
  className,
  error,
  ...p
}, ref){
  return (
    <input 
      ref={ref} 
      {...p} 
      className={cn('input', error ? 'input-error' : '', className)} 
    />
  );
});