import { useEffect, useState } from "react";

export default function Clock({ timeMs, isRunning, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(timeMs);

  // Sync with prop when server updates it or turn changes
  useEffect(() => {
    setTimeLeft(timeMs);
  }, [timeMs]);

  useEffect(() => {
    if (!isRunning) return;
    
    // Decrement by 100ms every 100ms for smooth UI update
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (timeLeft <= 0 && isRunning && onTimeout) {
      onTimeout();
    }
  }, [timeLeft, isRunning, onTimeout]);

  // If timeMs is null or undefined (e.g., unlimited), hide clock
  if (timeMs === null || timeMs === undefined) return null;

  const secondsTotal = Math.ceil(timeLeft / 1000);
  const m = Math.floor(secondsTotal / 60);
  const s = secondsTotal % 60;
  
  const isLowTime = secondsTotal <= 15 && secondsTotal > 0;
  
  return (
    <div className={`font-mono text-xl font-bold px-3 py-1 rounded bg-ink-3 border flex items-center gap-2 ${isLowTime ? 'text-red-400 border-red-500/50 animate-pulse' : 'text-paper border-line'}`}>
      <span>⏱</span>
      {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </div>
  );
}
