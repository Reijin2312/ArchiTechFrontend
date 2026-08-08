import { useState, useEffect } from 'react';
import { http } from '../../../shared/api/http.js';
import { endpoints } from '../../../shared/api/endpoints.js';
export function useProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        (async () => {
            try {
                const { data } = await http.get(endpoints.profileMe, { withCredentials: true });
                if (!alive)
                    return;
                setProfile(data);
            }
            catch (e) {
                const err = e;
                if (alive)
                    setError(err?.response?.data || err?.message || 'Ошибка загрузки');
            }
            finally {
                if (alive)
                    setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);
    const updateProfile = async (updates) => {
        setError(null);
        try {
            await http.put(endpoints.profileMe, updates, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' },
            });
            const { data } = await http.get(endpoints.profileMe, { withCredentials: true });
            setProfile(data);
            return { success: true, data };
        }
        catch (e) {
            const err = e;
            const errorMsg = err?.response?.data || err?.message || 'Ошибка сохранения профиля';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
    };
    return { profile, setProfile, loading, error, setError, updateProfile };
}
