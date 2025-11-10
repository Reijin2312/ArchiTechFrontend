import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import Footer from '@/shared/ui/Footer';
import type { ResetFinishReq, Ok } from '@/shared/api/types';
import { Seo } from '@/shared/seo/seo';

const schema = z.object({
pw1: z.string().min(8).regex(/[A-Za-z]/,'нужны буквы').regex(/\d/,'нужны цифры'),
pw2: z.string()
}).refine(v => v.pw1 === v.pw2, { path:['pw2'], message:'Не совпадает' });

type Form = z.infer<typeof schema>;

export default function NewPasswordPage() {
	const [sp] = useSearchParams();
	const token = sp.get('token') || '';
	const email = sp.get('email') || '';
	const nav = useNavigate();
	const { register, handleSubmit, formState:{errors, isSubmitting} } = useForm<Form>({ resolver: zodResolver(schema) });

	async function onSubmit(v: Form){
		await http.post<Ok>(endpoints.resetFinish, { resetToken: token, newPassword: v.pw1 } as ResetFinishReq);
		const next = sp.get('next') || '/profile';
		nav(`/auth/reset/done?next=${encodeURIComponent(next)}`, { replace:true });
	}

	if (!token) return (
		<div className="wrap"><Card><div className="error">Нет токена сброса.</div></Card></div>
	);

	return (
		<>
		<Seo title="Сброс пароля — ArchiTech MC" robots="noindex,follow" />
		<div className="wrap">
			<Card>
				<h1 className="text-2xl mb-2">Новый пароль</h1>
				<p className="hint mb-3">Для: {email}</p>
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
					<label className="label">Пароль</label>
					<Input type="password" autoComplete="new-password" {...register('pw1')} />
					<FormHint>{errors.pw1?.message || 'Мин. 8 символов, буквы и цифры'}</FormHint>

					<label className="label">Повтор</label>
					<Input type="password" autoComplete="new-password" {...register('pw2')} />
					<FormHint>{errors.pw2?.message}</FormHint>

					<div className="flex gap-2 mt-2">
						<Button disabled={isSubmitting}>Сменить пароль</Button>
					</div>
				</form>
			</Card>
			<Footer />
		</div>
		</>
	);
}