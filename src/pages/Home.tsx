import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GAMES, Game } from "../types/game";
import GameCard from "../components/GameCard";

const sections = [
  { id: "classic", title: "Классические", emoji: "🎮" },
  { id: "modern", title: "Современные", emoji: "🔥" },
  { id: "multiplayer", title: "Для двоих", emoji: "👥" },
  { id: "online", title: "Онлайн-игры", emoji: "🌐" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const featured = GAMES.filter(g => !g.isSoon).slice(0, 6);
  const popular = GAMES.filter(g => g.isHot).slice(0, 6);
  const newest = GAMES.filter(g => g.isNew || g.isHot).slice(0, 6);
  const multiplayer = GAMES.filter(g => g.players === "2" || g.players === "2-6");
  const online = GAMES.filter(g => g.isOnline);

  const categoryGames: Record<string, Game[]> = {
    classic: GAMES.filter(g => g.category === "classic" && !g.isSoon && !g.isOnline),
    modern: GAMES.filter(g => g.category === "modern" && !g.isSoon && !g.isOnline),
    multiplayer: multiplayer,
    online: online,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 pb-20 sm:pb-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full mb-4 text-[10px] sm:text-xs text-[var(--text-muted)]">
          Более 20 игр · Бесплатно · Без регистрации
        </div>
        <h1 className="font-orbitron text-3xl sm:text-6xl lg:text-7xl font-bold mb-2 sm:mb-4">
          <span className="neon-text-blue">Arcade</span>
          <span className="neon-text-purple">Hub</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm sm:text-lg max-w-xl mx-auto px-4">
          Играй в лучшие браузерные мини-игры прямо сейчас
        </p>
      </motion.div>

      {/* Category pills - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 mb-4 sm:mb-8">
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className="shrink-0 px-4 py-2 glass rounded-full text-xs sm:text-sm text-[var(--text-secondary)] active:text-[var(--neon-blue)] active:neon-glow-blue transition-all"
          >
            {s.emoji} {s.title}
          </a>
        ))}
        <a href="#all-games"
          className="shrink-0 px-4 py-2 glass rounded-full text-xs sm:text-sm text-[var(--text-secondary)] active:text-[var(--neon-blue)] active:neon-glow-blue transition-all"
        >
          Все
        </a>
      </div>

      {/* Featured - horizontal scroll on mobile */}
      <MobileSection title="Рекомендуемые" subtitle="Наш выбор">
        <HorizontalScroll games={featured} />
      </MobileSection>

      {/* Popular */}
      <MobileSection title="Популярные" subtitle="Играют сейчас">
        <HorizontalScroll games={popular} />
      </MobileSection>

      {/* New */}
      <MobileSection title="Новинки" subtitle="Свежие">
        <HorizontalScroll games={newest} />
      </MobileSection>

      {/* Category sections */}
      {sections.map(s => {
        const games = categoryGames[s.id];
        if (!games || games.length === 0) return null;
        return (
          <MobileSection key={s.id} id={s.id} title={`${s.emoji} ${s.title}`}>
            <HorizontalScroll games={games} />
          </MobileSection>
        );
      })}

      {/* All games grid */}
      <MobileSection id="all-games" title="Все игры">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {GAMES.map(g => (
            <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
          ))}
        </motion.div>
      </MobileSection>
    </div>
  );
}

function HorizontalScroll({ games }: { games: Game[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
      {games.map(g => (
        <div key={g.id} className="shrink-0 w-[160px] sm:w-[200px]">
          <GameCard game={g} />
        </div>
      ))}
    </div>
  );
}

function MobileSection({ title, subtitle, children, id }: { title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-6 sm:mb-14">
      <div className="flex items-baseline gap-2 mb-3 sm:mb-6">
        <h2 className="text-base sm:text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <span className="text-[10px] sm:text-sm text-[var(--text-muted)]">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
