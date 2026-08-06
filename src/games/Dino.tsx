import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 300;
const GROUND_Y = 250;
const DINO_X = 60;
const DINO_W = 44;
const DINO_H = 48;

type Obstacle = { x: number; type: "cactus" | "ptero"; h: number; w: number };

export default function Dino() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_dino_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    dinoY: GROUND_Y - DINO_H,
    dinoVy: 0,
    jumping: false,
    obstacles: [] as Obstacle[],
    speed: 6,
    spawn: 0,
    running: false,
    over: false,
    frame: 0,
    blinkTimer: 0,
  });

  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem("arcadehub_dino_best", String(score)); } catch {} }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("dino", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.dinoY = GROUND_Y - DINO_H;
    s.dinoVy = 0;
    s.jumping = false;
    s.obstacles = [];
    s.speed = 6;
    s.spawn = 0;
    s.over = false;
    s.running = true;
    s.frame = 0;
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) { restart(); return; }
    if (!s.jumping) { s.dinoVy = -12; s.jumping = true; }
  }, [restart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault(); jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

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

      // ground
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 4); ctx.lineTo(CANVAS_W, GROUND_Y + 4); ctx.stroke();

      if (s.running && !s.over) {
        s.speed = Math.min(14, s.speed + 0.002);
        s.spawn--;
        if (s.spawn <= 0) {
          s.spawn = Math.max(30, 80 - Math.floor(score / 20));
          const isPtero = Math.random() < 0.2 + Math.floor(score / 100) * 0.05;
          s.obstacles.push({
            x: CANVAS_W + 20,
            type: isPtero ? "ptero" : "cactus",
            h: isPtero ? 24 : 30 + Math.random() * 24,
            w: isPtero ? 36 : 16 + Math.random() * 12,
          });
        }

        for (const o of s.obstacles) o.x -= s.speed;
        s.obstacles = s.obstacles.filter(o => o.x > -50);

        // physics
        s.dinoVy += 0.65;
        s.dinoY += s.dinoVy;
        if (s.dinoY >= GROUND_Y - DINO_H) {
          s.dinoY = GROUND_Y - DINO_H;
          s.dinoVy = 0;
          s.jumping = false;
        }

        s.frame++;
        if (s.frame % 6 === 0) s.blinkTimer = (s.blinkTimer + 1) % 2;

        // collision
        const dx = DINO_X + 6, dw = DINO_W - 12, dy = s.dinoY + 6, dh = DINO_H - 6;
        for (const o of s.obstacles) {
          const ox = o.x + 4, ow = o.w - 8, oy = GROUND_Y - o.h, oh = o.h - 4;
          if (dx < ox + ow && dx + dw > ox && dy < oy + oh && dy + dh > oy) {
            s.over = true; s.running = false; setGameOver(true); break;
          }
        }

        setScore(sc => sc + Math.floor(s.speed / 4));
      }

      // draw dino
      const sx = DINO_X, sy = s.dinoY;
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 10;
      // body
      ctx.fillRect(sx + 8, sy + 6, DINO_W - 16, DINO_H - 16);
      // head
      ctx.fillRect(sx + DINO_W - 20, sy, 18, 18);
      // eye
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(sx + DINO_W - 8, sy + 5, 4, 4);
      // legs
      ctx.fillStyle = "#00ff88";
      if (!s.jumping) {
        const legOff = s.blinkTimer * 10;
        ctx.fillRect(sx + 10, sy + DINO_H - 14, 6, 14);
        ctx.fillRect(sx + 24 + (legOff ? -4 : 4), sy + DINO_H - 14, 6, 14);
      } else {
        ctx.fillRect(sx + 10, sy + DINO_H - 12, 16, 6);
      }
      ctx.shadowBlur = 0;

      // draw obstacles
      for (const o of s.obstacles) {
        if (o.type === "cactus") {
          ctx.fillStyle = "#ff2d95";
          ctx.shadowColor = "#ff2d95";
          ctx.shadowBlur = 8;
          ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
          ctx.fillRect(o.x + o.w / 2 - 4, GROUND_Y - o.h - 12, 8, 14);
        } else {
          ctx.fillStyle = "#ffdd00";
          ctx.shadowColor = "#ffdd00";
          ctx.shadowBlur = 8;
          // wings
          const wingFlap = Math.sin(s.frame * 0.3) * 8;
          ctx.fillRect(o.x, GROUND_Y - o.h + wingFlap, o.w, 10);
          ctx.fillRect(o.x + 4, GROUND_Y - o.h, 8, 16);
        }
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Рекорд</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{best}</div>
          </div>
        </div>
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all active:scale-95">Новая игра</button>
      </div>
      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(400px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full"
          onPointerDown={(e) => { e.preventDefault(); jump(); }} />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Dino</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Пробел / тап — прыжок</p>
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
    </div>
  );
}
