const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function createDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  return d;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function cardStr(c) { return c.rank + c.suit; }
function cardColor(c) { return c.suit === '♥' || c.suit === '♦' ? 'red' : 'black'; }

function evalHand(cards) {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts).map(([k, v]) => ({ val: +k, count: v })).sort((a, b) => b.count - a.count || b.val - a.val);
  const u = [...new Set(vals)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (u.length >= 5) {
    if (u[0] - u[4] === 4) straightHigh = u[0];
    else if (u[0] === 14 && u[1] === 5 && u[2] === 4 && u[3] === 3 && u[4] === 2) straightHigh = 5;
  }
  if (isFlush && straightHigh === 14) return { name: 'Роял-флеш', value: 10, kickers: [14] };
  if (isFlush && straightHigh) return { name: 'Стрит-флеш', value: 9, kickers: [straightHigh] };
  if (groups[0].count === 4) return { name: 'Каре', value: 8, kickers: [groups[0].val, groups[1]?.val || 0] };
  if (groups[0].count === 3 && groups[1]?.count === 2) return { name: 'Фулл-хаус', value: 7, kickers: [groups[0].val, groups[1].val] };
  if (isFlush) return { name: 'Флеш', value: 6, kickers: vals };
  if (straightHigh) return { name: 'Стрит', value: 5, kickers: [straightHigh] };
  if (groups[0].count === 3) return { name: 'Сет', value: 4, kickers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pv = [groups[0].val, groups[1].val].sort((a, b) => b - a);
    return { name: 'Две пары', value: 3, kickers: [...pv, groups[2]?.val || 0] };
  }
  if (groups[0].count === 2) return { name: 'Пара', value: 2, kickers: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
  return { name: 'Старшая', value: 1, kickers: vals };
}

function compareHands(a, b) {
  const ha = evalHand(a), hb = evalHand(b);
  if (ha.value !== hb.value) return ha.value - hb.value;
  for (let i = 0; i < Math.max(ha.kickers.length, hb.kickers.length); i++) {
    const ka = ha.kickers[i] || 0, kb = hb.kickers[i] || 0;
    if (ka !== kb) return ka - kb;
  }
  return 0;
}

let gameState = null;
let difficulty = null;
let timerInterval = null;

const AI_NAMES = ['Alpha','Neo','Luna','Vega','Orion'];
const AI_AVATARS = ['🤖','🦊','🐉','👾','👽'];

function $(id) { return document.getElementById(id) }

function startAIGame(diff) {
  difficulty = diff;
  navigate('game');
  setTimeout(initGame, 100);
}

function initGame() {
  const count = 6;
  const dk = shuffle(createDeck());
  const players = [{ name:'Вы', chips:1000, cards:[], bet:0, folded:false, allin:false, avatar:'😎' }];
  for (let i = 0; i < count - 1; i++) {
    players.push({ name:AI_NAMES[i], chips:1000, cards:[], bet:0, folded:false, allin:false, avatar:AI_AVATARS[i] });
  }
  for (let i = 0; i < count; i++) players[i].cards = [dk.pop(), dk.pop()];

  const pot = 30, currentBet = 20;
  players[1].chips -= 10; players[1].bet = 10;
  players[2].chips -= 20; players[2].bet = 20;

  gameState = { deck:dk, players, community:[], pot, currentBet, phase:'preflop', currentPlayer:3, lastAction:'', gameOver:false };
  renderGame();
  startTimer();
  if (gameState.currentPlayer > 0) setTimeout(aiTurn, 600);
}

function renderGame() {
  const s = gameState;
  if (!s) return;
  const el = (id) => { const e = $(id); if (!e) return null; return e; };

  const potEl = el('pot-display'); if (potEl) potEl.textContent = s.pot;

  // Opponents
  const oppEl = el('opponents');
  if (oppEl) {
    oppEl.innerHTML = '';
    for (let i = 1; i < s.players.length; i++) {
      const p = s.players[i];
      const div = document.createElement('div');
      div.className = `opponent ${s.currentPlayer === i ? 'active' : ''} ${p.folded ? 'opacity-30' : ''}`;
      div.innerHTML = `<div class="opponent-avatar gradient-border"><span>${p.avatar}</span></div>
        <span class="opponent-name">${p.name}</span>
        <span class="opponent-chips">${p.chips}</span>
        <div class="opponent-cards"><div class="opponent-card"></div><div class="opponent-card"></div></div>`;
      oppEl.appendChild(div);
    }
  }

  // Community
  const slots = document.querySelectorAll('.card-slot');
  slots.forEach((slot, i) => {
    if (s.community[i]) {
      const c = s.community[i];
      slot.className = `card-slot dealt card ${cardColor(c)}`;
      slot.textContent = cardStr(c);
    } else { slot.className = 'card-slot'; slot.textContent = ''; }
  });

  // Player cards
  const player = s.players[0];
  ['pc-0','pc-1'].forEach((id, i) => {
    const e = $(id);
    if (e && player.cards[i]) { const c = player.cards[i]; e.className = `card dealt ${cardColor(c)}`; e.textContent = cardStr(c); }
  });

  const chipsEl = el('player-chips'); if (chipsEl) chipsEl.textContent = player.chips;

  const statusEl = el('player-status');
  if (statusEl) {
    if (s.currentPlayer === 0 && !s.gameOver) { statusEl.textContent = 'Ваш ход'; statusEl.style.color = 'var(--neon-green)'; statusEl.style.animation = 'pulse 1s infinite'; }
    else { statusEl.textContent = s.lastAction || ''; statusEl.style.animation = 'none'; }
  }

  updateActions();
}

function updateActions() {
  const s = gameState;
  const a = $('actions'); if (!a) return;
  if (!s || s.gameOver) { a.classList.add('hidden'); return; }
  if (s.currentPlayer !== 0 || s.players[0].folded || s.players[0].allin) { a.classList.add('hidden'); return; }
  a.classList.remove('hidden');
  const r = $('raise-control'); if (r) r.classList.add('hidden');
}

function startTimer() {
  clearInterval(timerInterval);
  const el = $('game-timer'); if (!el) return;
  let time = 15; el.textContent = time; el.classList.remove('urgent');
  timerInterval = setInterval(() => {
    time--; el.textContent = time;
    if (time <= 5) el.classList.add('urgent');
    if (time <= 0) {
      clearInterval(timerInterval);
      if (gameState && gameState.currentPlayer === 0) playerAction('fold');
      else if (gameState && gameState.currentPlayer > 0) aiTurn();
    }
  }, 1000);
}

function resetTimer() { clearInterval(timerInterval); startTimer(); }

function playerAction(action) {
  const s = gameState;
  if (!s || s.gameOver || s.currentPlayer !== 0) return;
  const player = s.players[0];
  const a = $('actions'); if (a) a.classList.add('hidden');
  const r = $('raise-control'); if (r) r.classList.add('hidden');

  if (action === 'fold') { player.folded = true; s.lastAction = 'Fold'; advanceTurn(); }
  else if (action === 'check' || action === 'call') {
    const amt = Math.min(s.currentBet - player.bet, player.chips);
    player.chips -= amt; player.bet += amt; s.pot += amt;
    s.lastAction = action === 'check' ? 'Check' : 'Call';
    advanceTurn();
  } else if (action === 'allin') {
    s.pot += player.chips; player.bet += player.chips; player.chips = 0; player.allin = true;
    s.lastAction = 'All In'; s.currentBet = Math.max(s.currentBet, player.bet);
    advanceTurn();
  } else if (action === 'raise') {
    const slider = $('raise-slider'); if (!slider) return;
    const ra = $('raise-amount'); if (!ra) return;
    const minRaise = s.currentBet * 2;
    slider.min = Math.min(minRaise, player.chips); slider.max = player.chips;
    slider.value = Math.min(Math.max(50, minRaise), player.chips);
    ra.textContent = slider.value;
    slider.oninput = () => { ra.textContent = slider.value; };
    if (r) r.classList.remove('hidden');
    return;
  }
  renderGame();
  if (!s.gameOver) setTimeout(aiTurn, 800);
}

function confirmRaise() {
  const s = gameState; if (!s) return;
  const player = s.players[0];
  const amount = parseInt(($('raise-amount')||{}).textContent) || 50;
  if (player.chips < amount) return;
  player.chips -= amount; player.bet += amount; s.pot += amount;
  s.currentBet = Math.max(s.currentBet, player.bet);
  s.lastAction = `Рэйз до ${amount}`;
  const r = $('raise-control'); if (r) r.classList.add('hidden');
  advanceTurn(); renderGame();
  if (!s.gameOver) setTimeout(aiTurn, 800);
}

function aiTurn() {
  const s = gameState; if (!s || s.gameOver) return;
  if (s.currentPlayer === 0 || s.players[s.currentPlayer].folded || s.players[s.currentPlayer].allin) return;
  const p = s.players[s.currentPlayer];

  const mistakeChance = { easy:0.9, medium:0.5, hard:0.15, expert:0.02 }[difficulty] || 0.5;
  const shouldMistake = Math.random() < mistakeChance;
  const handStr = s.community.length > 0 ? evalHand(p.cards.concat(s.community)).value / 10 : 0.3;
  const eff = Math.max(0.1, handStr - (shouldMistake ? Math.random() * 0.6 : 0));
  const callAmt = Math.min(s.currentBet - p.bet, p.chips);

  let action = 'check', raiseAmt = 0;
  if (s.currentBet === p.bet) action = (eff > 0.2 || shouldMistake) ? 'check' : 'fold';
  else if (eff > 0.65 && p.chips > s.currentBet * 3) { action = 'raise'; raiseAmt = Math.min(Math.floor(s.currentBet * 2 + s.pot * 0.3 * eff), p.chips); }
  else if (eff > 0.35 && callAmt <= p.chips * 0.3) action = 'call';
  else if (eff > 0.15 && callAmt <= p.chips * 0.15) action = 'call';
  else if (shouldMistake && Math.random() < 0.3) action = 'call';
  else action = 'fold';

  if (p.chips <= 0) { advanceTurn(); return; }

  if (action === 'fold') { p.folded = true; s.lastAction = p.name + ' Fold'; }
  else if (action === 'check') { s.lastAction = p.name + ' Check'; advanceTurn(); renderGame(); return; }
  else if (action === 'call') { p.chips -= callAmt; p.bet += callAmt; s.pot += callAmt; s.lastAction = p.name + ' Call'; }
  else if (action === 'raise') { if (raiseAmt >= p.chips) { raiseAmt = p.chips; p.allin = true; } p.chips -= raiseAmt; p.bet += raiseAmt; s.pot += raiseAmt; s.currentBet = Math.max(s.currentBet, p.bet); s.lastAction = p.name + ' Рэйз ' + raiseAmt; }

  advanceTurn(); renderGame();
  if (!s.gameOver && s.currentPlayer > 0 && !s.players[s.currentPlayer].folded) setTimeout(aiTurn, 600);
}

function advanceTurn() {
  const s = gameState; if (!s) return;
  resetTimer();
  let next = s.currentPlayer;
  const total = s.players.length;
  for (let i = 0; i < total; i++) { next = (next + 1) % total; if (!s.players[next].folded && !s.players[next].allin) break; }
  s.currentPlayer = next;

  const active = s.players.filter(p => !p.folded && !p.allin);
  if (active.length <= 1) { endHand(); return; }

  const allActed = s.players.every(p => p.folded || p.allin || p.bet === s.currentBet);
  if (!allActed) return;

  if (s.phase === 'preflop') { s.deck.pop(); for (let i=0;i<3 && s.deck.length>0;i++) s.community.push(s.deck.pop()); s.phase = 'flop'; }
  else if (s.phase === 'flop') { s.deck.pop(); if (s.deck.length>0) s.community.push(s.deck.pop()); s.phase = 'turn'; }
  else if (s.phase === 'turn') { s.deck.pop(); if (s.deck.length>0) s.community.push(s.deck.pop()); s.phase = 'river'; }
  else if (s.phase === 'river') { endHand(); return; }

  s.currentBet = 0;
  for (const p of s.players) p.bet = 0;
  s.currentPlayer = s.players.findIndex(p => !p.folded && !p.allin);
  if (s.currentPlayer < 0) endHand();
}

function endHand() {
  const s = gameState; if (!s) return;
  s.gameOver = true; clearInterval(timerInterval);
  const t = $('game-timer'); if (t) t.textContent = '--';

  const active = s.players.filter(p => !p.folded);
  if (active.length === 0) { showResult('Ничья', '', false); renderGame(); return; }

  let winners = active;
  if (s.community.length > 0) {
    let best = active[0];
    for (const p of active) { if (compareHands(p.cards.concat(s.community), best.cards.concat(s.community)) > 0) best = p; }
    winners = active.filter(p => compareHands(p.cards.concat(s.community), best.cards.concat(s.community)) === 0);
  }

  const share = Math.floor(s.pot / winners.length);
  for (const w of winners) w.chips += share;

  const hn = s.community.length > 0 ? evalHand(winners[0].cards.concat(s.community)).name : '';
  const iw = winners.some(w => w.name === 'Вы');
  showResult(iw ? '🎉 Вы выиграли ' + share + '!' : '😔 Победил ' + winners[0].name, hn ? 'Комбинация: ' + hn : '', iw);
  renderGame();
}

function showResult(text, hand, win) {
  const modal = $('result-modal'); const txt = $('result-text'); const h = $('result-hand');
  if (!modal || !txt) return;
  txt.className = 'result-text ' + (win ? 'neon-green' : 'neon-pink');
  txt.textContent = text;
  if (h) h.textContent = hand || '';
  modal.classList.remove('hidden');
}

function closeResult() {
  const modal = $('result-modal'); if (modal) modal.classList.add('hidden');
  exitGame();
}

function exitGame() {
  clearInterval(timerInterval); gameState = null;
  const r = $('raise-control'); if (r) r.classList.add('hidden');
  navigate('home');
}
