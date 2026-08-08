import { useEffect, useState } from 'react';
export function useTeamAvatars(team) {
    const [avatars, setAvatars] = useState({});
    useEffect(() => {
        let alive = true;
        (async () => {
            const entries = await Promise.all(team.map(async (member) => {
                try {
                    const response = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(member.name)}`);
                    if (!response.ok)
                        return [member.name, ''];
                    const payload = await response.json();
                    return [member.name, payload.avatarUrl || ''];
                }
                catch {
                    return [member.name, ''];
                }
            }));
            if (!alive)
                return;
            const next = {};
            for (const [name, url] of entries) {
                if (url)
                    next[name] = url;
            }
            setAvatars(next);
        })();
        return () => {
            alive = false;
        };
    }, [team]);
    return avatars;
}
