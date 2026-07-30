import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

type Cell = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const SIZE = 20;
const MOVE_DELAY = 200;
const INIT: Cell[] = [{ x: 10, y: 10 }];

function randomFood(snake: Cell[]): Cell {
  let p: Cell;
  do {
    p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

const ArrowIcon = ({ d }: { d: Direction }) => {
  const paths: Record<Direction, string> = {
    UP: "M12 4l-8 8h16z",
    DOWN: "M12 20l8-8H4z",
    LEFT: "M4 12l8-8v16z",
    RIGHT: "M20 12l-8-8v16z",
  };
  return (
    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d={paths[d]} />
    </svg>
  );
};

function DirButton({ d, onMove }: { d: Direction; onMove: (d: Direction) => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onMove(d); }}
      onTouchStart={(e) => { e.preventDefault(); onMove(d); }}
      className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-xl flex items-center justify-center text-[var(--neon-blue)] active:bg-[var(--neon-blue)]/20 active:scale-90 transition-all select-none touch-none"
      style={{ boxShadow: "0 0 12px rgba(0,243,255,0.15)" }}
    >
      <ArrowIcon d={d} />
    </button>
  );
}

export default function SnakeGame() {
  const { user } = useAuth()
  const { addScore } = useGame()
  const [snake, setSnake] = useState<Cell[]>(INIT);
  const [food, setFood] = useState<Cell>(randomFood(INIT));
  const [dir, setDir] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastMoveRef = useRef(0);
  const dirRef = useRef<Direction>("RIGHT");
  const scoreRef = useRef(0);

  useEffect(() => { scoreRef.current = score }, [score])

  const move = useCallback((direction: Direction) => {
    const now = Date.now();
    if (now - lastMoveRef.current < MOVE_DELAY) return;
    if (gameOver) return;
    lastMoveRef.current = now;
    dirRef.current = direction;
    setStarted(true);

    setSnake(prev => {
      const head = { ...prev[0] };
      switch (direction) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }
      if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE || prev.some(s => s.x === head.x && s.y === head.y)) {
        setGameOver(true);
        return prev;
      }
      const eaten = head.x === food.x && head.y === food.y;
      const newSnake = [head, ...prev.slice(0, eaten ? prev.length : prev.length - 1)];
      if (eaten) {
        const s = scoreRef.current + 1
        setScore(s);
        setFood(randomFood(newSnake));
      }
      return newSnake;
    });
  }, [gameOver, food]);

  const handleMove = useCallback((d: Direction) => {
    if (d === "UP" && dirRef.current === "DOWN") return;
    if (d === "DOWN" && dirRef.current === "UP") return;
    if (d === "LEFT" && dirRef.current === "RIGHT") return;
    if (d === "RIGHT" && dirRef.current === "LEFT") return;
    setDir(d);
    move(d);
  }, [move]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
        W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      const d = keyMap[e.key];
      if (d) { e.preventDefault(); handleMove(d); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  useEffect(() => {
    if (gameOver && !saved && user) {
      addScore('snake', score);
      setSaved(true);
    }
  }, [gameOver, saved, user, score, addScore]);

  const restart = () => {
    setSnake(INIT);
    setFood(randomFood(INIT));
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setStarted(false);
    setSaved(false);
    lastMoveRef.current = 0;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span>Очки: <strong className="neon-text-green">{score}</strong></span>
        {user && <span className="text-[10px] text-[var(--text-muted)]">+{Math.max(1, Math.floor(score / 10))} монет</span>}
      </div>

      <div className="relative" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SIZE}, max(14px, min(20px, calc((100vw - 80px) / ${SIZE})))`,
        gridTemplateRows: `repeat(${SIZE}, max(14px, min(20px, calc((100vw - 80px) / ${SIZE})))`,
        gap: 1, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 4,
      }}>
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = i % SIZE;
          const y = Math.floor(i / SIZE);
          const isSnake = snake.some(s => s.x === x && s.y === y);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isFood = food.x === x && food.y === y;
          return (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: 2,
              background: isHead ? "#00ff88" : isSnake ? "#00cc66" : isFood ? "#ff3355" : "rgba(255,255,255,0.03)",
              boxShadow: isHead ? "0 0 8px rgba(0,255,136,0.6)" : isFood ? "0 0 8px rgba(255,51,85,0.6)" : "none",
              transition: "background 0.1s",
            }} />
          );
        })}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
            <div className="text-center">
              <p className="text-2xl font-bold neon-text-pink mb-2">Игра окончена!</p>
              <p className="text-[var(--text-secondary)] mb-1">Счёт: {score}</p>
              {user && <p className="text-[10px] text-[var(--text-muted)] mb-4">+{Math.max(1, Math.floor(score / 10))} монет · +{Math.max(1, Math.floor(score / 5))} XP</p>}
              {!user && <p className="text-[10px] text-[var(--text-muted)] mb-4"><Link to="/login" className="text-[var(--neon-blue)]">Войдите</Link> чтобы сохранять прогресс</p>}
              <button onClick={restart} className="px-6 py-2 glass rounded-lg neon-text-green hover:neon-glow-green transition-all active:scale-95">
                Заново
              </button>
            </div>
          </div>
        )}
        {!started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
            <div className="text-center">
              <p className="text-lg neon-text-blue mb-2">Нажми любую стрелку</p>
              <p className="text-xs text-[var(--text-muted)]">или на кнопку ниже</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 select-none touch-none">
        <div />
        <DirButton d="UP" onMove={handleMove} />
        <div />
        <DirButton d="LEFT" onMove={handleMove} />
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xs font-bold text-[var(--neon-green)] bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)]">
          {score}
        </div>
        <DirButton d="RIGHT" onMove={handleMove} />
        <div />
        <DirButton d="DOWN" onMove={handleMove} />
        <div />
      </div>

      <div className="absolute inset-0 z-0 md:hidden pointer-events-none" />
    </div>
  );
}