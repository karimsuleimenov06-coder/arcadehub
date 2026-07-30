import { Link } from "react-router-dom";
import { Game } from "../types/game";

interface GameCardProps { game: Game }

export default function GameCard({ game }: GameCardProps) {
  if (game.isSoon) {
    return (
      <div className="game-card glass rounded-xl p-3 sm:p-4 opacity-60 cursor-not-allowed">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-sm sm:text-xl font-bold shrink-0" style={{ background: game.color + "22", color: game.color }}>
            {game.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm truncate">{game.title}</h3>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{game.players} игрок</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-[var(--glass-bg)] text-[var(--text-muted)]">Скоро</span>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/game/${game.id}`} className="block active:scale-[0.97] transition-transform">
      <div className="game-card glass rounded-xl p-3 sm:p-4 active:neon-glow-green transition-all duration-200" style={{ borderColor: game.color + "22" }}>
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-sm sm:text-xl font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${game.color}22, ${game.color}44)`, color: game.color, boxShadow: `0 0 8px ${game.color}22` }}
          >
            {game.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">{game.title}</h3>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">{game.players} игрок</span>
          </div>
        </div>
        <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mb-2 line-clamp-2 hidden sm:block">{game.description}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full" style={{ background: game.color + "18", color: game.color }}>{game.tags[0]}</span>
          {game.isHot && <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[var(--neon-red)]/15 text-[var(--neon-red)]">Hot</span>}
          {game.isNew && <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[var(--neon-blue)]/15 text-[var(--neon-blue)]">New</span>}
          {game.isOnline && <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[var(--neon-purple)]/15 text-[var(--neon-purple)]">Online</span>}
        </div>
      </div>
    </Link>
  );
}
