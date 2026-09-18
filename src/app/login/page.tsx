import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Acesso — Pax Rio Verde",
  description: "Entre com suas credenciais para acessar o sistema.",
};

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-page)",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image
            src="/logo_pax_30_anos.png"
            alt="Pax Rio Verde"
            width={160}
            height={160}
            priority
            style={{ objectFit: "contain", width: 160, height: "auto", display: "inline-block" }}
          />
        </div>

        {/* Card de login */}
        <div style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-2xl)",
          padding: "36px 36px 32px",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border-default)",
        }}>
          {/* Barra decorativa */}
          <div style={{
            height: 4,
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(90deg, var(--brand-500), var(--brand-300))",
            marginBottom: 28,
            marginLeft: -36,
            marginRight: -36,
            marginTop: -36,
            borderTopLeftRadius:  "var(--radius-2xl)",
            borderTopRightRadius: "var(--radius-2xl)",
          }} />

          <h2 style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--brand-800)",
            marginBottom: 24,
            marginTop: 0,
          }}>
            Entrar no sistema
          </h2>

          <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Carregando…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 12,
          color: "var(--text-muted)",
        }}>
          © {new Date().getFullYear()} Pax Rio Verde · Acesso restrito
        </p>
      </div>
    </main>
  );
}
