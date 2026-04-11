import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { UserSearchResult } from '@/shared/api/types';

type SearchUsersProps = {
  query: string;
  onQueryChange: (q: string) => void;
  results: UserSearchResult[];
  loading: boolean;
  onSendRequest: (id: string) => void;
  onCancelRequest: (id: string) => void;
  hideInput?: boolean;
};

export function SearchUsers({
  query,
  onQueryChange,
  results,
  loading,
  onSendRequest,
  onCancelRequest,
  hideInput = false,
}: SearchUsersProps) {
  return (
    <div>
      {!hideInput ? (
        <div className="mb-3">
          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by nickname..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>
      ) : null}

      {loading ? (
        <div className="py-6 text-center text-sm text-slate-400">Searching...</div>
      ) : null}

      {!loading && query.length >= 2 && results.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">No users found</div>
      ) : null}

      {!loading && results.length > 0 ? (
        <div className="space-y-2">
          {results.map((user) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2"
            >
              <Link to={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-2">
                {user.avatarUrl ? (
                  <img
                    src={
                      user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/')
                        ? user.avatarUrl
                        : `/media/${user.avatarUrl}`
                    }
                    alt={user.username}
                    className="h-10 w-10 rounded-lg border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400">
                    {user.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.username}</div>
                  {user.displayName ? (
                    <div className="truncate text-xs text-slate-400">{user.displayName}</div>
                  ) : null}
                </div>
              </Link>

              {user.friendStatus === 'ACCEPTED' ? (
                <span className="rounded border border-emerald-700/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                  Added
                </span>
              ) : null}
              {user.friendStatus === 'PENDING' ? (
                <button
                  type="button"
                  onClick={() => onCancelRequest(user.userId)}
                  className="rounded border border-amber-700/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20"
                >
                  Cancel
                </button>
              ) : null}
              {user.friendStatus === 'BLOCKED' ? (
                <span className="rounded border border-rose-700/50 bg-rose-500/10 px-2 py-1 text-xs text-rose-300">
                  Blocked
                </span>
              ) : null}
              {!user.friendStatus ? (
                <button
                  type="button"
                  onClick={() => onSendRequest(user.userId)}
                  className="rounded bg-indigo-600 px-2 py-1 text-xs hover:bg-indigo-500"
                >
                  Add
                </button>
              ) : null}
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
