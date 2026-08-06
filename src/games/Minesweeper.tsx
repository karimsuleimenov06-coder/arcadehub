import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

const COLS = 12;
const ROWS = 14;
const MINES = 24;
const COLORS = ["#00f3ff", "#00ff88", "#ff3355", "#9b59b6", "#ff2d95", "#00f3ff", "#ffdd00", "#6b6b80"];

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };

function genMines(): boolean[][] {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!grid[r][c]) { grid[r][c] = true; placed++; }
  }
  return grid;
}

function countAdjacent(mines: boolean[][], r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && mines[nr][nc]) count++;
    }
  return count;
}

export default function Minesweeper() {
  const { user } = useAuth();
  const { addScore } = useGame();
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    try { return Number(localStorage.getItem("arcadehub_minesweeper_best") || 0); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [flags, setFlags] = useState(0);

  const minesRef = useRef<boolean[][]>([]);
  const cellsRef = useRef<Cell[][]>([]);
  const revealedRef = useRef(0);

  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem("arcadehub_minesweeper_best", String(score)); } catch {} }
  }, [score, best]);

  useEffect(() => {
    if ((gameOver || won) && !saved && user && score > 0) { addScore("minesweeper", score); setSaved(true); }
  }, [gameOver, won, saved, user, score, addScore]);

  const init = useCallback(() => {
    const mines = genMoves();
    minesRef.current = mines;
    revealedRef.current = 0;
    const cells: Cell[][] = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ({ mine: mines[r][c], revealed: false, flagged: false, adjacent: countAdjacent(mines, r, c) }))
    );
    cellsRef.current = cells.map(r => r.map(c => ({ ...c })));
    setGrid(cellsRef.current.map(r => r.map(c => ({ ...c }))));
    setFlags(0);
    setScore(0); setGameOver(false); setWon(false); setSaved(false); setStarted(true);
  }, []);

  function genMoves() { return genMines(); }

  const reveal = useCallback((r: number, c: number) => {
    const cells = cellsRef.current;
    const cell = cells[r][c];
    if (cell.revealed || cell.flagged || gameOver || won) return;

    if (!started) {
      // First click: regenerate if mine
      if (cell.mine) {
        const mines = genMines();
        minesRef.current = mines;
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++) {
            cells[y][x].mine = mines[y][x];
            cells[y][x].adjacent = countAdjacent(mines, y, x);
          }
      }
    }

    if (!started) setStarted(true);

    cell.revealed = true;
    revealedRef.current++;

    if (cell.mine) {
      // reveal all
      for (const row of cells) for (const c of row) c.revealed = true;
      setGrid(cells.map(r => r.map(c => ({ ...c }))));
      setGameOver(true);
      return;
    }

    if (cell.adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !cells[nr][nc].revealed && !cells[nr][nc].flagged)
            reveal(nr, nc);
        }
    }

    const totalRevealed = revealedRef.current;
    setScore(totalRevealed);
    setGrid(cells.map(r => r.map(c => ({ ...c }))));
    if (totalRevealed >= ROWS * COLS - MINES) {
      for (const row of cells) for (const c of row) if (c.mine) c.flagged = true;
      setGrid(cells.map(r => r.map(c => ({ ...c }))));
      setWon(true);
    }
  }, [gameOver, won, started]);

  const flag = useCallback((r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    const cells = cellsRef.current;
    const cell = cells[r][c];
    if (cell.revealed || gameOver || won) return;
    cell.flagged = !cell.flagged;
    setFlags(f => cell.flagged ? f + 1 : f - 1);
    setGrid(cells.map(r => r.map(c => ({ ...c }))));
  }, [gameOver, won]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[360px] gap-3">
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Открыто</div>
            <div className="font-bold neon-text-green text-lg leading-tight">{score}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Флаги</div>
            <div className="font-bold text-lg leading-tight" style={{ color: "var(--neon-pink)" }}>{flags}</div>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Рекорд</div>
            <div className="font-bold neon-text-yellow text-lg leading-tight">{best}</div>
          </div>
        </div>
        <button onClick={() => { init(); }} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Новая</button>
      </div>

      <div className="glass rounded-xl p-2 select-none" style={{ width: "min(360px, calc(100vw - 40px))" }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 2 }}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onClick={() => reveal(r, c)}
                onContextMenu={(e) => flag(r, c, e)}
                className="aspect-square rounded flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all cursor-pointer select-none"
                style={{
                  background: cell.revealed ? (cell.mine ? "#ff3355" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.12)",
                  color: cell.revealed ? (cell.mine ? "#fff" : (COLORS[cell.adjacent - 1] || "#fff")) : cell.flagged ? "#ff2d95" : "transparent",
                  boxShadow: cell.revealed && cell.mine ? "0 0 10px rgba(255,51,85,0.5)" : "none",
                }}
              >
                {cell.revealed ? (cell.mine ? "💣" : (cell.adjacent > 0 ? cell.adjacent : "")) : (cell.flagged ? "🚩" : "")}
              </div>
            ))
          )}
        </div>
      </div>

      {!started && (
        <div className="text-xs text-[var(--text-muted)]">Клик — открыть · ПКМ/долгое нажатие — флаг</div>
      )}
      {won && (
        <div className="text-sm font-bold neon-text-green">Победа! Все мины найдены 🎉</div>
      )}
    </div>
  );
}
