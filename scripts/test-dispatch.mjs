/**
 * Teste de disparo manual via terminal
 *
 * Busca o registro mais recente do banco (ou um ID específico)
 * e dispara o envio via Zenvia (mock ou real).
 *
 * Uso:
 *   node scripts/test-dispatch.mjs              ← usa o registro mais recente
 *   node scripts/test-dispatch.mjs <ID_UUID>    ← usa um ID específico
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import pg from "pg";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const idEspecifico = process.argv[2] ?? null;

// ── 1. Conecta no banco e busca o registro ───────────────────
console.log("\n📋 Buscando registro no banco...");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let registro;
if (idEspecifico) {
  const res = await client.query(
    "SELECT * FROM scheduled_messages WHERE id = $1",
    [idEspecifico]
  );
  registro = res.rows[0];
} else {
  const res = await client.query(
    "SELECT * FROM scheduled_messages ORDER BY criado_em DESC LIMIT 1"
  );
  registro = res.rows[0];
}

if (!registro) {
  console.error("❌ Nenhum registro encontrado no banco.");
  console.error("   Crie um agendamento pela interface primeiro.");
  await client.end();
  process.exit(1);
}

console.log("\n✅ Registro encontrado:");
console.log(`   ID:           ${registro.id}`);
console.log(`   Familiar:     ${registro.nome_familiar}`);
console.log(`   Telefone:     ${registro.telefone}`);
console.log(`   URL PDF:      ${registro.url_pdf}`);
console.log(`   Data Evento:  ${new Date(registro.data_evento).toLocaleDateString("pt-BR")}`);
console.log(`   Data Envio:   ${new Date(registro.data_envio).toLocaleDateString("pt-BR")}`);
console.log(`   Status atual: ${registro.status_envio}`);

// ── 2. Monta o payload Zenvia ────────────────────────────────
const dataFormatada = new Date(registro.data_evento).toLocaleDateString("pt-BR", {
  timeZone: "America/Sao_Paulo",
});

const payload = {
  from: process.env.ZENVIA_FROM,
  to:   registro.telefone,
  contents: [
    {
      type:       "template",
      templateId: process.env.ZENVIA_TEMPLATE_ID,
      fields: {
        header: {
          type:     "document",
          document: {
            link:     registro.url_pdf,
            filename: "Livro_de_Homenagem.pdf",
          },
        },
        body: [
          { type: "text", text: registro.nome_familiar },
          { type: "text", text: dataFormatada },
        ],
      },
    },
  ],
};

console.log("\n📦 Payload que será enviado para a Zenvia:");
console.log(JSON.stringify(payload, null, 2));

// ── 3. Verifica se está em modo mock ou real ─────────────────
const isMock = process.env.ZENVIA_API_TOKEN === "MOCK_TOKEN";

if (isMock) {
  console.log("\n⚠️  MODO MOCK — Zenvia não conectada ainda.");
  console.log("   O payload acima seria enviado quando a Zenvia estiver configurada.");
  console.log("   Para usar a API real, atualize ZENVIA_API_TOKEN no .env\n");

  // Atualiza status no banco para ENVIADO (simulado)
  await client.query(
    `UPDATE scheduled_messages
        SET status_envio   = 'ENVIADO',
            zenvia_msg_id  = $1,
            atualizado_em  = NOW()
      WHERE id = $2`,
    [`mock_${Date.now()}`, registro.id]
  );
  console.log("✅ Status atualizado para ENVIADO (simulado) no banco.");

} else {
  // ── 4. Disparo real via Zenvia ───────────────────────────
  console.log("\n🚀 Enviando via Zenvia...");
  try {
    const response = await axios.post(
      "https://api.zenvia.com/v2/channels/whatsapp/messages",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Token":  process.env.ZENVIA_API_TOKEN,
        },
        timeout: 15_000,
      }
    );

    const zenviaId = response.data.id;
    console.log("✅ Mensagem enviada com sucesso!");
    console.log(`   Zenvia ID: ${zenviaId}`);

    await client.query(
      `UPDATE scheduled_messages
          SET status_envio   = 'ENVIADO',
              zenvia_msg_id  = $1,
              ultimo_erro    = NULL,
              atualizado_em  = NOW()
        WHERE id = $2`,
      [zenviaId, registro.id]
    );
    console.log("✅ Status atualizado para ENVIADO no banco.\n");

  } catch (err) {
    const msg = err?.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;

    console.error("❌ Falha no envio:", msg);

    await client.query(
      `UPDATE scheduled_messages
          SET status_envio  = 'FALHA',
              ultimo_erro   = $1,
              atualizado_em = NOW()
        WHERE id = $2`,
      [msg, registro.id]
    );
    console.error("   Status atualizado para FALHA no banco.\n");
  }
}

await client.end();
