/**
 * Serviço de Cloud Storage — Cloudinary
 *
 * Faz upload de PDFs para o Cloudinary e retorna a URL pública permanente.
 * Os arquivos ficam na pasta "livros_homenagem/" dentro do seu Cloud.
 */

import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { randomUUID } from "crypto";

/* ── Configuração (lida das variáveis de ambiente) ─────────── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true, // sempre HTTPS
});

export interface UploadResult {
  /** URL pública permanente do PDF — usada no envio via Zenvia. */
  publicUrl: string;
  /** ID público no Cloudinary — usado para deleção futura se necessário. */
  storageKey: string;
}

/**
 * Faz upload de um arquivo PDF para o Cloudinary.
 * Retorna a URL pública permanente e o public_id interno.
 *
 * @param fileBuffer  - Conteúdo do arquivo em Buffer.
 * @param originalName - Nome original do arquivo (ex: "livro_joao.pdf").
 */
export async function uploadPdf(
  fileBuffer: Buffer,
  originalName: string
): Promise<UploadResult> {
  const baseName = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9_-]/g, "_") // remove caracteres inválidos
    .slice(0, 60);                     // limita o tamanho do nome

  // O public_id INCLUI a extensão .pdf — assim a URL pública termina em .pdf
  // e o WhatsApp reconhece o documento como PDF (e não como arquivo .bin).
  const publicId = `livros_homenagem/${baseName}_${randomUUID().slice(0, 8)}.pdf`;

  const resultado = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "raw",   // "raw" = qualquer arquivo não-imagem (PDF, DOCX, etc.)
          type: "upload",         // entrega pública (não "authenticated"/"private")
          access_mode: "public",  // garante acesso público mesmo se a conta restringe por padrão
          overwrite: false,
          tags: ["livro_homenagem", "pax_rio_verde"],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload falhou."));
          else resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );

      uploadStream.end(fileBuffer);
    }
  );

  console.log(`[Cloudinary] ✓ Upload concluído | public_id=${resultado.public_id}`);

  return {
    publicUrl:  resultado.secure_url,
    storageKey: resultado.public_id,
  };
}

/**
 * Remove um arquivo do Cloudinary.
 * Chamado apenas se necessário (ex: cancelamento de agendamento).
 *
 * @param storageKey - public_id retornado pelo upload.
 */
export async function deletePdf(storageKey: string): Promise<void> {
  await cloudinary.uploader.destroy(storageKey, { resource_type: "raw" });
  console.log(`[Cloudinary] 🗑 Arquivo removido | public_id=${storageKey}`);
}
