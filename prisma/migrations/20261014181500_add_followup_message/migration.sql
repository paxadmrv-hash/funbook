ALTER TABLE "scheduled_messages"
ADD COLUMN "status_lembrete" "StatusEnvio" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN "tentativas_lembrete" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ultimo_erro_lembrete" TEXT,
ADD COLUMN "zenvia_lembrete_id" VARCHAR(100);

CREATE INDEX "idx_data_envio_lembrete_status"
ON "scheduled_messages"("data_envio", "status_lembrete");
