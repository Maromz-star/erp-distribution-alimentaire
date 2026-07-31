import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Distribution - Gestion commerciale",
  description: "Application de gestion commerciale pour entreprise de distribution alimentaire",
    manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/*
          Applique le theme (clair/sombre) AVANT le premier rendu React, en
          lisant directement localStorage dans un script inline synchrone.
          Sans ca, la page flashe en clair puis bascule en sombre (FOUC).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'sombre' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-navy-950 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
