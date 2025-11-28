"use client";

/**
 * Theme Toggle Button
 *
 * Premium animated button to switch between light and dark modes.
 * Features smooth icon transitions and tooltip on hover.
 */

import { useTheme } from "./ThemeProvider";
import { Tooltip } from "@/components/ui";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Tooltip
      content={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      position="bottom"
    >
      <button
        onClick={toggleTheme}
        className="relative p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 active:scale-95 group"
        aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      >
        {/* Sun Icon (Light Mode) */}
        <svg
          className={`w-5 h-5 transition-all duration-300 ${
            resolvedTheme === "dark"
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          } absolute inset-0 m-auto`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
          />
        </svg>

        {/* Moon Icon (Dark Mode) */}
        <svg
          className={`w-5 h-5 transition-all duration-300 ${
            resolvedTheme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          />
        </svg>

        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-lg bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors duration-200" />
      </button>
    </Tooltip>
  );
}
