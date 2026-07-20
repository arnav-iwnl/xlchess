import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGlobalSocket } from "../hooks/useGlobalSocket";

export default function AchievementToast() {
  const [toasts, setToasts] = useState([]);
  const globalSocket = useGlobalSocket();

  useEffect(() => {
    if (!globalSocket) return;

    const handleUnlock = (achievements) => {
      if (!achievements || achievements.length === 0) return;

      const newToasts = achievements.map((ach) => ({
        id: Math.random().toString(36).substr(2, 9),
        ...ach,
      }));

      setToasts((prev) => [...prev, ...newToasts]);

      // Auto-dismiss each toast after 4 seconds
      newToasts.forEach((t) => {
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== t.id));
        }, 4000);
      });
    };

    globalSocket.on("achievementUnlocked", handleUnlock);
    return () => globalSocket.off("achievementUnlocked", handleUnlock);
  }, [globalSocket]);

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-ink-2 border border-violet-2 shadow-[0_0_20px_rgba(105,82,234,0.3)] rounded-xl p-4 w-72 flex items-center gap-4 pointer-events-auto"
          >
            <div className="text-4xl bg-ink-3 rounded-full w-12 h-12 flex items-center justify-center shrink-0">
              {t.icon}
            </div>
            <div className="flex-1">
              <div className="text-xs text-gold font-bold uppercase tracking-wider mb-0.5">Achievement Unlocked!</div>
              <div className="text-paper font-display font-bold leading-tight">{t.name}</div>
              {t.xpReward > 0 && (
                <div className="text-xs text-violet-2 font-mono mt-1">+{t.xpReward} XP</div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
