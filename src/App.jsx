import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FamousGames from "./components/FamousGames";
import PlayStockfish from "./components/PlayStockfish";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import { initAnalytics } from "./lib/analytics";

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAnalytics();
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <LoadingScreen visible={loading} />
      <Navbar />
      <main id="main">
        <Hero />
        <FamousGames />
        <PlayStockfish />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
