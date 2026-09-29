"use client";

import { useState, useCallback, useEffect, CSSProperties } from "react";
import { StatusBadge, StatusEnvio } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

/* ── tipos ─────────────────────────────────────────────── */
interface Registro {
  id: string;
  nomeFamiliar: string;
  telefone: string;
  urlPdf: string;
  dataEvento: string;
  dataEnvio: string;
  statusEnvio: StatusEnvio;
  tentativas: number;
  ultimoErro: string | null;
  zenviaId: string | null;
  criadoEm: string;
}

interface Paginacao {
  total: number;
  page: number;
  limit: number;
  totalPaginas: number;
}

/* ── helpers ────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function fmtPhone(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length >= 12) {
    const num = d.slice(4);
    const fmt = num.length === 9
      ? `${num.slice(0, 5)}-${num.slice(5)}`
      : `${num.slice(0, 4)}-${num.slice(4)}`;
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${fmt}`;
  }
  return tel;
}

/* ── estilos compartilhados ─────────────────────────────── */
const filterInputStyle: CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  backgroundColor: "#fff",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color .15s, box-shadow .15s",
};

const thStyle: CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  whiteSpace: "nowrap",
  backgroundColor: "var(--brand-50)",
  borderBottom: "1px solid var(--border-default)",
};

const tdStyle: CSSProperties = {
  padding: "13px 16px",
  color: "var(--text-primary)",
  fontSize: 13,
  verticalAlign: "middle",
};

