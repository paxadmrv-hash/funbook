"use client";

export type StatusEnvio = "PENDENTE" | "REENVIANDO" | "ENVIADO" | "FALHA";

const CONFIG: Record<StatusEnvio, { label: string; bg: string; color: string; border: string; dot: string; pulse?: boolean }> = {
  PENDENTE: {
    label: "Pendente",
    bg:     "var(--warning-bg)",
    color:  "var(--warning-text)",
    border: "var(--warning-border)",
    dot:    "#d4a017",
  },
  REENVIANDO: {
    label: "Reenviando",
    bg:     "var(--info-bg)",
    color:  "var(--info-text)",
    border: "var(--info-border)",
    dot:    "#2e86ab",
    pulse:  true,
  },
  ENVIADO: {
    label: "Enviado",
    bg:     "var(--success-bg)",
    color:  "var(--success-text)",
    border: "var(--success-border)",
    dot:    "var(--brand-500)",
  },
  FALHA: {
    label: "Falha",
    bg:     "var(--error-bg)",
    color:  "var(--error-text)",
    border: "var(--error-border)",
    dot:    "#c0392b",
  },
};

interface StatusBadgeProps {
  status: StatusEnvio;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = CONFIG[status] ?? CONFIG.PENDENTE;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: ".01em",
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: c.dot,
          flexShrink: 0,
          animation: c.pulse ? "pax-pulse 1.2s ease-in-out infinite" : undefined,
        }}
      />
      {c.label}

      {/* keyframes inline — só renderiza uma vez no DOM */}
      {c.pulse && (
        <style>{`
          @keyframes pax-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: .35; }
          }
        `}</style>
      )}
    </span>
  );
}
