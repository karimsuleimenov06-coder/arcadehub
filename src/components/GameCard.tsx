import { Link } from "react-router-dom";
import { Game } from "../types/game";

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  if (game.isSoon) {
    return (
      <div className="game-card glass rounded-xl p-4 opacity-60 cursor-not-allowed">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold" style={{ background: game.color + "22", color: game.color }}>
            {game.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{game.title}</h3>
            <span className="text-xs text-[var(--text-muted)]">{game.players} игрок</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">{game.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-1 rounded bg-[var(--glass-bg)] text-[var(--text-muted)]">Скоро</span>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/game/${game.id}`} className="block">
      <div className="game-card glass rounded-xl p-4 hover:neon-glow-green transition-all duration-300" style={{ borderColor: game.color + "33" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${game.color}22, ${game.color}44)`,
              color: game.color,
              boxShadow: `0 0 12px ${game.color}33`,
            }}
          >
            {game.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">{game.title}</h3>
            <span className="text-xs text-[var(--text-muted)]">{game.players} игрок</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{game.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: game.color + "22", color: game.color }}
          >
            {game.tags[0]}
          </span>
          {game.isHot && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--neon-red)]/20 text-[var(--neon-red)]">Hot</span>}
          {game.isNew && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--neon-blue)]/20 text-[var(--neon-blue)]">New</span>}
          {game.isOnline && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--neon-purple)]/20 text-[var(--neon-purple)]">Онлайн</span>}
        </div>
      </div>
    </Link>
  );
}
