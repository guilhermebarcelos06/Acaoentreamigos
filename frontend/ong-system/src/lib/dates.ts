/**
 * Converte uma string de data "YYYY-MM-DD" (coluna `date` do Postgres) em um
 * Date local à meia-noite. `new Date("YYYY-MM-DD")` sem o horário é
 * interpretado como UTC pelo JS e pode exibir o dia anterior em fusos
 * horários negativos (ex: America/Sao_Paulo) — por isso nunca usar
 * `new Date(dataColuna)` diretamente para exibição.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatDateBR(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR');
}
