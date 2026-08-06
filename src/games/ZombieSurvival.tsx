import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 480;

type Zombie = { x: number; y: number; hp: number; speed: number; wobble: number };

export default function ZombieSurvival() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_zombie_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lives, setLives] = useState(3);

  const stateRef = useRef({
    zombies: [] as Zombie[],
    running: false,
    over: false,
    spawn: 0,
    lives: 3,
    lastHit: 0,
  });

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_zombie_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("zombie-survival", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.zombies = [];
    s.over = false;
    s.running = true;
    s.spawn = 0;
    s.lives = 3;
    s.lastHit = 0;
    setScore(0); setLives(3); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  const shoot = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.over) return;
    const canvas = e.currentTarget;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (CANVAS_W / r.width);
    const y = (e.clientY - r.top) * (CANVAS_H / r.height);
    let hit = false;
    for (let i = s.zombies.length - 1; i >= 0; i--) {
      const z = s.zombies[i];
      if (Math.hypot(z.x - x, z.y - y) < 24) {
        z.hp--;
        hit = true;
        if (z.hp <= 0) {
          s.zombies.splice(i, 1);
          setScore(p => p + 10);
        }
        break;
      }
    }
    if (!hit) {
      // miss counts too — keep alive
    }
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
      ctx.strokeStyle = "rgba(255,51,85,0.06)";
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke();
      }

      if (s.running && !s.over) {
        // spawn
        s.spawn--;
        if (s.spawn <= 0) {
          s.spawn = Math.max(18, 48 - Math.floor(score / 40));
          const edge = Math.floor(Math.random() * 4);
          const speed = 0.7 + Math.random() * 1.1 + Math.floor(score / 60) * 0.08;
          let x = 0, y = 0;
          if (edge === 0) { x = Math.random() * CANVAS_W; y = -20; }
          else if (edge === 1) { x = Math.random() * CANVAS_W; y = CANVAS_H + 20; }
          else if (edge === 2) { x = -20; y = Math.random() * CANVAS_H; }
          else { x = CANVAS_W + 20; y = Math.random() * CANVAS_H; }
          s.zombies.push({ x, y, hp: 2, speed, wobble: Math.random() * 10 });
        }

        // move to center
        for (const z of s.zombies) {
          const ang = Math.atan2(CANVAS_H / 2 - z.y, CANVAS_W / 2 - z.x);
          z.x += Math.cos(ang) * z.speed;
          z.y += Math.sin(ang) * z.speed;
        }

        // collision with center
        for (let i = s.zombies.length - 1; i >= 0; i--) {
          const z = s.zombies[i];
          if (Math.hypot(z.x - CANVAS_W / 2, z.y - CANVAS_H / 2) < 20) {
            s.zombies.splice(i, 1);
            if (Date.now() - s.lastHit > 900) {
              s.lastHit = Date.now();
              s.lives--;
              setLives(s.lives);
              if (s.lives <= 0) {
                s.over = true;
                s.running = false;
                setGameOver(true);
              }
            }
          }
        }
      }

      // draw center base
      ctx.fillStyle = "#00f3ff";
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a1a";
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, CANVAS_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();

      // draw zombies
      for (const z of s.zombies) {
        const bob = Math.sin(z.wobble + z.x * 0.1) * 2;
        ctx.fillStyle = "#3a7d44";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(z.x, z.y + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#9b59b6";
        ctx.beginPath();
        ctx.arc(z.x, z.y - 4 + bob, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff3355";
        ctx.beginPath();
        ctx.arc(z.x - 3, z.y - 5 + bob, 1.8, 0, Math.PI * 2);
        ctx.arc(z.x + 3, z.y - 5 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[400px] gap-3">
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

      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(400px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          className="block w-full cursor-crosshair"
          onClick={(e) => {
            if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
            shoot(e as unknown as React.PointerEvent<HTMLCanvasElement>);
          }}
          onPointerDown={(e) => { if (stateRef.current.running) shoot(e); }}
        />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Zombie Survival</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Кликай по зомби · защищай базу</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">База пала!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Убито: <strong className="neon-text-green">{Math.floor(score / 10)}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--text-muted)]">Нажми на канвас и стреляй по зомби</div>
    </div>
  );
}
