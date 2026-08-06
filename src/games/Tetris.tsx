import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const COLS = 10;
const ROWS = 20;
const CELL = 22;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

type Piece = { shape: number[][]; color: string; x: number; y: number };
type Grid = (string | null)[][];

const PIECES: { shape: number[][]; color: string }[] = [
  { shape: [[1,1,1,1]], color: "#00f3ff" },
  { shape: [[1,0,0],[1,1,1]], color: "#ff2d95" },
  { shape: [[0,0,1],[1,1,1]], color: "#9b59b6" },
  { shape: [[1,1],[1,1]], color: "#ffdd00" },
  { shape: [[0,1,1],[1,1,0]], color: "#00ff88" },
  { shape: [[0,1,0],[1,1,1]], color: "#ff3355" },
  { shape: [[1,1,0],[0,1,1]], color: "#00f3ff" },
];

function rotate(shape: number[][]): number[][] {
  const rows = shape.length, cols = shape[0].length;
  const r: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) r[x][rows - 1 - y] = shape[y][x];
  return r;
}

function collides(grid: Grid, shape: number[][], px: number, py: number): boolean {
  for (let y = 0; y < shape.length; y++)
    for (let x = 0; x < shape[y].length; x++)
      if (shape[y][x]) {
        const gx = px + x, gy = py + y;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && grid[gy][gx]) return true;
      }
  return false;
}

function lock(grid: Grid, piece: Piece): Grid {
  const g = grid.map(r => [...r]);
  piece.shape.forEach((row, y) =>
    row.forEach((v, x) => { if (v && piece.y + y >= 0) g[piece.y + y][piece.x + x] = piece.color; })
  );
  return g;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const g = grid.filter(r => r.some(c => !c));
  const cleared = ROWS - g.length;
  while (g.length < ROWS) g.unshift(Array(COLS).fill(null));
  return { grid: g, cleared };
}

export default function Tetris() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_tetris_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lines, setLines] = useState(0);

  const stateRef = useRef({
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)) as Grid,
    piece: null as Piece | null,
    running: false,
    over: false,
    tick: 0,
    speed: 40,
    score: 0,
    linesCleared: 0,
  });

  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem("arcadehub_tetris_best", String(score)); } catch {} }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("tetris", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const spawn = useCallback(() => {
    const s = stateRef.current;
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    const piece = { ...p, shape: p.shape.map(r => [...r]), x: Math.floor((COLS - p.shape[0].length) / 2), y: -1 };
    if (collides(s.grid, piece.shape, piece.x, piece.y + 1)) {
      s.over = true; s.running = false; setGameOver(true);
    }
    s.piece = piece;
  }, []);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    s.tick = 0; s.speed = 40; s.score = 0; s.linesCleared = 0; s.over = false; s.running = true;
    spawn();
    setScore(0); setLines(0); setGameOver(false); setSaved(false); setStarted(true);
  }, [spawn]);

  const movePiece = useCallback((dx: number) => {
    const s = stateRef.current;
    if (!s.piece || s.over) return;
    const nx = s.piece.x + dx;
    if (!collides(s.grid, s.piece.shape, nx, s.piece.y)) s.piece.x = nx;
  }, []);

  const rotatePiece = useCallback(() => {
    const s = stateRef.current;
    if (!s.piece || s.over) return;
    const rs = rotate(s.piece.shape);
    if (!collides(s.grid, rs, s.piece.x, s.piece.y)) s.piece.shape = rs;
  }, []);

  const hardDrop = useCallback(() => {
    const s = stateRef.current;
    if (!s.piece || s.over) return;
    while (!collides(s.grid, s.piece.shape, s.piece.x, s.piece.y + 1)) s.piece.y++;
    s.grid = lock(s.grid, s.piece);
    const { grid, cleared } = clearLines(s.grid);
    s.grid = grid;
    const pts = [0, 100, 300, 500, 800][cleared] || 0;
    s.score += pts;
    s.linesCleared += cleared;
    s.speed = Math.max(6, 40 - Math.floor(s.linesCleared / 10) * 4);
    setScore(s.score); setLines(s.linesCleared);
    spawn();
  }, [spawn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!stateRef.current.running) {
        if (e.code === "Space") { restart(); return; }
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); movePiece(-1); }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); movePiece(1); }
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); rotatePiece(); }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); hardDrop(); }
      if (e.code === "Space") { e.preventDefault(); hardDrop(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart, movePiece, rotatePiece, hardDrop]);

  useEffect(() => {
    const s = stateRef.current;
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (s.running && !s.over) {
        s.tick++;
        if (s.tick >= s.speed) {
          s.tick = 0;
          if (s.piece) {
            if (!collides(s.grid, s.piece.shape, s.piece.x, s.piece.y + 1)) {
              s.piece.y++;
            } else {
              s.grid = lock(s.grid, s.piece);
              const { grid, cleared } = clearLines(s.grid);
              s.grid = grid;
              const pts = [0, 100, 300, 500, 800][cleared] || 0;
              s.score += pts;
              s.linesCleared += cleared;
              s.speed = Math.max(6, 40 - Math.floor(s.linesCleared / 10) * 4);
              setScore(s.score); setLines(s.linesCleared);
              spawn();
            }
          }
        }
      }

      // draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CANVAS_H); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(CANVAS_W, y * CELL); ctx.stroke(); }

      // grid
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (s.grid[y][x]) {
            ctx.fillStyle = s.grid[y][x]!;
            ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
          }

      // current piece
      if (s.piece) {
        s.piece.shape.forEach((row, y) =>
          row.forEach((v, x) => {
            if (v) {
              ctx.fillStyle = s.piece!.color;
              ctx.shadowColor = s.piece!.color;
              ctx.shadowBlur = 8;
              ctx.fillRect((s.piece!.x + x) * CELL + 1, (s.piece!.y + y) * CELL + 1, CELL - 2, CELL - 2);
            }
          })
        );
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spawn]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[280px] gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Очки</div>
            <div className="font-bold neon-text-green text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Линии</div>
            <div className="font-bold neon-text-blue text-lg leading-tight">{lines}</div>
          </div>
        </div>
        <button onClick={restart} className="px-3 py-1.5 glass rounded-lg text-xs neon-text-blue active:scale-95">Новая</button>
      </div>
      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(240px, calc(100vw - 60px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full" />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-5 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Тетрис</p>
              <p className="text-[10px] text-[var(--text-secondary)] mb-3">← → — сдвиг · ↑ — поворот · ↓ — сброс</p>
              <button onClick={restart} className="px-5 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-5 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Игра окончена!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Очки: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-5 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 select-none touch-none">
        <div />
        <button onPointerDown={(e) => { e.preventDefault(); if (!stateRef.current.running) restart(); rotatePiece(); }}
          className="w-12 h-10 glass rounded-lg flex items-center justify-center text-sm text-[var(--neon-blue)] active:scale-90">↻</button>
        <div />
        <button onPointerDown={(e) => { e.preventDefault(); movePiece(-1); }}
          className="w-12 h-10 glass rounded-lg flex items-center justify-center text-sm text-[var(--neon-blue)] active:scale-90">←</button>
        <button onPointerDown={(e) => { e.preventDefault(); hardDrop(); }}
          className="w-12 h-10 glass rounded-lg flex items-center justify-center text-xs neon-text-green active:scale-90">DROP</button>
        <button onPointerDown={(e) => { e.preventDefault(); movePiece(1); }}
          className="w-12 h-10 glass rounded-lg flex items-center justify-center text-sm text-[var(--neon-blue)] active:scale-90">→</button>
      </div>
    </div>
  );
}
