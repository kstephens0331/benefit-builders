// apps/web/src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

export const metadata = {
  title: "Benefits Builder",
  description: "Pre-tax optimization & reporting",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ToastProvider>
          <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              <a className="font-semibold tracking-tight" href="/">Benefits Builder</a>
              <Nav />
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
