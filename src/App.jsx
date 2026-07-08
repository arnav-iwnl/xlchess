import { useEffect, useState, lazy, Suspense, useRef } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { initAnalytics } from "./lib/analytics";

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
      { rootMargin: "400px" } // Load slightly before it comes into view
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
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
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
