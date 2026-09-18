import type { Metadata } from "next";
import { UploadForm } from "@/components/UploadForm";

export const metadata: Metadata = {
  title: "Novo Agendamento — Pax Rio Verde",
  description:
    "Faça upload do Livro de Homenagem e agende o envio automático por WhatsApp.",
};

export default function UploadPage() {
  return (
    <main style={{ flex: 1, backgroundColor: "var(--bg-page)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 664, margin: "0 auto" }}>

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          {/* Breadcrumb sutil */}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, letterSpacing: ".03em" }}>
            Dashboard &rsaquo; Novo Agendamento
          </p>

          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--brand-800)",
            letterSpacing: "-.02em",
            lineHeight: 1.2,
          }}>
            Novo Agendamento
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Anexe o Livro de Homenagem em PDF e informe os dados do familiar.
            O envio será realizado automaticamente{" "}
            <strong style={{ color: "var(--brand-600)" }}>7 dias após</strong> a data do evento.
          </p>
        </div>

        {/* ── Card principal ────────────────────────────────── */}
        <div style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "var(--radius-2xl)",
          padding: "36px 40px",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--border-default)",
        }}>
          {/* Linha decorativa superior na cor da marca */}
          <div style={{
            height: 4,
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(90deg, var(--brand-500), var(--brand-300))",
            marginBottom: 32,
            marginLeft: -40,
            marginRight: -40,
            marginTop: -36,
            borderTopLeftRadius: "var(--radius-2xl)",
            borderTopRightRadius: "var(--radius-2xl)",
          }} />

          <UploadForm />
        </div>

        {/* ── Aviso informativo ─────────────────────────────── */}
        <div style={{
          marginTop: 20,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          backgroundColor: "var(--warning-bg)",
          border: "1px solid var(--warning-border)",
          borderRadius: "var(--radius-lg)",
          padding: "12px 16px",
          fontSize: 13,
          color: "var(--warning-text)",
          lineHeight: 1.6,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} aria-hidden="true">⚠️</span>
          <p>
            <strong>Atenção:</strong> Verifique o número de telefone no formato{" "}
            <code style={{
              fontFamily: "monospace",
              fontSize: 12,
              backgroundColor: "rgba(0,0,0,.06)",
              padding: "1px 5px",
              borderRadius: 4,
            }}>
              +5564984754321
            </code>{" "}
            antes de confirmar. Não é possível alterar o número após o agendamento.
          </p>
        </div>

      </div>
    </main>
  );
}
