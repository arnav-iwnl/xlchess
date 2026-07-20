import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { BOARD_THEMES, PIECE_SETS } from "../data/themes";
import toast from "react-hot-toast";

export default function ThemeStore({ onClose }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("themes"); // "themes" or "coins"

  useEffect(() => {
    fetchThemes();
  }, []);



  const fetchThemes = () => {
    setLoading(true);
    apiFetch("/api/themes/mine")
      .then(setUserData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleBuyTheme = async (theme) => {
    try {
      const res = await apiFetch("/api/themes/buy", {
        method: "POST",
        body: JSON.stringify({ type: "board", themeId: theme.id, price: theme.price }),
      });
      setUserData(res);
      toast.success(`Successfully purchased ${theme.name}!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEquipTheme = async (theme) => {
    try {
      const res = await apiFetch("/api/themes/equip", {
        method: "POST",
        body: JSON.stringify({ type: "board", themeId: theme.id }),
      });
      setUserData((prev) => ({ ...prev, boardTheme: res.boardTheme }));
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: res.boardTheme }));
      toast.success(`${theme.name} equipped!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBuyPiece = async (pieceSet) => {
    try {
      const res = await apiFetch("/api/themes/buy", {
        method: "POST",
        body: JSON.stringify({ type: "piece", themeId: pieceSet.id, price: pieceSet.price }),
      });
      setUserData(res);
      toast.success(`Successfully purchased ${pieceSet.name}!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEquipPiece = async (pieceSet) => {
    try {
      const res = await apiFetch("/api/themes/equip", {
        method: "POST",
        body: JSON.stringify({ type: "piece", themeId: pieceSet.id }),
      });
      setUserData((prev) => ({ ...prev, pieceSet: res.pieceSet }));
      window.dispatchEvent(new CustomEvent('pieceChanged', { detail: res.pieceSet }));
      toast.success(`${pieceSet.name} equipped!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openRazorpay = async (coins, amountINR) => {
    try {
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: amountINR }),
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: order.currency,
        name: "XLChess",
        description: `Buy ${coins} XLCoins`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await apiFetch("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                coinsToAward: coins,
              }),
            });
            if (verifyRes.success) {
              setUserData((prev) => ({ ...prev, xlCoins: verifyRes.xlCoins }));
              toast.success(`Successfully purchased ${coins} XLCoins!`);
            }
          } catch (verifyErr) {
            toast.error("Payment verification failed. Contact support if amount was deducted.");
          }
        },
        prefill: {
          name: userData?.username || "Player",
        },
        theme: {
          color: "#0b1024",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err) {
      toast.error("Failed to initiate payment: " + err.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {loading ? (
        <div className="bg-ink-2 border border-line rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-gold text-lg mb-2">Loading Store...</div>
          <p className="text-mist text-sm">Fetching your themes and coins</p>
        </div>
      ) : error ? (
        <div className="bg-ink-2 border border-line rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      ) : (
      <div 
        className="bg-ink-2 border border-line rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-display font-bold text-paper m-0 leading-none">Store</h2>
            <div className="bg-ink-3 px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-sm border border-line/50">
              <span className="text-gold">🟡 {userData.xlCoins}</span>
              <span className="text-mist text-sm uppercase">XL Coins</span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ink-3 text-mist hover:text-paper transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-line pb-2">
          <button
            onClick={() => setActiveTab("themes")}
            className={`font-bold pb-2 border-b-2 transition-colors ${activeTab === "themes" ? "border-gold text-gold" : "border-transparent text-mist hover:text-paper"}`}
          >
            Board Themes
          </button>
          <button
            onClick={() => setActiveTab("pieces")}
            className={`font-bold pb-2 border-b-2 transition-colors ${activeTab === "pieces" ? "border-gold text-gold" : "border-transparent text-mist hover:text-paper"}`}
          >
            Piece Sets
          </button>
          <button
            onClick={() => setActiveTab("coins")}
            className={`font-bold pb-2 border-b-2 transition-colors ${activeTab === "coins" ? "border-gold text-gold" : "border-transparent text-mist hover:text-paper"}`}
          >
            Buy Coins
          </button>
        </div>

        {activeTab === "themes" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {BOARD_THEMES.map((theme) => {
              const isOwned = theme.free || userData.ownedThemes.includes(theme.id);
              const isEquipped = userData.boardTheme === theme.id;
              const canAfford = userData.xlCoins >= (theme.price || 0);

              return (
                <div key={theme.id} className={`border rounded-xl p-4 flex flex-col ${isEquipped ? 'border-violet-2 bg-violet-2/5' : 'border-line bg-ink-3'}`}>
                  <div className="aspect-square rounded-lg mb-4 overflow-hidden shadow-inner border border-line/50 grid grid-rows-4">
                    {[...Array(4)].map((_, r) => (
                      <div key={r} className="grid grid-cols-4">
                        {[...Array(4)].map((_, c) => (
                          <div 
                            key={c} 
                            style={{ backgroundColor: (r + c) % 2 === 0 ? theme.colors.light : theme.colors.dark }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-paper">{theme.name}</h3>
                    {!isOwned && (
                      <span className="text-gold font-bold text-sm">🟡 {theme.price}</span>
                    )}
                  </div>

                  <div className="mt-auto">
                    {isEquipped ? (
                      <button className="w-full py-2 rounded-lg bg-violet-2/20 text-violet-2 font-bold cursor-default">
                        Equipped
                      </button>
                    ) : isOwned ? (
                      <button 
                        onClick={() => handleEquipTheme(theme)}
                        className="w-full py-2 rounded-lg bg-ink-1 text-paper hover:bg-violet-2 transition-colors font-bold border border-line"
                      >
                        Equip
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBuyTheme(theme)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg font-bold transition-colors ${
                          canAfford ? 'bg-gold text-ink hover:bg-yellow-400' : 'bg-ink-1 text-mist cursor-not-allowed opacity-50'
                        }`}
                      >
                        {canAfford ? 'Buy Theme' : 'Not enough coins'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "pieces" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {PIECE_SETS.map((pieceSet) => {
              const isOwned = pieceSet.free || userData.ownedPieces.includes(pieceSet.id);
              const isEquipped = userData.pieceSet === pieceSet.id;
              const canAfford = userData.xlCoins >= (pieceSet.price || 0);

              const getPiecePreviewStyle = (id) => {
                switch(id) {
                  case 'minimal': return { color: '#ccc', fontWeight: '300', textShadow: 'none' };
                  case 'crystal': return { color: '#e0f7fa', textShadow: '0 0 10px #00bcd4' };
                  case 'golden': return { color: '#ffd700', textShadow: '0 2px 4px #b8860b' };
                  case 'obsidian': return { color: '#2c3e50', textShadow: '0 0 5px #000' };
                  case 'classic': return { color: '#d4a373', textShadow: '2px 2px 0px #8b5a2b' };
                  default: return { color: '#fbfbf8', textShadow: '0 1px 1px rgba(0,0,0,0.55)' };
                }
              };

              return (
                <div key={pieceSet.id} className={`border rounded-xl p-4 flex flex-col ${isEquipped ? 'border-violet-2 bg-violet-2/5' : 'border-line bg-ink-3'}`}>
                  <div className="aspect-square rounded-lg mb-4 overflow-hidden shadow-inner border border-line/50 flex items-center justify-center bg-ink-2">
                    <div className="text-[5rem] select-none" style={getPiecePreviewStyle(pieceSet.id)}>
                      ♞
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-paper">{pieceSet.name}</h3>
                    {!isOwned && (
                      <span className="text-gold font-bold text-sm">🟡 {pieceSet.price}</span>
                    )}
                  </div>

                  <div className="mt-auto">
                    {isEquipped ? (
                      <button className="w-full py-2 rounded-lg bg-violet-2/20 text-violet-2 font-bold cursor-default">
                        Equipped
                      </button>
                    ) : isOwned ? (
                      <button 
                        onClick={() => handleEquipPiece(pieceSet)}
                        className="w-full py-2 rounded-lg bg-ink-1 text-paper hover:bg-violet-2 transition-colors font-bold border border-line"
                      >
                        Equip
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBuyPiece(pieceSet)}
                        disabled={!canAfford}
                        className={`w-full py-2 rounded-lg font-bold transition-colors ${
                          canAfford ? 'bg-gold text-ink hover:bg-yellow-400' : 'bg-ink-1 text-mist cursor-not-allowed opacity-50'
                        }`}
                      >
                        {canAfford ? 'Buy Set' : 'Not enough coins'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}


        {activeTab === "coins" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-line rounded-xl p-6 flex flex-col items-center bg-gradient-to-b from-ink-3 to-ink-2">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-paper mb-2">Pro Pack</h3>
              <p className="text-mist text-center mb-6">Instantly get 1,000 XLCoins to unlock premium themes.</p>
              
              <div className="text-3xl font-display font-bold text-gold mb-6">
                1,000 <span className="text-lg">Coins</span>
              </div>
              
              <button 
                onClick={() => openRazorpay(1000, 100)}
                className="w-full py-3 rounded-lg bg-gold text-ink font-bold hover:bg-yellow-400 transition-colors mt-auto shadow-lg shadow-gold/20"
              >
                Buy for ₹100
              </button>
            </div>
            
            <div className="border border-line rounded-xl p-6 flex flex-col items-center bg-ink-3 opacity-50 relative overflow-hidden">
              <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px] flex items-center justify-center z-10">
                <span className="font-bold text-paper bg-ink-1 px-4 py-2 rounded-full shadow-xl">Coming Soon</span>
              </div>
              <div className="text-6xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-paper mb-2">Master Pack</h3>
              <p className="text-mist text-center mb-6">The ultimate coin stash.</p>
              <div className="text-3xl font-display font-bold text-gold mb-6">5,000 Coins</div>
              <button className="w-full py-3 rounded-lg bg-ink-1 text-mist font-bold mt-auto border border-line">
                Buy for ₹400
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
