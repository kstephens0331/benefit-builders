"use client";

/**
 * Theme Provider
 *
 * Forces light mode across the application.
 * Dark mode has been disabled via Tailwind config.
 */

import { useEffect, ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Ensure light mode is always applied
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");

    // Clear any dark theme from localStorage
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "system") {
      localStorage.removeItem("theme");
    }
  }, []);

  return <>{children}</>;
}
