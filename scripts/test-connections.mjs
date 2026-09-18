/**
 * Script de teste das conexões — Cloudinary + Neon
 * Execute com: node scripts/test-connections.mjs
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import { v2 as cloudinary } from "cloudinary";
import pg from "pg";

// ── Teste 1: Cloudinary ──────────────────────────────────────
console.log("\n🔍 Testando Cloudinary...");
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });

  const result = await cloudinary.api.ping();
  if (result.status === "ok") {
    console.log("✅ Cloudinary conectado com sucesso!");
    console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  }
} catch (err) {
  console.error("❌ Cloudinary falhou:", err.message ?? err);
}

// ── Teste 2: Banco de dados (Neon) ───────────────────────────
console.log("\n🔍 Testando banco de dados (Neon)...");
try {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT NOW() as agora");
  console.log("✅ Banco conectado com sucesso!");
  console.log(`   Hora no servidor: ${res.rows[0].agora}`);
  await client.end();
} catch (err) {
  console.error("❌ Banco falhou:", err.message);
}

console.log("\n✔ Teste concluído.\n");
