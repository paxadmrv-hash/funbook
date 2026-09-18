import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pax Rio Verde — Envios WhatsApp", template: "%s — Pax Rio Verde" },
  description: "Sistema de agendamento e envio automático do Livro de Homenagem via WhatsApp.",
  icons: { icon: "/logo_pax_30_anos.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`} style={{ height: "100%" }}>
      <body style={{ minHeight: "100%", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-page)", margin: 0 }}>
        <SessionProvider>
          <Navbar />
          {children}
          <footer style={{
            borderTop:       "1px solid var(--border-default)",
            backgroundColor: "var(--brand-50)",
            padding:         "16px 24px",
            textAlign:       "center",
            fontSize:        12,
            color:           "var(--text-muted)",
          }}>
            © {new Date().getFullYear()} Pax Rio Verde · Todos os direitos reservados
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
