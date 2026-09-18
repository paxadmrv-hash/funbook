"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/upload",    label: "Novo Agendamento" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname      = usePathname();
  const { data: session } = useSession();

  // Não renderiza navbar na página de login
  if (pathname === "/login") return null;

  return (
    <header style={{
      backgroundColor: "var(--bg-header)",
      borderBottom:    "1px solid var(--border-default)",
      boxShadow:       "0 1px 4px rgba(30,61,30,.06)",
      position:        "sticky",
      top:             0,
      zIndex:          50,
    }}>
      <div style={{
        maxWidth:       1152,
        margin:         "0 auto",
        padding:        "0 24px",
        height:         68,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            24,
      }}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}>
          <Image
            src="/logo_pax_30_anos.png"
            alt="Pax Rio Verde 30 anos"
            width={48}
            height={48}
            priority
            style={{ objectFit: "contain", width: 48, height: "auto" }}
          />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--brand-800)", letterSpacing: ".02em", textTransform: "uppercase" }}>
              Pax Rio Verde
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: ".04em" }}>
              Envios WhatsApp
            </span>
          </span>
        </Link>

        {/* ── Navegação + usuário ───────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          <nav style={{ display: "flex", alignItems: "center", gap: 2 }} aria-label="Navegação principal">
            {links.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    padding:         "8px 14px",
                    borderRadius:    "var(--radius-md)",
                    fontSize:        14,
                    fontWeight:      active ? 600 : 500,
                    textDecoration:  "none",
                    color:           active ? "var(--brand-700)" : "var(--text-secondary)",
                    backgroundColor: active ? "var(--brand-100)" : "transparent",
                    transition:      "background .15s, color .15s",
                    whiteSpace:      "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--brand-50)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--brand-700)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Divisor */}
          {session && (
            <div style={{ width: 1, height: 24, backgroundColor: "var(--border-default)", margin: "0 4px" }} />
          )}

          {/* Usuário logado */}
          {session?.user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Avatar inicial */}
              <div style={{
                width:           32,
                height:          32,
                borderRadius:    "50%",
                backgroundColor: "var(--brand-100)",
                border:          "1.5px solid var(--brand-300)",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                fontSize:        13,
                fontWeight:      700,
                color:           "var(--brand-700)",
                flexShrink:      0,
              }}>
                {(session.user.name ?? session.user.email ?? "U")[0].toUpperCase()}
              </div>

              {/* Nome — oculto em telas pequenas */}
              <span style={{
                fontSize:   13,
                fontWeight: 500,
                color:      "var(--text-secondary)",
                maxWidth:   120,
                overflow:   "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {session.user.name ?? session.user.email}
              </span>

              {/* Botão sair */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:             5,
                  padding:         "6px 12px",
                  borderRadius:    "var(--radius-md)",
                  border:          "1px solid var(--border-default)",
                  backgroundColor: "#fff",
                  color:           "var(--text-secondary)",
                  fontSize:        12,
                  fontWeight:      600,
                  cursor:          "pointer",
                  transition:      "background .15s, color .15s",
                  fontFamily:      "inherit",
                  whiteSpace:      "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--error-bg)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--error-text)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--error-border)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
                }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
