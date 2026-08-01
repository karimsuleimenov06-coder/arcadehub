import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

type Cell = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const SIZE = 20;
const MOVE_DELAY = 200;
const INIT: Cell[] = [{ x: 10, y: 10 }];

function randomFood(snake: Cell[], snake2?: Cell[]): Cell {
  let p: Cell;
  do {
    p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  } while (snake.some(s => s.x === p.x && s.y === p.y) || (snake2 && snake2.some(s => s.x === p.x && s.y === p.y)));
  return p;
}

const ArrowIcon = ({ d }: { d: Direction }) => {
  const paths: Record<Direction, string> = {
    UP: "M12 4l-8 8h16z", DOWN: "M12 20l8-8H4z",
    LEFT: "M4 12l8-8v16z", RIGHT: "M20 12l-8-8v16z",
  };
  return <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor"><path d={paths[d]} /></svg>;
};

function DirButton({ d, onMove }: { d: Direction; onMove: (d: Direction) => void }) {
  return <button onPointerDown={(e) => { e.preventDefault(); onMove(d); }} onTouchStart={(e) => { e.preventDefault(); onMove(d); }}
    className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-xl flex items-center justify-center text-[var(--neon-blue)] active:bg-[var(--neon-blue)]/20 active:scale-90 transition-all select-none touch-none"
    style={{ boxShadow: "0 0 12px rgba(0,243,255,0.15)" }}><ArrowIcon d={d} /></button>;
}

const API = '/api/room'
function apiCall(body: any) { return fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r=>r.json()) }

