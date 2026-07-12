import { lazy, Suspense, useState, useRef, useEffect } from "react";
import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { FiZap, FiMenu, FiX, FiClock } from "react-icons/fi";

const PlayStockfish = lazy(() => import("../components/PlayStockfish"));
const GameHistory = lazy(() => import("../components/GameHistory"));
const Contact = lazy(() => import("../components/Contact"));
const Footer = lazy(() => import("../components/Footer"));
import { GameReplay } from "../components/GameHistory";

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  // Open sidebar by default on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 980
  );
  const [selectedGame, setSelectedGame] = useState(null);
  const playRef = useRef(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-[28px] h-[28px] border-[3px] border-line border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main id="main" className="flex flex-col h-[calc(100vh-64px)] overflow-hidden min-[980px]:flex-row relative">
      {/* Mobile Sidebar Toggle Button */}
      <div className="min-[980px]:hidden bg-ink border-b border-line p-[16px] flex items-center justify-between z-40 relative flex-none">
        <div className="flex items-center gap-[10px]">
          <button 
            className="btn btn-ghost !p-[8px]" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle History Sidebar"
          >
            {sidebarOpen ? <FiX className="text-[1.2rem]" /> : <FiMenu className="text-[1.2rem]" />}
          </button>
          <span className="font-display font-semibold">Dashboard</span>
        </div>
      </div>

      {/* Sidebar (History) */}
      <aside 
        className={`bg-ink-2 border-line flex-none flex flex-col h-full overflow-hidden transition-[width,min-width,border-width,transform] duration-300 ease-in-out z-30
          max-[979px]:absolute max-[979px]:top-[65px] max-[979px]:left-0 max-[979px]:w-full max-[979px]:h-[calc(100vh-65px)]
          ${sidebarOpen 
            ? 'max-[979px]:translate-x-0 min-[980px]:w-[320px] min-[980px]:min-w-[320px] border-r' 
            : 'max-[979px]:-translate-x-full min-[980px]:w-0 min-[980px]:min-w-0 border-r-0'
          }`}
      >
        <div className="w-[320px] max-[979px]:w-full h-full flex flex-col flex-none">
          <div className="p-[16px] border-b border-line flex items-center justify-between sticky top-0 bg-ink-2 z-10 flex-none">
            <div className="flex items-center gap-[8px]">
              <FiClock className="text-violet-2" />
              <span className="font-display font-semibold text-paper text-[0.95rem]">History</span>
            </div>
            <button 
              className="btn btn-ghost !p-[6px] text-mist hover:text-paper" 
              onClick={() => setSidebarOpen(false)}
              aria-label="Close Sidebar"
            >
              <FiX className="text-[1.1rem]" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto w-full">
            <Suspense fallback={<div className="h-[400px]" />}>
              <GameHistory compact={true} onGameSelect={(game) => {
                setSelectedGame(game);
                if (window.innerWidth < 980) setSidebarOpen(false);
                scrollTo(playRef);
              }} />
            </Suspense>
          </div>
        </div>
      </aside>

      {/* Toggle Sidebar Button for Desktop (Fixed relative to main area) */}
      <div className="absolute top-[16px] left-[16px] z-20 hidden min-[980px]:block">
        {!sidebarOpen && (
          <button 
            className="btn btn-ghost !p-[8px] bg-ink-2 border border-line shadow-md hover:bg-ink-3"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open History Sidebar"
          >
            <FiMenu className="text-[1.2rem]" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col overflow-y-auto relative h-full">
        {/* Welcome Header */}
        <div className="pt-[24px] pb-[16px] bg-[radial-gradient(ellipse_900px_500px_at_15%_-10%,rgba(139,123,240,0.18),transparent_60%)] flex-none">
          <div className="container max-w-[900px] mx-auto px-[24px]">
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-[16px] text-[clamp(1.6rem,4vw,2.6rem)] font-bold text-paper leading-[1.1]">
              Welcome back,{" "}
              <span className="bg-[linear-gradient(100deg,var(--color-violet-2),var(--color-violet))] bg-clip-text text-transparent">
                {user.username || user.firstName || "Player"}
              </span>
            </h1>
            <p className="mt-[12px] text-mist text-[0.92rem] max-w-[50ch]">
              Ready for your next game? Play against Stockfish, track your progress, and review your past games from the sidebar.
            </p>

          </div>
        </div>

        {/* Play / Replay Section */}
        <div ref={playRef} className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-[900px] px-[24px]">
            <Suspense fallback={<div className="h-[800px]" />}>
              {selectedGame ? (
                <GameReplay game={selectedGame} onBack={() => setSelectedGame(null)} />
              ) : (
                <PlayStockfish enableCaching={true} />
              )}
            </Suspense>
          </div>
        </div>

        <Suspense fallback={null}>
          <Contact />
          <Footer />
        </Suspense>
      </section>
    </main>
  );
}
