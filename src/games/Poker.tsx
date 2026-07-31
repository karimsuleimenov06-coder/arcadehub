import { useState, useCallback, useEffect, useRef } from "react";

const SUITS = ["♠","♥","♦","♣"];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RV: Record<string,number> = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};
type Card = {rank:string;suit:string};
type Difficulty = "easy"|"medium"|"hard"|"expert";
const DIFF_L: Record<Difficulty,string> = {easy:"Новичок",medium:"Любитель",hard:"Сложный",expert:"Эксперт"};
const DIFF_O: Difficulty[] = ["easy","medium","hard","expert"];
const AI_N = ["Alpha","Neo","Luna"];
const AI_A = ["🤖","🦊","🐉"];

const MISTAKE: Record<Difficulty,number> = {easy:0.9,medium:0.5,hard:0.15,expert:0.02};

function shuffle<T>(a:T[]){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function cs(c:Card){return c.rank+c.suit}
function cr(c:Card){return c.suit==='♥'||c.suit==='♦'?'red':'black'}

function eh(cards:Card[]){const v=cards.map(c=>RV[c.rank]).sort((a,b)=>b-a),s=cards.every(c=>c.suit===cards[0].suit),cnt:Record<number,number>={};for(const x of v)cnt[x]=(cnt[x]||0)+1;const g=Object.entries(cnt).map(([k,v])=>({v:+k,c:v})).sort((a,b)=>b.c-a.c||b.v-a.v),u=[...new Set(v)].sort((a,b)=>b-a);let sh=0;if(u.length>=5){if(u[0]-u[4]===4)sh=u[0];else if(u[0]===14&&u[1]===5&&u[2]===4&&u[3]===3&&u[4]===2)sh=5}if(s&&sh===14)return{n:"Роял-флеш",s:10,k:[14]};if(s&&sh)return{n:"Стрит-флеш",s:9,k:[sh]};if(g[0].c===4)return{n:"Каре",s:8,k:[g[0].v,g[1]?.v||0]};if(g[0].c===3&&g[1]?.c===2)return{n:"Фулл-хаус",s:7,k:[g[0].v,g[1].v]};if(s)return{n:"Флеш",s:6,k:v};if(sh)return{n:"Стрит",s:5,k:[sh]};if(g[0].c===3)return{n:"Сет",s:4,k:[g[0].v,...g.slice(1).map(x=>x.v)]};if(g[0].c===2&&g[1]?.c===2){const p=[g[0].v,g[1].v].sort((a,b)=>b-a);return{n:"Две пары",s:3,k:[...p,g[2]?.v||0]}}if(g[0].c===2)return{n:"Пара",s:2,k:[g[0].v,...g.slice(1).map(x=>x.v)]};return{n:"Старшая",s:1,k:v}}
function ch(a:Card[],b:Card[]){const ha=eh(a),hb=eh(b);if(ha.s!==hb.s)return ha.s-hb.s;for(let i=0;i<Math.max(ha.k.length,hb.k.length);i++)if((ha.k[i]||0)!==(hb.k[i]||0))return(ha.k[i]||0)-(hb.k[i]||0);return 0}

interface P{name:string;chips:number;cards:Card[];bet:number;folded:boolean;allin:boolean;isAI:boolean;avatar:string}

const API = '/api/room'
function apiCall(body: any) { return fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }).then(r=>r.json()) }

