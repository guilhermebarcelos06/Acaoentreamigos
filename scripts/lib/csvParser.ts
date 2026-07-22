/** Parser de CSV simples (suporta campos entre aspas com vírgula/quebra de linha). */
export function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Encontra a melhor correspondência de nome de campanha por igualdade normalizada ou substring. */
export function encontrarCampanhaSimilar<T extends { titulo: string }>(nome: string, campanhas: T[]): T | null {
  const alvo = normalizar(nome);
  const exata = campanhas.find((c) => normalizar(c.titulo) === alvo);
  if (exata) return exata;
  const parcial = campanhas.find((c) => normalizar(c.titulo).includes(alvo) || alvo.includes(normalizar(c.titulo)));
  return parcial ?? null;
}
