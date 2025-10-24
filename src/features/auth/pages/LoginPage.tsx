import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { http } from '@/shared/api/http';
import { authStore } from '@/shared/store/auth';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import { Link, NavigateFunction } from 'react-router-dom';
import PasswordField from '../components/PasswordField';
import Footer from '@/shared/ui/Footer';
import type { LoginReq, LoginRes} from '@/shared/api/types'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });


type Form = z.infer<typeof schema>;


export default function LoginPage() {
	const { setTokens, setUser } = authStore();
	const { register, handleSubmit, formState:{errors, isSubmitting}, getValues } = useForm<Form>({ resolver: zodResolver(schema) });

	const navigate = useNavigate()
	const { search } = useLocation()
	const user = authStore(s => s.user)

	useEffect(() => {
  		if (user) navigate('/profile', { replace: true })
	}, [user, navigate])

	const next = new URLSearchParams(search).get('next') || '/profile'

	async function onSubmit(v: Form) {
		const { data } = await http.post<LoginRes>('/api/auth/login', v as LoginReq);
		setTokens(data.accessToken, data.refreshToken);
		setUser(data.user);
		try {
    		const { data } = await http.post<LoginRes>('/api/auth/login', v as LoginReq);
    		setTokens(data.accessToken, data.refreshToken);
    		setUser(data.user);
    		navigate(next, { replace: true });
  		} catch (e) {
    
		}
	}

	function startReset() {
		const email = getValues('email') || '';
		const qs = new URLSearchParams({ email }).toString();
		navigate('/auth/reset?' + qs);
	}


	return (
		<div className="wrap">
			<Card>
				<h1 className="text-2xl mb-4">Вход</h1>
				<form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
					<label className="label">Почта</label>
					<Input 
						autoComplete="email" 
						{...register('email')} 
						error={!!errors.email}
					/>
					<FormHint error={!!errors.email}>{errors.email?.message}</FormHint>

					<label className="label">Пароль</label>
					<PasswordField 
						autoComplete="current-password" 
						{...register('password')} 
						error={!!errors.password}
					/>
					<FormHint error={!!errors.password}>{errors.password?.message}</FormHint>

					<div className="flex gap-2 mt-2">
						<Button disabled={isSubmitting}>Войти</Button>
						<Button type="button" variant="ghost" onClick={startReset}>Забыли пароль?</Button>
						<Link to="/auth/register" className="btn ghost">Регистрация</Link>
					</div>
				</form>
			</Card>
			<Footer />
		</div>
	);
}