export default function PokerGame(){
  const [phase,setPhase]=useState<"idle"|"play"|"result">("idle");
  const [players,setPlayers]=useState<P[]>([]);
  const [community,setCommunity]=useState<Card[]>([]);
  const [pot,setPot]=useState(0);
  const [cb,setCb]=useState(0);
  const [cp,setCp]=useState(0);
  const [diff,setDiff]=useState<Difficulty>("medium");
  const [timer,setTimer]=useState(15);
  const [result,setResult]=useState<{text:string;hand:string;win:boolean}|null>(null);
  const [ra,setRa]=useState(50);
  const [sr,setSr]=useState(false);
  const [dealt,setDealt]=useState(false);
  const deckRef=useRef<Card[]>([]);
  const ti=useRef<ReturnType<typeof setInterval>>();
  const phaseRef=useRef(phase);phaseRef.current=phase;
  const cpRef=useRef(cp);cpRef.current=cp;
  const cbRef=useRef(cb);cbRef.current=cb;
  const diffRef=useRef(diff);diffRef.current=diff;
  const playersRef=useRef(players);playersRef.current=players;
  const communityRef=useRef(community);communityRef.current=community;
  const potRef=useRef(pot);potRef.current=pot;

  // Online mode state
  const [mode,setMode]=useState<"ai"|"online">("ai");
  const [onlineUI,setOnlineUI]=useState<'idle'|'lobby'|'playing'>('idle');
  const [roomCode,setRoomCode]=useState('');
  const [joinCode,setJoinCode]=useState('');
  const [onlineState,setOnlineState]=useState<any>(null);
  const [isP1,setIsP1]=useState(true);
  const pollRef=useRef<ReturnType<typeof setInterval>>();
  const opollRef=useRef<ReturnType<typeof setInterval>>();
  const myNameRef=useRef('Игрок1');

  const ct=()=>{if(ti.current){clearInterval(ti.current);ti.current=undefined}};

  const st=useCallback(()=>{
    ct();setTimer(15);
    ti.current=setInterval(()=>{setTimer(t=>{if(t<=1){ct();return 15}return t-1})},1000);
  },[]);

  const endHand=useCallback(()=>{
    ct();setPhase("result");
    const potNow=potRef.current;
    const comm=communityRef.current;
    setPlayers(prev=>{
      const active=prev.filter(p=>!p.folded);
      if(!active.length)return prev;
      if(active.length===1){active[0].chips+=potNow;return[...prev]}
      let best=active[0];for(const p of active)if(ch(p.cards.concat(comm),best.cards.concat(comm))>0)best=p;
      const ws=active.filter(p=>ch(p.cards.concat(comm),best.cards.concat(comm))===0);
      const sh=Math.floor(potNow/ws.length);for(const w of ws)w.chips+=sh;
      const hn=eh(best.cards.concat(comm)).n;
      const iw=ws.some(w=>w.name==="Вы");
      setResult({text:iw?`🎉 Вы выиграли ${sh}!`:`😔 Победил ${best.name}`,hand:`Комбинация: ${hn}`,win:iw});
      return[...prev]
    });
  },[]);

  const advancePhase=useCallback(()=>{
    const d=deckRef.current;
    const clen=communityRef.current.length;
    const resetBets=()=>{setCb(0);setPlayers(p=>p.map(x=>({...x,bet:0})));setCp(p=>p.findIndex(x=>!x.folded&&!x.allin));st()};
    if(clen===0){setCommunity(d.slice(-3));deckRef.current=d.slice(0,-3);resetBets()}
    else if(clen===3){setCommunity(c=>[...c,d[d.length-1]]);deckRef.current=d.slice(0,-1);resetBets()}
    else if(clen===4){setCommunity(c=>[...c,d[d.length-1]]);deckRef.current=d.slice(0,-1);resetBets()}
    else if(clen===5){endHand()}
  },[endHand,st]);

  const nextTurn=useCallback(()=>{
    const pv=playersRef.current;const cw=cbRef.current;
    const active=pv.filter(p=>!p.folded&&!p.allin);
    if(active.length<=1){endHand();return}
    const allActed=pv.every(p=>p.folded||p.allin||p.bet===cw);
    if(allActed){advancePhase();return}
    let n=cpRef.current;
    for(let i=0;i<pv.length;i++){n=(n+1)%pv.length;if(!pv[n].folded&&!pv[n].allin)break}
    setCp(n);st();
  },[advancePhase,endHand,st]);

  const fold=useCallback(()=>{
    setPlayers(p=>{const n=[...p];n[0].folded=true;return n});
    setTimeout(()=>nextTurn(),100);
  },[nextTurn]);

  const callAct=useCallback(()=>{
    const p=playersRef.current[0];const amt=Math.min(cbRef.current-p.bet,p.chips);
    setPlayers(p=>{const n=[...p];n[0].chips-=amt;n[0].bet+=amt;return n});
    setPot(p=>p+amt);
    setTimeout(()=>nextTurn(),100);
  },[nextTurn]);

  const raiseAct=useCallback(()=>{const p=playersRef.current[0];setRa(Math.min(Math.max(40,cbRef.current*2),p.chips));setSr(true)},[]);

  const confirmRaise=useCallback(()=>{
    setSr(false);const p=playersRef.current[0];const amt=Math.min(ra,p.chips);
    setPlayers(p=>{const n=[...p];n[0].chips-=amt;n[0].bet+=amt;return n});
    setPot(p=>p+amt);setCb(c=>Math.max(c,ra));
    setTimeout(()=>nextTurn(),100);
  },[ra,nextTurn]);

  const allin=useCallback(()=>{
    const p=playersRef.current[0];const amt=p.chips;
    setPlayers(p=>{const n=[...p];n[0].chips=0;n[0].bet+=amt;n[0].allin=true;return n});
    setPot(p=>p+amt);setCb(c=>Math.max(c,amt));
    setTimeout(()=>nextTurn(),100);
  },[nextTurn]);

  const startGame=useCallback((d:Difficulty)=>{
    setDiff(d);ct();setResult(null);setDealt(false);setSr(false);
    const dk=shuffle([...Array(52)].map((_,i)=>({rank:RANKS[i%13],suit:SUITS[Math.floor(i/13)]})));
    deckRef.current=dk.slice(10);
    setPlayers([
      {name:"Вы",chips:1000,cards:[dk[0],dk[1]],bet:0,folded:false,allin:false,isAI:false,avatar:"😎"},
      {name:AI_N[0],chips:1000,cards:[dk[2],dk[3]],bet:10,folded:false,allin:false,isAI:true,avatar:AI_A[0]},
      {name:AI_N[1],chips:1000,cards:[dk[4],dk[5]],bet:20,folded:false,allin:false,isAI:true,avatar:AI_A[1]},
      {name:AI_N[2],chips:1000,cards:[dk[6],dk[7]],bet:0,folded:false,allin:false,isAI:true,avatar:AI_A[2]},
    ]);
    setCommunity([]);setPot(30);setCb(20);setCp(3);setPhase("play");
    setTimeout(()=>setDealt(true),50);st();
  },[]);

  useEffect(()=>{if(phase==="play"&&cp>0&&!players[cp]?.folded&&!players[cp]?.allin){const t=setTimeout(()=>{
    const idx=cpRef.current,pdiff=diffRef.current;
    if(idx===0||phaseRef.current!=="play")return;
    const pv=playersRef.current;
    const p=pv[idx];if(!p||p.folded||p.allin){nextTurn();return}
    const should=Math.random()<MISTAKE[pdiff];
    const comm=communityRef.current;
    const hv=comm.length>0?eh(p.cards.concat(comm)).s/10:0.3;
    const eff=Math.max(0.1,hv-(should?Math.random()*0.6:0));
    const cw=cbRef.current;
    const ca=Math.min(cw-p.bet,p.chips);
    let action='fold',ra2=0;
    if(cw===p.bet)action=eff>0.2||should?'check':'fold';
    else if(eff>0.65&&p.chips>cw*3){action='raise';ra2=Math.min(Math.floor(cw*2+potRef.current*0.3*eff),p.chips)}
    else if(eff>0.35&&ca<=p.chips*0.3)action='call';
    else if(eff>0.15&&ca<=p.chips*0.15)action='call';
    else if(should&&Math.random()<0.3)action='call';
    else action='fold';
    if(p.chips<=0)return;
    if(action==='fold'){setPlayers(p=>{const n=[...p];n[idx].folded=true;return n})}
    else if(action==='check'){}
    else if(action==='call'){setPlayers(p=>{const n=[...p];n[idx].chips-=ca;n[idx].bet+=ca;return n});setPot(pr=>pr+ca)}
    else if(action==='raise'){if(ra2>=p.chips){ra2=p.chips;setPlayers(pp=>{const n=[...pp];n[idx].allin=true;return n})}setPlayers(pp=>{const n=[...pp];n[idx].chips-=ra2;n[idx].bet+=ra2;return n});setPot(pr=>pr+ra2);setCb(c=>Math.max(c,ra2))}
    setTimeout(()=>nextTurn(),400);
  },800);return ()=>clearTimeout(t)}},[phase,cp,nextTurn]);

  useEffect(()=>{return ()=>ct()},[]);

  // Online mode handlers
  const createPokerRoom=async()=>{
    const u0='Игрок1';
    const r=await apiCall({action:'create',game:'poker',username:u0});
    if(!r.ok)return;
    const uname=r.room.players[0]?.username||u0;
    myNameRef.current=uname;
    setRoomCode(r.room.id);setOnlineUI('lobby');setIsP1(true);
    pollRef.current=setInterval(async()=>{
      const s=await apiCall({action:'status',roomCode:r.room.id});
      if(s.ok&&s.room.status==='playing'){
        setOnlineUI('playing');clearInterval(pollRef.current);
        startOnlinePolling(r.room.id,true);
      }
    },1000);
  };

  const joinPokerRoom=async(code:string)=>{
    const u0='Игрок2';
    const r=await apiCall({action:'join',roomCode:code,username:u0});
    if(!r.ok){alert(r.error);return}
    const uname=r.room.players[1]?.username||u0;
    myNameRef.current=uname;
    setRoomCode(code.toUpperCase());setOnlineUI('playing');setIsP1(false);
    startOnlinePolling(code.toUpperCase(),false);
  };

  const startOnlinePolling=(rc:string,p1:boolean)=>{
    setIsP1(p1);
    if(opollRef.current)clearInterval(opollRef.current);
    opollRef.current=setInterval(async()=>{
      const s=await apiCall({action:'status',roomCode:rc});
      if(s.ok&&s.room.state){setOnlineState({...s.room.state,rc})}
    },500);
  };

  const onlineFold=async()=>{
    const s=onlineState;if(!s)return;
    await apiCall({action:'move',roomCode:s.rc,username:myNameRef.current,move:{action:'fold'}});
  };
  const onlineCall=async()=>{
    const s=onlineState;if(!s)return;
    await apiCall({action:'move',roomCode:s.rc,username:myNameRef.current,move:{action:'call'}});
  };
  const onlineRaise=async()=>{
    const s=onlineState;if(!s)return;
    const ra=Math.min(Math.max((s.cb||0)*2,40),isP1?s.p1chips:s.p2chips);
    await apiCall({action:'move',roomCode:s.rc,username:myNameRef.current,move:{action:'raise',amount:ra}});
  };

  const switchMode=(m:"ai"|"online")=>{
    if(pollRef.current)clearInterval(pollRef.current);
    if(opollRef.current)clearInterval(opollRef.current);
    setMode(m);setOnlineUI('idle');setOnlineState(null);ct();
    if(m==="ai"){setPhase("idle");setResult(null)}
  };

  useEffect(()=>{return()=>{if(pollRef.current)clearInterval(pollRef.current);if(opollRef.current)clearInterval(opollRef.current)}},[]);

  // Render online lobby
  if(mode==="online"&&onlineUI==="idle"){
    return<div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={()=>switchMode("ai")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">🤖 С ИИ</button>
        <button onClick={()=>{}} className="px-4 py-1.5 text-xs rounded-lg glass neon-text-blue">🌐 Онлайн</button>
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs py-8">
        <button onClick={createPokerRoom} className="w-full px-6 py-3 glass rounded-xl text-sm neon-text-blue font-bold">Создать комнату</button>
        <div className="flex items-center gap-2 w-full"><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/><span className="text-xs text-[var(--text-muted)]">или</span><div className="flex-1 h-px" style={{background:"linear-gradient(90deg,transparent,var(--glass-border),transparent)"}}/></div>
        <div className="flex gap-2 w-full">
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Код комнаты" maxLength={6}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{background:"var(--glass-bg)",border:"1px solid var(--glass-border)",color:"var(--text)"}}/>
          <button onClick={()=>joinPokerRoom(joinCode)} className="px-4 py-2 glass rounded-lg text-xs neon-text-purple">Войти</button>
        </div>
      </div>
    </div>;
  }

  if(mode==="online"&&onlineUI==="lobby"){
    return<div className="flex flex-col items-center gap-4">
      <div className="glass-card text-center py-8 px-8">
        <p className="text-xs text-[var(--text-muted)] mb-2">Код комнаты</p>
        <p className="text-3xl font-bold tracking-[0.2em] neon-text-blue" style={{fontFamily:"var(--font-title)"}}>{roomCode}</p>
        <p className="text-sm text-[var(--text-secondary)] mt-4">Ожидание противника...</p>
      </div>
    </div>;
  }

  // Render online poker game
  if(mode==="online"&&onlineUI==="playing"){
    const s=onlineState;
    if(!s)return<div className="text-center text-sm text-[var(--text-muted)] py-8">Загрузка...</div>;
    const myCards=isP1?s.p1cards||[]:s.p2cards||[];
    const oppCards=isP1?s.p2cards||[]:s.p1cards||[];
    const myChips=isP1?s.p1chips: s.p2chips;
    const oppChips=isP1?s.p2chips: s.p1chips;
    const myBet=isP1?s.p1bet||0: s.p2bet||0;
    const myTurn=s.turn===(isP1?0:1);
    const myFolded=isP1?s.p1folded: s.p2folded;
    const myAllin=isP1?s.p1allin: s.p2allin;
    const oppFolded=isP1?s.p2folded: s.p1folded;
    const oppAllin=isP1?s.p2allin: s.p1allin;

    return<div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button onClick={()=>switchMode("ai")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">🤖 С ИИ</button>
        <button onClick={()=>switchMode("online")} className="px-4 py-1.5 text-xs rounded-lg glass neon-text-blue">🌐 Онлайн</button>
      </div>

      <div className="flex items-center justify-between w-full text-xs text-[var(--text-secondary)] px-2">
        <div className="flex items-center gap-2">
          <span className={`${oppFolded?'opacity-30':''}`}>👤 Противник</span>
          <strong className={oppFolded?'text-[var(--text-muted)]':'neon-text-purple'}>{oppChips}</strong>
        </div>
        <div className="text-center">
          <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Банк</span>
          <span className="font-bold text-lg neon-text-green">{s.pot||0}</span>
        </div>
        <div className="flex items-center gap-2">
          <strong className="neon-text-blue">{myChips}</strong>
          <span className={myFolded?'opacity-30':''}>Вы</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <div className={`flex flex-col items-center gap-1 transition-all ${oppFolded?'opacity-30':''}`}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{background:"var(--glass-bg)"}}>👤</div>
          <span className="text-[10px] text-[var(--text-muted)]">Противник</span>
          <div className="flex gap-0.5">
            {[0,1].map(j=><div key={j} className={`w-3 h-4 rounded-sm ${oppFolded?'opacity-20':''}`}
              style={{background:oppFolded?'var(--glass-bg)':oppCards[j]?'linear-gradient(145deg,#1a1a2e,#16213e)':'var(--glass-bg)',border:"1px solid var(--glass-border)"}}>
              {oppCards[j]&&<span className={`text-[6px] block ${cr(oppCards[j])}`}>{cs(oppCards[j])}</span>}
            </div>)}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 my-2">
        {[0,1,2,3,4].map(i=>{
          const c=s.community?.[i];
          return<div key={i} className={`w-12 h-16 sm:w-14 sm:h-20 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold ${c?`${cr(c)}`:"opacity-30"}`} style={{
            background:c?"linear-gradient(145deg,#1a1a2e,#16213e)":"var(--glass-bg)",
            border:c?"1px solid rgba(0,243,255,0.15)":"1px solid var(--glass-border)",
          }}>{c?cs(c):''}</div>
        })}
      </div>

      <div className="flex items-center gap-3 glass rounded-2xl p-4 w-full max-w-md">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{background:"var(--glass-bg)"}}><span>😎</span></div>
        <div className="flex flex-col">
          <span className="text-sm font-bold">Вы</span>
          <span className="text-xs text-[var(--neon-yellow)]">{myChips}</span>
        </div>
        <div className="flex gap-2 ml-auto">
          {(!myFolded?myCards:[]).map((c,i)=><div key={i} className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold ${cr(c)}`}
            style={{background:"linear-gradient(145deg,#1a1a2e,#16213e)",border:"1px solid rgba(0,243,255,0.15)"}}>
            {cs(c)}
          </div>)}
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)]">{s.lastAction||''}</div>

      {myTurn&&!myFolded&&!myAllin&&<div className="flex gap-2 flex-wrap justify-center mt-2">
        <button onClick={onlineFold} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all active:scale-95"
          style={{color:'#ff4757',borderColor:'rgba(255,71,87,0.3)',background:'var(--glass-bg)'}}>Fold</button>
        <button onClick={onlineCall} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all active:scale-95"
          style={{color:'var(--neon-blue)',borderColor:'rgba(0,243,255,0.3)',background:'var(--glass-bg)'}}>Call {Math.max(0,(s.cb||0)-myBet)}</button>
        <button onClick={onlineRaise} className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all active:scale-95"
          style={{color:'var(--neon-yellow)',borderColor:'rgba(255,221,0,0.3)',background:'var(--glass-bg)'}}>Raise</button>
      </div>}

      {!myTurn&&!myFolded&&!s.result&&<div className="text-sm text-[var(--text-secondary)] mt-2">Ожидание хода противника...</div>}

      {s.result&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={()=>{switchMode("online")}}>
        <div className="glass-card text-center max-w-xs mx-4" onClick={e=>e.stopPropagation()}>
          <p className={`text-lg font-bold mb-2 ${s.result.winner===-1?'neon-text-yellow':(s.result.winner===(isP1?0:1)?'neon-text-green':'neon-text-pink')}`}>
            {s.result.winner===-1?'Ничья':(s.result.winner===(isP1?0:1)?'🎉 Вы выиграли!':'😔 Противник выиграл')}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{s.result.text}</p>
          {s.result.h1&&<p className="text-xs text-[var(--text-secondary)] mt-1">Вы: {s.result.h1}</p>}
          {s.result.h2&&<p className="text-xs text-[var(--text-secondary)]">Противник: {s.result.h2}</p>}
          <button onClick={()=>switchMode("online")} className="mt-4 px-4 py-2 glass rounded-lg text-xs neon-text-blue">В лобби</button>
        </div>
      </div>}
    </div>;
  }

  const me=players[0];
  const isMyTurn=cp===0&&!me?.folded&&!me?.allin;

  if(phase==="idle")return<div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4 py-8">
    <div className="flex gap-2 mb-2">
      <button onClick={()=>switchMode("ai")} className="px-4 py-1.5 text-xs rounded-lg glass neon-text-blue">🤖 С ИИ</button>
      <button onClick={()=>switchMode("online")} className="px-4 py-1.5 text-xs rounded-lg text-[var(--text-muted)]">🌐 Онлайн</button>
    </div>
    <p className="text-sm text-[var(--text-secondary)]">Выберите сложность</p>
    <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
      {DIFF_O.map(d=><button key={d} onClick={()=>startGame(d)}
        className={`p-4 glass rounded-xl text-center transition-all hover:-translate-y-1 ${
          d==="easy"?"hover:border-green-500/40 hover:shadow-[0_0_30px_rgba(0,255,136,0.12)]":
          d==="medium"?"hover:border-yellow-500/40 hover:shadow-[0_0_30px_rgba(255,221,0,0.12)]":
          d==="hard"?"hover:border-pink-500/40 hover:shadow-[0_0_30px_rgba(255,45,149,0.12)]":
          "hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)]"}`}>
        <span className="text-2xl mb-1 block">{d==="easy"?"🌱":d==="medium"?"⚖️":d==="hard"?"🔥":"👑"}</span>
        <span className="text-sm font-bold">{DIFF_L[d]}</span>
        <span className="block text-[10px] text-[var(--text-muted)] mt-1">
          {d==="easy"?"ИИ часто ошибается":d==="medium"?"Сбалансированная игра":d==="hard"?"ИИ играет сильно":"Почти непобедим"}
        </span>
      </button>)}
    </div>
  </div>;

  return<div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3">
    <div className="flex gap-2">
      <button onClick={()=>switchMode("ai")}
        className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode==="ai"?"glass neon-text-blue":"text-[var(--text-muted)]"}`}>🤖 С ИИ</button>
      <button onClick={()=>switchMode("online")}
        className={`px-4 py-1.5 text-xs rounded-lg transition-all ${mode==="online"?"glass neon-text-blue":"text-[var(--text-muted)]"}`}>🌐 Онлайн</button>
    </div>

    <div className="flex items-center justify-between w-full text-xs text-[var(--text-secondary)] px-2">
      <span>Вы: <strong className="neon-text-blue">{me?.chips||0}</strong></span>
      <div className="text-center">
        <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Банк</span>
        <span className="font-bold text-lg neon-text-green">{pot}</span>
      </div>
      <div className={`w-10 h-10 flex items-center justify-center rounded-full glass text-sm font-bold ${timer<=5?"neon-text-pink":"neon-text-blue"}`}>{timer}</div>
    </div>

    <div className="flex justify-center gap-4 sm:gap-8 flex-wrap">
      {players.filter((_,i)=>i>0).map((op,i)=>{
        const idx=players.indexOf(op);
        return<div key={i} className={`flex flex-col items-center gap-1 transition-all ${cp===idx?"scale-110":""} ${op.folded?"opacity-30":""}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${cp===idx?"ring-2 ring-[var(--neon-blue)] ring-offset-2 ring-offset-[#0b0b16] shadow-[0_0_20px_rgba(0,243,255,0.3)]":""}`} style={{background:"var(--glass-bg)"}}>
            <span>{op.avatar}</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{op.name}</span>
          <span className="text-[10px] text-[var(--neon-yellow)]">{op.chips}</span>
          <div className="flex gap-0.5">{[0,1].map(j=><div key={j} className="w-3 h-4 rounded-sm" style={{background:"var(--glass-bg)",border:"1px solid var(--glass-border)"}}/>)}</div>
        </div>
      })}
    </div>

    <div className="flex justify-center gap-2 my-2">
      {[0,1,2,3,4].map(i=>{
        const c=community[i];
        return<div key={i} className={`w-12 h-16 sm:w-14 sm:h-20 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-500 ${c?`${cr(c)}`:"opacity-30"}`} style={{
          background:c?"linear-gradient(145deg,#1a1a2e,#16213e)":"var(--glass-bg)",
          border:c?"1px solid rgba(0,243,255,0.15)":"1px solid var(--glass-border)",
          animation:c&&dealt?`cardDeal 0.4s ${i*0.15}s forwards`:'none',
          opacity:c&&dealt?0:undefined,
        }}>{c?cs(c):''}</div>
      })}
    </div>

    <div className="flex items-center gap-3 glass rounded-2xl p-4 w-full max-w-md">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${cp===0?"ring-2 ring-[var(--neon-blue)] ring-offset-2 ring-offset-[#0b0b16]":""}`} style={{background:"var(--glass-bg)"}}>
        <span>{me?.avatar}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold">{me?.name}</span>
        <span className="text-xs text-[var(--neon-yellow)]">{me?.chips}</span>
      </div>
      <div className="flex gap-2 ml-auto">
        {me?.cards.map((c,i)=><div key={i} className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold ${cr(c)}`}
          style={{background:"linear-gradient(145deg,#1a1a2e,#16213e)",border:"1px solid rgba(0,243,255,0.15)",boxShadow:"0 0 15px rgba(0,243,255,0.15)",animation:dealt?`cardDeal 0.4s ${i*0.15}s forwards`:''}}>
          {cs(c)}
        </div>)}
      </div>
    </div>

    {isMyTurn&&<div className="flex gap-2 flex-wrap justify-center mt-2">
      <button onClick={fold} className="ab fold">Fold</button>
      {(cb===me?.bet||!me)&&<button onClick={callAct} className="ab check">Check</button>}
      {(cb>0&&cb!==me?.bet&&me)&&<button onClick={callAct} className="ab call">Call {Math.min(cb-me.bet,me.chips)}</button>}
      <button onClick={raiseAct} className="ab raise">Raise</button>
      <button onClick={allin} className="ab allin">All In</button>
    </div>}

    {sr&&<div className="flex items-center gap-3 mt-2 w-full max-w-xs">
      <input type="range" min={Math.min(40,me?.chips||40)} max={me?.chips||0} step={10} value={ra} onChange={e=>setRa(Number(e.target.value))}
        className="flex-1 h-1 rounded-full accent-[var(--neon-blue)]" style={{background:"linear-gradient(90deg,var(--neon-blue),var(--neon-purple))"}}/>
      <span className="font-bold text-sm neon-text-yellow min-w-[40px]">{ra}</span>
      <button onClick={confirmRaise} className="px-3 py-1.5 glass rounded-lg text-xs neon-text-green active:scale-95">OK</button>
    </div>}

    {result&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={()=>setPhase("idle")}>
      <div className="glass-card text-center max-w-xs mx-4" onClick={e=>e.stopPropagation()}>
        <p className={`text-lg font-bold mb-2 ${result.win?"neon-text-green":"neon-text-pink"}`}>{result.text}</p>
        {result.hand&&<p className="text-xs text-[var(--text-secondary)] mb-4">{result.hand}</p>}
        <div className="flex gap-2 justify-center">
          <button onClick={()=>{setPhase("idle");setResult(null)}} className="px-4 py-2 glass rounded-lg text-xs text-[var(--text-muted)]">Выйти</button>
          <button onClick={()=>{setResult(null);startGame(diff)}} className="px-4 py-2 glass rounded-lg text-xs neon-text-blue">Ещё раз</button>
        </div>
      </div>
    </div>}

    <style>{`
      @keyframes cardDeal{0%{opacity:0;transform:translateY(-40px) rotate(-10deg) scale(0.6)}100%{opacity:1;transform:translateY(0) rotate(0) scale(1)}}
      .ab{padding:8px 16px;border-radius:12px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;border:1px solid var(--glass-border);cursor:pointer;transition:all .3s;background:var(--glass-bg)}
      .ab.fold{color:#ff4757;border-color:rgba(255,71,87,0.3)}.ab.fold:hover{background:rgba(255,71,87,0.1);box-shadow:0 0 20px rgba(255,71,87,0.15)}
      .ab.check,.ab.call{color:var(--neon-blue);border-color:rgba(0,243,255,0.3)}.ab.check:hover,.ab.call:hover{background:rgba(0,243,255,0.1);box-shadow:0 0 20px rgba(0,243,255,0.15)}
      .ab.raise{color:var(--neon-yellow);border-color:rgba(255,221,0,0.3)}.ab.raise:hover{background:rgba(255,221,0,0.1);box-shadow:0 0 20px rgba(255,221,0,0.15)}
      .ab.allin{color:var(--neon-pink);border-color:rgba(255,45,149,0.3)}.ab.allin:hover{background:rgba(255,45,149,0.1);box-shadow:0 0 20px rgba(255,45,149,0.15)}
      .red{color:#ff2d95;text-shadow:0 0 8px rgba(255,45,149,0.3)}.black{color:#e2e8f0;text-shadow:0 0 8px rgba(255,255,255,0.1)}
    `}</style>
  </div>;
}
