import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const CANVAS_W = 400;
const CANVAS_H = 480;
const PADDLE_W = 80;
const PADDLE_H = 14;
const BALL_R = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 44;
const BRICK_H = 18;
const BRICK_GAP = 4;
const BRICK_OFFSET_X = (CANVAS_W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;

type Brick = { x: number; y: number; hp: number; color: string };
type Ball = { x: number; y: number; vx: number; vy: number };

const BRICK_COLORS = ["#ff2d95", "#ffdd00", "#00ff88", "#00f3ff", "#9b59b6"];

export default function Arkanoid() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_arkanoid_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lives, setLives] = useState(3);

  const stateRef = useRef({
    paddle: { x: CANVAS_W / 2 - PADDLE_W / 2, y: CANVAS_H - 30 },
    ball: { x: CANVAS_W / 2, y: CANVAS_H - 48, vx: 3, vy: -3.5 } as Ball,
    bricks: [] as Brick[],
    keys: { left: false, right: false },
    running: false,
    over: false,
    lives: 3,
    level: 0,
  });

  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++)
      for (let c = 0; c < BRICK_COLS; c++)
        bricks.push({ x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_GAP), y: 40 + r * (BRICK_H + BRICK_GAP), hp: 2, color: BRICK_COLORS[r % BRICK_COLORS.length] });
    stateRef.current.bricks = bricks;
  }, []);

  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem("arcadehub_arkanoid_best", String(score)); } catch {} }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("arkanoid", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.paddle.x = CANVAS_W / 2 - PADDLE_W / 2;
    s.ball = { x: CANVAS_W / 2, y: CANVAS_H - 48, vx: 3, vy: -3.5 };
    s.keys = { left: false, right: false };
    s.over = false; s.running = true; s.lives = 3; s.level = 0;
    initBricks();
    setScore(0); setLives(3); setGameOver(false); setSaved(false); setStarted(true);
  }, [initBricks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = true;
      if (e.code === "Space" && !stateRef.current.running) restart();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, [restart]);

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
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let i = 0; i < CANVAS_W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke(); }
      for (let i = 0; i < CANVAS_H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke(); }

      if (s.running && !s.over) {
        if (s.keys.left) s.paddle.x = Math.max(0, s.paddle.x - 7);
        if (s.keys.right) s.paddle.x = Math.min(CANVAS_W - PADDLE_W, s.paddle.x + 7);

        const b = s.ball;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x - BALL_R < 0 || b.x + BALL_R > CANVAS_W) b.vx *= -1;
        if (b.y - BALL_R < 0) b.vy *= -1;
        b.x = Math.max(BALL_R, Math.min(CANVAS_W - BALL_R, b.x));

        // paddle bounce
        if (
          b.vy > 0 && b.y + BALL_R >= s.paddle.y && b.y + BALL_R <= s.paddle.y + PADDLE_H + 6 &&
          b.x > s.paddle.x - 4 && b.x < s.paddle.x + PADDLE_W + 4
        ) {
          b.vy = -Math.abs(b.vy);
          const hit = (b.x - s.paddle.x) / PADDLE_W;
          b.vx = (hit - 0.5) * 8;
        }

        // brick collision
        for (let i = s.bricks.length - 1; i >= 0; i--) {
          const br = s.bricks[i];
          if (
            b.x + BALL_R > br.x && b.x - BALL_R < br.x + BRICK_W &&
            b.y + BALL_R > br.y && b.y - BALL_R < br.y + BRICK_H
          ) {
            br.hp--;
            if (br.hp <= 0) {
              s.bricks.splice(i, 1);
              setScore(sc => sc + 10);
            }
            const prevX = b.x - b.vx, prevY = b.y - b.vy;
            const overlapX = (prevX < br.x) ? br.x - (prevX + BALL_R) : (prevX) - (br.x + BRICK_W);
            const overlapY = (prevY < br.y) ? br.y - (prevY + BALL_R) : (prevY) - (br.y + BRICK_H);
            if (Math.abs(overlapX) < Math.abs(overlapY)) b.vx *= -1;
            else b.vy *= -1;
            break;
          }
        }

        // fall
        if (b.y > CANVAS_H + 20) {
          s.lives--;
          setLives(s.lives);
          if (s.lives <= 0) {
            s.over = true; s.running = false; setGameOver(true);
          } else {
            b.x = s.paddle.x + PADDLE_W / 2;
            b.y = CANVAS_H - 48;
            b.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
            b.vy = -3.5;
          }
        }

        if (s.bricks.length === 0) {
          setScore(sc => sc + 500);
          initBricks();
        }
      }

      // draw bricks
      for (const br of s.bricks) {
        ctx.fillStyle = br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(br.x, br.y, BRICK_W, BRICK_H);
        if (br.hp > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillRect(br.x, br.y, BRICK_W, 3);
        }
      }

      // draw paddle
      ctx.fillStyle = "#00ff88";
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 12;
      ctx.fillRect(s.paddle.x, s.paddle.y, PADDLE_W, PADDLE_H);

      // draw ball
      ctx.fillStyle = "#ffdd00";
      ctx.shadowColor = "#ffdd00";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [score, initBricks]);

  const movePaddleTo = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    stateRef.current.paddle.x = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
    if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); }
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Жизни</div>
            <div className="font-bold text-lg leading-tight" style={{ color: "var(--neon-pink)" }}>{"❤".repeat(Math.max(0, lives))}</div>
          </div>
        </div>
        <button onClick={restart} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Новая игра</button>
      </div>
      <div className="relative glass rounded-xl overflow-hidden select-none touch-none" style={{ width: "min(400px, calc(100vw - 40px))" }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block w-full cursor-none"
          onPointerMove={movePaddleTo}
          onPointerDown={(e) => { movePaddleTo(e); if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); } }}
        />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Арканоид</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Мышь / касание — управление ракеткой</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Игра окончена!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Очки: <strong className="neon-text-green">{score}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
