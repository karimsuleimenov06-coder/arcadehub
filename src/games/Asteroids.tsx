import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 480;

type Vec = { x: number; y: number };
type Asteroid = { x: number; y: number; vx: number; vy: number; r: number };
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };

export default function Asteroids() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_asteroids_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    ship: { x: CANVAS_W / 2, y: CANVAS_H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, r: 12 },
    asteroids: [] as Asteroid[],
    bullets: [] as Bullet[],
    keys: { left: false, right: false, up: false },
    running: false,
    over: false,
    cooldown: 0,
  });

  const spawnAsteroid = useCallback((count: number) => {
    const s = stateRef.current;
    const asteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.max(CANVAS_W, CANVAS_H) / 2 + 30;
      const cx = CANVAS_W / 2 + Math.cos(ang) * dist;
      const cy = CANVAS_H / 2 + Math.sin(ang) * dist;
      const spd = 0.6 + Math.random() * 1.4;
      const a = Math.random() * Math.PI * 2;
      asteroids.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 18 + Math.random() * 16 });
    }
    s.asteroids = asteroids;
  }, []);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.ship = { x: CANVAS_W / 2, y: CANVAS_H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, r: 12 };
    s.bullets = [];
    s.over = false;
    s.running = true;
    spawnAsteroid(5);
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, [spawnAsteroid]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_asteroids_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("asteroids", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const fire = useCallback(() => {
    const s = stateRef.current;
    if (s.over || s.cooldown > 0) return;
    s.cooldown = 12;
    const spd = 8;
    s.bullets.push({
      x: s.ship.x + Math.cos(s.ship.angle) * 14,
      y: s.ship.y + Math.sin(s.ship.angle) * 14,
      vx: Math.cos(s.ship.angle) * spd,
      vy: Math.sin(s.ship.angle) * spd,
      life: 60,
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") stateRef.current.keys.up = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (!stateRef.current.running) { stateRef.current.running = true; spawnAsteroid(5); setStarted(true); return; }
        fire();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") stateRef.current.keys.up = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, [fire, spawnAsteroid]);

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

      ctx.strokeStyle = "rgba(0,255,136,0.06)";
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke();
      }

      if (s.running && !s.over) {
        const rot = 0.05;
        if (s.keys.left) s.ship.angle -= rot;
        if (s.keys.right) s.ship.angle += rot;
        if (s.keys.up) {
          const thrust = 0.22;
          s.ship.vx += Math.cos(s.ship.angle) * thrust;
          s.ship.vy += Math.sin(s.ship.angle) * thrust;
          ctx.fillStyle = "#ffdd00";
          ctx.beginPath();
          ctx.moveTo(s.ship.x - Math.cos(s.ship.angle) * 14, s.ship.y - Math.sin(s.ship.angle) * 14);
          ctx.lineTo(s.ship.x - Math.cos(s.ship.angle - 0.5) * 8, s.ship.y - Math.sin(s.ship.angle - 0.5) * 8);
          ctx.lineTo(s.ship.x - Math.cos(s.ship.angle + 0.5) * 8, s.ship.y - Math.sin(s.ship.angle + 0.5) * 8);
          ctx.closePath();
          ctx.fill();
        }
        const maxSpd = 5.5;
        const m = Math.hypot(s.ship.vx, s.ship.vy);
        if (m > maxSpd) { s.ship.vx = (s.ship.vx / m) * maxSpd; s.ship.vy = (s.ship.vy / m) * maxSpd; }
        s.ship.x = (s.ship.x + s.ship.vx + CANVAS_W) % CANVAS_W;
        s.ship.y = (s.ship.y + s.ship.vy + CANVAS_H) % CANVAS_H;

        if (s.cooldown > 0) s.cooldown--;

        for (const b of s.bullets) {
          b.x += b.vx;
          b.y += b.vy;
          b.life--;
          b.x = (b.x + CANVAS_W) % CANVAS_W;
          b.y = (b.y + CANVAS_H) % CANVAS_H;
        }
        s.bullets = s.bullets.filter(b => b.life > 0);

        for (const a of s.asteroids) {
          a.x += a.vx;
          a.y += a.vy;
          a.x = (a.x + CANVAS_W) % CANVAS_W;
          a.y = (a.y + CANVAS_H) % CANVAS_H;
        }

        for (const b of s.bullets) {
          for (let i = s.asteroids.length - 1; i >= 0; i--) {
            const a = s.asteroids[i];
            if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + 3) {
              s.asteroids.splice(i, 1);
              s.bullets = s.bullets.filter(x => x !== b);
              if (a.r > 12) {
                for (let k = 0; k < 2; k++) {
                  const na = Math.random() * Math.PI * 2;
                  const spd = 1 + Math.random() * 2;
                  s.asteroids.push({ x: a.x, y: a.y, vx: Math.cos(na) * spd, vy: Math.sin(na) * spd, r: a.r / 2 });
                }
              }
              const pts = a.r > 20 ? 20 : a.r > 12 ? 50 : 100;
              setScore(p => p + pts);
              break;
            }
          }
        }

        for (const a of s.asteroids) {
          if (Math.hypot(a.x - s.ship.x, a.y - s.ship.y) < a.r + s.ship.r) {
            s.over = true;
            s.running = false;
            setGameOver(true);
            break;
          }
        }

        if (s.asteroids.length === 0) {
          spawnAsteroid(6);
        }
      }

      // Draw bullets
      ctx.fillStyle = "#00f3ff";
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 6;
      for (const b of s.bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw asteroids
      for (const a of s.asteroids) {
        ctx.strokeStyle = "#ff2d95";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ff2d95";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2;
          const rr = a.r * (0.8 + 0.2 * Math.sin(i * 3.7 + a.x));
          const px = a.x + Math.cos(ang) * rr;
          const py = a.y + Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw ship
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(s.ship.x + Math.cos(s.ship.angle) * 16, s.ship.y + Math.sin(s.ship.angle) * 16);
      ctx.lineTo(s.ship.x + Math.cos(s.ship.angle + 2.4) * 12, s.ship.y + Math.sin(s.ship.angle + 2.4) * 12);
      ctx.lineTo(s.ship.x + Math.cos(s.ship.angle - 2.4) * 12, s.ship.y + Math.sin(s.ship.angle - 2.4) * 12);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spawnAsteroid]);

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
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full"
          onClick={() => {
            if (!stateRef.current.running) { stateRef.current.running = true; spawnAsteroid(5); setStarted(true); return; }
            fire();
          }}
        />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Asteroids</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">← → — поворот · ↑ — тяга · Пробел / клик — выстрел</p>
              <button onClick={() => { stateRef.current.running = true; spawnAsteroid(5); setStarted(true); }} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Корабль уничтожен!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-[400px] select-none touch-none">
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; spawnAsteroid(5); setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }} onPointerLeave={() => { stateRef.current.keys.left = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">⟲</button>
        <button onPointerDown={(e) => { e.preventDefault(); if (!stateRef.current.running) { stateRef.current.running = true; spawnAsteroid(5); setStarted(true); } stateRef.current.keys.up = true; }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.up = false; }} onPointerLeave={() => { stateRef.current.keys.up = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-green)] active:scale-95 transition-all">▲</button>
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; spawnAsteroid(5); setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }} onPointerLeave={() => { stateRef.current.keys.right = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">⟳</button>
        <button onPointerDown={(e) => { e.preventDefault(); if (!stateRef.current.running) { stateRef.current.running = true; spawnAsteroid(5); setStarted(true); } fire(); }}
          className="flex-1 py-3 glass rounded-xl text-sm neon-text-pink font-bold active:scale-95 transition-all">FIRE</button>
      </div>
    </div>
  );
}
