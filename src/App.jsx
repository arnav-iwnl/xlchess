import { useEffect, useState, lazy, Suspense } from "react";
import LoadingScreen from "./components/LoadingScreen";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { initAnalytics } from "./lib/analytics";

const FamousGames = lazy(() => import("./components/FamousGames"));
const PlayStockfish = lazy(() => import("./components/PlayStockfish"));
const Testimonials = lazy(() => import("./components/Testimonials"));
const Contact = lazy(() => import("./components/Contact"));
const Footer = lazy(() => import("./components/Footer"));

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAnalytics();
    const t = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <LoadingScreen visible={loading} />
      <Navbar />
      <main id="main">
        <Hero />
        <Suspense fallback={<div className="h-[20vh]" />}>
          <FamousGames />
          <PlayStockfish />
          <Testimonials />
          <Contact />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
