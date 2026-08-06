import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 520;
const GRAVITY = 0.5;
const JUMP_V = -12;
const PLATFORM_H = 14;

type Platform = { x: number; y: number; w: number };

export default function DoodleJump() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_doodlejump_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    player: { x: CANVAS_W / 2, y: CANVAS_H - 90, vx: 0, vy: -12, w: 28, h: 28 },
    platforms: [] as Platform[],
    keys: { left: false, right: false },
    running: false,
    over: false,
    maxY: CANVAS_H - 90,
    jumpBonus: 0,
  });

  const genPlatforms = useCallback((above: number) => {
    const s = stateRef.current;
    const list: Platform[] = [];
    for (let y = CANVAS_H - 60; y > above; y -= 64) {
      list.push({
        x: 20 + Math.random() * (CANVAS_W - 100),
        y: y + Math.random() * 26,
        w: 62 + Math.random() * 30,
      });
    }
    s.platforms = list;
  }, []);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.player = { x: CANVAS_W / 2, y: CANVAS_H - 90, vx: 0, vy: -12, w: 28, h: 28 };
    s.keys = { left: false, right: false };
    s.over = false;
    s.running = true;
    s.maxY = CANVAS_H - 90;
    s.jumpBonus = 0;
    genPlatforms(0);
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, [genPlatforms]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_doodlejump_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("doodle-jump", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, []);

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
      ctx.strokeStyle = "rgba(255,45,149,0.05)";
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke();
      }

      if (s.running && !s.over) {
        const p = s.player;
        if (s.keys.left) { p.vx = -5; } else if (s.keys.right) { p.vx = 5; } else { p.vx = 0; }
        p.x += p.vx;
        if (p.x < -p.w / 2) p.x = CANVAS_W - p.w / 2;
        if (p.x > CANVAS_W + p.w / 2) p.x = -p.w / 2;

        p.vy += GRAVITY;
        p.y += p.vy;

        // Ground death
        if (p.y > CANVAS_H - p.h) {
          s.over = true;
          s.running = false;
          setGameOver(true);
        }

        // Landing
        if (p.vy > 0) {
          for (const pl of s.platforms) {
            if (
              p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w &&
              p.y + p.h >= pl.y && p.y + p.h <= pl.y + PLATFORM_H + 12
            ) {
              p.vy = JUMP_V;
              p.y = pl.y - p.h;
              break;
            }
          }
        }

        // Scroll up
        if (p.y < s.maxY) {
          const diff = s.maxY - p.y;
          s.maxY = p.y;
          setScore(sc => sc + Math.floor(diff * 2));
          for (const pl of s.platforms) pl.y += diff;
          while (s.platforms.some(pl => pl.y > CANVAS_H + 20)) {
            const lowest = Math.max(...s.platforms.map(pl => pl.y));
            const idx = s.platforms.findIndex(pl => pl.y === lowest);
            s.platforms.splice(idx, 1);
            s.platforms.push({ x: 20 + Math.random() * (CANVAS_W - 100), y: Math.min(...s.platforms.map(pl => pl.y)) - 64, w: 62 + Math.random() * 30 });
          }
          if (s.platforms.length < 9) {
            const top = Math.min(...s.platforms.map(pl => pl.y));
            s.platforms.push({ x: 20 + Math.random() * (CANVAS_W - 100), y: top - 64, w: 62 + Math.random() * 30 });
          }
        }

        // Fall below current platforms
        if (p.y > Math.max(...s.platforms.map(pl => pl.y)) + 120) {
          s.over = true;
          s.running = false;
          setGameOver(true);
        }
      }

      // Draw platforms
      for (const pl of s.platforms) {
        ctx.fillStyle = "#9b59b6";
        ctx.shadowColor = "#9b59b6";
        ctx.shadowBlur = 8;
        ctx.fillRect(pl.x, pl.y, pl.w, PLATFORM_H);
        ctx.fillStyle = "#00f3ff";
        ctx.fillRect(pl.x, pl.y, pl.w, 3);
      }

      // Draw player
      const p = s.player;
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a1a";
      ctx.beginPath();
      ctx.arc(p.x + 5, p.y - 3, 3.5, 0, Math.PI * 2);
      ctx.arc(p.x - 5, p.y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[400px] gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Очки</div>
            <div className="font-bold neon-text-green text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Рекорд</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{best}</div>
          </div>
        </div>
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all active:scale-95">Новая игра</button>
      </div>

      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(400px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full" />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Doodle Jump</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">← → — движение · прыгай по платформам</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Упал!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-[400px] select-none touch-none">
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }} onPointerLeave={() => { stateRef.current.keys.left = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">←</button>
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }} onPointerLeave={() => { stateRef.current.keys.right = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">→</button>
      </div>
    </div>
  );
}
