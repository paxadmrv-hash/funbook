/**
 * DELETE /api/registros/[id]
 *
 * Exclui PERMANENTEMENTE um agendamento da lista e remove o PDF
 * correspondente do Cloudinary. Ação irreversível.
 *
 * Regra: um registro já ENVIADO também pode ser excluído (apenas some
 * da lista) — o WhatsApp já foi entregue, então excluir aqui só limpa
 * o histórico. Não há como "desenviar".
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePdf } from "@/services/storage";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const registro = await prisma.scheduledMessage.findUnique({ where: { id } });
    if (!registro) {
      return NextResponse.json({ erro: "Registro não encontrado." }, { status: 404 });
    }

    // Tenta remover o PDF do Cloudinary — se falhar, não impede a exclusão
    // do registro (o arquivo órfão pode ser limpo depois).
    if (registro.storageKey) {
      try {
        await deletePdf(registro.storageKey);
      } catch (err) {
        console.warn(`[DELETE /api/registros] Falha ao remover PDF ${registro.storageKey}:`, err);
      }
    }

    await prisma.scheduledMessage.delete({ where: { id } });

    return NextResponse.json({ mensagem: "Registro excluído com sucesso." });
  } catch (err: unknown) {
    console.error("[DELETE /api/registros]", err);
    const message = err instanceof Error ? err.message : "Erro interno do servidor.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
