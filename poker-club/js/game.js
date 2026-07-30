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
  const isStraight = straightHigh > 0;
  if (isFlush && straightHigh === 14) return { name: 'Роял-флеш', value: 10, kickers: [14] };
  if (isFlush && isStraight) return { name: 'Стрит-флеш', value: 9, kickers: [straightHigh] };
  if (groups[0].count === 4) return { name: 'Каре', value: 8, kickers: [groups[0].val, groups[1]?.val || 0] };
  if (groups[0].count === 3 && groups[1]?.count === 2) return { name: 'Фулл-хаус', value: 7, kickers: [groups[0].val, groups[1].val] };
  if (isFlush) return { name: 'Флеш', value: 6, kickers: vals };
  if (isStraight) return { name: 'Стрит', value: 5, kickers: [straightHigh] };
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

// ---- Game State ----
let gameState = null;
let gameMode = null; // 'ai' | 'multi'
let difficulty = null;
let timerInterval = null;

function startAIGame(diff) {
  difficulty = diff;
  gameMode = 'ai';
  navigate('game');
  initGame();
}

function initGame() {
  const state = {
    deck: shuffle(createDeck()),
    players: [
      { name: 'Вы', chips: 1000, cards: [], bet: 0, folded: false, allin: false, isAI: false, avatar: '😎' },
    ],
    community: [],
    pot: 0,
    currentBet: 0,
    turn: 0,
    phase: 'preflop',
    dealer: 0,
    currentPlayer: 0,
    lastAction: '',
    raiseAmount: 20,
    gameOver: false,
  };

  const aiNames = ['Alpha', 'Neo', 'Luna'];
  for (let i = 0; i < 3; i++) {
    state.players.push({
      name: aiNames[i],
      chips: 1000,
      cards: [],
      bet: 0,
      folded: false,
      allin: false,
      isAI: true,
      avatar: ['🤖', '🦊', '🐉'][i],
    });
  }

  // Deal hole cards
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].cards = [state.deck.pop(), state.deck.pop()];
  }

  // Blinds
  state.players[1].chips -= 10; state.players[1].bet = 10;
  state.players[2].chips -= 20; state.players[2].bet = 20;
  state.pot = 30;
  state.currentBet = 20;
  state.currentPlayer = 3;
  state.dealer = 0;

  gameState = state;
  renderGame();
  startTimer();
  if (state.currentPlayer > 0) setTimeout(() => aiTurn(), 600);
}

function renderGame() {
  const state = gameState;
  if (!state) return;

  // Pot
  document.getElementById('pot-display').textContent = state.pot;

  // Opponents
  const oppEl = document.getElementById('opponents');
  oppEl.innerHTML = '';
  for (let i = 1; i < state.players.length; i++) {
    const p = state.players[i];
    const div = document.createElement('div');
    div.className = `opponent ${state.currentPlayer === i ? 'active' : ''} ${p.folded ? 'opacity-30' : ''}`;
    div.innerHTML = `
      <div class="opponent-avatar gradient-border"><span>${p.avatar}</span></div>
      <span class="opponent-name">${p.name}</span>
      <span class="opponent-chips">${p.chips}</span>
      <div class="opponent-cards">
        <div class="opponent-card"></div>
        <div class="opponent-card"></div>
      </div>
    `;
    oppEl.appendChild(div);
  }

  // Community cards
  const slots = document.querySelectorAll('.card-slot');
  slots.forEach((slot, i) => {
    if (state.community[i]) {
      const c = state.community[i];
      slot.className = `card-slot dealt card ${cardColor(c)}`;
      slot.textContent = cardStr(c);
    } else {
      slot.className = 'card-slot';
      slot.textContent = '';
    }
  });

  // Player cards
  const player = state.players[0];
  ['pc-0', 'pc-1'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (player.cards[i]) {
      const c = player.cards[i];
      el.className = `card dealt ${cardColor(c)}`;
      el.textContent = cardStr(c);
    }
  });

  // Player chips
  document.getElementById('player-chips').textContent = player.chips;

  // Player status
  const statusEl = document.getElementById('player-status');
  if (state.currentPlayer === 0 && !state.gameOver) {
    statusEl.textContent = 'Ваш ход';
    statusEl.style.color = 'var(--neon-green)';
    statusEl.style.animation = 'pulse 1s infinite';
  } else {
    statusEl.textContent = state.lastAction || '';
    statusEl.style.animation = 'none';
  }

  updateActions();
}

