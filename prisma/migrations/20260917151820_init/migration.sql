-- CreateEnum
CREATE TYPE "StatusEnvio" AS ENUM ('PENDENTE', 'REENVIANDO', 'ENVIADO', 'FALHA');

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" UUID NOT NULL,
    "nome_familiar" VARCHAR(150) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "url_pdf" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "data_evento" DATE NOT NULL,
    "data_envio" DATE NOT NULL,
    "status_envio" "StatusEnvio" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" TEXT,
    "zenvia_msg_id" VARCHAR(100),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_data_envio_status" ON "scheduled_messages"("data_envio", "status_envio");

-- CreateIndex
CREATE INDEX "idx_criado_em" ON "scheduled_messages"("criado_em" DESC);
