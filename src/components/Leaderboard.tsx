import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

type LeaderboardEntry = {
  username: string;
  nickname: string;
  score: number;
  date: number;
};

export default function Leaderboard({ gameId }: { gameId: string }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard.mjs?game=${gameId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setEntries(data.entries || []);
      }
    } catch {}
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    setLoading(true);
    load();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.game !== gameId) return;
      if (Array.isArray(detail.entries)) {
        setEntries(detail.entries as LeaderboardEntry[]);
        setLoading(false);
      } else {
        load();
      }
    };
    window.addEventListener("arcadehub:leaderboard", handler);
    return () => window.removeEventListener("arcadehub:leaderboard", handler);
  }, [gameId, load]);

  return (
    <div className="w-full mt-8">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5" style={{ color: "var(--neon-yellow)" }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <h3 className="text-sm font-bold uppercase tracking-wider neon-text-yellow">Рейтинг</h3>
      </div>

      {loading ? (
        <div className="glass rounded-xl p-4 text-center text-sm text-[var(--text-muted)]">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl p-4 text-center text-sm text-[var(--text-muted)]">Пока нет результатов — стань первым!</div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--glass-border)" }}>
                <th className="py-2 px-3 text-left text-xs font-semibold text-[var(--text-muted)] w-10">#</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-[var(--text-muted)]">Игрок</th>
                <th className="py-2 px-3 text-right text-xs font-semibold text-[var(--text-muted)]">Очки</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const isMe = user && e.username === user.username;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <tr key={e.username} className="border-b last:border-0" style={{ borderColor: "var(--glass-border)", background: isMe ? "rgba(0,243,255,0.06)" : "transparent" }}>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{medal || i + 1}</td>
                    <td className="py-2 px-3">
                      <span className={isMe ? "neon-text-blue font-semibold" : "text-[var(--text-secondary)]"}>
                        {e.nickname}{isMe ? " (вы)" : ""}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold neon-text-green">{e.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
