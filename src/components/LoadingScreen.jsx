import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] bg-ink flex flex-col items-center justify-center gap-[18px]"
          role="status"
          aria-live="polite"
          aria-label="Loading XLChess"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            className="text-[3.2rem] text-violet-2"
            initial={{ y: 0, rotate: -8 }}
            animate={{ y: [0, -10, 0], rotate: [-8, 8, -8] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            ♞
          </motion.div>
          <div className="font-display font-bold tracking-[0.28em] text-[0.95rem] text-paper">XLCHESS</div>
          <div className="w-[160px] h-[3px] bg-ink-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[linear-gradient(90deg,var(--color-violet),var(--color-violet-2))]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
