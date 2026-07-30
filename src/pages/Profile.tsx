import { motion } from "framer-motion";

export default function Profile() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="glass rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--neon-blue)] to-[var(--neon-purple)] flex items-center justify-center text-3xl font-bold mx-auto mb-4">
          G
        </div>
        <h1 className="text-2xl font-bold mb-2">Гость</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">Войдите, чтобы сохранять прогресс</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Уровень", value: "1" },
            { label: "XP", value: "0" },
            { label: "Игр сыграно", value: "0" },
            { label: "Монет", value: "0" },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4">
              <div className="text-xl font-bold neon-text-blue">{s.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)]">Авторизация через Firebase/Supabase будет добавлена позже</p>
      </div>
    </motion.div>
  );
}
