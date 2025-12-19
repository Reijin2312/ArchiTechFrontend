import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/shared/ui/card/Card';
import { Button } from '@/shared/ui/button/Button';
import { Seo } from '@/shared/seo/seo';
import { useWallpaper } from '@/shared/ui/wallpaper/useWallpaper';

export default function DeviceLoginDonePage() {
  useWallpaper();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initial = Math.max(2, Math.min(15, Number(params.get('seconds') || 5)));
  const [left, setLeft] = useState(initial);

  useEffect(() => {
    const timer = setInterval(() => {
      setLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (left > 0) return;
    try { (window as any)?.Telegram?.WebApp?.close(); } catch {}
    try { window.close(); } catch {}
  }, [left]);

  const closeNow = () => {
    setLeft(0);
    try { (window as any)?.Telegram?.WebApp?.close(); } catch {}
    try { window.close(); } catch {}
  };

  return (
    <>
      <Seo title="Вход выполнен" robots="noindex,follow" />
      <div className="wrap" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(7,10,18,0.78), rgba(7,10,18,0.55))',
            zIndex: 0,
          }}
        />

        <Card
          style={{
            maxWidth: 520,
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            background: 'rgba(11,16,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 22px 60px rgba(0,0,0,0.45)',
            padding: '28px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: 8 }}>✅</div>
          <h1 style={{ fontSize: '24px', marginBottom: 10, color: '#e2e8f0' }}>Вход выполнен</h1>
          <p style={{ marginBottom: 14, color: '#cbd5e1' }}>
            Можно закрывать это окно. Если авто‑закрытие не сработало, нажми кнопку.
          </p>
          <div
            style={{
              fontSize: '34px',
              fontVariantNumeric: 'tabular-nums',
              marginBottom: 18,
              color: '#a5b4fc',
              letterSpacing: '0.5px',
            }}
          >
            {left > 0 ? `00:${String(left).padStart(2, '0')}` : '00:00'}
          </div>
          <Button onClick={closeNow} variant="primary">
            Закрыть сейчас
          </Button>
        </Card>
      </div>
    </>
  );
}
