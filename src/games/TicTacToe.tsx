import { useState, useCallback, useEffect, useRef } from "react";

type Player = "X" | "O";
type Board = (Player | null)[];

const WINNERS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(b: Board): Player | "draw" | null {
  for (const [a,c,d] of WINNERS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  if (b.every(c => c !== null)) return "draw";
  return null;
}

function aiMove(b: Board): number {
  const empty = b.map((c, i) => c === null ? i : null).filter(i => i !== null) as number[];
  if (empty.length === 0) return -1;
  for (const i of empty) {
    const test = [...b]; test[i] = "O";
    if (checkWinner(test) === "O") return i;
  }
  for (const i of empty) {
    const test = [...b]; test[i] = "X";
    if (checkWinner(test) === "X") return i;
  }
  if (b[4] === null) return 4;
  const corners = [0,2,6,8].filter(i => b[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToeGame() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>("X");
  const [winner, setWinner] = useState<null | Player | "draw">(null);
  const [mode, setMode] = useState<"ai" | "local">("ai");
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 });
  const boardRef = useRef(board);
  boardRef.current = board;
  const turnRef = useRef(turn);
  turnRef.current = turn;

  useEffect(() => {
    setWinner(checkWinner(board));
  }, [board]);

  useEffect(() => {
    if (mode !== "ai" || turn !== "O" || winner) return;
    const timer = setTimeout(() => {
      const move = aiMove(boardRef.current);
      if (move < 0) return;
      setBoard(prev => { const n = [...prev]; n[move] = "O"; return n; });
      setTurn("X");
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, turn, winner]);

  const handleClick = useCallback((i: number) => {
    if (boardRef.current[i] !== null || checkWinner(boardRef.current) || (mode === "ai" && turnRef.current === "O")) return;
    setBoard(prev => { const n = [...prev]; n[i] = turnRef.current; return n; });
    setTurn(prev => prev === "X" ? "O" : "X");
  }, [mode]);

  const restart = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinner(null);
  };

  const switchMode = (m: "ai" | "local") => {
    setMode(m);
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinner(null);
    setScore({ X: 0, O: 0, draw: 0 });
  };

  useEffect(() => {
    if (!winner) return;
    setScore(prev => {
      const key = winner === "draw" ? "draw" : winner;
      return { ...prev, [key]: prev[key] + 1 };
    });
  }, [winner]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={() => switchMode("ai")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "ai" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>
          🤖 С ИИ
        </button>
        <button onClick={() => switchMode("local")}
          className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode === "local" ? "glass neon-text-blue" : "text-[var(--text-muted)]"}`}>
          👥 Вдвоём
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span>X: <strong className="neon-text-blue">{score.X}</strong></span>
        <span>Ничья: <strong>{score.draw}</strong></span>
        <span>O: <strong className="neon-text-pink">{score.O}</strong></span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 glass rounded-xl" style={{ width: "min(300px, calc(100vw - 60px))", aspectRatio: "1" }}>
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!!winner || (mode === "ai" && turn === "O")}
            className="rounded-lg text-3xl sm:text-4xl font-bold active:scale-95 transition-all disabled:cursor-not-allowed"
            style={{
              background: cell ? "var(--glass-bg)" : "rgba(0,243,255,0.03)",
              color: cell === "X" ? "var(--neon-blue)" : "var(--neon-pink)",
              boxShadow: cell === "X" ? "0 0 12px rgba(0,243,255,0.2)" : cell === "O" ? "0 0 12px rgba(255,45,149,0.2)" : "none",
            }}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="text-sm">
        {winner === "draw" && <span className="neon-text-yellow">Ничья!</span>}
        {winner && winner !== "draw" && <span className={winner === "X" ? "neon-text-blue" : "neon-text-pink"}>{winner} победил!</span>}
        {!winner && <span className="text-[var(--text-secondary)]">Ход: <strong className={turn === "X" ? "neon-text-blue" : "neon-text-pink"}>{turn}</strong></span>}
      </div>

      <button onClick={restart} className="px-6 py-2 glass rounded-lg text-sm neon-text-green hover:neon-glow-green transition-all active:scale-95">
        Заново
      </button>
    </div>
  );
}