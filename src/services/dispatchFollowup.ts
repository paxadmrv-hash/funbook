import { prisma } from "@/lib/prisma";
import { comRetry } from "@/lib/retry";
import { sendWhatsAppFollowupTemplate } from "@/services/zenvia";

const MAX_TENTATIVAS = 3;

export interface FollowupDispatchResult {
  total: number;
  enviados: number;
  falhas: number;
}

export async function dispatchFollowupMessages(
  force = false
): Promise<FollowupDispatchResult> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const registros = await prisma.scheduledMessage.findMany({
    where: {
      ...(!force ? { dataEnvio: { lt: hoje } } : {}),
      statusEnvio: "ENVIADO",
      statusLembrete: { in: ["PENDENTE", "REENVIANDO"] },
      tentativasLembrete: { lt: MAX_TENTATIVAS },
    },
    orderBy: { criadoEm: "asc" },
  });

  let enviados = 0;
  let falhas = 0;

  for (const registro of registros) {
    const novaTentativa = registro.tentativasLembrete + 1;

    await prisma.scheduledMessage.update({
      where: { id: registro.id },
      data: {
        statusLembrete: "REENVIANDO",
        tentativasLembrete: novaTentativa,
      },
    });

    try {
      const { zenviaId } = await comRetry(
        () => sendWhatsAppFollowupTemplate(registro.telefone),
        {
          maxTentativas: 2,
          delayBaseMs: 800,
          naoRetentar: [400, 401, 403, 404],
        }
      );

      await prisma.scheduledMessage.update({
        where: { id: registro.id },
        data: {
          statusLembrete: "ENVIADO",
          zenviaLembreteId: zenviaId,
          ultimoErroLembrete: null,
        },
      });
      enviados++;
      console.log(
        `[Followup] ✓ Enviado | id=${registro.id} | telefone=${registro.telefone} | zenvia_id=${zenviaId}`
      );
    } catch (err: unknown) {
      const mensagemErro = err instanceof Error ? err.message : String(err);
      const novoStatus =
        novaTentativa >= MAX_TENTATIVAS ? "FALHA" : "PENDENTE";

      await prisma.scheduledMessage.update({
        where: { id: registro.id },
        data: {
          statusLembrete: novoStatus,
          ultimoErroLembrete: mensagemErro,
        },
      });
      falhas++;
      console.error(
        `[Followup] ✗ Falha | id=${registro.id} | tentativa=${novaTentativa}/${MAX_TENTATIVAS} | status=${novoStatus} | erro=${mensagemErro}`
      );
    }
  }

  return { total: registros.length, enviados, falhas };
}
