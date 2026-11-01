import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./dashboard-refresh.css";
import "./fire-replay.css";
import "./branding.css";
import "./history-map.css";
import "./weather-map.css";
import "./purpleair.css";
import "./air-quality-map.css";
import "./site-access.css";
import SiteAccessNotice from "../components/site-access-notice";

// Identificador público do Cloudflare Web Analytics do domínio de produção.
// Manter no código-fonte para sobreviver aos próximos deployments.
const CLOUDFLARE_WEB_ANALYTICS_TOKEN = "1e88520ee2864d3ea301ea7a158e1409";

export const metadata: Metadata = {
  title: "Sentinela Tapajós · Monitoramento Ambiental",
  description: "Focos de calor, qualidade do ar, previsão do tempo e vento em uma visão integrada da região do Tapajós. Windy, PurpleAir, INPE, CAMS, AccuWeather e Clima & Radar.",
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
      <body className="antialiased">
        {children}
        <SiteAccessNotice />
        <Script
          id="sentinela-cloudflare-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon={JSON.stringify({
            token: CLOUDFLARE_WEB_ANALYTICS_TOKEN,
            spa: true,
          })}
        />
      </body>
    </html>
  );
}
