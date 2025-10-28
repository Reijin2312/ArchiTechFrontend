import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import { FormHint } from '@/shared/ui/FormHint';
import Footer from '@/shared/ui/Footer';

const schema = z.object({
  old: z.string().min(1, 'Введите текущий пароль'),
  pw1: z.string().min(8).regex(/[A-Za-z]/,'нужны буквы').regex(/\d/,'нужны цифры'),
  pw2: z.string()
}).refine(v => v.pw1 === v.pw2, { path:['pw2'], message:'Не совпадает' });

type Form = z.infer<typeof schema>;

export default function ChangePasswordPage(){
  const nav = useNavigate();
  const { register, handleSubmit, formState:{errors, isSubmitting} } =
    useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Form){
    await http.post(endpoints.accountPasswordChange, {
      oldPassword: v.old,
      newPassword: v.pw1,
    });
    nav('/settings/profile', { replace:true });
  }

  return (
    <div className="wrap">
      <Card>
        <h1 className="text-2xl mb-4">Смена пароля</h1>

        <label className="label">Текущий пароль</label>
        <Input type="password" autoComplete="current-password" {...register('old')} />
        <FormHint>{errors.old?.message}</FormHint>

        <label className="label mt-3">Новый пароль</label>
        <Input type="password" autoComplete="new-password" {...register('pw1')} />
        <FormHint>{errors.pw1?.message || 'Мин. 8 символов, буквы и цифры'}</FormHint>

        <label className="label mt-3">Повтор</label>
        <Input type="password" autoComplete="new-password" {...register('pw2')} />
        <FormHint>{errors.pw2?.message}</FormHint>

        <div className="flex gap-2 mt-4">
          <Button disabled={isSubmitting}>Сменить пароль</Button>
          <Button variant="ghost" onClick={()=>nav('/settings/profile')}>Отмена</Button>
        </div>

      </Card>
      <Footer />
    </div>
  );
}
