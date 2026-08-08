import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseRedirectUri } from '../../shared/auth/utils.js';
export function useRedirectUri() {
    const [searchParams] = useSearchParams();
    const [redirectUri, setRedirectUri] = useState(null);
    useEffect(() => {
        const fromUrl = searchParams.get('redirect_uri');
        const fromStorage = sessionStorage.getItem('redirect_uri');
        const raw = fromUrl || fromStorage;
        if (fromUrl) {
            sessionStorage.setItem('redirect_uri', fromUrl);
        }
        // Парсим и валидируем
        const validated = parseRedirectUri(raw);
        setRedirectUri(validated);
    }, [searchParams]);
    const clearRedirectUri = () => {
        sessionStorage.removeItem('redirect_uri');
        setRedirectUri(null);
    };
    return { redirectUri, clearRedirectUri };
}
