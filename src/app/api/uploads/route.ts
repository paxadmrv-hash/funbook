/**
 * POST /api/uploads
 *
 * Recebe multipart/form-data com:
 *   - pdf      : File   — arquivo PDF do Livro de Homenagem
 *   - nome     : string — nome do familiar
 *   - telefone : string — telefone em formato E.164 (+5511999999999)
 *   - dataEvento: string — data no formato YYYY-MM-DD
 *
 * Fluxo:
 *   1. Valida os campos
 *   2. Faz upload do PDF para o Cloud Storage (mock)
 *   3. Calcula data_envio = data_evento + 7 dias
 *   4. Salva o registro no banco com status PENDENTE
 *   5. Retorna o registro criado
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPdf } from "@/services/storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ── Extração dos campos ───────────────────────────────────────────────
    const pdfFile = formData.get("pdf") as File | null;
    const nome = (formData.get("nome") as string | null)?.trim();
    const telefone = (formData.get("telefone") as string | null)?.trim();
    const dataEventoStr = (formData.get("dataEvento") as string | null)?.trim();

    // ── Validação ─────────────────────────────────────────────────────────
    const erros: string[] = [];

    if (!pdfFile) erros.push("O arquivo PDF é obrigatório.");
    if (pdfFile && pdfFile.type !== "application/pdf")
      erros.push("O arquivo deve ser um PDF.");
    if (pdfFile && pdfFile.size > 30 * 1024 * 1024)
      erros.push("O PDF não pode ultrapassar 30 MB.");
    if (!nome) erros.push("O nome do familiar é obrigatório.");
    if (!telefone) erros.push("O telefone é obrigatório.");
    if (telefone && !/^\+[1-9]\d{7,14}$/.test(telefone))
      erros.push('O telefone deve estar no formato E.164 (ex: +5564984754321).');
    if (!dataEventoStr) erros.push("A data do evento é obrigatória.");

    if (erros.length > 0) {
      return NextResponse.json({ erros }, { status: 400 });
    }

    // ── Upload do PDF ─────────────────────────────────────────────────────
    const arrayBuffer = await pdfFile!.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { publicUrl, storageKey } = await uploadPdf(buffer, pdfFile!.name);

    // ── Cálculo da data de envio (evento + 7 dias) ────────────────────────
    const dataEvento = new Date(dataEventoStr! + "T12:00:00.000Z");
    const dataEnvio = new Date(dataEvento);
    dataEnvio.setUTCDate(dataEnvio.getUTCDate() + 7);

    // ── Persistência no banco ─────────────────────────────────────────────
    const registro = await prisma.scheduledMessage.create({
      data: {
        nomeFamiliar: nome!,
        telefone: telefone!,
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
