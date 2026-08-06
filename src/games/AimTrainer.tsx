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
  color: number;
  life: number;
  maxLife: number;
};

export default function AimTrainer() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_aim_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);

  const stateRef = useRef({
    targets: [] as Target[],
    running: false,
    over: false,
    spawn: 0,
    time: 30,
    nextId: 1,
    hits: 0,
  });

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try { localStorage.setItem("arcadehub_aim_best", String(score)); } catch {}
    }
  }, [score, best]);

  useEffect(() => {
    if (gameOver && !saved && user && score > 0) { addScore("aim-trainer", score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = useCallback(() => {
    const s = stateRef.current;
    s.targets = [];
    s.over = false;
    s.running = true;
    s.spawn = 0;
    s.time = 30;
    s.nextId = 1;
    s.hits = 0;
    setScore(0); setHits(0); setGameOver(false); setSaved(false); setStarted(true);
    const el = document.getElementById("aim-time");
    if (el) el.textContent = "30";
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    const el = document.getElementById("aim-time");
    let raf: number;
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      if (s.running && !s.over) {
        s.time -= dt;
        if (el) el.textContent = String(Math.max(0, Math.ceil(s.time)));
        if (s.time <= 0) {
          s.over = true;
          s.running = false;
          setGameOver(true);
        }

        s.spawn -= dt;
        if (s.spawn <= 0) {
          s.spawn = Math.max(0.35, 0.9 - Math.floor(s.hits / 8) * 0.05);
          const r = 20 + Math.random() * 18;
          s.targets.push({
            id: s.nextId++,
            x: r + Math.random() * (AREA_W - r * 2),
            y: r + Math.random() * (AREA_H - r * 2 - 40),
            r,
            color: s.hits % 6,
            life: 1.4,
            maxLife: 1.4,
          });
        }

        for (const t of s.targets) t.life -= dt;
        s.targets = s.targets.filter(t => t.life > 0);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const shoot = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (!s.running || s.over) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (AREA_W / rect.width);
    const y = (e.clientY - rect.top) * (AREA_H / rect.height);
    let bestDist = 60;
    let bestIdx = -1;
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const d = Math.hypot(s.targets[i].x - x, s.targets[i].y - y);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      const t = s.targets[bestIdx];
      const centerGap = Math.hypot(t.x - x, t.y - y);
      const isBullseye = centerGap < t.r * 0.4;
      const pts = Math.round((isBullseye ? 100 : 50) * (t.life / t.maxLife));
      s.targets.splice(bestIdx, 1);
      s.hits += 1;
      setHits(s.hits);
      setScore(p => p + pts);
    } else {
      setScore(p => Math.max(0, p - 5));
    }
  }, []);

  const COLORS = ["#00f3ff", "#00ff88", "#ffdd00", "#ff2d95", "#9b59b6", "#ff3355"];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[400px] gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Очки</div>
            <div className="font-bold neon-text-green text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Время</div>
            <div className="font-bold text-lg leading-tight" style={{ color: "var(--neon-blue)" }}><span id="aim-time">30</span></div>
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
        style={{ width: "min(400px, calc(100vw - 40px))", height: AREA_H, backgroundImage: "radial-gradient(circle at center, rgba(255,51,85,0.06) 0%, transparent 70%)" }}
        onClick={(e) => {
          if (!stateRef.current.running) { stateRef.current.running = true; setStarted(true); return; }
          shoot(e);
        }}
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
              opacity: Math.min(1, (t.life / t.maxLife) * 1.2),
              background: `radial-gradient(circle, #ffffff, ${COLORS[t.color]})`,
              boxShadow: `0 0 18px ${COLORS[t.color]}, inset 0 0 0 4px rgba(255,255,255,0.3)`,
            }}
          />
        ))}

        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-xl font-bold neon-text-pink mb-2">Aim Trainer</p>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Попадай в центр для 100 очков · 30 секунд</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Играть</button>
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
            <div className="text-center glass p-6 rounded-xl">
              <p className="text-2xl font-bold neon-text-pink mb-1">Время вышло!</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Счёт: <strong className="neon-text-green">{score}</strong> · Попаданий: <strong style={{ color: "var(--neon-blue)" }}>{hits}</strong></p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green active:scale-95">Заново</button>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-[var(--text-muted)]">Целься в центр мишени для максимального счёта</div>
    </div>
  );
}