/** Formata um número como moeda brasileira, ex: 1500.5 -> "1.500,50" (sem símbolo). */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata um número como moeda brasileira com símbolo, ex: 1500.5 -> "R$ 1.500,50". */
export function formatBRLWithSymbol(value: number): string {
  return `R$ ${formatBRL(value)}`;
}

/**
 * Máscara monetária em tempo real para inputs: recebe o valor bruto digitado
 * (pode conter qualquer coisa) e retorna a representação formatada pt-BR,
 * tratando os dígitos como centavos (ex: digitar "150000" -> "1.500,00").
 */
export function formatCurrencyInputMask(rawInput: string): string {
  const digits = rawInput.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return formatBRL(num);
}

/**
 * Converte um valor formatado em pt-BR (ex: "1.500,50") para número JS.
 * Única fonte de verdade para esse parsing — substitui os parsers duplicados
 * que existiam em Financial.tsx e Overview.tsx.
 */
export function parseBRLInput(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}
