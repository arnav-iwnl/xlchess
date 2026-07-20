import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Stats from "./pages/Stats";
import Leaderboard from "./pages/Leaderboard";
import ReferralLanding from "./pages/ReferralLanding";
import Challenge from "./pages/Challenge";
import AchievementToast from "./components/AchievementToast";
import LevelUpModal from "./components/LevelUpModal";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { apiFetch } from "./lib/api";
import { Link, useLocation } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";
import { SocketProvider } from "./contexts/SocketContext";
import ThemeStore from "./components/ThemeStore";
import { Toaster } from "react-hot-toast";

export default function App() {
  const { isSignedIn } = useUser();
  const [activeGameId, setActiveGameId] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => {
    // Intercept subdomain referral (e.g. username.localhost:5173/referral)
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (
      window.location.pathname === "/referral" && 
      (
        (parts.length >= 3 && parts[0] !== 'www') || 
        (parts.length === 2 && parts[1] === 'localhost')
      )
    ) {
      const username = parts[0];
      const mainDomain = parts.slice(1).join('.');
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      // Redirect to the main domain to ensure localStorage tracking works correctly
      window.location.href = `${protocol}//${mainDomain}${port}/?signup=true&ref=${username}`;
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      const checkActive = async () => {
        try {
          const res = await apiFetch("/api/games/active");
          setActiveGameId(res.activeGameId || null);
        } catch (e) {
          // ignore
        }
      };

      const handleGameSaved = () => setActiveGameId(null);
      window.addEventListener("gameSaved", handleGameSaved);
      
      const handleOpenStore = () => setStoreOpen(true);
      window.addEventListener("openThemeStore", handleOpenStore);

      checkActive();
      const interval = setInterval(checkActive, 30000);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener("gameSaved", handleGameSaved);
        window.removeEventListener("openThemeStore", handleOpenStore);
      };
    }
  }, [isSignedIn]);

  return (
    <SocketProvider>
      <BrowserRouter>
        <Navbar />
        <RouteContainer />
        <AchievementToast />
        <LevelUpModal />
        
        {activeGameId && (
          <ActiveGameToast gameId={activeGameId} />
        )}
        
        {storeOpen && (
          <ThemeStore onClose={() => setStoreOpen(false)} />
        )}

        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#131932',
              color: '#eef1d8',
              border: '1px solid rgba(255,255,255,0.05)'
            }
          }}
        />
      </BrowserRouter>
    </SocketProvider>
  );
}

function RouteContainer() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setLoading(true);
      // Wait for loading screen to become somewhat opaque before swapping routes
      const swapTimer = setTimeout(() => {
        setDisplayLocation(location);
        
        // Wait a bit on the loading screen, then fade it out
        setTimeout(() => {
          setLoading(false);
        }, 500); 
      }, 400);
      
      return () => clearTimeout(swapTimer);
    }
  }, [location, displayLocation.pathname]);

  return (
    <>
      <LoadingScreen visible={loading} />
      <Routes location={displayLocation}>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/r/:code" element={<ReferralLanding />} />
        <Route path="/challenge/:id" element={<Challenge />} />
      </Routes>
    </>
  );
}

function ActiveGameToast({ gameId }) {
  const location = useLocation();
  const isAlreadyInGame = location.pathname === `/challenge/${gameId}`;
  
  if (isAlreadyInGame) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-ink-2 border border-violet-2 rounded-xl p-4 shadow-[0_4px_24px_rgba(139,123,240,0.3)] animate-slide-up max-w-sm w-full">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-display font-bold text-paper text-sm">Active Game Found</h4>
          <p className="text-mist text-xs mt-1">You have a Live PvP game in progress.</p>
        </div>
        <Link to={`/challenge/${gameId}`} className="btn btn-primary !py-1 !px-3 !text-xs">
          Rejoin
        </Link>
      </div>
    </div>
  );
}
