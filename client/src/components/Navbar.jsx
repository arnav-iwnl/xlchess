import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
  useClerk,
} from "@clerk/clerk-react";
import { setTokenGetter, syncUser } from "../lib/api";

const LANDING_LINKS = [
  { href: "#games", label: "Famous Games" },
  { href: "#play", label: "Play" },
  { href: "#reviews", label: "Reviews" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { getToken } = useAuth();
  const { user, isSignedIn } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/home";

  // Preload Clerk's authentication chunks to make the modal open instantly
  useEffect(() => {
    if (clerk && !isSignedIn) {
      const dummyDiv = document.createElement("div");
      dummyDiv.style.display = "none";
      try {
        clerk.mountSignIn(dummyDiv, { routing: "virtual" });
        // The script fetch has started; unmount quickly to avoid duplicate mount errors later
        setTimeout(() => {
          clerk.unmountSignIn(dummyDiv);
        }, 100);
      } catch (e) {
        // Ignore errors
      }
    }
  }, [clerk, isSignedIn]);

  // Register the Clerk token getter for the API layer
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  // Sync user to our DB when they sign in
  useEffect(() => {
    if (isSignedIn && user?.username) {
      syncUser().catch((err) =>
        console.warn("User sync failed:", err.message)
      );
    }
  }, [isSignedIn, user?.username]);

  useEffect(() => {
    const handleScroll = (e) => {
      if (e.target.id === 'main-scroll') {
        setScrolled(e.target.scrollTop > 12);
      } else if (e.target === document || e.target === window) {
        setScrolled(window.scrollY > 12);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    
    // Initial check
    const mainScroll = document.getElementById('main-scroll');
    if (mainScroll) {
      setScrolled(mainScroll.scrollTop > 12);
    } else {
      setScrolled(window.scrollY > 12);
    }

    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [location.pathname]);

  return (
    <header className={`fixed top-0 w-full z-[100] transition-colors duration-250 border-b ${scrolled ? "bg-ink/40 backdrop-blur-[16px] border-line/50" : "bg-transparent border-transparent"}`}>
      <div className="container flex items-center justify-between py-[15px]">
        {/* Logo — links to landing or home based on auth */}
        <Link to={isSignedIn ? "/home" : "/"} className="flex items-center gap-[10px] text-paper no-underline">
          <span className="text-[1.6rem] text-violet-2" aria-hidden="true">♞</span>
          <span className="font-display font-bold tracking-[0.04em] text-[1rem] flex flex-col leading-[1.1]">
            XLCHESS
            <span className="font-mono font-normal text-[0.62rem] tracking-[0.1em] text-mist uppercase">Excel at Chess</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden max-[860px]:hidden min-[861px]:flex gap-[28px] text-[0.92rem]" aria-label="Primary">
          {isHome ? (
            <>
              <Link to="/home" className="text-mist transition-colors duration-150 hover:text-paper">Play</Link>
              <button 
                onClick={() => window.dispatchEvent(new Event('toggleHistorySidebar'))}
                className="bg-transparent border-none cursor-pointer p-0 font-body text-[0.92rem] text-mist transition-colors duration-150 hover:text-paper"
              >
                History
              </button>
              <Link to="/" className="text-mist transition-colors duration-150 hover:text-paper">Landing</Link>
            </>
          ) : (
            <>
              {LANDING_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-mist transition-colors duration-150 hover:text-paper">{l.label}</a>
              ))}
            </>
          )}
        </nav>

        {/* Right side — auth controls */}
        <div className="flex items-center gap-[14px]">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn btn-ghost !h-[36px] !py-0 !px-[18px] !text-[0.85rem] !inline-flex !items-center !justify-center max-[860px]:hidden">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-primary !h-[36px] !py-0 !px-[18px] !text-[0.85rem] !inline-flex !items-center !justify-center max-[860px]:hidden">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-[34px] h-[34px]",
                },
              }}
            />
          </SignedIn>
          <button
            className="flex min-[861px]:hidden flex-col gap-[4px] bg-transparent border-none cursor-pointer p-[8px]"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="xl-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="w-[20px] h-[2px] bg-paper rounded-[2px]" />
            <span className="w-[20px] h-[2px] bg-paper rounded-[2px]" />
            <span className="w-[20px] h-[2px] bg-paper rounded-[2px]" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav id="xl-mobile-menu" className="flex flex-col gap-[4px] px-[24px] pt-[10px] pb-[20px] bg-[#0b1024]/98 border-b border-line min-[861px]:hidden" aria-label="Mobile">
          {isHome ? (
            <>
              <Link to="/home" className="py-[12px] px-[4px] text-paper border-b border-line text-[0.95rem] no-underline" onClick={() => setOpen(false)}>Play</Link>
              <button 
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event('toggleHistorySidebar'));
                }}
                className="w-full text-left bg-transparent cursor-pointer font-body py-[12px] px-[4px] text-paper border-b border-line text-[0.95rem] no-underline"
              >
                History
              </button>
              <Link to="/" className="py-[12px] px-[4px] text-paper border-b border-line text-[0.95rem] no-underline" onClick={() => setOpen(false)}>Landing</Link>
            </>
          ) : (
            <>
              {LANDING_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="py-[12px] px-[4px] text-paper border-b border-line text-[0.95rem]" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
            </>
          )}
          <SignedOut>
            <div className="flex gap-[10px] mt-[12px]">
              <SignInButton mode="modal">
                <button className="btn btn-ghost flex-1 justify-center" onClick={() => setOpen(false)}>Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary flex-1 justify-center" onClick={() => setOpen(false)}>Sign Up</button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            {!isHome && (
              <Link to="/home" className="btn btn-primary mt-[12px] justify-center no-underline" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            )}
          </SignedIn>
        </nav>
      )}
    </header>
  );
}
