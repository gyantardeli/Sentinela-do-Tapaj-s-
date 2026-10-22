import type { Metadata } from "next";
import "./globals.css";
import "./dashboard-refresh.css";
import "./fire-replay.css";
import "./branding.css";

export const metadata: Metadata = {
  title: "Sentinela Tapajós · Monitoramento Ambiental",
  description: "Focos de calor, qualidade do ar, previsão do tempo e vento em uma visão integrada da região do Tapajós. SELVA, Windy, INPE, CAMS, AccuWeather e Clima & Radar.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sentinela Tapajós",
  appleWebApp: { capable: true, title: "Sentinela Tapajós", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg?v=20261018",
    shortcut: "/favicon.svg?v=20261018",
    apple: "/icons/apple-touch-icon.png?v=20261018",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head><meta name="theme-color" content="#061f1b" /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
