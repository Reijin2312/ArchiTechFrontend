import { useState, useEffect } from 'react';
import { http } from '@/shared/api/http';
import { endpoints } from '@/shared/api/endpoints';

interface Profile {
  achievements?: Array<{
    id: string;
    icon: string;
    title: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: string;
  }>;
  savedSkins?: Array<{
    id: string;
    name: string;
    url: string;
    model: 'classic' | 'slim';
    savedAt: string;
  }>;
  id: string;
  userId?: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  birthDate?: string | null;
  avatarUrl: string;
  skinUrl: string;
  skinModel?: 'classic' | 'slim';
  email?: string;
  registeredAt?: string;
  bannerUrl?: string;
  profileTheme?: string;
  customThemeColor1?: string;
  customThemeColor2?: string;
  profileWallpaper?: string;
  userStatus?: string;
  customStatus?: string;
  socialLinks?: Array<{ type: string; value: string }>;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data } = await http.get<Profile>(endpoints.profileMe, { withCredentials: true });
        if (!alive) return;
        setProfile(data);
      } catch (e: unknown) {
        const err = e as { response?: { data?: unknown }; message?: string };
        if (alive) setError(err?.response?.data as string || err?.message || 'Ошибка загрузки');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const updateProfile = async (updates: Partial<Profile>) => {
    setError(null);
    try {
      await http.put(endpoints.profileMe, updates, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const { data } = await http.get<Profile>(endpoints.profileMe, { withCredentials: true });
      setProfile(data);
      return { success: true, data };
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown }; message?: string };
      const errorMsg = err?.response?.data as string || err?.message || 'Ошибка сохранения профиля';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  return { profile, setProfile, loading, error, setError, updateProfile };
}
