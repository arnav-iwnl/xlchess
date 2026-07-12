export default function Footer() {
  return (
    <footer className="border-t border-line py-[32px]">
      <div className="container flex items-center justify-between gap-[16px] flex-wrap max-[700px]:flex-col max-[700px]:text-center">
        <div className="flex items-center gap-[8px] font-display font-bold text-[0.9rem] tracking-[0.04em] text-paper">
          <span aria-hidden="true" className="text-violet-2 text-[1.2rem]">♞</span>
          <span>XLCHESS</span>
        </div>
        <p className="coord-strip justify-center max-[700px]:hidden" aria-hidden="true">
          a&nbsp;&nbsp;b&nbsp;&nbsp;c&nbsp;&nbsp;d&nbsp;&nbsp;e&nbsp;&nbsp;f&nbsp;&nbsp;g&nbsp;&nbsp;h
        </p>
        <p className="text-[0.82rem] text-mist">© {new Date().getFullYear()} XLChess.</p>
      </div>
    </footer>
  );
}
