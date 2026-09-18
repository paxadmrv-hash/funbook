/**
 * Utilitário de retry com back-off exponencial e jitter.
 * Usado pelo cron job e pelo reenvio manual do dashboard.
 */

export interface RetryOptions {
  /** Número máximo de tentativas (inclui a primeira). */
  maxTentativas: number;
  /** Delay base em ms. Dobra a cada tentativa: 1s → 2s → 4s */
  delayBaseMs: number;
  /**
   * HTTP status codes que NÃO devem ser retentados.
   * Erros de configuração (401, 403, 400) não se resolvem sozinhos.
   */
  naoRetentar?: number[];
}

interface WithStatus {
  status?: number;
  response?: { status?: number };
}

function getStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const e = err as WithStatus;
    return e.status ?? e.response?.status;
  }
  return undefined;
}

/**
 * Executa `fn` com retry automático conforme as opções fornecidas.
 *
 * @example
 * const result = await comRetry(() => sendWhatsAppTemplate(params), {
 *   maxTentativas: 3,
 *   delayBaseMs: 1000,
 *   naoRetentar: [400, 401, 403, 404],
 * });
 */
export async function comRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let tentativa = 0;
  let lastError: unknown;

  while (tentativa < opts.maxTentativas) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      tentativa++;

      const status = getStatus(err);

      // Erros não-recuperáveis: falha imediata sem retry
      if (status !== undefined && opts.naoRetentar?.includes(status)) {
        throw err;
      }

      if (tentativa >= opts.maxTentativas) break;

      // Back-off exponencial + jitter aleatório para evitar thundering herd
      const delayMs =
        opts.delayBaseMs * Math.pow(2, tentativa - 1) +
        Math.random() * 500;

      console.warn(
        `[Retry] Tentativa ${tentativa}/${opts.maxTentativas} falhou. ` +
          `Próxima em ${Math.round(delayMs)}ms...`
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
