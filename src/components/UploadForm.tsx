"use client";

import { useState, useRef, FormEvent, CSSProperties } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

/* ── helpers de estilo reutilizáveis ──────────────────────── */
const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 14px",
  fontSize: 14,
  color: "var(--text-primary)",
  backgroundColor: "#fff",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
  fontFamily: "inherit",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-primary)",
  marginBottom: 6,
  letterSpacing: ".01em",
};

const hintStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 12,
  color: "var(--text-muted)",
};

type FormStatus = "idle" | "loading" | "success" | "error";

interface FormState {
  status: FormStatus;
  mensagem?: string;
  erros?: string[];
}

export function UploadForm() {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [nomeArquivo, setNomeArquivo] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    const pdf = formData.get("pdf") as File | null;
    const nome = (formData.get("nome") as string | null)?.trim() ?? "";
    const telefone = (formData.get("telefone") as string | null)?.trim() ?? "";
    const dataEvento = (formData.get("dataEvento") as string | null)?.trim() ?? "";

    // ── Validação no cliente (antes de qualquer requisição) ──────────────
    const errosLocais: string[] = [];
    if (!pdf || pdf.size === 0) errosLocais.push("Selecione um arquivo PDF.");
    if (pdf && pdf.type !== "application/pdf")
      errosLocais.push("O arquivo deve ser um PDF.");
    if (pdf && pdf.size > 30 * 1024 * 1024)
      errosLocais.push("O PDF não pode ultrapassar 30 MB.");
    if (errosLocais.length > 0) {
      setState({ status: "error", erros: errosLocais });
      return;
    }

    setState({ status: "loading" });

    try {
      // 1) Pede ao servidor uma assinatura de upload do Cloudinary.
      //    O PDF NÃO passa pela nossa API — evita o 413 (limite 4,5 MB da Vercel).
      const signRes = await fetch("/api/uploads/sign", { method: "POST" });
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        setState({
          status: "error",
          erros: [err.erro ?? "Não foi possível preparar o upload. Tente novamente."],
        });
        return;
      }
      const sign = await signRes.json();

      // 2) Envia o PDF DIRETO ao Cloudinary com os parâmetros assinados.
      const cloudForm = new FormData();
      cloudForm.append("file", pdf as File);
      cloudForm.append("api_key", sign.apiKey);
      cloudForm.append("timestamp", String(sign.params.timestamp));
      cloudForm.append("folder", sign.params.folder);
      cloudForm.append("tags", sign.params.tags);
      cloudForm.append("signature", sign.signature);

      const cloudRes = await fetch(sign.uploadUrl, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) {
        const cloudErr = await cloudRes.json().catch(() => ({}));
        setState({
          status: "error",
          erros: [
            cloudErr?.error?.message
              ? `Falha no envio do PDF: ${cloudErr.error.message}`
              : "Falha ao enviar o PDF para o armazenamento. Tente novamente.",
          ],
        });
        return;
      }
      const cloudData = await cloudRes.json();

      // 3) Envia apenas os METADADOS para a nossa API (corpo pequeno, sem 413).
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicUrl: cloudData.secure_url,
          storageKey: cloudData.public_id,
          nome,
          telefone,
          dataEvento,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", erros: data.erros ?? [data.erro ?? "Erro desconhecido."] });
        return;
      }

      const dataEnvio = new Date(data.registro.dataEnvio).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      setState({ status: "success", mensagem: `Agendamento criado! O PDF será enviado em ${dataEnvio}.` });
      formRef.current?.reset();
      setNomeArquivo("");
    } catch {
      setState({ status: "error", erros: ["Falha na comunicação com o servidor. Tente novamente."] });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setNomeArquivo(file.name);
    }
  }

  function getFocusStyle(id: string): CSSProperties {
    return focusedField === id
      ? { borderColor: "var(--brand-500)", boxShadow: "0 0 0 3px rgba(58,122,58,.15)" }
      : {};
  }

  const hasFile = !!nomeArquivo;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      aria-label="Formulário de agendamento de envio"
    >
      {/* ── Feedback ─────────────────────────────────────────── */}
      {state.status === "success" && (
        <Alert type="success" title="Agendado com sucesso!">
          {state.mensagem}
        </Alert>
      )}
      {state.status === "error" && (
        <Alert type="error" title="Erro ao agendar">
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {state.erros?.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Alert>
      )}

      {/* ── Upload do PDF ─────────────────────────────────────── */}
      <div>
        <label style={labelStyle}>
          Livro de Homenagem (PDF){" "}
          <span style={{ color: "var(--error-text)" }} aria-hidden="true">*</span>
        </label>

        {/* Zona de drop — o input ocupa toda a área com opacity:0 para máxima compatibilidade */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: hasFile ? "var(--brand-400)" : dragOver ? "var(--brand-500)" : "var(--border-default)",
            borderRadius: "var(--radius-xl)",
            backgroundColor: hasFile ? "var(--brand-50)" : dragOver ? "var(--brand-100)" : "#fafcfa",
            padding: "36px 24px",
            cursor: "pointer",
            transition: "border-color .2s, background-color .2s",
            textAlign: "center",
          }}
        >
          {/* Ícone */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-lg)",
              backgroundColor: hasFile ? "var(--brand-100)" : "var(--brand-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
              transition: "background-color .2s",
            }}
          >
            {hasFile ? (
              /* Ícone de check quando arquivo selecionado */
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand-600)" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              /* Ícone de upload */
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="var(--brand-400)" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
          </div>

          {hasFile ? (
            <>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-700)" }}>
                {nomeArquivo}
              </span>
              <span style={{ fontSize: 12, color: "var(--brand-500)" }}>
                Clique para trocar o arquivo
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                Arraste o PDF aqui ou clique para selecionar
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Somente PDF · Máximo 30 MB
              </span>
            </>
          )}

          {/* Input invisível cobre TODA a área — garante clique em qualquer navegador */}
          <input
            ref={fileInputRef}
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            required
            aria-label="Selecionar arquivo PDF do Livro de Homenagem"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
              fontSize: 0,
            }}
            onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? "")}
          />
        </div>
      </div>

      {/* ── Nome do Familiar ──────────────────────────────────── */}
      <div>
        <label htmlFor="nome" style={labelStyle}>
          Nome do Familiar{" "}
          <span style={{ color: "var(--error-text)" }} aria-hidden="true">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          maxLength={150}
          placeholder="Ex: Maria da Silva"
          style={{ ...inputStyle, ...getFocusStyle("nome") }}
          onFocus={() => setFocusedField("nome")}
          onBlur={() => setFocusedField(null)}
        />
      </div>

      {/* ── Telefone ──────────────────────────────────────────── */}
      <div>
        <label htmlFor="telefone" style={labelStyle}>
          Telefone WhatsApp{" "}
          <span style={{ color: "var(--error-text)" }} aria-hidden="true">*</span>
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          required
          placeholder="+5564984754321"
          pattern="^\+[1-9]\d{7,14}$"
          title="Use o formato E.164: +55 + DDD + número (ex: +5564984754321)"
          style={{ ...inputStyle, ...getFocusStyle("telefone") }}
          onFocus={() => setFocusedField("telefone")}
          onBlur={() => setFocusedField(null)}
        />
        <p style={hintStyle}>
          Formato E.164: código do país + DDD + número — ex:{" "}
          <code style={{ fontFamily: "monospace", fontSize: 12 }}>+5564984754321</code>
        </p>
      </div>

      {/* ── Data do Evento ────────────────────────────────────── */}
      <div>
        <label htmlFor="dataEvento" style={labelStyle}>
          Data do Evento{" "}
          <span style={{ color: "var(--error-text)" }} aria-hidden="true">*</span>
        </label>
        <input
          id="dataEvento"
          name="dataEvento"
          type="date"
          required
          style={{ ...inputStyle, ...getFocusStyle("dataEvento") }}
          onFocus={() => setFocusedField("dataEvento")}
          onBlur={() => setFocusedField(null)}
        />
        <p style={hintStyle}>
          O Livro de Homenagem será enviado automaticamente{" "}
          <strong style={{ color: "var(--brand-600)" }}>7 dias após</strong> esta data.
        </p>
      </div>

      {/* ── Divider ───────────────────────────────────────────── */}
      <hr style={{ border: "none", borderTop: "1px solid var(--border-default)", margin: "4px 0" }} />

      {/* ── Botão submit ──────────────────────────────────────── */}
      <button
        type="submit"
        disabled={state.status === "loading"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "13px 24px",
          borderRadius: "var(--radius-md)",
          border: "none",
          backgroundColor: state.status === "loading" ? "var(--brand-300)" : "var(--brand-500)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: ".02em",
          cursor: state.status === "loading" ? "not-allowed" : "pointer",
          transition: "background-color .15s, box-shadow .15s",
          boxShadow: state.status === "loading" ? "none" : "var(--shadow-md)",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          if (state.status !== "loading")
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-600)";
        }}
        onMouseLeave={(e) => {
          if (state.status !== "loading")
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-500)";
        }}
      >
        {state.status === "loading" ? (
          <>
            <Spinner size="sm" color="#fff" />
            Enviando…
          </>
        ) : (
          <>
            {/* Ícone de calendário */}
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Agendar Envio
          </>
        )}
      </button>
    </form>
  );
}
