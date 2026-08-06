import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 360;
const CANVAS_H = 520;
const ROWS = 9;
const ROW_H = 48;
const FROG_R = 14;

type Vehicle = { x: number; dir: number; speed: number; color: string };
type Log = { x: number; dir: number; speed: number };
type RowCarrier = { vehicles?: Vehicle[]; logs?: Log[] };

export default function Frogger() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_frogger_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lives, setLives] = useState(3);

  const stateRef = useRef({
    frog: { x: CANVAS_W / 2, y: CANVAS_H - ROW_H / 2, row: 8 },
    rows: [] as RowCarrier[],
    running: false,
    over: false,
    lives: 3,
    homes: [] as boolean[],
    homeTimer: 0,
    moved: false,
  });

  const centerY = (row: number) => row * ROW_H + ROW_H / 2;

  const initRows = useCallback(() => {
    const rows: RowCarrier[] = [];
    const roadColors = ["#ff3355", "#ffdd00", "#ff2d95", "#9b59b6"];
    for (let r = 0; r < 4; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      const speed = 2.2 + (r % 2) * 1.6;
      const vehicles: Vehicle[] = [];
      for (let i = 0; i < 4; i++) vehicles.push({ x: (CANVAS_W / 4) * i + (i % 2) * 20, dir, speed, color: roadColors[r] });
      rows.push({ vehicles });
    }
    for (let r = 0; r < 4; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      const speed = 1.4 + (r % 2) * 1.0;
      const logs: Log[] = [];
      for (let i = 0; i < 4; i++) logs.push({ x: (CANVAS_W / 4) * i + (i % 2) * 40, dir, speed });
      rows.push({ logs });
    }
    rows.push({});
    stateRef.current.rows = rows;
  }, []);

  useEffect(() => { initRows(); }, [initRows]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.frog = { x: CANVAS_W / 2, y: CANVAS_H - ROW_H / 2, row: 8 };
    s.running = true;
    s.over = false;
    s.lives = 3;
    s.homes = [false, false, false, false, false];
    s.homeTimer = 0;
    s.moved = false;
    initRows();
    setLives(3); setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, [initRows]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_frogger_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("frogger", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const die = useCallback(() => {
    const s = stateRef.current;
    if (s.homeTimer > 0) return;
    s.lives--;
    setLives(s.lives);
    if (s.lives <= 0) {
      s.over = true;
      s.running = false;
      setGameOver(true);
    } else {
      s.frog = { x: CANVAS_W / 2, y: CANVAS_H - ROW_H / 2, row: 8 };
    }
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    const s = stateRef.current;
    if (!s.running || s.over || s.homeTimer > 0) return;
    s.moved = true;
    const frog = s.frog;
    frog.x = Math.max(16, Math.min(CANVAS_W - 16, frog.x + dx));
    const newRow = Math.max(0, Math.min(8, frog.row + dy));
    if (newRow !== frog.row) {
      frog.row = newRow;
      frog.y = centerY(newRow);
      setScore(sc => sc + 10);
    }
    if (frog.row === 0) {
      const slot = Math.floor(frog.x / (CANVAS_W / 5));
      if (slot >= 0 && slot < 5 && !s.homes[slot]) {
        s.homes[slot] = true;
        setScore(sc => sc + 50);
        s.homeTimer = 40;
        setTimeout(() => {
          s.homeTimer = 0;
          s.frog = { x: CANVAS_W / 2, y: CANVAS_H - ROW_H / 2, row: 8 };
        }, 600);
      }
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keyMap: Record<string, [number, number]> = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-30, 0], a: [-30, 0], A: [-30, 0],
        ArrowRight: [30, 0], d: [30, 0], D: [30, 0],
      };
      const combo = keyMap[e.key];
      if (!combo) return;
      e.preventDefault();
      if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
      move(combo[0], combo[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  useEffect(() => {
    const s = stateRef.current;
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (let r = 0; r < ROWS; r++) {
        const y = r * ROW_H;
        const isRoad = r < 4;
        const isRiver = r >= 4 && r < 8;
        ctx.fillStyle = isRiver ? "rgba(0,120,180,0.18)" : isRoad ? "rgba(255,51,85,0.04)" : "rgba(0,255,136,0.06)";
        ctx.fillRect(0, y, CANVAS_W, ROW_H);
      }

      if (s.running && !s.over) {
        for (const row of s.rows) {
          if (row.vehicles) {
            for (const v of row.vehicles) {
              v.x += v.dir * v.speed;
              if (v.dir > 0 && v.x > CANVAS_W + 30) v.x = -30;
              if (v.dir < 0 && v.x < -30) v.x = CANVAS_W + 30;
            }
          }
          if (row.logs) {
            for (const l of row.logs) {
              l.x += l.dir * l.speed;
              if (l.dir > 0 && l.x > CANVAS_W + 40) l.x = -40;
              if (l.dir < 0 && l.x < -40) l.x = CANVAS_W + 40;
            }
          }
        }

        const frog = s.frog;
        const rowData = s.rows[frog.row];
        if (frog.row < 4 && rowData?.vehicles) {
          for (const v of rowData.vehicles) {
            if (Math.abs(v.x - frog.x) < 18 && Math.abs(frog.y - centerY(frog.row)) < 20) { die(); break; }
          }
        } else if (frog.row >= 4 && frog.row < 8 && rowData?.logs) {
          let onLog = false;
          for (const l of rowData.logs) {
            if (frog.x > l.x - 30 && frog.x < l.x + 30) {
              frog.x += l.dir * l.speed;
              frog.x = Math.max(16, Math.min(CANVAS_W - 16, frog.x));
              onLog = true;
              break;
            }
          }
          if (!onLog) die();
        }
      }

      for (let i = 0; i < s.rows.length; i++) {
        const row = s.rows[i];
        if (row.logs) {
          for (const l of row.logs) {
            ctx.fillStyle = "#7a5a2a";
            ctx.shadowColor = "#7a5a2a";
            ctx.shadowBlur = 6;
            ctx.fillRect(l.x - 30, i * ROW_H + 8, 60, ROW_H - 16);
            ctx.fillStyle = "#a07a3a";
            ctx.fillRect(l.x - 28, i * ROW_H + 12, 56, 5);
            ctx.shadowBlur = 0;
          }
        }
        if (row.vehicles) {
          for (const v of row.vehicles) {
            ctx.fillStyle = v.color;
            ctx.shadowColor = v.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(v.x - 16, i * ROW_H + 8, 32, ROW_H - 16);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillRect(v.x - 10, i * ROW_H + 16, 5, 8);
            ctx.fillRect(v.x + 5, i * ROW_H + 16, 5, 8);
            ctx.shadowBlur = 0;
          }
        }
      }

      // homes
      for (let slot = 0; slot < 5; slot++) {
        const hx = slot * (CANVAS_W / 5) + CANVAS_W / 10;
        if (s.homes[slot]) {
          ctx.fillStyle = "#00ff88";
          ctx.shadowColor = "#00ff88";
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(hx, centerY(0), 14, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = "rgba(0,255,136,0.3)";
          ctx.lineWidth = 2;
          ctx.strokeRect(hx - 14, centerY(0) - 14, 28, 28);
        }
      }

      const frog = s.frog;
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(frog.x, frog.y, FROG_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a1a";
      ctx.beginPath();
      ctx.arc(frog.x + 5, frog.y - 2, 3, 0, Math.PI * 2);
      ctx.arc(frog.x - 5, frog.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [die]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[360px] gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Очки</div>
            <div className="font-bold neon-text-green text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Жизни</div>
            <div className="font-bold text-lg leading-tight" style={{ color: "var(--neon-pink)" }}>{"❤".repeat(Math.max(0, lives))}<span className="opacity-20">{"❤".repeat(Math.max(0, 3 - lives))}</span></div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Рекорд</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{best}</div>
          </div>
        </div>
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all active:scale-95">Новая игра</button>
      </div>

      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(360px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full" />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Frogger</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Стрелки — движение · перебеги дорогу и реку</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Игра окончена!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-1 select-none touch-none">
        <div />
        <button onPointerDown={(e) => { e.preventDefault(); if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); } move(0, -1); }}
          className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-green)] active:scale-90 transition-all">↑</button>
        <div />
        <button onPointerDown={(e) => { e.preventDefault(); move(-30, 0); }} className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-blue)] active:scale-90 transition-all">←</button>
        <button onPointerDown={(e) => { e.preventDefault(); move(0, 1); }} className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-pink)] active:scale-90 transition-all">↓</button>
        <button onPointerDown={(e) => { e.preventDefault(); move(30, 0); }} className="w-14 h-11 glass rounded-xl flex items-center justify-center text-lg text-[var(--neon-blue)] active:scale-90 transition-all">→</button>
      </div>
    </div>
  );
}
