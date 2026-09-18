/**
 * POST /api/reenviar/[id]
 *
 * Reenvio manual de uma mensagem com status FALHA ou PENDENTE.
 * Reseta o contador de tentativas, marca como PENDENTE e dispara
 * imediatamente via Zenvia (mock).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/services/zenvia";
import { comRetry } from "@/lib/retry";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Busca o registro ──────────────────────────────────────────────────
    const registro = await prisma.scheduledMessage.findUnique({ where: { id } });

    if (!registro) {
      return NextResponse.json({ erro: "Registro não encontrado." }, { status: 404 });
    }

    if (registro.statusEnvio === "ENVIADO") {
      return NextResponse.json(
        { erro: "Esta mensagem já foi enviada com sucesso. Não é necessário reenviar." },
        { status: 409 }
      );
    }

    // ── Marca como REENVIANDO para evitar race condition ──────────────────
    await prisma.scheduledMessage.update({
      where: { id },
      data: { statusEnvio: "REENVIANDO", tentativas: 0, ultimoErro: null },
    });

    // ── Disparo imediato ──────────────────────────────────────────────────
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
          maxTentativas: 3,
          delayBaseMs: 800,
          naoRetentar: [400, 401, 403, 404],
        }
      );

      const atualizado = await prisma.scheduledMessage.update({
        where: { id },
        data: { statusEnvio: "ENVIADO", zenviaId, ultimoErro: null },
      });

      return NextResponse.json({
        mensagem: "Mensagem reenviada com sucesso.",
        registro: {
          id: atualizado.id,
          statusEnvio: atualizado.statusEnvio,
          zenviaId: atualizado.zenviaId,
        },
      });
    } catch (err: unknown) {
      const mensagemErro = err instanceof Error ? err.message : String(err);

      await prisma.scheduledMessage.update({
        where: { id },
        data: { statusEnvio: "FALHA", ultimoErro: mensagemErro, tentativas: 1 },
      });

      return NextResponse.json(
        {
          erro: "Falha ao reenviar a mensagem.",
          detalhe: mensagemErro,
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    console.error("[POST /api/reenviar]", err);
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
