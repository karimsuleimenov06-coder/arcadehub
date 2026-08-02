import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

type Player = "X" | "O";
type Board = (Player | null)[];

const WINNERS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

type Difficulty = "easy" | "medium" | "hard";
const DIFF_LABELS: Record<Difficulty, string> = { easy: "Новичок", medium: "Любитель", hard: "Профи" };
const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard"];
const DIFF_MISTAKE: Record<Difficulty, number> = { easy: 0.9, medium: 0.5, hard: 0.01 };

function checkWinner(b: Board): Player | "draw" | null {
  for (const [a,c,d] of WINNERS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  if (b.every(c => c !== null)) return "draw";
  return null;
}

function bestMove(b: Board): number {
  const empty = b.map((c, i) => c === null ? i : null).filter(i => i !== null) as number[];
  if (empty.length === 0) return -1;
  for (const i of empty) { const test = [...b]; test[i] = "O"; if (checkWinner(test) === "O") return i; }
  for (const i of empty) { const test = [...b]; test[i] = "X"; if (checkWinner(test) === "X") return i; }
  if (b[4] === null) return 4;
  const corners = [0,2,6,8].filter(i => b[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

function aiMove(b: Board, diff: Difficulty): number {
  const empty = b.map((c, i) => c === null ? i : null).filter(i => i !== null) as number[];
  if (empty.length === 0) return -1;
  if (Math.random() < DIFF_MISTAKE[diff]) return empty[Math.floor(Math.random() * empty.length)];
  return bestMove(b);
}

const API = '/api/room'
async function apiCall(body: any) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}

export default function TicTacToeGame() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>("X");
  const [winner, setWinner] = useState<null | Player | "draw">(null);
  const [mode, setMode] = useState<"ai" | "local" | "online">("ai");
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const boardRef = useRef(board); boardRef.current = board;
  const turnRef = useRef(turn); turnRef.current = turn;
  const submittedRef = useRef(false);

  const [roomCode, setRoomCode] = useState("");
  const [mySymbol, setMySymbol] = useState<Player>("X");
  const [opponent, setOpponent] = useState("");
  const [onlineStatus, setOnlineStatus] = useState<"idle"|"lobby"|"playing">("idle");
  const [joinCode, setJoinCode] = useState("");
  const [myName, setMyName] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = undefined } };
  const moveSeqRef = useRef(0);

  useEffect(() => { setWinner(checkWinner(board)); }, [board]);

  useEffect(() => {
    if (mode !== "ai" || turn !== "O" || winner) return;
    const timer = setTimeout(() => {
      const move = aiMove(board, diff);
      if (move < 0) return;
      setBoard(prev => { const n = [...prev]; n[move] = "O"; return n; });
      setTurn("X");
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, turn, winner, diff, board]);

  const handleClick = useCallback((i: number) => {
    if (boardRef.current[i] !== null || checkWinner(boardRef.current)) return;
    if (mode === "ai" && turnRef.current === "O") return;
    if (mode === "online" && turnRef.current !== mySymbol) return;

    if (mode === "online") {
      moveSeqRef.current++;
      apiCall({ action: 'move', roomCode, username: myName, move: i }).then(r => {
        if (r && r.ok) {
          setBoard(r.room.state.board);
          setTurn(r.room.turn === 0 ? "X" : "O");
          setWinner(r.room.state.winner);
        }
      }).catch(() => {});
      return;
    }

    setBoard(prev => { const n = [...prev]; n[i] = turnRef.current; return n; });
    setTurn(prev => prev === "X" ? "O" : "X");
  }, [mode, mySymbol, roomCode, myName]);

  const restart = () => { setBoard(Array(9).fill(null)); setTurn("X"); setWinner(null); submittedRef.current = false; };

  const switchMode = (m: "ai" | "local" | "online") => {
    stopPoll(); setMode(m);
    if (m !== "online") { setOnlineStatus("idle"); restart(); setScore({ X: 0, O: 0, draw: 0 }); }
  };

  useEffect(() => { if (!winner) return; setScore(prev => { const key = winner === "draw" ? "draw" : winner; return { ...prev, [key]: prev[key] + 1 }; }); }, [winner]);

  useEffect(() => {
    if (!winner || submittedRef.current || mode === "online") return;
    submittedRef.current = true;
    addScore("tictactoe", winner === "X" ? 10 : winner === "O" ? 5 : 3);
  }, [winner, mode, addScore]);

  const createRoom = async () => {
    const uname = user?.username || 'Игрок1';
    const r = await apiCall({ action: 'create', game: 'tictactoe', username: uname })
    if (r.ok) {
      setMyName(r.room.players[0]?.username || uname);
      setRoomCode(r.room.id); setMySymbol("X"); setOpponent(""); setOnlineStatus("lobby");
      setBoard(Array(9).fill(null)); setWinner(null);
      pollRef.current = setInterval(async () => {
        const s = await apiCall({ action: 'status', roomCode: r.room.id })
        if (s.ok && s.room.status === 'playing') {
          setOpponent(s.room.players[1]?.username || ''); setOnlineStatus("playing"); setTurn("X"); stopPoll()
        }
      }, 1500);
    }
  };

  const joinRoom = async (code: string) => {
    const uname = user?.username || 'Игрок2';
    const r = await apiCall({ action: 'join', roomCode: code, username: uname })
    if (r.ok) {
      setMyName(r.room.players[1]?.username || uname);
      setRoomCode(code.toUpperCase()); setMySymbol("O"); setOpponent(r.room.players[0]?.username || '');
      setOnlineStatus("playing"); setBoard(Array(9).fill(null)); setWinner(null); setTurn("X");
    } else { alert(r.error) }
  };

  useEffect(() => {
    if (mode !== "online" || onlineStatus !== "playing") return;
    pollRef.current = setInterval(async () => {
      const pollSeq = moveSeqRef.current;
      const s = await apiCall({ action: 'status', roomCode })
      if (!s.ok) return;
      if (moveSeqRef.current !== pollSeq) return;
      const r = s.room;
      if (r.state) { setBoard(r.state.board); setWinner(r.state.winner); setTurn(r.turn === 0 ? "X" : "O") }
      if (r.status === 'finished') stopPoll();
    }, 1500);
    return () => stopPoll();
  }, [mode, onlineStatus, roomCode]);

  useEffect(() => { return () => stopPoll(); }, []);

  if (mode === "online" && onlineStatus === "idle") {
    return <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={() => switchMode("ai")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">🤖 С ИИ</button>
        <button onClick={() => switchMode("local")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">👥 Вдвоём</button>
        <button onClick={() => {}} className="px-4 py-1.5 text-xs rounded-lg glass neon-text-blue">🌐 Онлайн</button>
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs py-8">
        <button onClick={createRoom} className="w-full px-6 py-3 glass rounded-xl text-sm neon-text-blue font-bold hover:shadow-[0_0_30px_rgba(0,243,255,0.2)] transition-all active:scale-95">Создать комнату</button>
        <div className="flex items-center gap-2 w-full"><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/><span className="text-xs text-[var(--text-muted)]">или</span><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/></div>
        <div className="flex gap-2 w-full">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Код комнаты" maxLength={6}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{background:"var(--glass-bg)",border:"1px solid var(--glass-border)",color:"var(--text)"}}/>
          <button onClick={()=>joinRoom(joinCode)} className="px-4 py-2 glass rounded-lg text-xs neon-text-purple active:scale-95">Войти</button>
        </div>
      </div>
    </div>;
  }

  if (mode === "online" && onlineStatus === "lobby") {
    return <div className="flex flex-col items-center gap-4">
      <div className="glass-card text-center py-8 px-8">
        <p className="text-xs text-[var(--text-muted)] mb-2">Код комнаты</p>
        <p className="text-3xl font-bold tracking-[0.2em] neon-text-blue" style={{fontFamily:"var(--font-title)"}}>{roomCode}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-4">Ожидание противника...</p>
        <div className="mt-3 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--neon-blue)] animate-bounce" style={{animationDelay:"0s"}}/>
          <div className="w-2 h-2 rounded-full bg-[var(--neon-purple)] animate-bounce" style={{animationDelay:"0.15s"}}/>
          <div className="w-2 h-2 rounded-full bg-[var(--neon-blue)] animate-bounce" style={{animationDelay:"0.3s"}}/>
        </div>
      </div>
    </div>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={() => switchMode("ai")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "ai" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>🤖 С ИИ</button>
        <button onClick={() => switchMode("local")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "local" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>👥 Вдвоём</button>
        <button onClick={() => switchMode("online")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "online" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>🌐 Онлайн</button>
      </div>

      {mode === "ai" && (
        <div className="flex gap-1.5">
          {DIFF_ORDER.map(d => (
            <button key={d} onClick={() => { setDiff(d); restart(); }}
              className={`px-3 py-1 text-[11px] rounded-lg transition-all ${diff === d
                ? d === "easy" ? "glass neon-text-green" : d === "medium" ? "glass neon-text-yellow" : "glass neon-text-pink"
                : "text-[var(--text-muted)]"}`}>
              {DIFF_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {mode === "online" && onlineStatus === "playing" && (
        <div className="text-xs text-[var(--text-secondary)]">
          {opponent ? <span>Противник: <strong className="neon-text-purple">{opponent}</strong></span> : <span>Ожидание...</span>}
          <span className="ml-2">{mySymbol === "X" ? "❌" : "⭕"}</span>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        {mode !== "online" && <><span>X: <strong className="neon-text-blue">{score.X}</strong></span><span>Ничья: <strong>{score.draw}</strong></span><span>O: <strong className="neon-text-pink">{score.O}</strong></span></>}
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 glass rounded-xl" style={{ width: "min(300px, calc(100vw - 60px))", aspectRatio: "1" }}>
        {board.map((cell, i) => (
          <button key={i} onClick={() => handleClick(i)}
            disabled={!!winner || (mode === "ai" && turn === "O") || (mode === "online" && turn !== mySymbol)}
            className="rounded-lg text-3xl sm:text-4xl font-bold active:scale-95 transition-all disabled:cursor-not-allowed"
            style={{
              background: cell ? "var(--glass-bg)" : "rgba(0,243,255,0.03)",
              color: cell === "X" ? "var(--neon-blue)" : "var(--neon-pink)",
              boxShadow: cell === "X" ? "0 0 12px rgba(0,243,255,0.2)" : cell === "O" ? "0 0 12px rgba(255,45,149,0.2)" : "none",
            }}>
            {cell}
          </button>
        ))}
      </div>

      <div className="text-sm">
        {winner === "draw" && <span className="neon-text-yellow">Ничья!</span>}
        {winner && winner !== "draw" && <span className={winner === "X" ? "neon-text-blue" : "neon-text-pink"}>{winner} победил!</span>}
        {!winner && <span className="text-[var(--text-secondary)]">
          {mode === "online" ? (turn === mySymbol ? "Ваш ход" : "Ход противника...") : `Ход: ${turn}`}
        </span>}
      </div>

      {mode !== "online" && <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green hover:neon-glow-green transition-all active:scale-95">Заново</button>}
      {mode === "online" && winner && <button onClick={() => switchMode("online")} className="px-6 py-2 glass rounded-lg text-sm neon-text-blue transition-all active:scale-95">В лобби</button>}
    </div>
  );
}