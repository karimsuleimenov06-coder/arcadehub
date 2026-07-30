import { useState, useCallback } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANK_VAL: Record<string, number> = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14 };

type Card = { rank: string; suit: string };

type Difficulty = "easy" | "medium" | "hard";
const DIFF_LABELS: Record<Difficulty, string> = { easy: "Новичок", medium: "Любитель", hard: "Профи" };
const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard"];

function createDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  return d;
}

function shuffle(d: Card[]): Card[] {
  const a = [...d];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type HandRank = { name: string; value: number; kickers: number[] };

function evalHand(cards: Card[]): HandRank {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts).map(([k, v]) => ({ val: +k, count: v })).sort((a, b) => b.count - a.count || b.val - a.val);

  const isStraight = (() => {
    const u = [...new Set(vals)].sort((a, b) => b - a);
    if (u.length < 5) return false;
    if (u[0] - u[4] === 4) return true;
    if (u[0] === 14 && u[1] === 5 && u[2] === 4 && u[3] === 3 && u[4] === 2) return true;
    return false;
  })();

  const straightHigh = (() => {
    const u = [...new Set(vals)].sort((a, b) => b - a);
    if (u[0] === 14 && u[1] === 5 && u[2] === 4 && u[3] === 3 && u[4] === 2) return 5;
    if (u.length >= 5 && u[0] - u[4] === 4) return u[0];
    return 0;
  })();

  if (isFlush && straightHigh === 14) return { name: "Роял-флеш", value: 10, kickers: [14] };
  if (isFlush && straightHigh) return { name: "Стрит-флеш", value: 9, kickers: [straightHigh] };
  if (groups[0].count === 4) return { name: "Каре", value: 8, kickers: [groups[0].val, groups[1]?.val || 0] };
  if (groups[0].count === 3 && groups[1]?.count === 2) return { name: "Фулл-хаус", value: 7, kickers: [groups[0].val, groups[1].val] };
  if (isFlush) return { name: "Флеш", value: 6, kickers: vals };
  if (straightHigh) return { name: "Стрит", value: 5, kickers: [straightHigh] };
  if (groups[0].count === 3) return { name: "Сет", value: 4, kickers: [groups[0].val, ...groups.filter((_, i) => i > 0).map(g => g.val)] };
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairVals = [groups[0].val, groups[1].val].sort((a, b) => b - a);
    const kicker = groups[2]?.val || 0;
    return { name: "Две пары", value: 3, kickers: [...pairVals, kicker] };
  }
  if (groups[0].count === 2) {
    const kickers = groups.filter((_, i) => i > 0).map(g => g.val);
    return { name: "Пара", value: 2, kickers: [groups[0].val, ...kickers] };
  }
  return { name: "Старшая", value: 1, kickers: vals };
}

function compareHands(a: Card[], b: Card[]): number {
  const ha = evalHand(a), hb = evalHand(b);
  if (ha.value !== hb.value) return ha.value - hb.value;
  for (let i = 0; i < Math.max(ha.kickers.length, hb.kickers.length); i++) {
    const ka = ha.kickers[i] || 0, kb = hb.kickers[i] || 0;
    if (ka !== kb) return ka - kb;
  }
  return 0;
}

function aiDiscard(hand: Card[], diff: Difficulty): number[] {
  const ev = evalHand(hand);
  let mistake = 0;
  if (diff === "easy") mistake = 0.9;
  else if (diff === "medium") mistake = 0.5;
  else mistake = 0.01;

  if (Math.random() < mistake) {
    const idx = hand.map((_, i) => i);
    const n = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...idx].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  if (ev.value >= 6) return [];
  if (ev.value >= 4) return [];

  const vals = hand.map(c => RANK_VAL[c.rank]);
  const counts: Record<number, number> = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;

  const toDiscard: number[] = [];
  hand.forEach((c, i) => {
    const cnt = counts[RANK_VAL[c.rank]] || 0;
    if (cnt === 1) toDiscard.push(i);
  });

  if (toDiscard.length <= 3) return toDiscard;
  return toDiscard.sort(() => Math.random() - 0.5).slice(0, 3);
}

