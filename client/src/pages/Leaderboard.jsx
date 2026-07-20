import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Link } from "react-router-dom";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("rating"); // "rating" | "weekly" | "climbers"
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/leaderboard/${activeTab}`)
      .then((res) => {
        setData(res.leaderboard || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="min-h-screen pt-[100px] pb-10 px-4 text-paper">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-center pt-2">Leaderboard</h1>

        <div className="flex justify-center gap-2 pt-6">
          <TabButton active={activeTab === "rating"} onClick={() => setActiveTab("rating")}>Top Rated</TabButton>
          <TabButton active={activeTab === "weekly"} onClick={() => setActiveTab("weekly")}>Weekly Wins</TabButton>
          <TabButton active={activeTab === "climbers"} onClick={() => setActiveTab("climbers")}>Top Climbers</TabButton>
        </div>

        <div className="bg-ink-2 border border-line rounded-xl overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ink-3 border-b border-line text-mist text-sm uppercase tracking-wider font-mono">
                  <th className="py-4 px-6 font-medium">Rank</th>
                  <th className="py-4 px-6 font-medium">Player</th>
                  {activeTab === "rating" && <th className="py-4 px-6 font-medium text-right">Rating</th>}
                  {activeTab === "weekly" && <th className="py-4 px-6 font-medium text-right">Wins</th>}
                  {activeTab === "climbers" && <th className="py-4 px-6 font-medium text-right">Rating Gained</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-mist">Loading...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-mist">No data yet.</td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.username} className="hover:bg-ink/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-lg">
                        {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="font-display font-bold text-lg">{row.username}</div>
                          {row.level && (
                            <span className="bg-violet-2/20 text-violet-2 text-[0.65rem] px-2 py-0.5 rounded-full font-mono">
                              Lvl {row.level}
                            </span>
                          )}
                        </div>
                      </td>
                      {activeTab === "rating" && <td className="py-4 px-6 text-right font-bold text-gold">{row.rating}</td>}
                      {activeTab === "weekly" && <td className="py-4 px-6 text-right font-bold text-green-400">{row.wins}</td>}
                      {activeTab === "climbers" && <td className="py-4 px-6 text-right font-bold text-green-400">+{row.ratingGained}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-full font-bold transition-all ${
        active ? "bg-violet-2 text-paper shadow-[0_0_15px_rgba(105,82,234,0.3)]" : "bg-ink-3 text-mist hover:text-paper hover:bg-ink-2"
      }`}
    >
      {children}
    </button>
  );
}