export function DashboardTable() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  // Vazio por padrão = mostra TODOS os registros (não filtra por data)
  const [dataFiltro, setDataFiltro] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<StatusEnvio | "">("");
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<Record<string, boolean>>({});
  const [acaoEmCurso, setAcaoEmCurso] = useState<Record<string, boolean>>({});
  const [feedbackReenvio, setFeedbackReenvio] = useState<
    Record<string, { tipo: "success" | "error"; msg: string }>
  >({});
  const [focusedFilter, setFocusedFilter] = useState<string | null>(null);

  function focusStyle(id: string): CSSProperties {
    return focusedFilter === id
      ? { borderColor: "var(--brand-500)", boxShadow: "0 0 0 3px rgba(58,122,58,.15)" }
      : {};
  }

  const buscarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (dataFiltro) params.set("data", dataFiltro);
      if (statusFiltro) params.set("status", statusFiltro);
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar dados.");
      const json = await res.json();
      setRegistros(json.registros);
      setPaginacao(json.paginacao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setCarregando(false);
    }
  }, [dataFiltro, statusFiltro, page]);

  useEffect(() => { buscarDados(); }, [buscarDados]);

  async function handleReenviar(id: string) {
    setReenviando((p) => ({ ...p, [id]: true }));
    setFeedbackReenvio((p) => { const n = { ...p }; delete n[id]; return n; });
    try {
      const res = await fetch(`/api/reenviar/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: data.detalhe ?? data.erro ?? "Falha." } }));
      } else {
        setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "success", msg: "Reenviado com sucesso!" } }));
        setRegistros((p) =>
          p.map((r) => r.id === id
            ? { ...r, statusEnvio: "ENVIADO" as StatusEnvio, zenviaId: data.registro.zenviaId }
            : r
          )
        );
      }
    } catch {
      setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: "Erro de comunicação com o servidor." } }));
    } finally {
      setReenviando((p) => ({ ...p, [id]: false }));
    }
  }

  const canReenviar = (s: StatusEnvio) => s === "FALHA" || s === "PENDENTE" || s === "CANCELADO";
  const canCancelar = (s: StatusEnvio) => s === "PENDENTE" || s === "FALHA" || s === "REENVIANDO";

  async function handleCancelar(id: string, nome: string) {
    if (!window.confirm(`Cancelar o envio agendado para "${nome}"?\n\nO registro continua na lista, mas o WhatsApp não será enviado. Você pode reativá-lo depois clicando em "Reenviar".`)) {
      return;
    }
    setAcaoEmCurso((p) => ({ ...p, [id]: true }));
    setFeedbackReenvio((p) => { const n = { ...p }; delete n[id]; return n; });
    try {
      const res = await fetch(`/api/cancelar/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: data.erro ?? "Falha ao cancelar." } }));
      } else {
        setRegistros((p) =>
          p.map((r) => r.id === id ? { ...r, statusEnvio: "CANCELADO" as StatusEnvio, ultimoErro: null } : r)
        );
        setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "success", msg: "Envio cancelado." } }));
      }
    } catch {
      setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: "Erro de comunicação com o servidor." } }));
    } finally {
      setAcaoEmCurso((p) => ({ ...p, [id]: false }));
    }
  }

  async function handleExcluir(id: string, nome: string) {
    if (!window.confirm(`Excluir permanentemente o registro de "${nome}"?\n\nEsta ação NÃO pode ser desfeita — o agendamento e o PDF serão removidos de vez.`)) {
      return;
    }
    setAcaoEmCurso((p) => ({ ...p, [id]: true }));
    setFeedbackReenvio((p) => { const n = { ...p }; delete n[id]; return n; });
    try {
      const res = await fetch(`/api/registros/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: data.erro ?? "Falha ao excluir." } }));
        setAcaoEmCurso((p) => ({ ...p, [id]: false }));
      } else {
        // Some da lista imediatamente
        setRegistros((p) => p.filter((r) => r.id !== id));
      }
    } catch {
      setFeedbackReenvio((p) => ({ ...p, [id]: { tipo: "error", msg: "Erro de comunicação com o servidor." } }));
      setAcaoEmCurso((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>

        <div>
          <label htmlFor="filtro-data" style={{
            display: "block", fontSize: 11, fontWeight: 600,
            color: "var(--text-secondary)", textTransform: "uppercase",
            letterSpacing: ".06em", marginBottom: 5,
          }}>
            Data de Envio <span style={{ fontWeight: 400, textTransform: "none" }}>(vazio = todas)</span>
          </label>
          <input
            id="filtro-data"
            type="date"
            value={dataFiltro}
            style={{ ...filterInputStyle, ...focusStyle("data") }}
            onFocus={() => setFocusedFilter("data")}
            onBlur={() => setFocusedFilter(null)}
            onChange={(e) => { setDataFiltro(e.target.value); setPage(1); }}
          />
        </div>

        <div>
          <label htmlFor="filtro-status" style={{
            display: "block", fontSize: 11, fontWeight: 600,
            color: "var(--text-secondary)", textTransform: "uppercase",
            letterSpacing: ".06em", marginBottom: 5,
          }}>
            Status
          </label>
          <select
            id="filtro-status"
            value={statusFiltro}
            style={{ ...filterInputStyle, ...focusStyle("status") }}
            onFocus={() => setFocusedFilter("status")}
            onBlur={() => setFocusedFilter(null)}
            onChange={(e) => { setStatusFiltro(e.target.value as StatusEnvio | ""); setPage(1); }}
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="REENVIANDO">Reenviando</option>
            <option value="ENVIADO">Enviado</option>
            <option value="FALHA">Falha</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <button
          onClick={() => buscarDados()}
          disabled={carregando}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: "var(--radius-md)",
            border: "none", backgroundColor: "var(--brand-500)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: carregando ? "not-allowed" : "pointer",
            opacity: carregando ? .7 : 1, transition: "background .15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { if (!carregando) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-600)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-500)"; }}
        >
          {carregando ? <Spinner size="sm" color="#fff" /> : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
          Atualizar
        </button>

        {/* Limpar filtros — só aparece quando há algum filtro ativo */}
        {(dataFiltro || statusFiltro) && (
          <button
            onClick={() => { setDataFiltro(""); setStatusFiltro(""); setPage(1); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: "var(--radius-md)",
              borderWidth: 1, borderStyle: "solid", borderColor: "var(--border-default)",
              backgroundColor: "#fff", color: "var(--text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "background .15s", fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-50)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff"; }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Erro global ─────────────────────────────────────── */}
      {erro && <Alert type="error">{erro}</Alert>}

      {/* ── Contagem ─────────────────────────────────────────── */}
      {paginacao && (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {paginacao.total} registro(s) encontrado(s)
          {dataFiltro && ` · envio em ${fmtDate(dataFiltro + "T12:00:00Z")}`}
        </p>
      )}

      {/* ── Tabela ───────────────────────────────────────────── */}
      <div style={{
        overflowX: "auto",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-default)",
        backgroundColor: "#fff",
        boxShadow: "var(--shadow-card)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>
              {["Familiar", "Telefone", "Data Evento", "Data Envio", "Status", "Tent.", "PDF", "Ações"].map((col) => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading state */}
            {carregando && registros.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: "center", padding: "56px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                    <Spinner size="lg" />
                    <span>Carregando registros…</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {!carregando && registros.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...tdStyle, textAlign: "center", padding: "56px 16px", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--brand-200)" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <span>Nenhum registro encontrado para os filtros selecionados.</span>
                  </div>
                </td>
              </tr>
            )}

            {/* Linhas de dados */}
            {registros.map((r, idx) => (
              <>
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid var(--brand-50)",
                    backgroundColor: idx % 2 === 0 ? "#fff" : "var(--brand-50)",
                    transition: "background-color .1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--brand-100)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? "#fff" : "var(--brand-50)"; }}
                >
                  {/* Nome */}
                  <td style={{ ...tdStyle, fontWeight: 600, color: "var(--brand-800)" }}>
                    {r.nomeFamiliar}
                  </td>

                  {/* Telefone */}
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {fmtPhone(r.telefone)}
                  </td>

                  {/* Data evento */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                    {fmtDate(r.dataEvento)}
                  </td>

                  {/* Data envio */}
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                    {fmtDate(r.dataEnvio)}
                  </td>

                  {/* Status */}
                  <td style={tdStyle}>
                    <StatusBadge status={r.statusEnvio} />
                  </td>

                  {/* Tentativas */}
                  <td style={{ ...tdStyle, textAlign: "center", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {r.tentativas}
                  </td>

                  {/* Link PDF */}
                  <td style={tdStyle}>
                    <a
                      href={r.urlPdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir PDF de ${r.nomeFamiliar}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        color: "var(--brand-600)", fontSize: 13, fontWeight: 500,
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none"; }}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver PDF
                    </a>
                  </td>

                  {/* Ações */}
                  <td style={tdStyle}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {canReenviar(r.statusEnvio) && (
                        <button
                          onClick={() => handleReenviar(r.id)}
                          disabled={reenviando[r.id] || acaoEmCurso[r.id]}
                          aria-label={`Reenviar mensagem para ${r.nomeFamiliar}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-default)",
                            backgroundColor: "#fff", color: "var(--text-primary)",
                            fontSize: 12, fontWeight: 600, cursor: (reenviando[r.id] || acaoEmCurso[r.id]) ? "not-allowed" : "pointer",
                            opacity: (reenviando[r.id] || acaoEmCurso[r.id]) ? .6 : 1,
                            transition: "background .15s, border-color .15s",
                            fontFamily: "inherit", whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            if (!reenviando[r.id] && !acaoEmCurso[r.id]) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-50)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand-300)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
                          }}
                        >
                          {reenviando[r.id] ? <Spinner size="sm" /> : (
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                            </svg>
                          )}
                          {r.statusEnvio === "CANCELADO" ? "Reativar" : "Reenviar"}
                        </button>
                      )}

                      {canCancelar(r.statusEnvio) && (
                        <button
                          onClick={() => handleCancelar(r.id, r.nomeFamiliar)}
                          disabled={acaoEmCurso[r.id] || reenviando[r.id]}
                          aria-label={`Cancelar envio de ${r.nomeFamiliar}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-default)",
                            backgroundColor: "#fff", color: "var(--text-secondary)",
                            fontSize: 12, fontWeight: 600, cursor: (acaoEmCurso[r.id] || reenviando[r.id]) ? "not-allowed" : "pointer",
                            opacity: (acaoEmCurso[r.id] || reenviando[r.id]) ? .6 : 1,
                            transition: "background .15s, border-color .15s",
                            fontFamily: "inherit", whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            if (!acaoEmCurso[r.id] && !reenviando[r.id]) {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--warning-bg)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--warning-border)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
                          }}
                        >
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Cancelar
                        </button>
                      )}

                      {/* Excluir — sempre disponível */}
                      <button
                        onClick={() => handleExcluir(r.id, r.nomeFamiliar)}
                        disabled={acaoEmCurso[r.id] || reenviando[r.id]}
                        aria-label={`Excluir registro de ${r.nomeFamiliar}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--error-border)",
                          backgroundColor: "#fff", color: "var(--error-text)",
                          fontSize: 12, fontWeight: 600, cursor: (acaoEmCurso[r.id] || reenviando[r.id]) ? "not-allowed" : "pointer",
                          opacity: (acaoEmCurso[r.id] || reenviando[r.id]) ? .6 : 1,
                          transition: "background .15s",
                          fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => {
                          if (!acaoEmCurso[r.id] && !reenviando[r.id])
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--error-bg)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                        }}
                      >
                        {acaoEmCurso[r.id] ? <Spinner size="sm" /> : (
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        )}
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Linha de detalhe do erro */}
                {r.ultimoErro && (
                  <tr key={`${r.id}-err`} style={{ backgroundColor: "var(--error-bg)" }}>
                    <td colSpan={8} style={{
                      padding: "8px 16px", fontSize: 12,
                      color: "var(--error-text)",
                      borderBottom: "1px solid var(--error-border)",
                    }}>
                      <strong>Último erro:</strong> {r.ultimoErro}
                    </td>
                  </tr>
                )}

                {/* Feedback inline de reenvio */}
                {feedbackReenvio[r.id] && (
                  <tr key={`${r.id}-fb`}>
                    <td colSpan={8} style={{
                      padding: "8px 16px", fontSize: 12, fontWeight: 600,
                      backgroundColor: feedbackReenvio[r.id].tipo === "success"
                        ? "var(--success-bg)" : "var(--error-bg)",
                      color: feedbackReenvio[r.id].tipo === "success"
                        ? "var(--success-text)" : "var(--error-text)",
                    }}>
                      {feedbackReenvio[r.id].msg}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ────────────────────────────────────────── */}
      {paginacao && paginacao.totalPaginas > 1 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 13, color: "var(--text-muted)",
        }}>
          <span>Página {paginacao.page} de {paginacao.totalPaginas}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "← Anterior", disabled: page === 1, onClick: () => setPage((p) => Math.max(1, p - 1)) },
              { label: "Próxima →", disabled: page === paginacao.totalPaginas, onClick: () => setPage((p) => Math.min(paginacao.totalPaginas, p + 1)) },
            ].map(({ label, disabled, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled || carregando}
                style={{
                  padding: "6px 16px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "#fff", color: "var(--text-primary)",
                  fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? .4 : 1, fontFamily: "inherit",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--brand-50)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff"; }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
