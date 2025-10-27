import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';
import { isSelf } from '@/shared/auth/isSelf';

type PublicUser = { id: string; username: string; about?: string; avatar?: string };
type Me = PublicUser & { email?: string }; // приватные поля добавляй по мере надобности

export default function UserProfilePage() {
  const username = useParams().username!;
  const self = isSelf(username);
  const [data, setData] = useState<PublicUser | Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = self
          ? await http.get<Me>(endpoints.profileMe)
          : await http.get<PublicUser>(endpoints.userByName(username));
        if (alive) setData(r.data);
      } catch (e: any) {
        if (alive) setErr(e?.response?.status === 404 ? 'Профиль не найден' : 'Ошибка загрузки');
      }
    })();
    return () => { alive = false; };
  }, [username, self]);

  if (err) return <div className="wrap"><h1>{err}</h1></div>;
  if (!data) return <div className="wrap"><h1>Загрузка…</h1></div>;

  return (
    <div className="wrap">
      <div className="flex items-center gap-4 mb-4">
        <img src={(data as any).avatar || '/images/ely-icon.png'} className="w-16 h-16 rounded-xl" />
        <h1 className="text-2xl">@{data.username}</h1>
        {self && <a className="btn" href="/settings/profile">Редактировать</a>}
      </div>
      {/* выведи публичные/приватные поля */}
      {('about' in data) && data.about && <p className="text-slate-300">{data.about}</p>}
    </div>
  );
}
