"use client";

import { useState, FormEvent, CSSProperties } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "11px 14px",
  fontSize: 14,
  color: "var(--text-primary)",
  backgroundColor: "#fff",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color .15s, box-shadow .15s",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
  marginBottom: 6,
};

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";

  const [loading,  setLoading]  = useState(false);
  const [erro,     setErro]     = useState<string | null>(null);
  const [focused,  setFocused]  = useState<string | null>(null);

  const focusStyle = (id: string): CSSProperties =>
    focused === id
      ? { borderColor: "var(--brand-500)", boxShadow: "0 0 0 3px rgba(58,122,58,.15)" }
      : {};

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const fd    = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const senha = fd.get("senha") as string;

    const result = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    if (result?.error) {
      setErro("E-mail ou senha incorretos. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
      aria-label="Formulário de login"
    >
      {/* Erro */}
      {erro && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            color: "var(--error-text)",
            fontSize: 13,
          }}
        >
          {erro}
        </div>
      )}

      {/* E-mail */}
      <div>
        <label htmlFor="email" style={labelStyle}>E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          style={{ ...inputStyle, ...focusStyle("email") }}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused(null)}
        />
      </div>

      {/* Senha */}
      <div>
        <label htmlFor="senha" style={labelStyle}>Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          style={{ ...inputStyle, ...focusStyle("senha") }}
          onFocus={() => setFocused("senha")}
          onBlur={() => setFocused(null)}
        />
      </div>

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "12px 24px",
          marginTop: 4,
          borderRadius: "var(--radius-md)",
          border: "none",
          backgroundColor: loading ? "var(--brand-300)" : "var(--brand-500)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background-color .15s",
          boxShadow: loading ? "none" : "var(--shadow-md)",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (!loading)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-600)";
        }}
        onMouseLeave={(e) => {
          if (!loading)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-500)";
        }}
      >
        {loading ? <><Spinner size="sm" color="#fff" /> Entrando…</> : "Entrar"}
      </button>
    </form>
  );
}
