import type { Metadata } from "next";
import Link from "next/link";
import { DashboardTable } from "@/components/DashboardTable";
import { DashboardStats } from "@/components/DashboardStats";

export const metadata: Metadata = {
  title: "Dashboard — Pax Rio Verde",
  description: "Acompanhe os envios agendados e o status de cada mensagem.",
};

export default function DashboardPage() {
  return (
    <main style={{ flex: 1, backgroundColor: "var(--bg-page)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}>
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, letterSpacing: ".03em" }}>
              Pax Rio Verde &rsaquo; Dashboard
            </p>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--brand-800)",
              letterSpacing: "-.02em",
              lineHeight: 1.2,
            }}>
              Dashboard de Envios
            </h1>
            <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Acompanhe os agendamentos, verifique o status e reenvie mensagens com falha.
            </p>
          </div>

          {/* Botão CTA */}
          <Link
            href="/upload"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--brand-500)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "var(--shadow-md)",
              whiteSpace: "nowrap",
              letterSpacing: ".01em",
              transition: "background .15s",
            }}
          >
            {/* Ícone + */}
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo Agendamento
          </Link>
        </div>

        {/* ── Cards de resumo (dados reais do banco) ────────── */}
        <DashboardStats />

        {/* ── Divider com título de seção ───────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            width: 4,
            height: 20,
            borderRadius: 2,
            backgroundColor: "var(--brand-500)",
            flexShrink: 0,
          }} />
          <h2 style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--brand-700)",
            letterSpacing: ".01em",
          }}>
            Registros
          </h2>
          <div style={{
            flex: 1,
            height: 1,
            backgroundColor: "var(--border-default)",
          }} />
        </div>

        {/* ── Tabela (client component) ─────────────────────── */}
        <DashboardTable />

      </div>
    </main>
  );
}
