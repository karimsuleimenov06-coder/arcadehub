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

export default function Home() {
  const featured = GAMES.filter(g => g.isHot).slice(0, 4);
  const popular = GAMES.filter(g => g.isHot).slice(0, 3);
  const newest = GAMES.filter(g => g.isNew || g.isHot).slice(0, 6);
  const multiplayer = GAMES.filter(g => g.players === "2" || g.players === "2-6");
  const online = GAMES.filter(g => g.isOnline);
  const allGames = GAMES;

  const categoryGames: Record<string, Game[]> = {
    classic: GAMES.filter(g => g.category === "classic" && !g.isSoon),
    modern: GAMES.filter(g => g.category === "modern" && !g.isSoon),
    multiplayer: multiplayer,
    online: online,
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full mb-6 text-xs text-[var(--text-muted)]">
          Более 20 игр · Бесплатно · Без регистрации
        </div>
        <h1 className="font-orbitron text-4xl sm:text-6xl lg:text-7xl font-bold mb-4">
          <span className="neon-text-blue">Arcade</span>
          <span className="neon-text-purple">Hub</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-xl mx-auto">
          Играй в лучшие браузерные мини-игры прямо сейчас. Классика и современные хиты в одном месте.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`}
              className="px-4 py-2 glass rounded-full text-sm text-[var(--text-secondary)] hover:text-[var(--neon-blue)] hover:neon-glow-blue transition-all"
            >
              {s.emoji} {s.title}
            </a>
          ))}
        </div>
      </motion.div>

      {/* Featured */}
      <Section title="Рекомендуемые" subtitle="Наш выбор для тебя">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map(g => (
            <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
          ))}
        </motion.div>
      </Section>

      {/* Popular */}
      <Section title="Популярные" subtitle="Играют прямо сейчас">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.map(g => (
            <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
          ))}
        </motion.div>
      </Section>

      {/* New */}
      <Section title="Новинки" subtitle="Свежие игры">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {newest.slice(0, 6).map(g => (
            <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
          ))}
        </motion.div>
      </Section>

      {/* Categories */}
      {sections.map(s => {
        const games = categoryGames[s.id];
        if (!games || games.length === 0) return null;
        return (
          <Section key={s.id} id={s.id} title={`${s.emoji} ${s.title}`}>
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {games.map(g => (
                <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
              ))}
            </motion.div>
          </Section>
        );
      })}

      {/* All games */}
      <Section id="all-games" title="Все игры">
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allGames.map(g => (
            <motion.div key={g.id} variants={item}><GameCard game={g} /></motion.div>
          ))}
        </motion.div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children, id }: { title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mb-10 sm:mb-14">
      <div className="flex items-end gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
        {subtitle && <span className="text-sm text-[var(--text-muted)] mb-0.5">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
