import { FiStar } from "react-icons/fi";
import { testimonials } from "../data/testimonials";

export default function Testimonials() {
  return (
    <section id="reviews" className="py-[96px] border-t border-line">
      <div className="container">
        <p className="section-label">FROM THE COMMUNITY</p>
        <h2 className="mt-[10px] text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold max-w-[22ch]">Players are noticing the difference</h2>

        <div className="mt-[44px] grid grid-cols-3 max-[980px]:grid-cols-2 max-[620px]:grid-cols-1 gap-[20px]">
          {testimonials.map((t) => (
            <figure className="m-0 bg-ink-2 border border-ink-3 rounded-[14px] p-[22px] flex flex-col gap-[14px]" key={t.name}>
              <div className="flex gap-[3px] text-[0.9rem]" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <FiStar key={i} className={i < t.rating ? "text-gold" : "text-ink-3"} aria-hidden="true" />
                ))}
              </div>
              <blockquote className="m-0 text-[0.94rem] leading-[1.6] text-paper flex-1">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="flex flex-col gap-[2px] border-t border-ink-3 pt-[12px]">
                <span className="font-display font-semibold text-[0.92rem]">{t.name}</span>
                <span className="font-mono text-[0.74rem] text-mist">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
