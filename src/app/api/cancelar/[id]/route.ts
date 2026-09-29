/**
 * POST /api/cancelar/[id]
 *
 * Cancela um agendamento: muda o status para CANCELADO. O registro
 * permanece na lista (para histórico), mas o cron job de envio nunca
 * o dispara — ele só busca PENDENTE e REENVIANDO.
 *
 * Regra: não é possível cancelar algo que já foi ENVIADO (o WhatsApp
 * já saiu). Um item CANCELADO pode ser reativado via "Reenviar", que
 * o coloca de volta em REENVIANDO.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const registro = await prisma.scheduledMessage.findUnique({ where: { id } });
    if (!registro) {
      return NextResponse.json({ erro: "Registro não encontrado." }, { status: 404 });
    }

    if (registro.statusEnvio === "ENVIADO") {
      return NextResponse.json(
        { erro: "Esta mensagem já foi enviada. Não é possível cancelar um envio concluído." },
        { status: 409 }
      );
    }

    if (registro.statusEnvio === "CANCELADO") {
      return NextResponse.json(
        { erro: "Este agendamento já está cancelado." },
        { status: 409 }
      );
    }

    const atualizado = await prisma.scheduledMessage.update({
      where: { id },
      data: { statusEnvio: "CANCELADO", ultimoErro: null },
    });

    return NextResponse.json({
      mensagem: "Agendamento cancelado. Este envio não será mais realizado.",
      registro: { id: atualizado.id, statusEnvio: atualizado.statusEnvio },
    });
  } catch (err: unknown) {
    console.error("[POST /api/cancelar]", err);
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
