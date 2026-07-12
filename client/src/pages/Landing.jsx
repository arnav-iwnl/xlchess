import { useEffect, useState, lazy, Suspense, useRef } from "react";
import Hero from "../components/Hero";

const FamousGames = lazy(() => import("../components/FamousGames"));
const PlayStockfish = lazy(() => import("../components/PlayStockfish"));
const Testimonials = lazy(() => import("../components/Testimonials"));
const Contact = lazy(() => import("../components/Contact"));
const Footer = lazy(() => import("../components/Footer"));

function LazySection({ children, minHeight = "50vh" }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? "auto" : minHeight }}>
      {isVisible && children}
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <main id="main">
        <Hero />
        <LazySection minHeight="800px">
          <Suspense fallback={<div className="h-[800px]" />}>
            <FamousGames />
          </Suspense>
        </LazySection>

        <LazySection minHeight="800px">
          <Suspense fallback={<div className="h-[800px]" />}>
            <div className="container mx-auto px-[24px] max-w-[1050px]">
              <PlayStockfish enableCaching={false} />
            </div>
          </Suspense>
        </LazySection>

        <LazySection minHeight="400px">
          <Suspense fallback={null}>
            <Testimonials />
            <Contact />
          </Suspense>
        </LazySection>
      </main>
      <LazySection minHeight="200px">
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </LazySection>
    </>
  );
}
