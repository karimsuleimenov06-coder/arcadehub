import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 520;
const ROAD_Y = 100;
const LANE_H = 64;
const CAR_W = 40;
const CAR_H = 64;
const LOWER = ROAD_Y + LANE_H * 4; // player car level

type Car = { lane: number; y: number; speed: number; color: string };

export default function EndlessDriver() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_driver_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    lane: 1,
    cars: [] as Car[],
    keys: { left: false, right: false },
    running: false,
    over: false,
    speed: 6,
    obstacle: 0,
  });

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_driver_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("endless-driver", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const laneX = (lane: number) => 60 + lane * (CANVAS_W - 120) / 3;

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.lane = 1;
    s.cars = [];
    s.keys = { left: false, right: false };
    s.over = false;
    s.running = true;
    s.speed = 6;
    s.obstacle = 0;
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

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

      // road
      ctx.fillStyle = "#12122a";
      ctx.fillRect(40, 0, CANVAS_W - 80, CANVAS_H);
      ctx.strokeStyle = "#ffffff33";
      ctx.lineWidth = 2;
      for (let l = 0; l <= 4; l++) {
        const x = 40 + l * (CANVAS_W - 80) / 4;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      // dashed lane markers
      ctx.strokeStyle = "#ffffff44";
      ctx.lineWidth = 3;
      for (let l = 1; l <= 3; l++) {
        const x = 40 + l * (CANVAS_W - 80) / 4;
        ctx.setLineDash([24, 18]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      ctx.setLineDash([]);
      // finish line
      ctx.fillStyle = "rgba(0,243,255,0.15)";
      ctx.fillRect(40, LOWER - 4, CANVAS_W - 80, 4);

      if (s.running && !s.over) {
        if (s.keys.left) s.lane = Math.max(0, s.lane - 1);
        if (s.keys.right) s.lane = Math.min(3, s.lane + 1);
        s.speed = Math.min(11, s.speed + 0.0025);

        s.obstacle--;
        if (s.obstacle <= 0) {
          s.obstacle = Math.max(24, 64 - Math.floor(score / 30));
          const lane = Math.floor(Math.random() * 4);
          const colors = ["#ff2d95", "#ffdd00", "#9b59b6", "#ff3355"];
          s.cars.push({ lane, y: -CAR_H - Math.random() * 200, speed: 3 + Math.random() * 3, color: colors[Math.floor(Math.random() * colors.length)] });
        }

        for (const c of s.cars) c.y += c.speed;
        s.cars = s.cars.filter(c => c.y < CANVAS_H + 80);

        const px = laneX(s.lane);
        for (const c of s.cars) {
          const cxl = laneX(c.lane);
          if (
            c.lane === s.lane &&
            Math.abs(px - cxl) < CAR_W &&
            c.y + CAR_H > LOWER - CAR_H / 2 && c.y < LOWER + CAR_H / 2
          ) {
            s.over = true;
            s.running = false;
            setGameOver(true);
          }
        }

        setScore(sc => sc + Math.floor(s.speed / 3));
      }

      // traffic cars
      for (const c of s.cars) {
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 8;
        roundRect(ctx, laneX(c.lane) - CAR_W / 2, c.y, CAR_W, CAR_H, 8);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(laneX(c.lane) - CAR_W / 2 + 6, c.y + 12, 7, 10);
        ctx.fillRect(laneX(c.lane) + CAR_W / 2 - 13, c.y + 12, 7, 10);
        ctx.fillRect(laneX(c.lane) - CAR_W / 2 + 6, c.y + CAR_H - 22, 7, 10);
        ctx.fillRect(laneX(c.lane) + CAR_W / 2 - 13, c.y + CAR_H - 22, 7, 10);
      }

      // player car
      const px = laneX(s.lane);
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 14;
      roundRect(ctx, px - CAR_W / 2, LOWER - CAR_H / 2, CAR_W, CAR_H, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(px - CAR_W / 2 + 6, LOWER - CAR_H / 2 + 12, 7, 10);
      ctx.fillRect(px + CAR_W / 2 - 13, LOWER - CAR_H / 2 + 12, 7, 10);
      ctx.fillRect(px - CAR_W / 2 + 6, LOWER + CAR_H / 2 - 22, 7, 10);
      ctx.fillRect(px + CAR_W / 2 - 13, LOWER + CAR_H / 2 - 22, 7, 10);
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Дистанция</div>
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
              <p className="text-xl font-bold neon-text-pink mb-2">Endless Driver</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">← → — перестраивайся · объезжай машины</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Авария!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Дистанция: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 w-full max-w-[400px] select-none touch-none">
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }} onPointerLeave={() => { stateRef.current.keys.left = false; }}
          onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">←</button>
        <button onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }} onPointerLeave={() => { stateRef.current.keys.right = false; }}
          onTouchStart={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onTouchEnd={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">→</button>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
