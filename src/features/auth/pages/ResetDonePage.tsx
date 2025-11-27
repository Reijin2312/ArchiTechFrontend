import { Card } from '@/shared/ui/card/Card';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Seo } from '@/shared/seo/seo';

export default function ResetDonePage(){
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const next = sp.get('next');

  useEffect(() => {
    if (!next) return;
    const t = setTimeout(() => nav(next, { replace:true }), 3000);
    return () => clearTimeout(t);
  }, [next, nav]);

  return (
    <>
    <Seo title="Сброс пароля — ArchiTech MC" robots="noindex,follow" />
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-2">Пароль изменён</h1>
        <p className="hint mb-4">
          {next ? 'Возвращаем на предыдущую страницу…' : 'Теперь можно войти с новым паролем.'}
        </p>
        {next
          ? <Link className="btn" to={next}>Перейти сейчас</Link>
          : <Link className="btn primary" to="/auth/login">Перейти ко входу</Link>}
      </Card>
    </div>
    </>
  );
}