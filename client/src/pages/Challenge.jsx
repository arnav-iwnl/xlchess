import { useParams, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import PvPGame from "../components/PvPGame";
import GameHistory from "../components/GameHistory";
import { useState, useEffect, Suspense } from "react";
import { FiX, FiClock } from "react-icons/fi";

export default function Challenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev);
    window.addEventListener("toggleHistorySidebar", handleToggle);
    return () => window.removeEventListener("toggleHistorySidebar", handleToggle);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-ink pt-[89px]">
      <SignedIn>
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto relative p-4 h-full">
          <div className="max-w-5xl mx-auto h-full">
            <PvPGame challengeId={id} />
          </div>
        </div>

        {/* Sidebar (History) */}
        <aside 
          className={`bg-ink-2 border-line flex-none flex flex-col h-full overflow-hidden transition-[width,min-width,border-width,transform] duration-300 ease-in-out z-[90]
            absolute top-[89px] left-0 h-[calc(100vh-89px)]
            ${sidebarOpen 
              ? 'translate-x-0 w-full sm:w-[320px] sm:min-w-[320px] border-r' 
              : '-translate-x-full w-0 min-w-0 border-r-0'
            }`}
        >
          <div className="w-full sm:w-[320px] h-full flex flex-col flex-none">
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
                  setSidebarOpen(false);
                  if (game.result === "playing") {
                    navigate(`/challenge/${game.challengeCode || game.id}`);
                  } else {
                    navigate('/home', { state: { selectedGameId: game.id } }); 
                  }
                }} />
              </Suspense>
            </div>
          </div>
        </aside>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
}
