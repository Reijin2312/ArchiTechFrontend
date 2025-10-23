import React from 'react';
import { cn } from './cn';


export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function I({className, ...p}, ref){
return <input ref={ref} {...p} className={cn('input', className)} />
});