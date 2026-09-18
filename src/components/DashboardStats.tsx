"use client";

import { useEffect, useState } from "react";

interface Stats {
  pendente:   number;
  reenviando: number;
  enviado:    number;
  falha:      number;
  total:      number;
}

const CARDS = [
  { key: "pendente" as const, label: "Pendentes", bg: "var(--warning-bg)", border: "var(--warning-border)", textLabel: "var(--warning-text)", textValue: "#92400e" },
  { key: "enviado"  as const, label: "Enviados",  bg: "var(--success-bg)", border: "var(--success-border)", textLabel: "var(--success-text)", textValue: "var(--brand-800)" },
  { key: "falha"    as const, label: "Com falha", bg: "var(--error-bg)",   border: "var(--error-border)",   textLabel: "var(--error-text)",   textValue: "#7a1e1e" },
  { key: "total"    as const, label: "Total",     bg: "var(--brand-50)",   border: "var(--brand-200)",      textLabel: "var(--brand-600)",    textValue: "var(--brand-800)" },
];

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (ativo && data && !data.erro) setStats(data); })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 16,
      marginBottom: 28,
    }}>
      {CARDS.map(({ key, label, bg, border, textLabel, textValue }) => (
        <div
          key={key}
          style={{
            backgroundColor: bg,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: border,
            borderRadius: "var(--radius-xl)",
            padding: "18px 22px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            color: textLabel,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 8,
          }}>
            {label}
          </p>
          <p style={{
            fontSize: 32,
            fontWeight: 800,
            color: textValue,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}>
            {stats ? stats[key] : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
