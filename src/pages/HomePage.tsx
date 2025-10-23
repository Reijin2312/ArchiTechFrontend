import { Link } from 'react-router-dom';
import { authStore } from '@/shared/store/auth';
import Footer from '@/shared/ui/Footer';

export default function HomePage() {
const { user, logout } = authStore();
return (
<div className="wrap">
<div className="card">
<h1 className="text-2xl mb-4">ArchiTech</h1>
{user ? (
<>
<p className="mb-4">Привет, {user.username}</p>
<button className="btn ghost" onClick={logout}>Выйти</button>
</>
) : (
<div className="flex gap-2">
<Link className="btn primary" to="/auth/login">Войти</Link>
<Link className="btn ghost" to="/auth/register">Регистрация</Link>
</div>
)}
</div>
	<Footer />
</div>
);
}