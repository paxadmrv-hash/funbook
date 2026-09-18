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
  const { telefone, urlPdf, nomeFamiliar, dataEvento } = params;

  // Garante formato sem + (Zenvia usa DDI+DDD+número sem caracteres especiais)
  const to = telefone.replace(/^\+/, "");

  // Data da cerimônia formatada em pt-BR (variável {{2}} do template)
  const dataFormatada = new Date(dataEvento).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const payload = {
    from: process.env.ZENVIA_FROM,
    to,
    contents: [
      {
        type:       "template",
        templateId: process.env.ZENVIA_TEMPLATE_ID,
        fields: {
          // Header: documento PDF
          documentUrl: urlPdf,
          // Corpo do template: {{1}} = nome do familiar, {{2}} = data da cerimônia
          "1": nomeFamiliar,
          "2": dataFormatada,
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
  const dataFormatada = new Date(params.dataEvento).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  return {
    from: process.env.ZENVIA_FROM,
    to,
    contents: [
      {
        type:       "template",
        templateId: process.env.ZENVIA_TEMPLATE_ID,
        fields: {
          documentUrl: params.urlPdf,
          "1": params.nomeFamiliar,
          "2": dataFormatada,
        },
      },
    ],
  };
}
