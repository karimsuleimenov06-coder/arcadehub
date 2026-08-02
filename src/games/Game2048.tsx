import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const SIZE = 4;
type Dir = "up" | "down" | "left" | "right";

const EMPTY_GRID = (): number[][] => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

function newTile(): number {
  return Math.random() < 0.9 ? 2 : 4;
}

function addRandom(grid: number[][]): number[][] {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const n = grid.map(row => [...row]);
  n[r][c] = newTile();
  return n;
}

function newGame(): number[][] {
  return addRandom(addRandom(EMPTY_GRID()));
}

function slideRow(line: number[]): { row: number[]; gained: number } {
  const vals = line.filter(v => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { row: out, gained };
}

function move(dir: Dir, grid: number[][]): { grid: number[][]; gained: number; moved: boolean } {
  const n = grid.map(r => [...r]);
  let gained = 0, moved = false;

  const apply = (get: (i: number) => number[], set: (i: number, row: number[]) => void, reversed: boolean) => {
    for (let i = 0; i < SIZE; i++) {
      const line = reversed ? [...get(i)].reverse() : get(i);
      const { row, gained: g } = slideRow(line);
      gained += g;
      const final = reversed ? [...row].reverse() : row;
      set(i, final);
      if (line.join(",") !== final.join(",")) moved = true;
    }
  };

  switch (dir) {
    case "left": apply(i => n[i], (i, r) => { n[i] = r; }, false); break;
    case "right": apply(i => n[i], (i, r) => { n[i] = r; }, true); break;
    case "up": apply(c => n.map(r => r[c]), (c, r) => { for (let i = 0; i < SIZE; i++) n[i][c] = r[i]; }, false); break;
    case "down": apply(c => n.map(r => r[c]), (c, r) => { for (let i = 0; i < SIZE; i++) n[i][c] = r[i]; }, true); break;
  }
  return { grid: n, gained, moved };
}

function canMove(grid: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (!v) return true;
      if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

const DIR_KEYS: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
  W: "up", S: "down", A: "left", D: "right",
};

function tileBg(v: number): string {
  if (!v) return "rgba(255,255,255,0.03)";
  const bg: Record<number, string> = {
    2: "rgba(255,221,0,0.14)", 4: "rgba(255,221,0,0.26)",
    8: "rgba(255,190,0,0.4)", 16: "rgba(255,160,0,0.52)",
    32: "rgba(255,130,0,0.64)", 64: "rgba(255,100,0,0.76)",
    128: "rgba(255,221,0,0.85)", 256: "rgba(255,221,0,0.9)",
    512: "rgba(255,221,0,0.95)", 1024: "#ffdd00", 2048: "#ffdd00",
  };
  return bg[v] || "rgba(255,221,0,0.95)";
}

function tileTextSize(v: number): string {
  const len = String(v).length;
  if (len <= 1) return "text-3xl sm:text-4xl";
  if (len === 2) return "text-2xl sm:text-3xl";
  if (len === 3) return "text-xl sm:text-2xl";
  return "text-lg sm:text-xl";
}

export default function Game2048() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const gridRef = useRef<number[][]>(newGame());
  const overRef = useRef(false);
  const wonRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const [grid, setGrid] = useState<number[][]>(gridRef.current);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_2048_best") || 0); } catch { return 0; }
  });
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_2048_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (over && !saved) {
      setSaved(true);
      if (user && score > 0) addScore("2048", score);
    }
  }, [over, saved, user, score, addScore]);

  const doMove = useCallback((dir: Dir) => {
    if (overRef.current) return;
    const prev = gridRef.current;
    const res = move(dir, prev);
    if (!res.moved) return;
    const next = addRandom(res.grid);
    gridRef.current = next;
    setGrid(next);
    if (res.gained) setScore(s => s + res.gained);
    if (!canMove(next)) { overRef.current = true; setOver(true); }
    if (!wonRef.current && !continued && next.some(r => r.some(v => v >= 2048))) {
      wonRef.current = true; setWon(true);
    }
  }, [continued]);

  const restart = useCallback(() => {
    gridRef.current = newGame();
    setGrid(gridRef.current);
    setScore(0); setOver(false); setWon(false); setContinued(false); setSaved(false);
    overRef.current = false; wonRef.current = false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = DIR_KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove]);

  const swipeStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const swipeEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
    else doMove(dy > 0 ? "down" : "up");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-xs gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Очки</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Рекорд</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{best}</div>
          </div>
        </div>
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all active:scale-95">
          Новая игра
        </button>
      </div>

      <div
        className="relative glass rounded-xl p-2 select-none touch-none"
        style={{ width: "min(360px, calc(100vw - 60px))" }}
        onTouchStart={swipeStart}
        onTouchEnd={swipeEnd}
      >
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}
        >
          {grid.flat().map((v, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center font-bold transition-all ${tileTextSize(v)}`}
              style={{
                background: tileBg(v),
                color: v >= 128 ? "#1a1a1a" : "#f5f5f5",
                boxShadow: v >= 128 ? "0 0 18px rgba(255,221,0,0.35)" : "none",
                textShadow: v && v < 128 ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
              }}
            >
              {v || ""}
            </div>
          ))}
        </div>

        {over && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Игра окончена!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-yellow">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}

        {won && !over && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-yellow mb-1">Вы собрали 2048!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-yellow">{score}</strong></p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setContinued(true)} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Продолжить</button>
                <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-green active:scale-95">Новая игра</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--text-muted)] text-center">Стрелки или WASD — двигать плитки</div>

      <div className="grid grid-cols-3 gap-2 mt-1 select-none touch-none">
        <div />
        <button onTouchStart={(e) => { e.preventDefault(); doMove("up"); }} onPointerDown={(e) => { e.preventDefault(); doMove("up"); }}
          className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-yellow)] active:scale-90 transition-all">↑</button>
        <div />
        <button onTouchStart={(e) => { e.preventDefault(); doMove("left"); }} onPointerDown={(e) => { e.preventDefault(); doMove("left"); }}
          className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-yellow)] active:scale-90 transition-all">←</button>
        <button onTouchStart={(e) => { e.preventDefault(); doMove("down"); }} onPointerDown={(e) => { e.preventDefault(); doMove("down"); }}
          className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-yellow)] active:scale-90 transition-all">↓</button>
        <button onTouchStart={(e) => { e.preventDefault(); doMove("right"); }} onPointerDown={(e) => { e.preventDefault(); doMove("right"); }}
          className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-yellow)] active:scale-90 transition-all">→</button>
      </div>
    </div>
  );
}
