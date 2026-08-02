import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GAMES, getGameById } from "../types/game";
import SnakeGame from "../games/Snake";
import TicTacToeGame from "../games/TicTacToe";
import PongGame from "../games/Pong";
import PokerGame from "../games/Poker";
import Game2048 from "../games/Game2048";

const gameComponents: Record<string, React.FC> = {
  snake: SnakeGame,
  tictactoe: TicTacToeGame,
  pong: PongGame,
  poker: PokerGame,
  "2048": Game2048,
};

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = getGameById(gameId || "");

  if (!game) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold neon-text-pink mb-4">Игра не найдена</h2>
        <Link to="/" className="text-[var(--neon-blue)] hover:underline">На главную</Link>
      </div>
    );
  }

  const GameComponent = gameComponents[game.id];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--neon-blue)] mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Назад
      </Link>

      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${game.color}22, ${game.color}44)`,
              color: game.color,
              boxShadow: `0 0 20px ${game.color}33`,
            }}
          >
            {game.emoji}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">{game.title}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{game.description}</p>
          </div>
        </div>

        {GameComponent ? (
          <GameComponent />
        ) : game.isSoon ? (
          <div className="flex items-center justify-center h-64 glass rounded-xl">
            <div className="text-center">
              <p className="text-3xl mb-3">{game.emoji}</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">Скоро!</p>
              <p className="text-sm text-[var(--text-muted)]">Эта игра появится совсем скоро</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 glass rounded-xl">
            <div className="text-center">
              <p className="text-3xl mb-3">{game.emoji}</p>
              <p className="text-sm text-[var(--text-muted)]">В разработке</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
