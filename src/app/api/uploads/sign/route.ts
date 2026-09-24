/**
 * POST /api/uploads/sign
 *
 * Retorna uma assinatura de upload do Cloudinary para que o navegador
 * envie o PDF DIRETO ao Cloudinary, sem passar pela função da Vercel
 * (que limita o corpo a 4,5 MB e devolveria 413 para arquivos maiores).
 *
 * A rota é protegida pelo proxy (src/proxy.ts): exige sessão válida.
 * O api_secret nunca sai do servidor — só a assinatura derivada dele.
 */

import { NextResponse } from "next/server";
import { assinarUploadDireto } from "@/services/storage";

export async function POST() {
  try {
    const dados = assinarUploadDireto();
    return NextResponse.json(dados, { status: 200 });
  } catch (err: unknown) {
    console.error("[POST /api/uploads/sign]", err);
    const message =
      err instanceof Error ? err.message : "Erro ao gerar assinatura de upload.";
    return NextResponse.json({ erro: message }, { status: 500 });
  }
}
