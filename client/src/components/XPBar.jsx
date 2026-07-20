import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useUser } from "@clerk/clerk-react";

// Matches server logic (server/lib/xp.js)
function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(50 * level * (level - 1));
}

export default function XPBar() {
  const { user, isSignedIn } = useUser();
  const [stats, setStats] = useState({ level: 1, xp: 0 });

  useEffect(() => {
    if (isSignedIn && user?.username) {
      apiFetch(`/api/stats/${user.username}`)
        .then((res) => {
          if (res?.user) {
            setStats({ level: res.user.level, xp: res.user.xp });
          }
        })
        .catch(() => {});
      
      // Update when game ends
      const handleGameSave = () => {
        apiFetch(`/api/stats/${user.username}`)
          .then((res) => {
            if (res?.user) setStats({ level: res.user.level, xp: res.user.xp });
          });
      };
      
      window.addEventListener("gameSaved", handleGameSave);
      return () => window.removeEventListener("gameSaved", handleGameSave);
    }
  }, [isSignedIn, user?.username]);

  if (!isSignedIn) return null;

  const currentLevelXp = xpForLevel(stats.level);
  const nextLevelXp = xpForLevel(stats.level + 1);
  const progress = Math.max(0, Math.min(100, ((stats.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-1.5">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <span className="bg-violet-2 text-paper text-xs font-bold px-2 py-0.5 rounded shadow-sm">
            Lvl {stats.level}
          </span>
          <span className="text-mist text-xs font-mono">{stats.xp} XP</span>
        </div>
        <div className="text-mist text-[0.65rem] font-mono uppercase tracking-wider">
          {nextLevelXp - stats.xp} to next
        </div>
      </div>
      
      <div className="h-2 w-full bg-ink-3 rounded-full overflow-hidden border border-line/50">
        <div 
          className="h-full bg-gradient-to-r from-violet-2 to-gold transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