function updateActions() {
  const state = gameState;
  if (!state || state.gameOver) { document.getElementById('actions').classList.add('hidden'); return; }
  if (state.currentPlayer !== 0 || state.players[0].folded || state.players[0].allin) {
    document.getElementById('actions').classList.add('hidden');
    return;
  }
  document.getElementById('actions').classList.remove('hidden');
  document.getElementById('raise-control').classList.add('hidden');
}

function startTimer() {
  clearInterval(timerInterval);
  const el = document.getElementById('game-timer');
  let time = 15;
  el.textContent = time;
  el.classList.remove('urgent');
  timerInterval = setInterval(() => {
    time--;
    el.textContent = time;
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
  const state = gameState;
  if (!state || state.gameOver || state.currentPlayer !== 0) return;

  const player = state.players[0];
  document.getElementById('actions').classList.add('hidden');
  document.getElementById('raise-control').classList.add('hidden');

  if (action === 'fold') {
    player.folded = true;
    state.lastAction = 'Fold';
    checkRoundEnd();
  } else if (action === 'check' || action === 'call') {
    const callAmount = state.currentBet - player.bet;
    const amount = Math.min(callAmount, player.chips);
    player.chips -= amount;
    player.bet += amount;
    state.pot += amount;
    state.lastAction = action === 'check' ? 'Check' : 'Call';
    advanceTurn();
  } else if (action === 'raise' || action === 'allin') {
    if (action === 'allin') {
      state.pot += player.chips;
      player.bet += player.chips;
      player.chips = 0;
      player.allin = true;
      state.lastAction = 'All In';
      state.currentBet = Math.max(state.currentBet, player.bet);
      advanceTurn();
    } else {
      document.getElementById('raise-control').classList.remove('hidden');
      const slider = document.getElementById('raise-slider');
      const minRaise = state.currentBet * 2;
      slider.min = Math.min(minRaise, player.chips);
      slider.max = player.chips;
      slider.value = Math.min(Math.max(50, minRaise), player.chips);
      document.getElementById('raise-amount').textContent = slider.value;
      slider.oninput = () => { document.getElementById('raise-amount').textContent = slider.value; };
      state.raiseAmount = parseInt(slider.value);
      return;
    }
  }
  renderGame();
  if (!state.gameOver) setTimeout(() => aiTurn(), 800);
}

function confirmRaise() {
  const state = gameState;
  if (!state) return;
  const player = state.players[0];
  const amount = parseInt(document.getElementById('raise-amount').textContent);
  const totalBet = amount;
  const callPart = state.currentBet - player.bet;
  const raisePart = totalBet - callPart;
  if (player.chips < totalBet) return;

  player.chips -= totalBet;
  player.bet += totalBet;
  state.pot += totalBet;
  state.currentBet = Math.max(state.currentBet, player.bet);
  state.lastAction = `Рэйз до ${amount}`;
  document.getElementById('raise-control').classList.add('hidden');
  advanceTurn();
  renderGame();
  if (!state.gameOver) setTimeout(() => aiTurn(), 800);
}

function aiTurn() {
  const state = gameState;
  if (!state || state.gameOver) return;
  if (state.currentPlayer === 0) return;
  const p = state.players[state.currentPlayer];
  if (p.folded || p.allin) { advanceTurn(); if (!state.gameOver) setTimeout(() => aiTurn(), 600); return; }

  const hand = evalHand(p.cards.concat(state.community));
  const mistakeChance = { easy: 0.9, medium: 0.5, hard: 0.15, expert: 0.02 }[difficulty] || 0.5;
  const shouldMistake = Math.random() < mistakeChance;

  let action = 'check';
  let raiseAmt = 0;

  const handStrength = hand.value / 10;
  const randomFactor = shouldMistake ? Math.random() * 0.6 : 0;

  const callAmount = Math.min(state.currentBet - p.bet, p.chips);
  const effectiveStrength = Math.max(0.1, handStrength - randomFactor);

  if (effectiveStrength > 0.7 && p.chips > state.currentBet * 3) {
    action = 'raise';
    raiseAmt = Math.floor(state.currentBet * 2 + state.pot * 0.3 * effectiveStrength);
    raiseAmt = Math.min(raiseAmt, p.chips);
  } else if (effectiveStrength > 0.4 && callAmount <= p.chips * 0.3) {
    action = 'call';
  } else if (effectiveStrength > 0.15 && callAmount <= p.chips * 0.15) {
    action = 'call';
  } else if (shouldMistake && Math.random() < 0.3) {
    action = 'call';
  } else {
    action = 'fold';
  }

  if (state.currentBet === p.bet) {
    action = (effectiveStrength > 0.3 || shouldMistake) ? 'check' : 'fold';
  }

  if (p.chips <= 0) { advanceTurn(); return; }

  if (action === 'fold') {
    p.folded = true;
    state.lastAction = p.name + ' Fold';
  } else if (action === 'check') {
    state.lastAction = p.name + ' Check';
    advanceTurn(); renderGame(); return;
  } else if (action === 'call') {
    p.chips -= callAmount;
    p.bet += callAmount;
    state.pot += callAmount;
    state.lastAction = p.name + ' Call';
  } else if (action === 'raise') {
    if (raiseAmt >= p.chips) { raiseAmt = p.chips; p.allin = true; }
    p.chips -= raiseAmt;
    p.bet += raiseAmt;
    state.pot += raiseAmt;
    state.currentBet = Math.max(state.currentBet, p.bet);
    state.lastAction = p.name + ` Рэйз ${raiseAmt}`;
  }

  advanceTurn();
  renderGame();
  if (!state.gameOver && state.currentPlayer > 0 && !state.players[state.currentPlayer].folded) {
    setTimeout(() => aiTurn(), 600);
  }
}

function advanceTurn() {
  const state = gameState;
  if (!state) return;
  resetTimer();
  let next = state.currentPlayer;
  const total = state.players.length;
  for (let i = 0; i < total; i++) {
    next = (next + 1) % total;
    if (!state.players[next].folded && !state.players[next].allin) break;
  }
  state.currentPlayer = next;

  // Check if round should advance
  const active = state.players.filter(p => !p.folded && !p.allin);
  if (active.length <= 1) { endHand(); return; }

  // Check if all active have acted
  const allActed = state.players.every(p => p.folded || p.allin || p.bet === state.currentBet);
  if (allActed) {
    if (state.phase === 'preflop') { dealCommunity(3); state.phase = 'flop'; }
    else if (state.phase === 'flop') { dealCommunity(1); state.phase = 'turn'; }
    else if (state.phase === 'turn') { dealCommunity(1); state.phase = 'river'; }
    else if (state.phase === 'river') { endHand(); return; }
    state.currentBet = 0;
    for (const p of state.players) p.bet = 0;
    state.currentPlayer = state.players.findIndex(p => !p.folded && !p.allin);
    if (state.currentPlayer < 0) endHand();
  }
}

function dealCommunity(n) {
  const state = gameState;
  if (!state) return;
  state.deck.pop(); // burn
  for (let i = 0; i < n && state.deck.length > 0; i++) {
    state.community.push(state.deck.pop());
  }
}

function checkRoundEnd() {
  const state = gameState;
  if (!state) return;
  const active = state.players.filter(p => !p.folded && !p.allin);
  if (active.length <= 1) { endHand(); return; }
  advanceTurn();
  renderGame();
  if (state.currentPlayer > 0) setTimeout(() => aiTurn(), 600);
}

function endHand() {
  const state = gameState;
  if (!state) return;
  state.gameOver = true;
  clearInterval(timerInterval);
  document.getElementById('game-timer').textContent = '--';

  const active = state.players.filter(p => !p.folded);

  let winners = active;
  if (state.community.length > 0) {
    let best = active[0];
    for (const p of active) {
      if (p.folded) continue;
      if (compareHands(p.cards.concat(state.community), best.cards.concat(state.community)) > 0) best = p;
    }
    winners = active.filter(p => !p.folded && compareHands(p.cards.concat(state.community), best.cards.concat(state.community)) === 0);
  }

  const winAmount = Math.floor(state.pot / winners.length);
  for (const w of winners) w.chips += winAmount;

  // Show result
  const modal = document.getElementById('result-modal');
  const text = document.getElementById('result-text');
  const handEl = document.getElementById('result-hand');

  let handName = '';
  if (state.community.length > 0 && !winners[0].folded) {
    const h = evalHand(winners[0].cards.concat(state.community));
    handName = h.name;
  }

  if (winners.some(w => w.name === 'Вы')) {
    text.className = 'result-text neon-green';
    text.textContent = `🎉 Вы выиграли ${winAmount}!`;
    handEl.textContent = handName ? `Комбинация: ${handName}` : '';
  } else {
    text.className = 'result-text neon-pink';
    text.textContent = `😔 Вы проиграли`;
    handEl.textContent = `Победил ${winners[0]?.name}`;
  }

  modal.classList.remove('hidden');
  renderGame();
}

function closeResult() {
  document.getElementById('result-modal').classList.add('hidden');
  exitGame();
}

function exitGame() {
  clearInterval(timerInterval);
  gameState = null;
  document.getElementById('raise-control').classList.add('hidden');
  navigate('home');
}
