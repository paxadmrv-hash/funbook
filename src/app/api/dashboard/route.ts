/**
 * GET /api/dashboard
 *
 * Query params opcionais:
 *   - data   : YYYY-MM-DD  — filtra por data_envio (padrão: hoje)
 *   - status : PENDENTE | ENVIADO | FALHA | REENVIANDO — filtra por status
 *   - page   : número da página (padrão: 1)
 *   - limit  : itens por página (padrão: 20, máx: 100)
 *
 * Retorna a lista paginada de agendamentos e o total de registros.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StatusEnvio } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // ── Parâmetros ────────────────────────────────────────────────────────
    const dataParam = searchParams.get("data");
    const statusParam = searchParams.get("status") as StatusEnvio | null;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    // ── Filtro de data ────────────────────────────────────────────────────
    let dataEnvio: Date | undefined;
    if (dataParam) {
      dataEnvio = new Date(dataParam + "T12:00:00.000Z");
      if (isNaN(dataEnvio.getTime())) {
        return NextResponse.json(
          { erro: 'Parâmetro "data" inválido. Use o formato YYYY-MM-DD.' },
          { status: 400 }
        );
      }
    }

    // ── Filtro de status ──────────────────────────────────────────────────
    const statusValidos: StatusEnvio[] = ["PENDENTE", "REENVIANDO", "ENVIADO", "FALHA"];
    if (statusParam && !statusValidos.includes(statusParam)) {
      return NextResponse.json(
        { erro: `Status inválido. Use: ${statusValidos.join(", ")}.` },
        { status: 400 }
      );
    }

    // ── Query ─────────────────────────────────────────────────────────────
    const where = {
      ...(dataEnvio ? { dataEnvio } : {}),
      ...(statusParam ? { statusEnvio: statusParam } : {}),
    };

    const [registros, total] = await prisma.$transaction([
      prisma.scheduledMessage.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          nomeFamiliar: true,
          telefone: true,
          urlPdf: true,
          dataEvento: true,
          dataEnvio: true,
          statusEnvio: true,
          tentativas: true,
          ultimoErro: true,
          zenviaId: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      prisma.scheduledMessage.count({ where }),
    ]);

    return NextResponse.json({
      registros,
      paginacao: {
        total,
        page,
        limit,
        totalPaginas: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/dashboard]", err);
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
