import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 520;
const FUEL_DRAIN = 0.012;
const ROCKET_W = 26;
const ROCKET_H = 40;

type Obstacle = { x: number; y: number; w: number; h: number };

export default function RocketEscape() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_rocketescape_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fuel, setFuel] = useState(1);

  const stateRef = useRef({
    rocket: { x: CANVAS_W / 2, y: CANVAS_H - 90, vy: 0, tilt: 0 },
    obstacles: [] as Obstacle[],
    keys: { left: false, right: false },
    holding: false,
    running: false,
    over: false,
    fuel: 1,
    speed: 0,
    fuelCell: 0,
  });

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_rocketescape_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("rocket-escape", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.rocket = { x: CANVAS_W / 2, y: CANVAS_H - 90, vy: 0, tilt: 0 };
    s.obstacles = [];
    s.keys = { left: false, right: false };
    s.holding = false;
    s.over = false;
    s.running = true;
    s.fuel = 1;
    s.speed = 2.4;
    s.fuelCell = 0;
    setScore(0); setFuel(1); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
        stateRef.current.holding = true;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") stateRef.current.holding = false;
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
      ctx.strokeStyle = "rgba(0,243,255,0.05)";
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke();
      }

      if (s.running && !s.over) {
        const r = s.rocket;
        // horizontal
        if (s.keys.left) { r.x -= 6; r.tilt = -0.3; } else if (s.keys.right) { r.x += 6; r.tilt = 0.3; } else { r.tilt = 0; }
        r.x = Math.max(ROCKET_W / 2, Math.min(CANVAS_W - ROCKET_W / 2, r.x));
        s.speed = Math.min(5.2, s.speed + 0.006);

        if (s.holding && s.fuel > 0) {
          r.vy = Math.max(r.vy - 0.42, -6.5);
          s.fuel = Math.max(0, s.fuel - FUEL_DRAIN);
          setFuel(s.fuel);
        } else {
          r.vy = Math.min(r.vy + 0.35, 5.5);
        }
        r.y += r.vy;
        s.fuel = Math.min(1, s.fuel + 0.35 / 120);
        if (s.fuelCell <= 0) { s.fuelCell = 120; }
        s.fuelCell--;

        // obstacles
        if (Math.random() < 0.018) {
          const gap = 130;
          const ox = Math.random() < 0.5 ? -30 : CANVAS_W + 30;
          s.obstacles.push({ x: ox, y: CANVAS_H + 40, w: 34, h: 60 });
        }
        for (const o of s.obstacles) o.y -= s.speed;
        s.obstacles = s.obstacles.filter(o => o.y > -80);

        // collision
        for (const o of s.obstacles) {
          if (
            r.x - ROCKET_W / 2 < o.x + o.w / 2 && r.x + ROCKET_W / 2 > o.x - o.w / 2 &&
            r.y - ROCKET_H / 2 < o.y + o.h / 2 && r.y + ROCKET_H / 2 > o.y - o.h / 2
          ) {
            s.over = true; s.running = false; setGameOver(true);
          }
        }

        if (r.y < 30) {
          setScore(sc => sc + 1);
          r.y = CANVAS_H - 60;
        }
      }

      // draw obstacles
      for (const o of s.obstacles) {
        ctx.fillStyle = "#ff3355";
        ctx.shadowColor = "#ff3355";
        ctx.shadowBlur = 10;
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        ctx.fillStyle = "#ffdd00";
        ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, 6, o.h);
      }

      // draw rocket
      const r = s.rocket;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.tilt);
      ctx.fillStyle = "#f5f5f5";
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-ROCKET_W / 2, 12);
      ctx.lineTo(ROCKET_W / 2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff2d95";
      ctx.fillRect(-5, 6, 10, 12);
      if (s.holding && s.fuel > 0) {
        ctx.fillStyle = "#ffdd00";
        ctx.shadowColor = "#ffdd00";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-5, 18);
        ctx.lineTo(0, 30 + Math.random() * 8);
        ctx.lineTo(5, 18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Высота</div>
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
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          className="block w-full"
          onPointerDown={(e) => { e.preventDefault(); stateRef.current.holding = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.holding = false; }}
          onPointerLeave={() => { stateRef.current.holding = false; }}
          onTouchStart={(e) => { e.preventDefault(); stateRef.current.holding = true; stateRef.current.running = true; setStarted(true); }}
          onTouchEnd={(e) => { e.preventDefault(); stateRef.current.holding = false; }}
        >
        </canvas>
        <div className="absolute bottom-2 left-2 right-2 bg-black/40 rounded-lg px-3 py-1">
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((stateRef.current.fuel > 0 ? stateRef.current.fuel : 0) * 100)}%`,
                background: stateRef.current.fuel < 0.3 ? "linear-gradient(90deg,#ff3355,#ff2d95)" : "linear-gradient(90deg,#00f3ff,#00ff88)" }} />
          </div>
        </div>
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Rocket Escape</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Удерживай — лететь вверх · ← → — уклоняйся</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Взрыв!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Высота: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-[400px] select-none touch-none">
        <button
          onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }} onPointerLeave={() => { stateRef.current.keys.left = false; }}
          onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">←</button>
        <button
          onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }} onPointerLeave={() => { stateRef.current.keys.right = false; }}
          onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">→</button>
      </div>
    </div>
  );
}