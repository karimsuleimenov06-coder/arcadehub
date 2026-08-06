import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const COLS = 9;
const ROWS = 4;
const COLS_SPACING = 44;
const ROWS_SPACING = 32;
const COLS_OFFSET = 40;
const ROWS_OFFSET = 60;
const PLAYER_SPEED = 6;
const INVADER_SPEED = 0.6;
const BULLET_SPEED = 7;
const CANVAS_W = 400;
const CANVAS_H = 480;

type Entity = { x: number; y: number; w: number; h: number };

export default function SpaceInvaders() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_spaceinvaders_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    player: { x: CANVAS_W / 2 - 18, y: CANVAS_H - 44, w: 36, h: 24 },
    invaders: [] as Entity[],
    invaderDir: 1,
    invaderSpeed: INVADER_SPEED,
    bullets: [] as Entity[],
    keys: { left: false, right: false },
    running: false,
    over: false,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.invaders = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        s.invaders.push({ x: COLS_OFFSET + c * COLS_SPACING, y: ROWS_OFFSET + r * ROWS_SPACING, w: 28, h: 20 });
      }
    }
    s.player.x = CANVAS_W / 2 - 18;
    s.invaderDir = 1;
    s.invaderSpeed = INVADER_SPEED;
    s.bullets = [];
    s.over = false;
  }, [started]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_spaceinvaders_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("space-invaders", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const fire = useCallback(() => {
    const s = stateRef.current;
    if (s.over) return;
    if (s.bullets.some(b => b.y < CANVAS_H - 70)) return;
    s.bullets.push({ x: s.player.x + 16, y: s.player.y, w: 4, h: 12 });
  }, []);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.over = false;
    s.running = true;
    s.bullets = [];
    s.player.x = CANVAS_W / 2 - 18;
    s.invaderSpeed = INVADER_SPEED;
    s.invaders = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        s.invaders.push({ x: COLS_OFFSET + c * COLS_SPACING, y: ROWS_OFFSET + r * ROWS_SPACING, w: 28, h: 20 });
      }
    }
    setScore(0); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
      if (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W") {
        if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
        fire();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, [fire]);

  useEffect(() => {
    const s = stateRef.current;
    let raf: number;
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = "#0a0a1a";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          ctx.strokeStyle = "rgba(0,243,255,0.05)";
          for (let i = 0; i < CANVAS_W; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke();
          }
          for (let i = 0; i < CANVAS_H; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke();
          }
        }
      }

      if (s.running && !s.over) {
        if (s.keys.left && s.player.x > 6) s.player.x -= PLAYER_SPEED;
        if (s.keys.right && s.player.x + s.player.w < CANVAS_W - 6) s.player.x += PLAYER_SPEED;

        let edge = false;
        for (const inv of s.invaders) {
          inv.x += s.invaderDir * s.invaderSpeed;
          if (inv.x <= 4 || inv.x + inv.w >= CANVAS_W - 4) edge = true;
        }
        if (edge) {
          for (const inv of s.invaders) { inv.y += 14; inv.x = Math.max(4, Math.min(CANVAS_W - 4 - inv.w, inv.x)); }
          s.invaderDir *= -1;
        }

        for (const b of s.bullets) b.y -= BULLET_SPEED;
        s.bullets = s.bullets.filter(b => b.y > -12);

        for (const b of s.bullets) {
          for (let i = s.invaders.length - 1; i >= 0; i--) {
            const inv = s.invaders[i];
            if (b.x < inv.x + inv.w && b.x + b.w > inv.x && b.y < inv.y + inv.h && b.y + b.h > inv.y) {
              s.invaders.splice(i, 1);
              s.bullets = s.bullets.filter(x => x !== b);
              setScore(p => p + 10);
              break;
            }
          }
        }

        const shots = s.invaders.length > 12;
        if (shots && Math.random() < 0.004) {
          const inv = s.invaders[Math.floor(Math.random() * s.invaders.length)];
          s.bullets.push({ x: inv.x + inv.w / 2 - 1, y: inv.y + inv.h, w: 3, h: 10 });
        }

        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          if (b.y > CANVAS_H) continue;
          if (b.x < s.player.x + s.player.w && b.x + b.w > s.player.x && b.y < s.player.y + s.player.h && b.y + b.h > s.player.y) {
            s.over = true;
            break;
          }
        }

        if (s.invaders.some(inv => inv.y + inv.h >= s.player.y) || s.invaders.length === 0) {
          s.over = true;
          if (s.invaders.length === 0) setScore(p => p + 500);
        }

        if (s.over) {
          s.running = false;
          setGameOver(true);
        }
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const s = stateRef.current;
        ctx.fillStyle = "#00ff88";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 14;
        ctx.fillRect(s.player.x, s.player.y, s.player.w, s.player.h);
        ctx.beginPath();
        ctx.moveTo(s.player.x, s.player.y);
        ctx.lineTo(s.player.x + s.player.w / 2, s.player.y - 12);
        ctx.lineTo(s.player.x + s.player.w, s.player.y);
        ctx.fillStyle = "#00ff88";
        ctx.fill();
        ctx.shadowBlur = 0;

        for (const inv of s.invaders) {
          ctx.fillStyle = "#ff2d95";
          ctx.shadowColor = "#ff2d95";
          ctx.shadowBlur = 10;
          ctx.fillRect(inv.x, inv.y, inv.w, inv.h);
          ctx.fillStyle = "#ffdd00";
          ctx.fillRect(inv.x + 3, inv.y + 3, 4, 4);
          ctx.fillRect(inv.x + inv.w - 7, inv.y + 3, 4, 4);
          ctx.shadowBlur = 0;
        }

        for (const b of s.bullets) {
          ctx.fillStyle = "#00f3ff";
          ctx.shadowColor = "#00f3ff";
          ctx.shadowBlur = 8;
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.shadowBlur = 0;
        }
      }
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
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          className="block w-full cursor-crosshair"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) * (CANVAS_W / r.width);
            if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
            stateRef.current.player.x = Math.max(6, Math.min(CANVAS_W - 6 - stateRef.current.player.w, x - stateRef.current.player.w / 2));
            fire();
          }}
        />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Space Invaders</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">← → — движение · Пробел / клик — выстрел</p>
              <button onClick={() => { stateRef.current.running = true; setStarted(true); }} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
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

      <div className="flex gap-2 w-full max-w-[400px] select-none touch-none">
        <button
          onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.left = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.left = false; }}
          onPointerLeave={() => { stateRef.current.keys.left = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">←</button>
        <button onClick={() => { if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); } fire(); }}
          onPointerDown={(e) => e.preventDefault()}
          className="flex-1 py-3 glass rounded-xl text-sm neon-text-green font-bold active:scale-95 transition-all">FIRE</button>
        <button
          onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys.right = true; stateRef.current.running = true; setStarted(true); }}
          onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys.right = false; }}
          onPointerLeave={() => { stateRef.current.keys.right = false; }}
          className="flex-1 py-3 glass rounded-xl text-lg text-[var(--neon-blue)] active:scale-95 transition-all">→</button>
      </div>
    </div>
  );
}
