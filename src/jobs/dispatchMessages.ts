/**
 * Cron Job — Disparo Diário de Mensagens WhatsApp
 *
 * Roda todos os dias às 09:00 (America/Sao_Paulo).
 * Busca todos os registros com data_envio = HOJE e status PENDENTE ou REENVIANDO,
 * e realiza o disparo via Zenvia.
 *
 * Para ativar, chame `registerDispatchJob()` no ponto de entrada da aplicação.
 * Em Next.js, use um Custom Server (server.ts) ou um Worker separado.
 */

import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { comRetry } from "@/lib/retry";
import { sendWhatsAppTemplate } from "@/services/zenvia";
import type { ScheduledMessage } from "@prisma/client";

const MAX_TENTATIVAS = 3;
/** Quantas mensagens processar em paralelo por lote (evita rate limit). */
const TAMANHO_LOTE = 5;

/**
 * Registra o cron job. Deve ser chamado uma única vez na inicialização.
 * Expressão cron: "0 9 * * *" = todo dia às 09:00 (TZ definido por process.env.TZ).
 */
export function registerDispatchJob(): void {
  cron.schedule(
    "0 9 * * *",
    async () => {
      await executarDisparo();
    },
    { timezone: "America/Sao_Paulo" }
  );

  console.log("[CronJob] ✅ Job de disparo diário registrado (09:00 BRT).");
}

/**
 * Executa o ciclo de disparo — exportada separadamente para permitir
 * chamada manual em testes ou via endpoint de admin.
 */
export async function executarDisparo(): Promise<{
  total: number;
  enviados: number;
  falhas: number;
}> {
  const hoje = new Date();
  // Zera hora/min/seg para comparar apenas a data
  hoje.setHours(0, 0, 0, 0);

  console.log(`[CronJob] 🚀 Iniciando disparo | data=${hoje.toISOString().slice(0, 10)}`);

  const registros = await prisma.scheduledMessage.findMany({
    where: {
      dataEnvio: hoje,
      statusEnvio: { in: ["PENDENTE", "REENVIANDO"] },
      tentativas: { lt: MAX_TENTATIVAS },
    },
    orderBy: { criadoEm: "asc" },
  });

  console.log(`[CronJob] 📋 ${registros.length} mensagem(ns) para processar.`);

  if (registros.length === 0) {
    return { total: 0, enviados: 0, falhas: 0 };
  }

  let enviados = 0;
  let falhas = 0;

  // Processa em lotes para respeitar o rate limit da API
  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    const lote = registros.slice(i, i + TAMANHO_LOTE);
    const resultados = await Promise.allSettled(lote.map(processarRegistro));

    for (const r of resultados) {
      if (r.status === "fulfilled") enviados++;
      else falhas++;
    }
  }

  console.log(
    `[CronJob] ✅ Concluído | total=${registros.length} | enviados=${enviados} | falhas=${falhas}`
  );

  return { total: registros.length, enviados, falhas };
}

async function processarRegistro(registro: ScheduledMessage): Promise<void> {
  const novaTentativa = registro.tentativas + 1;

  // Marca como REENVIANDO antes de chamar a API para evitar double-dispatch
  // em caso de crash ou reinicialização durante o processamento.
  await prisma.scheduledMessage.update({
    where: { id: registro.id },
    data: { statusEnvio: "REENVIANDO", tentativas: novaTentativa },
  });

  try {
    const { zenviaId } = await comRetry(
      () =>
        sendWhatsAppTemplate({
          telefone: registro.telefone,
          nomeFamiliar: registro.nomeFamiliar,
          urlPdf: registro.urlPdf,
          dataEvento: registro.dataEvento,
        }),
      {
        maxTentativas: 2, // 2 tentativas internas; a terceira é pelo cron no dia seguinte
        delayBaseMs: 1000,
        naoRetentar: [400, 401, 403, 404],
      }
    );

    await prisma.scheduledMessage.update({
      where: { id: registro.id },
      data: {
        statusEnvio: "ENVIADO",
        zenviaId,
        ultimoErro: null,
      },
    });

    console.log(
      `[CronJob] ✓ Enviado | id=${registro.id} | telefone=${registro.telefone} | zenvia_id=${zenviaId}`
    );
  } catch (err: unknown) {
    const mensagemErro = err instanceof Error ? err.message : String(err);
    // Esgotou MAX_TENTATIVAS → marca como FALHA; caso contrário volta para PENDENTE
    const novoStatus = novaTentativa >= MAX_TENTATIVAS ? "FALHA" : "PENDENTE";

    await prisma.scheduledMessage.update({
      where: { id: registro.id },
      data: { statusEnvio: novoStatus, ultimoErro: mensagemErro },
    });

    console.error(
      `[CronJob] ✗ Falha | id=${registro.id} | tentativa=${novaTentativa}/${MAX_TENTATIVAS} | status=${novoStatus} | erro=${mensagemErro}`
    );
  }
}
