import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function useThemes() {
  const [boardTheme, setBoardTheme] = useState("classic");
  const [pieceSet, setPieceSet] = useState("standard");

  useEffect(() => {
    // Initial fetch of the user's equipped theme
    apiFetch("/api/themes/mine")
      .then((res) => {
        if (res) {
          if (res.boardTheme) setBoardTheme(res.boardTheme);
          if (res.pieceSet) setPieceSet(res.pieceSet);
        }
      })
      .catch(() => {
        // Ignore errors if not logged in
      });

    // Listen for real-time theme changes from the ThemeStore
    const handleThemeChanged = (e) => setBoardTheme(e.detail);
    const handlePieceChanged = (e) => setPieceSet(e.detail);

    window.addEventListener("themeChanged", handleThemeChanged);
    window.addEventListener("pieceChanged", handlePieceChanged);
    
    return () => {
      window.removeEventListener("themeChanged", handleThemeChanged);
      window.removeEventListener("pieceChanged", handlePieceChanged);
    };
  }, []);

  return { boardTheme, pieceSet };
}
