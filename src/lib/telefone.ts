/**
 * Validação de telefone WhatsApp brasileiro.
 *
 * Um celular brasileiro no formato E.164 é SEMPRE:
 *   +55  (código do país)
 *   DD   (DDD com 2 dígitos, de 11 a 99)
 *   9    (nono dígito obrigatório dos celulares)
 *   NNNNNNNN (8 dígitos restantes)
 *
 * Total: 13 dígitos além do "+".  Exemplo válido: +5564984754321
 *
 * A regra antiga (^\+[1-9]\d{7,14}$) aceitava qualquer número de 8 a 15
 * dígitos, deixando passar celulares sem o 9 ou com contagem errada de
 * dígitos (ex: +556484056472 — falta o nono dígito).
 */

/** Regex canônica de celular BR em E.164. */
export const TELEFONE_BR_REGEX = /^\+55(?:1[1-9]|[2-9]\d)9\d{8}$/;

/** Mensagem única usada em todas as validações, para não divergirem. */
export const TELEFONE_ERRO =
  "Telefone inválido. Use um celular brasileiro com DDD e o 9, no formato +55 + DDD + 9 + 8 dígitos (ex: +5564984754321).";

/** Retorna true se o telefone for um celular BR válido em E.164. */
export function telefoneValido(telefone: string): boolean {
  return TELEFONE_BR_REGEX.test(telefone.trim());
}
