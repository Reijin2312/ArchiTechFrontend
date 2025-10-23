import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import Footer from '@/shared/ui/Footer';


export default function ResetDonePage(){
return (
<div className="wrap">
<Card>
<h1 className="text-2xl mb-2">Пароль изменён</h1>
<p className="hint mb-4">Теперь можно войти с новым паролем.</p>
<Link className="btn primary" to="/auth/login">Перейти ко входу</Link>
</Card>
<Footer />
</div>
);
}