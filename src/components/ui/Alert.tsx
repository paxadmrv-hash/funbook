"use client";

import type { ReactNode } from "react";

type AlertType = "success" | "error" | "info" | "warning";

const STYLES: Record<AlertType, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg:     "var(--success-bg)",
    border: "var(--success-border)",
    color:  "var(--success-text)",
    icon:   "✓",
  },
  error: {
    bg:     "var(--error-bg)",
    border: "var(--error-border)",
    color:  "var(--error-text)",
    icon:   "✕",
  },
  warning: {
    bg:     "var(--warning-bg)",
    border: "var(--warning-border)",
    color:  "var(--warning-text)",
    icon:   "!",
  },
  info: {
    bg:     "var(--info-bg)",
    border: "var(--info-border)",
    color:  "var(--info-text)",
    icon:   "i",
  },
};

interface AlertProps {
  type: AlertType;
  title?: string;
  children: ReactNode;
}

export function Alert({ type, title, children }: AlertProps) {
  const s = STYLES[type];

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
        padding: "14px 16px",
        fontSize: 14,
        color: s.color,
        lineHeight: 1.6,
      }}
    >
      {/* Ícone circular */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          marginTop: 1,
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `1.5px solid ${s.border}`,
          backgroundColor: s.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: s.color,
        }}
      >
        {s.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ fontWeight: 700, marginBottom: 3, fontSize: 14 }}>
            {title}
          </p>
        )}
        <div style={{ fontSize: 13, opacity: 0.9 }}>{children}</div>
      </div>
    </div>
  );
}
