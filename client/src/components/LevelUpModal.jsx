import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useGlobalSocket } from "../hooks/useGlobalSocket";

export default function LevelUpModal() {
  const [level, setLevel] = useState(null);
  const globalSocket = useGlobalSocket();

  useEffect(() => {
    if (!globalSocket) return;

    const handleLevelUp = (data) => {
      const newLevel = data.level;
      setLevel(newLevel);
      
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6952ea', '#e0b039', '#ffffff']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6952ea', '#e0b039', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Auto dismiss after 5s
      setTimeout(() => setLevel(null), 5000);
    };

    globalSocket.on("levelUp", handleLevelUp);
    return () => globalSocket.off("levelUp", handleLevelUp);
  }, [globalSocket]);

  if (!level) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4 pointer-events-auto">
      <AnimatePresence>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-ink-2 border border-gold shadow-[0_0_50px_rgba(224,176,57,0.3)] rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-2 to-gold"></div>
          
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-display font-bold text-paper mb-2">Level Up!</h2>
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gold to-yellow-300 drop-shadow-lg mb-6">
            {level}
          </div>
          
          <p className="text-mist text-sm mb-8">
            You've earned enough XP to reach the next level. Keep playing to unlock more rewards!
          </p>

          <button 
            onClick={() => setLevel(null)}
            className="w-full btn btn-primary py-3 text-lg"
          >
            Awesome!
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
