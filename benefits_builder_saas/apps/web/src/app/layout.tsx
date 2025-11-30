// apps/web/src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Benefits Builder",
  description: "Pre-tax optimization & reporting",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Force remove dark class and set light mode
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');

                  // Clear any dark theme in localStorage
                  var theme = localStorage.getItem('theme');
                  if (!theme || theme === 'dark' || theme === 'system') {
                    localStorage.setItem('theme', 'light');
                  }
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-lg shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <a
                  className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-400 dark:to-primary-500 bg-clip-text text-transparent hover:scale-105 transition-transform"
                  href="/"
                >
                  Benefits Builder
                </a>
                <Nav />
              </div>
            </header>
            <main>{children}</main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
