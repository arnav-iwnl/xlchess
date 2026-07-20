import { useEffect, useState, useRef } from "react";
import { apiFetch } from "../lib/api";
import { useUser } from "@clerk/clerk-react";
import { toPng } from "html-to-image";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ReferralCard from "../components/ReferralCard";

export default function Stats() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const shareRef = useRef(null);

  useEffect(() => {
    if (user?.username) {
      apiFetch(`/api/stats/${user.username}`)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.username]);

  const handleShare = async () => {
    if (!shareRef.current) return;
    try {
      const dataUrl = await toPng(shareRef.current, {
        backgroundColor: "transparent",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `xlchess-stats-${user?.username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate share image", err);
    }
  };

  if (loading) return <div className="pt-24 text-center text-paper">Loading stats...</div>;
  if (!stats) return <div className="pt-24 text-center text-paper">Could not load stats.</div>;

  const diffData = Object.entries(stats.pvp.byTimeControl).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    Won: data.won,
    Defeat: data.played - data.won,
  }));

  return (
    <div className="min-h-screen pt-[100px] pb-10 text-paper px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Shareable Card Area */}
        <div ref={shareRef} className="bg-ink-2 p-8 rounded-2xl border border-line shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-2 to-gold"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-display font-bold text-violet-2">{stats.user.username}</h1>
              <p className="text-mist mt-1 font-mono text-sm uppercase tracking-wider">
                Lvl {stats.user.level} • {stats.personality}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gold">{stats.user.rating}</div>
              <div className="text-xs text-mist font-mono uppercase">Current Rating</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <StatBox label="Total Games" value={stats.totals.games} />
            <StatBox label="Win Rate" value={`${stats.totals.winRate}%`} color="text-green-400" />
            <StatBox label="Longest Streak" value={`${stats.totals.longestStreak} 🔥`} color="text-orange-400" />
            <StatBox label="Total Moves" value={stats.totals.totalMoves} />
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display font-bold text-lg pb-2 mb-4">Top Openings</h3>
              <div className="space-y-3">
                {stats.favoriteOpenings.map((op, i) => (
                  <div key={op.move} className="flex justify-between items-center bg-ink-3 px-4 py-2 rounded-lg">
                    <span className="font-mono text-gold font-bold">#{i + 1} {op.move}</span>
                    <span className="text-mist text-sm">{op.count} times</span>
                  </div>
                ))}
                {stats.favoriteOpenings.length === 0 && (
                  <div className="text-mist text-sm italic">Not enough data yet.</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-lg mb-4 text-right">PvP Win History</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diffData}>
                    <XAxis dataKey="name" stroke="#5d6b89" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#131932', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="Won" stackId="a" fill="#2ecc71" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Defeat" stackId="a" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-end border-t border-line/50 pt-4">
            <div className="font-display font-bold text-mist text-sm tracking-widest uppercase">XLChess Stats</div>
            <div className="text-mist text-xs">Joined {new Date(stats.user.memberSince).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={handleShare} className="btn btn-primary px-8 flex items-center gap-2">
            <span>📸</span> Download Share Card
          </button>
        </div>

        {/* Achievements Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-display font-bold mb-6">Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.achievements.map((ach) => (
              <div key={ach.key} className="bg-ink-2 border border-line rounded-xl p-4 text-center flex flex-col items-center gap-2 hover:border-violet-2 transition-colors">
                <div className="text-4xl">{ach.icon}</div>
                <div className="font-bold text-sm leading-tight">{ach.name}</div>
                <div className="text-[0.65rem] text-mist font-mono">{new Date(ach.unlockedAt).toLocaleDateString()}</div>
              </div>
            ))}
            {stats.achievements.length === 0 && (
              <div className="col-span-full text-mist italic text-center py-8">Play some games to start earning achievements!</div>
            )}
          </div>
        </div>

        {/* Referral System Section */}
        <div className="mt-12">
          <ReferralCard />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "text-paper" }) {
  return (
    <div className="bg-ink-3 rounded-xl p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-mist font-mono uppercase mt-1">{label}</div>
    </div>
  );
}
