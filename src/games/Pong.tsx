import { useState, useRef, useEffect, useCallback } from "react";

const W = 640, H = 400;
const PADDLE_W = 10, PADDLE_H = 60, BALL_R = 8;
const SPEED = 5, AI_SPEED = 4;

type Mode = "ai" | "local";

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    ball: { x: W/2, y: H/2, vx: SPEED, vy: SPEED },
    p1: { y: H/2 - PADDLE_H/2, score: 0, dy: 0 },
    p2: { y: H/2 - PADDLE_H/2, score: 0, dy: 0 },
    running: false,
  });
  const [mode, setMode] = useState<Mode>("ai");
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<number | null>(null);
  const keysRef = useRef(new Set<string>());

  const resetBall = useCallback((dir: number) => {
    const s = stateRef.current;
    s.ball = { x: W/2, y: H/2, vx: SPEED * dir, vy: (Math.random() * 2 - 1) * SPEED };
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.p1 = { y: H/2 - PADDLE_H/2, score: 0, dy: 0 };
    s.p2 = { y: H/2 - PADDLE_H/2, score: 0, dy: 0 };
    setScore({ p1: 0, p2: 0 });
    setWinner(null);
    resetBall(1);
    s.running = true;
  }, [resetBall]);

  // Update score callback
  const updateScore = useCallback((p1: number, p2: number) => {
    setScore({ p1, p2 });
    if (p1 >= 5) { setWinner(1); stateRef.current.running = false; }
    if (p2 >= 5) { setWinner(2); stateRef.current.running = false; }
  }, []);

  useEffect(() => {
    if (!stateRef.current.running && winner === null) startGame();
  }, [startGame, winner]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); e.preventDefault(); };
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key); e.preventDefault(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Touch refs for D-Pad style controls
  const touchRef = useRef({ p1: 0, p2: 0 });

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      const s = stateRef.current;
      if (!s.running) { animRef.current = requestAnimationFrame(loop); return; }

      // Input
      const keys = keysRef.current;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) s.p1.dy = -SPEED;
      else if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) s.p1.dy = SPEED;
      else if (touchRef.current.p1 !== 0) s.p1.dy = touchRef.current.p1;
      else s.p1.dy = 0;

      if (mode === "local") {
        if ((keys.has("ArrowUp") && !keys.has("ArrowDown") && !keys.has("w") && !keys.has("s"))) {
          // if only up/down arrows pressed in local, they control p2, wasd controls p1
        }
        if (keys.has("ArrowUp")) s.p2.dy = -SPEED;
        else if (keys.has("ArrowDown")) s.p2.dy = SPEED;
        else if (touchRef.current.p2 !== 0) s.p2.dy = touchRef.current.p2;
        else s.p2.dy = 0;
      } else {
        // AI
        const target = s.ball.y;
        const diff = target - (s.p2.y + PADDLE_H/2);
        if (Math.abs(diff) > 10) s.p2.dy = Math.sign(diff) * AI_SPEED;
        else s.p2.dy = 0;
      }

      // Move paddles
      s.p1.y = Math.max(0, Math.min(H - PADDLE_H, s.p1.y + s.p1.dy));
      s.p2.y = Math.max(0, Math.min(H - PADDLE_H, s.p2.y + s.p2.dy));

      // Move ball
      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;

      // Wall bounce
      if (s.ball.y - BALL_R < 0 || s.ball.y + BALL_R > H) s.ball.vy *= -1;

      // Paddle collision
      // P1 (left)
      if (s.ball.x - BALL_R < PADDLE_W &&
          s.ball.y > s.p1.y && s.ball.y < s.p1.y + PADDLE_H &&
          s.ball.vx < 0) {
        s.ball.vx *= -1.05;
        s.ball.vy = (s.ball.y - (s.p1.y + PADDLE_H/2)) / (PADDLE_H/2) * SPEED;
        s.ball.x = PADDLE_W + BALL_R;
      }
      // P2 (right)
      if (s.ball.x + BALL_R > W - PADDLE_W &&
          s.ball.y > s.p2.y && s.ball.y < s.p2.y + PADDLE_H &&
          s.ball.vx > 0) {
        s.ball.vx *= -1.05;
        s.ball.vy = (s.ball.y - (s.p2.y + PADDLE_H/2)) / (PADDLE_H/2) * SPEED;
        s.ball.x = W - PADDLE_W - BALL_R;
      }

      // Score
      if (s.ball.x < -50) {
        s.p2.score++;
        updateScore(s.p1.score, s.p2.score);
        resetBall(-1);
      } else if (s.ball.x > W + 50) {
        s.p1.score++;
        updateScore(s.p1.score, s.p2.score);
        resetBall(1);
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0, 243, 255, 0.05)";
      ctx.fillRect(0, 0, W, H);

      // Center line
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = "#00f3ff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00f3ff";
      ctx.fillRect(0, s.p1.y, PADDLE_W, PADDLE_H);
      ctx.fillStyle = "#ff2d95";
      ctx.shadowColor = "#ff2d95";
      ctx.fillRect(W - PADDLE_W, s.p2.y, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;

      // Ball
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#fff";
      ctx.fill();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode, resetBall, updateScore]);

  // Touch handlers for mobile
  const handleTouch = useCallback((player: 1 | 2, dy: number) => {
    touchRef.current[player === 1 ? "p1" : "p2"] = dy * SPEED * 2;
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button onClick={() => { setMode("ai"); startGame(); }}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "ai" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>
          🤖 С ИИ
        </button>
        <button onClick={() => { setMode("local"); startGame(); }}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "local" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>
          👥 Вдвоём
        </button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-6 text-sm">
        <span className="neon-text-blue">{(stateRef.current.p1.score.toString())}</span>
        <span className="text-[var(--text-muted)]">:</span>
        <span className="neon-text-pink">{(stateRef.current.p2.score.toString())}</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl max-w-full"
          style={{ height: "auto", aspectRatio: `${W}/${H}`, background: "rgba(0,243,255,0.03)" }}
        />
        {winner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            <div className="text-center glass p-6 rounded-xl">
              <p className={`text-2xl font-bold mb-2 ${winner === 1 ? "neon-text-blue" : "neon-text-pink"}`}>
                Игрок {winner} победил!
              </p>
              <button onClick={startGame} className="px-6 py-2 glass rounded-lg text-sm neon-text-green hover:neon-glow-green transition-all active:scale-95">
                Ещё раз
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls info */}
      {!winner && (
        <div className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          {mode === "local" ? (
            <>
              <span className="neon-text-blue">W/S</span> — левый &nbsp;
              <span className="neon-text-pink">↑/↓</span> — правый
            </>
          ) : (
            <><span className="neon-text-blue">W/S</span> или <span className="neon-text-blue">↑/↓</span> — движение</>
          )}
        </div>
      )}

      {/* Touch controls */}
      <div className="flex gap-8 mt-1">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-[var(--text-muted)] neon-text-blue">Игрок 1</span>
          <div className="flex gap-2">
            <button onTouchStart={() => handleTouch(1, -1)} onTouchEnd={() => handleTouch(1, 0)}
              className="w-12 h-10 glass rounded-lg text-lg active:scale-90 text-[var(--neon-blue)]">&uarr;</button>
            <button onTouchStart={() => handleTouch(1, 1)} onTouchEnd={() => handleTouch(1, 0)}
              className="w-12 h-10 glass rounded-lg text-lg active:scale-90 text-[var(--neon-blue)]">&darr;</button>
          </div>
        </div>
        {mode === "local" && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[var(--text-muted)] neon-text-pink">Игрок 2</span>
            <div className="flex gap-2">
              <button onTouchStart={() => handleTouch(2, -1)} onTouchEnd={() => handleTouch(2, 0)}
                className="w-12 h-10 glass rounded-lg text-lg active:scale-90 text-[var(--neon-pink)]">&uarr;</button>
              <button onTouchStart={() => handleTouch(2, 1)} onTouchEnd={() => handleTouch(2, 0)}
                className="w-12 h-10 glass rounded-lg text-lg active:scale-90 text-[var(--neon-pink)]">&darr;</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}