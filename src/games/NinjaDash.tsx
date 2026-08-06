import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const AREA_W = 400;
const AREA_H = 420;

type Target = {
  id: number;
  x: number;
  y: number;
  r: number;
  good: boolean;
  life: number;
  maxLife: number;
  swoop: number;
};

export default function NinjaDash() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_ninja_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);

  const stateRef = useRef({
    targets: [] as Target[],
    running: false,
    over: false,
    spawn: 0,
    combo: 0,
    maxCombo: 0,
    nextId: 1,
    lastSlice: 0,
    lives: 3,
  });

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_ninja_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("ninja-dash", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.targets = [];
    s.over = false;
    s.running = true;
    s.spawn = 0;
    s.combo = 0;
    s.maxCombo = 0;
    s.nextId = 1;
    s.lastSlice = 0;
    s.lives = 3;
    setScore(0); setCombo(0); setLives(3); setGameOver(false); setSaved(false); setStarted(true);
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    let raf: number;
    const loop = () => {
      const now = Date.now();
      if (s.running && !s.over) {
        s.spawn--;
        if (s.spawn <= 0) {
          s.spawn = Math.max(18, 45 - Math.floor(score / 25));
          const good = Math.random() < 0.6;
          const r = 26 + Math.random() * 14;
          s.targets.push({
            id: s.nextId++,
            x: r + Math.random() * (AREA_W - r * 2),
            y: r + Math.random() * (AREA_H - r * 2),
            r,
            good,
            life: 1,
            maxLife: 1,
            swoop: 0.02 + Math.random() * 0.02,
          });
        }

        const prevLen = s.targets.length;
        s.targets = s.targets.filter(t => (t.life -= t.swoop) > 0);
        // expired targets = missed enemies
        if (s.targets.length < prevLen) {
          const missed = prevLen - s.targets.length;
          s.lives = Math.max(0, s.lives - missed);
          setLives(s.lives);
          if (s.lives <= 0) {
            s.over = true;
            s.running = false;
            setGameOver(true);
          }
        }
        // combo decay
        if (now - s.lastSlice > 2500) {
          s.combo = 0;
          setCombo(0);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const slice = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (!s.running || s.over) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (AREA_W / rect.width);
    const y = (e.clientY - rect.top) * (AREA_H / rect.height);
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i];
      if (Math.hypot(t.x - x, t.y - y) < t.r + 6) {
        if (t.good) {
          s.targets.splice(i, 1);
          s.combo += 1;
          s.maxCombo = Math.max(s.maxCombo, s.combo);
          s.lastSlice = Date.now();
          setCombo(s.combo);
          setScore(p => p + 10 * s.combo);
        } else {
          // bomb -> lose a life and combo
          s.targets.splice(i, 1);
          s.combo = 0;
          setCombo(0);
          s.lives = Math.max(0, s.lives - 1);
          setLives(s.lives);
          if (s.lives <= 0) {
            s.over = true;
            s.running = false;
            setGameOver(true);
          }
        }
        return;
      }
    }
    // miss
    s.combo = 0;
    setCombo(0);
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Комбо</div>
            <div className="font-bold text-lg leading-tight" style={{ color: combo >= 3 ? "var(--neon-pink)" : "var(--neon-blue)" }}>x{combo}</div>
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

      <div
        className="relative glass rounded-xl overflow-hidden select-none touch-none cursor-crosshair"
        style={{ width: "min(400px, calc(100vw - 40px))", height: AREA_H, backgroundImage: "radial-gradient(circle at center, rgba(0,243,255,0.05) 0%, transparent 70%)" }}
        onClick={slice}
        onMouseMove={() => { if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); } }}
      >
        {stateRef.current.targets.map(t => (
          <div
            key={t.id}
            className="absolute rounded-full"
            style={{
              left: t.x - t.r,
              top: t.y - t.r,
              width: t.r * 2,
              height: t.r * 2,
              opacity: Math.min(1, t.life * 2),
              background: t.good ? "radial-gradient(circle, #00ff88, #00cc66)" : "radial-gradient(circle, #ff3355, #cc1177)",
              boxShadow: `0 0 20px ${t.good ? "rgba(0,255,136,0.6)" : "rgba(255,51,85,0.6)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: t.good ? t.r : t.r,
              fontWeight: 700,
              color: "transparent",
            }}
          >
            {t.good ? "" : "💥"}
          </div>
        ))}

        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Ninja Dash</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Режь зелёные цели · избегай бомб 💥</p>
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
      <div className="text-xs text-[var(--text-muted)]">Кликай по целям как можно быстрее</div>
    </div>
  );
}