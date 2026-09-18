/**
 * GET /api/cron/dispatch
 *
 * Endpoint para disparar o cron job manualmente.
 * Útil para:
 *   - Testar antes dos 7 dias
 *   - Forçar reprocessamento de pendentes
 *   - Produção: chamado pelo Vercel Cron Jobs diariamente
 *
 * Proteção: requer o header Authorization: Bearer <CRON_SECRET>
 *
 * Para testar localmente sem autenticação, acesse:
 *   GET http://localhost:3000/api/cron/dispatch?force=true
 *   (force=true bypassa a checagem de data — processa QUALQUER pendente)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/services/zenvia";
import { comRetry } from "@/lib/retry";

const MAX_TENTATIVAS = 3;

export async function GET(req: NextRequest) {
  // ── Autenticação ───────────────────────────────────────────
  const isDev  = process.env.NODE_ENV === "development";
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get("authorization");
  const force  = req.nextUrl.searchParams.get("force") === "true";

  // Em produção exige o token. Em dev com ?force=true, libera.
  if (!isDev || !force) {
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { erro: "Não autorizado. Use: Authorization: Bearer <CRON_SECRET>" },
        { status: 401 }
      );
    }
  }

  const inicio = Date.now();
  console.log(`[CronDispatch] 🚀 Disparo manual iniciado | force=${force}`);

  try {
    // ── Busca registros pendentes ────────────────────────────
    // Com ?force=true ignora a data — útil para testes
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const statusFiltro = ["PENDENTE", "REENVIANDO"] as const;

    const where = force
      ? {
          statusEnvio: { in: [...statusFiltro] },
          tentativas:  { lt: MAX_TENTATIVAS },
        }
      : {
          dataEnvio:   hoje,
          statusEnvio: { in: [...statusFiltro] },
          tentativas:  { lt: MAX_TENTATIVAS },
        };

    const registros = await prisma.scheduledMessage.findMany({
      where,
      orderBy: { criadoEm: "asc" },
    });

    console.log(`[CronDispatch] 📋 ${registros.length} registro(s) encontrado(s)`);

    if (registros.length === 0) {
      return NextResponse.json({
        mensagem: force
          ? "Nenhum registro PENDENTE encontrado no banco."
          : "Nenhum registro com data_envio = hoje encontrado.",
        total: 0,
        enviados: 0,
        falhas: 0,
        duracaoMs: Date.now() - inicio,
      });
    }

    // ── Processa cada registro ───────────────────────────────
    let enviados = 0;
    let falhas   = 0;
    const detalhes: Array<{ id: string; status: string; erro?: string }> = [];

    for (const registro of registros) {
      const novaTentativa = registro.tentativas + 1;

      await prisma.scheduledMessage.update({
        where: { id: registro.id },
        data:  { statusEnvio: "REENVIANDO", tentativas: novaTentativa },
      });

      try {
        const { zenviaId } = await comRetry(
          () => sendWhatsAppTemplate({
            telefone:     registro.telefone,
            nomeFamiliar: registro.nomeFamiliar,
            urlPdf:       registro.urlPdf,
            dataEvento:   registro.dataEvento,
          }),
          { maxTentativas: 2, delayBaseMs: 800, naoRetentar: [400, 401, 403, 404] }
        );

        await prisma.scheduledMessage.update({
          where: { id: registro.id },
          data:  { statusEnvio: "ENVIADO", zenviaId, ultimoErro: null },
        });

        enviados++;
        detalhes.push({ id: registro.id, status: "ENVIADO" });
        console.log(`[CronDispatch] ✓ ${registro.nomeFamiliar} | zenvia_id=${zenviaId}`);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const novoStatus = novaTentativa >= MAX_TENTATIVAS ? "FALHA" : "PENDENTE";

        await prisma.scheduledMessage.update({
          where: { id: registro.id },
          data:  { statusEnvio: novoStatus, ultimoErro: msg },
        });

        falhas++;
        detalhes.push({ id: registro.id, status: novoStatus, erro: msg });
        console.error(`[CronDispatch] ✗ ${registro.nomeFamiliar} | ${msg}`);
      }
    }

    const resultado = {
      mensagem:  `Processamento concluído.`,
      total:     registros.length,
      enviados,
      falhas,
      duracaoMs: Date.now() - inicio,
      detalhes,
    };

    console.log(`[CronDispatch] ✅ Concluído | enviados=${enviados} falhas=${falhas}`);
    return NextResponse.json(resultado);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CronDispatch] ❌ Erro interno:", msg);
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
