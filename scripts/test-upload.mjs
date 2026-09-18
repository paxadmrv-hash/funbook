/**
 * Teste de upload direto para o Cloudinary
 * Cria um PDF mínimo em memória e faz o upload.
 *
 * Execute com: node scripts/test-upload.mjs
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

console.log("\n🔍 Testando upload para o Cloudinary...");
console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);

// Cria um PDF mínimo válido em memória (sem precisar de arquivo real)
const pdfMinimo = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj " +
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
  "3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\n" +
  "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
  "0000000058 00000 n\n0000000115 00000 n\n" +
  "trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"
);

try {
  const resultado = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id:     "livros_homenagem/teste_conexao",
        resource_type: "raw",
        overwrite:     true,
        tags:          ["teste", "pax_rio_verde"],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload falhou"));
        else resolve(result);
      }
    );
    stream.end(pdfMinimo);
  });

  console.log("\n✅ Upload concluído com sucesso!");
  console.log(`   URL pública: ${resultado.secure_url}`);
  console.log(`   Public ID:   ${resultado.public_id}`);
  console.log(`   Tamanho:     ${resultado.bytes} bytes`);
  console.log("\n👉 Verifique em: https://cloudinary.com/console → Media Library → livros_homenagem\n");

} catch (err) {
  console.error("\n❌ Upload falhou!");
  console.error("   Erro:", err?.message ?? err);
  if (err?.http_code) console.error("   HTTP:", err.http_code);
}
