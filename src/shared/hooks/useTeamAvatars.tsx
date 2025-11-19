import { useEffect, useState } from 'react';
import type { TeamMember } from '@/shared/data/team';

type PublicUser = {
  username: string;
  userId: string;
  avatarUrl?: string | null;
};

export function useTeamAvatars(team: TeamMember[]) {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        team.map(async (member) => {
          try {
            const response = await fetch(`/api/v1/users/by-name?username=${encodeURIComponent(member.name)}`);
            if (!response.ok) return [member.name, ''] as const;
            const payload: PublicUser = await response.json();
            return [member.name, payload.avatarUrl || ''] as const;
          } catch {
            return [member.name, ''] as const;
          }
        }),
      );
      if (!alive) return;
      const next: Record<string, string> = {};
      for (const [name, url] of entries) {
        if (url) next[name] = url;
      }
      setAvatars(next);
    })();

    return () => {
      alive = false;
    };
  }, [team]);

  return avatars;
}

