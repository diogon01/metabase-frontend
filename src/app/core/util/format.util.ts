/**
 * Helpers de formatação de valores numéricos para apresentação em PT-BR.
 */

/**
 * Compacta números grandes: 1234567 → "1,23 M", 1234 → "1,2 k", 100 → "100".
 * Mantém vírgula como separador decimal (PT-BR).
 */
export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + ' k';
  return n.toLocaleString('pt-BR');
}

/**
 * Extrai o primeiro emoji presentational do começo de uma string,
 * ignorando código-pontuação genérica.
 * Ex: "💰 Receita" → "💰", "Receita" → "".
 */
export function extractLeadingEmoji(text: string): string {
  const m = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  return m ? m[0] : '';
}

/**
 * Remove o emoji presentational do começo de uma string.
 * Ex: "💰 Receita" → "Receita".
 */
export function stripLeadingEmoji(text: string): string {
  return text.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, '');
}
