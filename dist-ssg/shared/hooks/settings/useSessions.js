import { useState, useEffect, useMemo } from 'react';
import { http } from '../../../shared/api/http.js';
import { endpoints } from '../../../shared/api/endpoints.js';
function sessionStatus(s) {
    if (s.revokedAt)
        return 'revoked';
    if (s.replacedBy)
        return 'replaced';
    if (Date.parse(s.expiresAt) < Date.now())
        return 'expired';
    return 'active';
}
export function useSessions() {
    const [sessions, setSessions] = useState([]);
    const [show, setShow] = useState({
        active: true,
        expired: false,
        replaced: false,
        revoked: false,
    });
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [sortBy, setSortBy] = useState('created_desc');
    useEffect(() => {
        loadSessions();
    }, []);
    const loadSessions = async () => {
        try {
            const resp = await http.get(endpoints.accountSessions, {
                withCredentials: true,
            });
            setSessions(resp.data.sessions || []);
        }
        catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };
    const revokeSession = async (tokenId) => {
        try {
            await http.delete(`${endpoints.accountSessions}/${encodeURIComponent(tokenId)}`, {
                withCredentials: true,
            });
            await loadSessions();
            return { success: true };
        }
        catch (e) {
            const err = e;
            return { success: false, error: err?.response?.data || err?.message || 'Ошибка завершения сессии' };
        }
    };
    const visibleSessions = useMemo(() => {
        let list = sessions.filter((s) => show[sessionStatus(s)]);
        const fromTs = from ? Date.parse(from) : -Infinity;
        const toTs = to ? Date.parse(to) : Infinity;
        list = list.filter((s) => {
            const t = Date.parse(s.createdAt);
            return t >= fromTs && t <= toTs;
        });
        const latest = new Map();
        for (const s of list) {
            const prev = latest.get(s.familyId);
            if (!prev || Date.parse(prev.createdAt) < Date.parse(s.createdAt))
                latest.set(s.familyId, s);
        }
        list = Array.from(latest.values()).filter((s) => !s.replacedBy);
        const cmp = (a, b) => {
            const ca = Date.parse(a.createdAt), cb = Date.parse(b.createdAt);
            const ea = Date.parse(a.expiresAt), eb = Date.parse(b.expiresAt);
            switch (sortBy) {
                case 'created_asc':
                    return ca - cb;
                case 'created_desc':
                    return cb - ca;
                case 'expires_asc':
                    return ea - eb;
                case 'expires_desc':
                    return eb - ea;
            }
        };
        return list.sort(cmp);
    }, [sessions, show, from, to, sortBy]);
    const since = useMemo(() => {
        if (!sessions.length)
            return null;
        const created = sessions.reduce((min, s) => Math.min(min, Date.parse(s.createdAt)), Number.POSITIVE_INFINITY);
        if (!isFinite(created))
            return null;
        try {
            return new Date(created).toLocaleDateString();
        }
        catch {
            return null;
        }
    }, [sessions]);
    return {
        sessions,
        visibleSessions,
        show,
        setShow,
        from,
        setFrom,
        to,
        setTo,
        sortBy,
        setSortBy,
        since,
        loadSessions,
        revokeSession,
        sessionStatus,
    };
}
