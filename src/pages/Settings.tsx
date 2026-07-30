import { motion } from "framer-motion";

export default function Settings() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
        <SettingRow label="Тема">
          <select className="glass rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]">
            <option>Тёмная</option>
            <option>Светлая</option>
          </select>
        </SettingRow>
        <SettingRow label="Язык">
          <select className="glass rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]">
            <option>Русский</option>
            <option>English</option>
          </select>
        </SettingRow>
        <SettingRow label="Музыка">
          <Toggle />
        </SettingRow>
        <SettingRow label="Звуки">
          <Toggle />
        </SettingRow>
        <SettingRow label="Громкость">
          <input type="range" min="0" max="100" className="w-24 accent-[var(--neon-blue)]" />
        </SettingRow>
        <SettingRow label="Качество графики">
          <select className="glass rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)]">
            <option>Высокое</option>
            <option>Среднее</option>
            <option>Низкое</option>
          </select>
        </SettingRow>
      </div>
    </motion.div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-primary)]">{label}</span>
      {children}
    </div>
  );
}

function Toggle() {
  return (
    <div className="w-10 h-5 rounded-full bg-[var(--glass-bg)] cursor-pointer relative">
      <div className="w-4 h-4 rounded-full bg-[var(--neon-blue)] absolute top-0.5 right-0.5" />
    </div>
  );
}
