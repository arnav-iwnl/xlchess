import { useEffect, useState, lazy, Suspense, useRef } from "react";
import LoadingScreen from "./components/LoadingScreen";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";

const FamousGames = lazy(() => import("./components/FamousGames"));
const PlayStockfish = lazy(() => import("./components/PlayStockfish"));
const Testimonials = lazy(() => import("./components/Testimonials"));
const Contact = lazy(() => import("./components/Contact"));
const Footer = lazy(() => import("./components/Footer"));

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
      { rootMargin: "0px" } // Only load when touching the viewport
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

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Keep the loading screen extremely brief to protect Lighthouse scores
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <LoadingScreen visible={loading} />
      <Navbar />
      <main id="main">
        <Hero />
        <LazySection minHeight="800px">
          <Suspense fallback={<div className="h-[800px]" />}>
            <FamousGames />
          </Suspense>
        </LazySection>

        <LazySection minHeight="800px">
          <Suspense fallback={<div className="h-[800px]" />}>
            <PlayStockfish />
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
