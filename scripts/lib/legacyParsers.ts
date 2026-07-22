/** Converte "10/10/2023" -> "2023-10-10". Retorna null se o formato for inválido. */
export function parseLegacyDateBR(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Converte uma data de formato desconhecido (arquivo externo) para "YYYY-MM-DD".
 * Aceita ISO ("2026-06-01") diretamente, ou "DD/MM/YYYY" (padrão pt-BR, mesmo
 * do sistema legado). Retorna null se não reconhecer o formato — nesse caso a
 * linha deve ser reportada como erro em vez de gravar uma data adivinhada.
 */
export function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return parseLegacyDateBR(trimmed);
}

export interface ValorLegado {
  /** Valor numérico já convertido (pode ser negativo se o dado de origem estava corrompido). */
  valor: number;
  /** true se o texto original já vinha com sinal negativo, indicando inconsistência com o campo `type`. */
  sinalNegativoNoTexto: boolean;
}

/**
 * Converte um valor monetário formatado do sistema legado (ex: "+ R$ 1.500,00",
 * "- R$ -42.000,00") para número. O sinal correto de uma transação deve vir do
 * campo `type` ("Entrada"/"Saída"), nunca deste texto — por isso retornamos
 * também se havia um sinal negativo embutido no próprio texto numérico, que é
 * a assinatura do bug de dados corrompidos encontrado em produção.
 */
export function parseLegacyValor(valueStr: string): ValorLegado | null {
  if (!valueStr) return null;
  // Remove "R$", espaços, o prefixo +/- de formatação, e separadores de milhar.
  const semPrefixo = valueStr.replace(/^[+-]\s*/, '').replace(/R\$\s*/, '').trim();
  const semMilhar = semPrefixo.replace(/\./g, '').replace(',', '.');
  const valor = parseFloat(semMilhar);
  if (!Number.isFinite(valor)) return null;
  return { valor, sinalNegativoNoTexto: valor < 0 };
}

/**
 * Converte um valor monetário de formato desconhecido (arquivo externo, ex:
 * banco do Rodrigo) para número, sem assumir R$/pt-BR. Diferente de
 * `parseLegacyValor` (que é específico do formato interno já conhecido do
 * `data.json`), aqui o separador decimal é inferido: o último separador
 * (',' ou '.') encontrado é tratado como decimal; os demais como milhar.
 * Se só existir '.', só é tratado como decimal quando há 1-2 dígitos depois
 * dele (ex: "150.00" -> decimal; "1.500" -> milhar).
 */
export function parseFlexibleMoney(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d,.-]/g, '').trim();
  if (!s) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1) {
    const casasDecimais = s.length - lastDot - 1;
    if (casasDecimais !== 1 && casasDecimais !== 2) {
      s = s.replace(/\./g, '');
    }
  }

  const valor = parseFloat(s);
  return Number.isFinite(valor) ? valor : null;
}

export function statusVoluntarioLegado(status: string): 'ativo' | 'inativo' | 'novo' {
  const normalizado = (status || '').toLowerCase();
  if (normalizado.startsWith('ativo')) return 'ativo';
  if (normalizado.startsWith('inativo')) return 'inativo';
  return 'novo';
}