export default function SnakeGame() {
  const { user } = useAuth()
  const { addScore } = useGame()
  const [snake, setSnake] = useState<Cell[]>(INIT);
  const [food, setFood] = useState<Cell>(randomFood(INIT));
  const [dir, setDir] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastMoveRef = useRef(0);
  const dirRef = useRef<Direction>("RIGHT");
  const scoreRef = useRef(0);
  const [mode, setMode] = useState<"single"|"online">("single");
  const [onlineUI, setOnlineUI] = useState<'idle'|'lobby'|'playing'>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [opponent, setOpponent] = useState('');
  const [opponentSnake, setOpponentSnake] = useState<Cell[]>([]);
  const [opponentScore, setOpponentScore] = useState(0);
  const [onlineFood, setOnlineFood] = useState<Cell>({ x: 15, y: 10 });
  const [dead2, setDead2] = useState(false);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const orRef = useRef({ roomCode: '', myName: '', isP1: true, tickRef: null as any, pollRef: null as any, dir: 'RIGHT' as Direction, oppDir: 'LEFT' as Direction, foodEaten: false, started: false });
  const mySnakeRef = useRef<Cell[]>(INIT);
  const oppSnakeRef = useRef<Cell[]>([]);
  const foodRef = useRef<Cell>({ x: 15, y: 10 });
  const deadRef = useRef(false);
  const dead2Ref = useRef(false);

  useEffect(() => { scoreRef.current = score }, [score]);

  const moveSnake = useCallback((snakeArr: Cell[], direction: Direction, foodPos: Cell, grow: boolean): { snake: Cell[]; ate: boolean; dead: boolean } => {
    const head = { ...snakeArr[0] };
    switch (direction) { case "UP": head.y -= 1; break; case "DOWN": head.y += 1; break; case "LEFT": head.x -= 1; break; case "RIGHT": head.x += 1; break; }
    if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) return { snake: snakeArr, ate: false, dead: true };
    const hitSelf = snakeArr.some(s => s.x === head.x && s.y === head.y);
    if (hitSelf) return { snake: snakeArr, ate: false, dead: true };
    const ate = head.x === foodPos.x && head.y === foodPos.y;
    const newSnake = [head, ...snakeArr.slice(0, ate ? snakeArr.length : snakeArr.length - 1)];
    return { snake: newSnake, ate, dead: false };
  }, []);

  const handleDirection = useCallback((d: Direction) => {
    if (d === "UP" && dirRef.current === "DOWN") return;
    if (d === "DOWN" && dirRef.current === "UP") return;
    if (d === "LEFT" && dirRef.current === "RIGHT") return;
    if (d === "RIGHT" && dirRef.current === "LEFT") return;
    setStarted(true);
    dirRef.current = d;
    setDir(d);
  }, []);

  // Single-player game tick
  useEffect(() => {
    if (mode !== 'single') return;
    if (gameOver) return;
    if (!started) return;
    const interval = setInterval(() => {
      setSnake(prev => {
        const r = moveSnake(prev, dirRef.current, food, false);
        if (r.dead) { setGameOver(true); return prev; }
        const nf = r.ate ? randomFood(r.snake) : food;
        if (r.ate) { setScore(s => s + 1); setFood(nf); }
        return r.snake;
      });
    }, MOVE_DELAY);
    return () => clearInterval(interval);
  }, [mode, gameOver, food, moveSnake]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT", w:"UP", s:"DOWN", a:"LEFT", d:"RIGHT" };
      const d = keyMap[e.key];
      if (d) { e.preventDefault(); handleDirection(d); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDirection]);

  useEffect(() => {
    if (gameOver && !saved && user) { addScore('snake', score); setSaved(true); }
  }, [gameOver, saved, user, score, addScore]);

  const restart = () => {
    setSnake(INIT); setFood(randomFood(INIT)); setDir("RIGHT"); dirRef.current = "RIGHT";
    setGameOver(false); setScore(0); setStarted(false); setSaved(false); lastMoveRef.current = 0;
    mySnakeRef.current = INIT;
  };

  // Online mode
  const createSnakeRoom = async () => {
    const uname0 = 'Игрок1';
    const r = await apiCall({ action: 'create', game: 'snake', username: uname0 });
    if (!r.ok) return;
    const uname = r.room.players[0]?.username || uname0;
    setRoomCode(r.room.id); setOnlineUI('lobby'); setP1Name(uname);
    const or = orRef.current; or.roomCode = r.room.id; or.myName = uname; or.isP1 = true;
    or.pollRef = setInterval(async () => {
      const s = await apiCall({ action: 'status', roomCode: r.room.id });
      if (s.ok && s.room.status === 'playing') {
        setOpponent(s.room.players[1]?.username || '');
        setP2Name(s.room.players[1]?.username || '');
        setOnlineUI('playing');
        clearInterval(or.pollRef);
        startOnlineGame(or.roomCode, uname, true);
      }
    }, 1000);
  };

  const joinSnakeRoom = async (code: string) => {
    const uname0 = 'Игрок2';
    const r = await apiCall({ action: 'join', roomCode: code, username: uname0 });
    if (!r.ok) { alert(r.error); return; }
    const uname = r.room.players[1]?.username || uname0;
    setRoomCode(code.toUpperCase()); setOpponent(r.room.players[0]?.username || '');
    setP1Name(r.room.players[0]?.username || ''); setP2Name(uname);
    setOnlineUI('playing');
    startOnlineGame(code.toUpperCase(), uname, false);
  };

  const startOnlineGame = (rc: string, uname: string, isP1: boolean) => {
    const or = orRef.current;
    if (or.started) return;
    or.started = true;
    or.roomCode = rc; or.myName = uname; or.isP1 = isP1;
    mySnakeRef.current = isP1 ? [{ x: 10, y: 10 }] : [{ x: 5, y: 5 }];
    oppSnakeRef.current = isP1 ? [{ x: 5, y: 5 }] : [{ x: 10, y: 10 }];
    foodRef.current = { x: 15, y: 10 };
    or.dir = isP1 ? 'RIGHT' : 'LEFT';
    or.oppDir = isP1 ? 'LEFT' : 'RIGHT';
    setSnake(mySnakeRef.current);
    setOpponentSnake(oppSnakeRef.current);
    setFood(foodRef.current);
    setOnlineFood(foodRef.current);
    setScore(0); setOpponentScore(0); setGameOver(false); setDead2(false);
    deadRef.current = false; dead2Ref.current = false;

    // Game tick
    or.tickRef = setInterval(() => {
      if (deadRef.current && dead2Ref.current) return;

      // Move my snake
      const mySnake = mySnakeRef.current;
      const myResult = moveSnake(mySnake, or.dir, foodRef.current, false);
      if (myResult.dead) { deadRef.current = true; setGameOver(true); }
      if (!myResult.dead) {
        mySnakeRef.current = myResult.snake;
        if (myResult.ate) {
          foodRef.current = randomFood(myResult.snake, oppSnakeRef.current);
          setScore(s => s + 1);
        }
      }

      // Move opponent snake
      const oppSnake = oppSnakeRef.current;
      const oppResult = moveSnake(oppSnake.length ? oppSnake : [{ x: isP1 ? 5 : 10, y: isP1 ? 5 : 10 }], or.oppDir, foodRef.current, false);
      if (oppResult.dead) { dead2Ref.current = true; setDead2(true); }
      if (!oppResult.dead) {
        oppSnakeRef.current = oppResult.snake;
        if (oppResult.ate) {
          foodRef.current = randomFood(mySnakeRef.current, oppResult.snake);
          setOpponentScore(s => s + 1);
        }
      }

      setSnake([...mySnakeRef.current]);
      setOpponentSnake([...oppSnakeRef.current]);
      setFood({ ...foodRef.current });
      setOnlineFood({ ...foodRef.current });

      // Send state to server (P1 is authoritative for the shared food)
      const payload = isP1
        ? { snake: mySnakeRef.current, dir: or.dir, food: foodRef.current }
        : { snake: mySnakeRef.current, dir: or.dir };
      apiCall({ action: 'move', roomCode: rc, username: uname, move: payload }).catch(() => {});
    }, MOVE_DELAY);
  };

  // Poll for opponent state in online mode
  useEffect(() => {
    if (mode !== 'online' || onlineUI !== 'playing') return;
    const or = orRef.current;
    const pollInterval = setInterval(async () => {
      const s = await apiCall({ action: 'status', roomCode: or.roomCode });
      if (!s.ok || !s.room.state) return;
      const st = s.room.state;
      if (or.isP1) {
        if (Array.isArray(st.snake2) && st.snake2.length) { oppSnakeRef.current = st.snake2; setOpponentSnake([...st.snake2]); }
        if (typeof st.dir2 === 'string') or.oppDir = st.dir2;
      } else {
        if (Array.isArray(st.snake1) && st.snake1.length) { oppSnakeRef.current = st.snake1; setOpponentSnake([...st.snake1]); }
        if (typeof st.dir1 === 'string') or.oppDir = st.dir1;
      }
      if (st.food && st.food.x !== undefined) { foodRef.current = st.food; setFood(st.food); setOnlineFood(st.food); }
    }, MOVE_DELAY);
    return () => clearInterval(pollInterval);
  }, [mode, onlineUI]);

  useEffect(() => {
    return () => {
      if (orRef.current.tickRef) clearInterval(orRef.current.tickRef);
      if (orRef.current.pollRef) clearInterval(orRef.current.pollRef);
    };
  }, []);

  const switchMode = (m: "single" | "online") => {
    if (orRef.current.tickRef) clearInterval(orRef.current.tickRef);
    if (orRef.current.pollRef) clearInterval(orRef.current.pollRef);
    orRef.current.started = false;
    setMode(m); setOnlineUI('idle'); restart(); setOpponentSnake([]); setDead2(false);
  };

  // Online direction handler
  const handleOnlineDirection = useCallback((d: Direction) => {
    if (d === "UP" && dirRef.current === "DOWN") return;
    if (d === "DOWN" && dirRef.current === "UP") return;
    if (d === "LEFT" && dirRef.current === "RIGHT") return;
    if (d === "RIGHT" && dirRef.current === "LEFT") return;
    dirRef.current = d;
    orRef.current.dir = d;
    setDir(d);
  }, []);

  // Keyboard for both modes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT", w:"UP", s:"DOWN", a:"LEFT", d:"RIGHT" };
      const d = keyMap[e.key];
      if (!d) return;
      e.preventDefault();
      if (mode === 'online') handleOnlineDirection(d);
      else handleDirection(d);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, handleDirection, handleOnlineDirection]);

  if (mode === "online" && onlineUI === "idle") {
    return <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={() => switchMode("single")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">👤 Один</button>
        <button onClick={() => {}} className="px-4 py-1.5 text-xs rounded-lg glass neon-text-blue">🌐 Онлайн</button>
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs py-8">
        <button onClick={createSnakeRoom} className="w-full px-6 py-3 glass rounded-xl text-sm neon-text-blue font-bold">Создать комнату</button>
        <div className="flex items-center gap-2 w-full"><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/><span className="text-xs text-[var(--text-muted)]">или</span><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/></div>
        <div className="flex gap-2 w-full">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Код комнаты" maxLength={6}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{background:"var(--glass-bg)",border:"1px solid var(--glass-border)",color:"var(--text)"}}/>
          <button onClick={()=>joinSnakeRoom(joinCode)} className="px-4 py-2 glass rounded-lg text-xs neon-text-purple">Войти</button>
        </div>
      </div>
    </div>;
  }

  if (mode === "online" && onlineUI === "lobby") {
    return <div className="flex flex-col items-center gap-4">
      <div className="glass-card text-center py-8 px-8">
        <p className="text-xs text-[var(--text-muted)] mb-2">Код комнаты</p>
        <p className="text-3xl font-bold tracking-[0.2em] neon-text-blue" style={{fontFamily:"var(--font-title)"}}>{roomCode}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-4">Ожидание противника...</p>
      </div>
    </div>;
  }

  const displayFood = mode === 'online' ? onlineFood : food;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={() => switchMode("single")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "single" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>👤 Один</button>
        <button onClick={() => switchMode("online")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "online" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>🌐 Онлайн</button>
      </div>

      {mode === "online" && onlineUI === "playing" && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{background:"#00cc66"}}/><span className="text-[var(--text-secondary)]">{p1Name}</span><strong className="neon-text-green ml-1">{score}</strong></div>
          <span className="text-[var(--text-muted)]">vs</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{background:"#cc1177"}}/><span className="text-[var(--text-secondary)]">{p2Name}</span><strong className="neon-text-pink ml-1">{opponentScore}</strong></div>
        </div>
      )}

      {mode === "single" && (
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>Очки: <strong className="neon-text-green">{score}</strong></span>
        </div>
      )}

      <div className="relative" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SIZE}, max(14px, min(20px, calc((100vw - 80px) / ${SIZE}))))`,
        gridTemplateRows: `repeat(${SIZE}, max(14px, min(20px, calc((100vw - 80px) / ${SIZE}))))`,
        gap: 1, background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 4,
      }}>
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = i % SIZE; const y = Math.floor(i / SIZE);
          const isSnake = snake.some(s => s.x === x && s.y === y);
          const isHead = snake[0]?.x === x && snake[0]?.y === y;
          const isOpp = opponentSnake.some(s => s.x === x && s.y === y);
          const isOppHead = opponentSnake[0]?.x === x && opponentSnake[0]?.y === y;
          const isFood = displayFood.x === x && displayFood.y === y;
          return <div key={i} style={{
            aspectRatio: "1", borderRadius: 2,
            background: isHead ? "#00ff88" : isSnake ? "#00cc66" : isOppHead ? "#ff2d95" : isOpp ? "#cc1177" : isFood ? "#ff3355" : "rgba(255,255,255,0.03)",
            boxShadow: isHead ? "0 0 8px rgba(0,255,136,0.6)" : isOppHead ? "0 0 8px rgba(255,45,149,0.6)" : isFood ? "0 0 8px rgba(255,51,85,0.6)" : "none",
          }} />;
        })}
        {(gameOver || dead2) && mode === "online" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
            <div className="text-center">
              <p className="text-2xl font-bold neon-text-pink mb-2">Игра окончена!</p>
              <p className="text-[var(--text-secondary)] mb-1">{p1Name}: {score} | {p2Name}: {opponentScore}</p>
              <button onClick={() => switchMode("online")} className="px-6 py-2 glass rounded-lg neon-text-blue">В лобби</button>
            </div>
          </div>
        )}
        {gameOver && mode === "single" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-10">
            <div className="text-center">
              <p className="text-2xl font-bold neon-text-pink mb-2">Игра окончена!</p>
              <p className="text-[var(--text-secondary)] mb-1">Счёт: {score}</p>
              <button onClick={restart} className="px-6 py-2 glass rounded-lg neon-text-green">Заново</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 select-none touch-none">
        <div /><DirButton d="UP" onMove={mode === 'online' ? handleOnlineDirection : handleDirection} /><div />
        <DirButton d="LEFT" onMove={mode === 'online' ? handleOnlineDirection : handleDirection} />
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xs font-bold text-[var(--neon-green)] bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)]">{score}</div>
        <DirButton d="RIGHT" onMove={mode === 'online' ? handleOnlineDirection : handleDirection} />
        <div /><DirButton d="DOWN" onMove={mode === 'online' ? handleOnlineDirection : handleDirection} /><div />
      </div>
    </div>
  );
}
