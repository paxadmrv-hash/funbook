/**
 * Serviço Zenvia — WhatsApp via API oficial
 *
 * Payload baseado no formato real confirmado:
 * {
 *   "from": "556481500660",
 *   "to": "5564984084357",
 *   "contents": [{
 *     "type": "template",
 *     "templateId": "4a4f0b1f-ea4b-4c81-8da1-4bb9e6530613",
 *     "fields": {
 *       "documentUrl": "https://..."
 *     }
 *   }]
 * }
 *
 * ATENÇÃO: as credenciais vivem APENAS no servidor (process.env).
 * Nunca exponha ZENVIA_API_TOKEN no client — não use NEXT_PUBLIC_.
 */

import axios, { AxiosError } from "axios";

const ZENVIA_BASE_URL = "https://api.zenvia.com/v2/channels/whatsapp/messages";

export interface SendTemplateParams {
  telefone:     string; // E.164 sem + — ex: 5564984754321
  nomeFamiliar: string;
  urlPdf:       string; // URL pública permanente do Cloudinary
  dataEvento:   Date;
}

export interface SendTemplateResult {
  zenviaId: string;
}

/**
 * Envia o Livro de Homenagem via template WhatsApp aprovado na Zenvia.
 * Lança erro com mensagem descritiva em caso de falha.
 */
export async function sendWhatsAppTemplate(
  params: SendTemplateParams
): Promise<SendTemplateResult> {
  const { telefone, urlPdf } = params;

  // Garante formato sem + (Zenvia usa DDI+DDD+número sem caracteres especiais)
  const to = telefone.replace(/^\+/, "");

  const payload = {
    from: process.env.ZENVIA_FROM,
    to,
    contents: [
      {
        type:       "template",
        templateId: process.env.ZENVIA_TEMPLATE_ID,
        fields: {
          documentUrl: urlPdf,
        },
      },
    ],
  };

  console.log(`[Zenvia] Enviando payload: ${JSON.stringify(payload)}`);

  try {
    const response = await axios.post(ZENVIA_BASE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-API-Token":  process.env.ZENVIA_API_TOKEN,
      },
      timeout: 15_000, // 15 segundos
    });

    const zenviaId: string = response.data?.id ?? `zenvia_${Date.now()}`;

    // Log completo da resposta para diagnóstico de entrega
    console.log(
      `[Zenvia] Resposta HTTP ${response.status} | to=${to} | ` +
      `id=${zenviaId} | body=${JSON.stringify(response.data)}`
    );

    return { zenviaId };

  } catch (err: unknown) {
    const axiosErr = err as AxiosError<{ message?: string; error?: string }>;

    // Extrai mensagem de erro da resposta da Zenvia quando disponível
    const detalhe =
      axiosErr.response?.data?.message ??
      axiosErr.response?.data?.error ??
      axiosErr.message ??
      "Erro desconhecido";

    const httpCode = axiosErr.response?.status ?? 0;

    const mensagem = `[Zenvia] Falha HTTP ${httpCode}: ${detalhe}`;
    console.error(mensagem);

    // Re-lança com status para o mecanismo de retry classificar corretamente
    const erro = new Error(mensagem) as Error & { status?: number };
    erro.status = httpCode;
    throw erro;
  }
}

/**
 * Monta e retorna o payload sem enviar — útil para logs e testes.
 */
export function buildZenviaPayload(params: SendTemplateParams) {
  const to = params.telefone.replace(/^\+/, "");
  return {
    from: process.env.ZENVIA_FROM,
    to,
    contents: [
      {
        type:       "template",
        templateId: process.env.ZENVIA_TEMPLATE_ID,
        fields: {
          documentUrl: params.urlPdf,
        },
      },
    ],
  };
}