function handName(cards: Card[]): string {
  return evalHand(cards).name;
}

export default function PokerGame() {
  const [phase, setPhase] = useState<"bet" | "discard" | "result">("bet");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [playerChips, setPlayerChips] = useState(1000);
  const [aiChips, setAiChips] = useState(1000);
  const [pot, setPot] = useState(0);
  const [bet, setBet] = useState(10);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState<"player" | "ai" | "tie" | null>(null);
  const [diff, setDiff] = useState<Difficulty>("medium");

  const deal = useCallback(() => {
    const d = shuffle(createDeck());
    const p = d.slice(0, 5);
    const a = d.slice(5, 10);
    setDeck(d.slice(10));
    setPlayerHand(p);
    setAiHand(a);
    setSelected(new Set());
    setPhase("bet");
    setPot(0);
    setWinner(null);
    setMessage("Ваш ход: поставьте или пас");
  }, []);

  const startGame = useCallback(() => {
    setPlayerChips(1000);
    setAiChips(1000);
    deal();
  }, [deal]);

  const playerFold = () => {
    setAiChips(prev => prev + pot + bet);
    setAiChips(prev => prev + (bet > 0 ? bet : 10));
    setMessage("Вы сбросили. Противник забирает банк.");
    setPhase("result");
    setWinner("ai");
  };

  const playerCall = () => {
    const b = bet;
    setPot(prev => prev + b * 2);
    setPlayerChips(prev => prev - b);
    setAiChips(prev => prev - b);
    setMessage("Ставки сделаны! Выберите карты для замены (до 3)");
    setPhase("discard");
    setBet(b);
  };

  const playerRaise = () => {
    const b = bet * 2;
    const actual = Math.min(b, playerChips);
    setPot(prev => prev + actual + actual);
    setPlayerChips(prev => prev - actual);
    setAiChips(prev => prev - actual);
    setMessage("Ставки сделаны! Выберите карты для замены (до 3)");
    setPhase("discard");
    setBet(actual);
  };

  const toggleCard = (i: number) => {
    if (phase !== "discard") return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < 3) next.add(i);
      return next;
    });
  };

  const discardAndShow = () => {
    const discards = [...selected].sort((a, b) => a - b);
    let d = [...deck];

    const newPlayer = [...playerHand];
    for (const idx of discards.reverse()) {
      newPlayer[idx] = d.shift()!;
    }

    const aiDiscardIdx = aiDiscard(aiHand, diff);
    const newAi = [...aiHand];
    for (const idx of aiDiscardIdx.sort((a, b) => b - a)) {
      newAi[idx] = d.shift()!;
    }

    setDeck(d);
    setPlayerHand(newPlayer);
    setAiHand(newAi);

    const cmp = compareHands(newPlayer, newAi);
    if (cmp > 0) {
      setPlayerChips(prev => prev + pot * 2);
      setMessage(`Вы выиграли! ${handName(newPlayer)} vs ${handName(newAi)}`);
      setWinner("player");
    } else if (cmp < 0) {
      setAiChips(prev => prev + pot * 2);
      setMessage(`Противник выиграл! ${handName(newAi)} vs ${handName(newPlayer)}`);
      setWinner("ai");
    } else {
      const half = pot;
      setPlayerChips(prev => prev + half);
      setAiChips(prev => prev + half);
      setMessage(`Ничья! ${handName(newPlayer)}`);
      setWinner("tie");
    }
    setPhase("result");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {DIFF_ORDER.map(d => (
          <button key={d} onClick={() => { setDiff(d); startGame(); }}
            className={`px-3 py-1 text-[11px] rounded-lg transition-all ${
              diff === d
                ? d === "easy" ? "glass neon-text-green"
                  : d === "medium" ? "glass neon-text-yellow"
                  : "glass neon-text-pink"
                : "text-[var(--text-muted)]"
            }`}>
            {DIFF_LABELS[d]}
          </button>
        ))}
      </div>

      <div className="flex gap-6 text-xs text-[var(--text-secondary)]">
        <span className="neon-text-blue">Вы: <strong>{playerChips}</strong></span>
        <span>Банк: <strong className="neon-text-green">{pot * 2 || 0}</strong></span>
        <span className="neon-text-pink">ИИ: <strong>{aiChips}</strong></span>
      </div>

      {aiHand.length > 0 && (
        <div className="text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-1">Противник ({aiChips})</p>
          <div className="flex gap-1.5 justify-center">
            {aiHand.map((c, i) => (
              <div key={i} className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${
                phase === "result" ? (c.suit === "♥" || c.suit === "♦" ? "text-red-400" : "text-white") : "text-[var(--text-muted)]"
              }`}
                style={{ background: phase === "result" ? "var(--glass-bg)" : "rgba(0,243,255,0.05)" }}>
                {phase === "result" ? c.rank + c.suit : "?"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Вы ({playerChips})</p>
        <div className="flex gap-1.5 justify-center">
          {playerHand.length > 0 && playerHand.map((c, i) => (
            <button key={i} onClick={() => toggleCard(i)}
              className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                phase === "discard" && selected.has(i) ? "opacity-40 scale-90 border border-red-500" : ""
              } ${c.suit === "♥" || c.suit === "♦" ? "text-red-400" : "text-white"}`}
              style={{
                background: phase === "discard" && selected.has(i) ? "rgba(255,0,0,0.1)" : "var(--glass-bg)",
                boxShadow: "0 0 8px rgba(0,243,255,0.1)",
              }}>
              {c.rank}{c.suit}
            </button>
          ))}
        </div>
      </div>

      {phase === "result" && winner && (
        <div className={`text-sm font-bold ${winner === "player" ? "neon-text-green" : winner === "ai" ? "neon-text-pink" : "neon-text-yellow"}`}>
          {winner === "player" ? "Вы победили!" : winner === "ai" ? "Противник победил!" : "Ничья!"}
        </div>
      )}
      {phase === "result" && <div className="text-xs text-[var(--text-secondary)]">{message}</div>}

      {phase === "result" && (playerChips <= 0 || aiChips <= 0) && (
        <div className="text-center text-sm neon-text-yellow mb-2">
          Игра окончена! {playerChips <= 0 ? "Противник выиграл все фишки" : "Вы выиграли все фишки!"}
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {phase === "bet" && (
          <>
            <button onClick={playerFold} disabled={playerChips <= 0}
              className="px-4 py-2 glass rounded-lg text-xs text-red-400 disabled:opacity-30 active:scale-95">Пас</button>
            <button onClick={playerCall} disabled={playerChips < bet || aiChips < bet}
              className="px-4 py-2 glass rounded-lg text-xs neon-text-green active:scale-95">Колл ({bet})</button>
            <button onClick={playerRaise} disabled={playerChips < bet * 2 || aiChips < bet * 2}
              className="px-4 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Рэйз ({bet * 2})</button>
          </>
        )}
        {phase === "discard" && (
          <button onClick={discardAndShow}
            className="px-6 py-2 glass rounded-lg text-xs neon-text-green active:scale-95">
            Заменить {selected.size > 0 ? `(${selected.size})` : "(0)"} и открыться
          </button>
        )}
        {(phase === "result" || winner) && (playerChips > 0 && aiChips > 0) && (
          <button onClick={deal} className="px-6 py-2 glass rounded-lg text-xs neon-text-blue active:scale-95">Следующий раунд</button>
        )}
        <button onClick={startGame} className="px-6 py-2 glass rounded-lg text-xs text-[var(--text-muted)] active:scale-95">Заново</button>
      </div>
    </div>
  );
}