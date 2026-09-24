/**
 * POST /api/uploads
 *
 * Recebe application/json com os METADADOS do agendamento (o PDF já foi
 * enviado direto ao Cloudinary pelo navegador — ver /api/uploads/sign):
 *   - publicUrl  : string — URL pública (secure_url) retornada pelo Cloudinary
 *   - storageKey : string — public_id retornado pelo Cloudinary
 *   - nome       : string — nome do familiar
 *   - telefone   : string — telefone em formato E.164 (+5511999999999)
 *   - dataEvento : string — data no formato YYYY-MM-DD
 *
 * Este endpoint NÃO recebe mais o arquivo, justamente para não esbarrar
 * no limite de 4,5 MB de corpo das funções da Vercel (que causava 413).
 *
 * Fluxo:
 *   1. Valida os campos
 *   2. Calcula data_envio = data_evento + 7 dias
 *   3. Salva o registro no banco com status PENDENTE
 *   4. Retorna o registro criado
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUDINARY_FOLDER } from "@/services/storage";

export async function POST(req: NextRequest) {
  try {
    // ── Extração dos campos ───────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { erros: ["Requisição inválida: corpo JSON esperado."] },
        { status: 400 }
      );
    }

    const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl.trim() : "";
    const storageKey = typeof body.storageKey === "string" ? body.storageKey.trim() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const telefone = typeof body.telefone === "string" ? body.telefone.trim() : "";
    const dataEventoStr =
      typeof body.dataEvento === "string" ? body.dataEvento.trim() : "";

    // ── Validação ─────────────────────────────────────────────────────────
    const erros: string[] = [];

    if (!publicUrl) erros.push("A URL do PDF é obrigatória.");
    // Garante que a URL veio mesmo do nosso Cloudinary, na pasta esperada.
    if (
      publicUrl &&
      !/^https:\/\/res\.cloudinary\.com\/.+/.test(publicUrl)
    )
      erros.push("A URL do PDF é inválida.");
    if (!storageKey) erros.push("A referência do arquivo (storageKey) é obrigatória.");
    if (storageKey && !storageKey.startsWith(`${CLOUDINARY_FOLDER}/`))
      erros.push("A referência do arquivo é inválida.");
    if (!nome) erros.push("O nome do familiar é obrigatório.");
    if (!telefone) erros.push("O telefone é obrigatório.");
    if (telefone && !/^\+[1-9]\d{7,14}$/.test(telefone))
      erros.push("O telefone deve estar no formato E.164 (ex: +5564984754321).");
    if (!dataEventoStr) erros.push("A data do evento é obrigatória.");
    if (dataEventoStr && !/^\d{4}-\d{2}-\d{2}$/.test(dataEventoStr))
      erros.push("A data do evento deve estar no formato YYYY-MM-DD.");

    if (erros.length > 0) {
      return NextResponse.json({ erros }, { status: 400 });
    }

    // ── Cálculo da data de envio (evento + 7 dias) ────────────────────────
    const dataEvento = new Date(dataEventoStr + "T12:00:00.000Z");
    const dataEnvio = new Date(dataEvento);
    dataEnvio.setUTCDate(dataEnvio.getUTCDate() + 7);

    // ── Persistência no banco ─────────────────────────────────────────────
    const registro = await prisma.scheduledMessage.create({
      data: {
        nomeFamiliar: nome,
        telefone,
        urlPdf: publicUrl,
        storageKey,
        dataEvento,
        dataEnvio,
        statusEnvio: "PENDENTE",
      },
    });

    return NextResponse.json(
      {
        mensagem: "Agendamento criado com sucesso.",
        registro: {
          id: registro.id,
          nomeFamiliar: registro.nomeFamiliar,
          telefone: registro.telefone,
          dataEvento: registro.dataEvento,
          dataEnvio: registro.dataEnvio,
          statusEnvio: registro.statusEnvio,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/uploads]", err);
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
