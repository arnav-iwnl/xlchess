import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export default function ReferralCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/referrals/code"),
      apiFetch("/api/referrals/stats"),
    ])
      .then(([codeRes, statsRes]) => {
        setData({ code: codeRes, stats: statsRes });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (data?.code?.link) {
      navigator.clipboard.writeText(data.code.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="p-4 bg-ink-2 rounded-xl border border-line text-mist text-center animate-pulse">Loading referral info...</div>;
  if (!data) return <div className="p-4 bg-ink-2 rounded-xl border border-line text-mist text-center">Failed to load referral info.</div>;

  return (
    <div className="bg-ink-2 border border-line rounded-xl p-6 shadow-lg">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        
        <div className="flex-1">
          <h3 className="text-xl font-display font-bold text-violet-2 mb-2 flex items-center gap-2">
            <span>🎁</span> Invite Friends, Earn XL Coins
          </h3>
          <p className="text-mist text-sm mb-4">
            Share your unique link. When a friend signs up and plays 5 games, you both get XL Coins! You get <strong>100</strong>, they get <strong>50</strong>.
          </p>

          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={data.code.link} 
              className="flex-1 bg-ink-3 border border-line rounded-lg px-3 py-2 text-paper text-sm focus:outline-none focus:border-violet-2 transition-colors"
            />
            <button 
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${copied ? 'bg-green-500 text-ink' : 'bg-violet-2 text-paper hover:bg-violet-3'}`}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <a 
              href={`https://twitter.com/intent/tweet?text=Challenge%20me%20to%20a%20game%20of%20chess%20on%20XLChess!%20${encodeURIComponent(data.code.link)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-mist hover:text-[#1DA1F2] transition-colors flex items-center gap-1 bg-ink-3 px-3 py-1.5 rounded-full"
            >
              Share on Twitter
            </a>
            <a 
              href={`https://wa.me/?text=Challenge%20me%20to%20a%20game%20of%20chess%20on%20XLChess!%20${encodeURIComponent(data.code.link)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-mist hover:text-[#25D366] transition-colors flex items-center gap-1 bg-ink-3 px-3 py-1.5 rounded-full"
            >
              Share on WhatsApp
            </a>
          </div>
        </div>

        <div className="w-full md:w-48 bg-ink-3 rounded-lg p-4 flex flex-col justify-center gap-3">
          <div className="text-center">
            <div className="text-xs text-mist uppercase font-mono tracking-wider">Friends Invited</div>
            <div className="text-2xl font-bold text-paper">{data.stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-mist uppercase font-mono tracking-wider">Qualified</div>
            <div className="text-2xl font-bold text-green-400">{data.stats.qualified}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-mist uppercase font-mono tracking-wider">Coins Earned</div>
            <div className="text-2xl font-bold text-gold flex items-center justify-center gap-1">
              <span className="text-sm">🟡</span> {data.stats.coinsEarned}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
