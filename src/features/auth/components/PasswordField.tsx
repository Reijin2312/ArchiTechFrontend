import { useState } from 'react';
import { Input } from '@/shared/ui/form/Input';

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export default function PasswordField({ error, ...props }: PasswordFieldProps){
const [show, setShow] = useState(false);
return (
<div className="relative">
<Input type={show?'text':'password'} error={error} {...props} />
<button type="button" onClick={()=>setShow(v=>!v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
{show? 'Скрыть':'Показать'}
</button>
</div>
);
}