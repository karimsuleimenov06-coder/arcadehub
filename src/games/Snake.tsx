import { useState, useCallback, useEffect, useRef } from "react";

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

export default function SnakeGame() {
  const [snake, setSnake] = useState<Cell[]>(INIT);
  const [food, setFood] = useState<Cell>(randomFood(INIT));
  const [dir, setDir] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const lastMoveRef = useRef(0);
  const dirRef = useRef<Direction>("RIGHT");

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
        setScore(s => s + 1);
        setFood(randomFood(newSnake));
      }
      return newSnake;
    });
  }, [gameOver, food]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
        W: "UP", S: "DOWN", A: "LEFT", D: "RIGHT",
      };
      const d = keyMap[e.key];
      if (d) {
        e.preventDefault();
        if (d === "UP" && dirRef.current === "DOWN") return;
        if (d === "DOWN" && dirRef.current === "UP") return;
        if (d === "LEFT" && dirRef.current === "RIGHT") return;
        if (d === "RIGHT" && dirRef.current === "LEFT") return;
        setDir(d);
        move(d);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  const restart = () => {
    setSnake(INIT);
    setFood(randomFood(INIT));
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setStarted(false);
    lastMoveRef.current = 0;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        <span>Очки: <strong className="neon-text-green">{score}</strong></span>
        {started && <span>Управление: стрелки / WASD</span>}
      </div>
      <div
        className="relative"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 20px)`,
          gridTemplateRows: `repeat(${SIZE}, 20px)`,
          gap: 1,
          background: "rgba(0,0,0,0.3)",
          borderRadius: 8,
          padding: 4,
        }}
      >
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = i % SIZE;
          const y = Math.floor(i / SIZE);
          const isSnake = snake.some(s => s.x === x && s.y === y);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={i}
              style={{
                width: 20,
                height: 20,
                borderRadius: 2,
                background: isHead ? "#00ff88" : isSnake ? "#00cc66" : isFood ? "#ff3355" : "rgba(255,255,255,0.03)",
                boxShadow: isHead ? "0 0 8px rgba(0,255,136,0.6)" : isFood ? "0 0 8px rgba(255,51,85,0.6)" : "none",
                transition: "background 0.1s",
              }}
            />
          );
        })}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold neon-text-pink mb-2">Игра окончена!</p>
              <p className="text-[var(--text-secondary)] mb-4">Счёт: {score}</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg neon-text-green hover:neon-glow-green transition-all">
                Заново
              </button>
            </div>
          </div>
        )}
        {!started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
            <div className="text-center">
              <p className="text-lg neon-text-blue mb-2">Нажми любую стрелку</p>
              <p className="text-xs text-[var(--text-muted)]">WASD / стрелки</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}