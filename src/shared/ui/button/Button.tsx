import { cn } from '../utils/cn';
import React from 'react';


type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost' };
export function Button({ className, variant='primary', ...p }: Props){
return <button {...p} className={cn('btn', variant==='primary'?'primary':'ghost', className)} />;
}