import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import Footer from '@/shared/ui/Footer';


const schema = z.object({
email: z.string().email(),
username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/,'3–16: латиница/цифры/_'),
password: z.string().min(8).regex(/[A-Za-z]/,'нужны буквы').regex(/\d/,'нужны цифры'),
confirm: z.string()
}).refine(v => v.password === v.confirm, { path: ['confirm'], message: 'Не совпадает' });


type Form = z.infer<typeof schema>;


export default function RegisterPage(){
const { register, handleSubmit, formState:{errors, isSubmitting} } = useForm<Form>({ resolver: zodResolver(schema) });


async function onSubmit(v: Form){
const { data } = await http.post('/api/auth/register', { email: v.email, username: v.username, password: v.password });
if (data.needVerify) {
const qs = new URLSearchParams({ ticket: data.ticket, email: data.email });
window.location.href = '/auth/verify?' + qs.toString();
}
}


return (
	<div className="wrap">
		<Card>
			<h1 className="text-2xl mb-4">Создание аккаунта</h1>
			<form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
<label className="label">Email</label>
<Input autoComplete="email" {...register('email')} />
<FormHint>{errors.email?.message}</FormHint>


<label className="label">Ник</label>
<Input autoComplete="username" {...register('username')} />
<FormHint>{errors.username?.message}</FormHint>


<label className="label">Пароль</label>
<Input type="password" autoComplete="new-password" {...register('password')} />
<FormHint>{errors.password?.message || 'мин. 8, буквы и цифры'}</FormHint>


<label className="label">Повтор</label>
<Input type="password" autoComplete="new-password" {...register('confirm')} />
<FormHint>{errors.confirm?.message}</FormHint>


<div className="flex gap-2 mt-2">
<Button disabled={isSubmitting}>Зарегистрироваться</Button>
</div>
			</form>
		</Card>
		<Footer />
	</div>
);
}