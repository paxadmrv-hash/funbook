/**
 * GET /api/dashboard/stats
 *
 * Retorna a contagem de registros por status.
 * Query param opcional:
 *   - data : YYYY-MM-DD — se informado, conta só os daquela data de envio
 *
 * Sem o param data, conta TODOS os registros.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const dataParam = req.nextUrl.searchParams.get("data");

    let dataEnvio: Date | undefined;
    if (dataParam) {
      dataEnvio = new Date(dataParam + "T12:00:00.000Z");
      if (isNaN(dataEnvio.getTime())) {
        return NextResponse.json(
          { erro: 'Parâmetro "data" inválido.' },
          { status: 400 }
        );
      }
    }

    const whereBase = dataEnvio ? { dataEnvio } : {};

    // Agrupa por status em uma única query
    const grupos = await prisma.scheduledMessage.groupBy({
      by: ["statusEnvio"],
      where: whereBase,
      _count: { _all: true },
    });

    // Monta o objeto de resposta com todos os status zerados por padrão
    const stats = {
      pendente: 0,
      reenviando: 0,
      enviado: 0,
      falha: 0,
      total: 0,
    };

    for (const g of grupos) {
      const qtd = g._count._all;
      stats.total += qtd;
      switch (g.statusEnvio) {
        case "PENDENTE":   stats.pendente   = qtd; break;
        case "REENVIANDO": stats.reenviando = qtd; break;
        case "ENVIADO":    stats.enviado    = qtd; break;
        case "FALHA":      stats.falha      = qtd; break;
      }
    }

    return NextResponse.json(stats);
  } catch (err: unknown) {
    console.error("[GET /api/dashboard/stats]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
