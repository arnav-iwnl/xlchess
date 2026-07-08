import { useEffect, useState } from "react";

const LINKS = [
  { href: "#games", label: "Famous Games" },
  { href: "#play", label: "Play" },
  { href: "#reviews", label: "Reviews" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-[100] transition-colors duration-250 border-b ${scrolled ? "bg-ink/86 backdrop-blur-[10px] border-line" : "bg-transparent border-transparent"}`}>
      <div className="container flex items-center justify-between py-[15px]">
        <a href="#top" className="flex items-center gap-[10px] text-paper">
          <span className="text-[1.6rem] text-violet-2" aria-hidden="true">♞</span>
          <span className="font-display font-bold tracking-[0.04em] text-[1rem] flex flex-col leading-[1.1]">
            XLCHESS
            <span className="font-mono font-normal text-[0.62rem] tracking-[0.1em] text-mist uppercase">Excel at Chess</span>
          </span>
        </a>

        <nav className="hidden max-[860px]:hidden min-[861px]:flex gap-[28px] text-[0.92rem]" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-mist transition-colors duration-150 hover:text-paper">{l.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-[14px]">
          <a href="#play" className="btn btn-primary max-[860px]:hidden !h-[36px] !py-0 !px-[18px] !text-[0.85rem] !inline-flex !items-center !justify-center">
            Play Now
          </a>
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

      {open && (
        <nav id="xl-mobile-menu" className="flex flex-col gap-[4px] px-[24px] pt-[10px] pb-[20px] bg-[#0b1024]/98 border-b border-line min-[861px]:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="py-[12px] px-[4px] text-paper border-b border-line text-[0.95rem]" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="#play" className="btn btn-primary mt-[12px] justify-center" onClick={() => setOpen(false)}>
            Play Now
          </a>
        </nav>
      )}
    </header>
  );
}
