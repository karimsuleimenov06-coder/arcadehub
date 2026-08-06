import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 500;
const PIPE_W = 60;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;

type Pipe = { x: number; gapY: number; passed: boolean };

export default function Flappy() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_flappy_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    birdY: CANVAS_H / 2,
    birdVy: 0,
    pipes: [] as Pipe[],
    running: false,
    over: false,
    spawn: 0,
    frame: 0,
  });

  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem("arcadehub_flappy_best", String(score)); } catch {} }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("flappy", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.birdY = CANVAS_H / 2;
    s.birdVy = 0;
    s.pipes = [];
    s.running = true;
    s.over = false;
    s.spawn = 0;
    s.frame = 0;
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) { restart(); return; }
    s.birdVy = -7;
  }, [restart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault(); flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

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

      if (s.running && !s.over) {
        s.frame++;
        s.birdVy += 0.35;
        s.birdY += s.birdVy;

        // spawn
        s.spawn--;
        if (s.spawn <= 0) {
          s.spawn = 90;
          const gapY = 80 + Math.random() * (CANVAS_H - 200);
          s.pipes.push({ x: CANVAS_W + 10, gapY, passed: false });
        }

        for (const p of s.pipes) {
          p.x -= PIPE_SPEED;
          if (!p.passed && p.x + PIPE_W < 60) { p.passed = true; setScore(sc => sc + 1); }
        }
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

        // collision
        const bx = 60, by = s.birdY, br = 14;
        if (by - br < 0 || by + br > CANVAS_H) { s.over = true; s.running = false; setGameOver(true); }
        for (const p of s.pipes) {
          const px = p.x, pw = PIPE_W;
          if (bx + br > px && bx - br < px + pw) {
            if (by - br < p.gapY - PIPE_GAP / 2 || by + br > p.gapY + PIPE_GAP / 2) {
              s.over = true; s.running = false; setGameOver(true);
            }
          }
        }
      }

      // draw pipes
      for (const p of s.pipes) {
        const topH = p.gapY - PIPE_GAP / 2;
        const botY = p.gapY + PIPE_GAP / 2;
        ctx.fillStyle = "#ff2d95";
        ctx.shadowColor = "#ff2d95";
        ctx.shadowBlur = 10;
        ctx.fillRect(p.x, 0, PIPE_W, topH);
        ctx.fillStyle = "#ff2d95";
        ctx.fillRect(p.x, botY, PIPE_W, CANVAS_H - botY);
        // caps
        ctx.fillStyle = "#ff2d95";
        ctx.fillRect(p.x - 4, topH - 20, PIPE_W + 8, 20);
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 20);
      }

      // draw bird
      ctx.fillStyle = "#ffdd00";
      ctx.shadowColor = "#ffdd00";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(60, s.birdY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0a0a1a";
      ctx.beginPath();
      ctx.arc(65, s.birdY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.fillStyle = "#ff3355";
      ctx.beginPath();
      ctx.moveTo(72, s.birdY);
      ctx.lineTo(82, s.birdY + 4);
      ctx.lineTo(72, s.birdY + 6);
      ctx.closePath();
      ctx.fill();
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
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Новая игра</button>
      </div>
      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(400px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full"
          onPointerDown={(e) => { e.preventDefault(); flap(); }} />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Flappy Bird</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Пробел / тап — взмах крыльями</p>
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
