/**
 * Migra backend/data.json (sistema legado Express+JSON) para o Supabase Postgres.
 *
 * Uso:
 *   pnpm migrate-legacy -- --target=local            (padrão: aplica no Supabase LOCAL via Docker)
 *   pnpm migrate-legacy -- --target=production        (aplica em produção — exige confirmação)
 *   pnpm migrate-legacy -- --dry-run                  (apenas calcula e gera relatórios, não grava nada)
 *
 * Nunca corrige dados financeiros suspeitos automaticamente — apenas reporta
 * para revisão humana. Ver relatórios gerados em scripts/reports/.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { parseLegacyDateBR, parseLegacyValor, statusVoluntarioLegado } from './lib/legacyParsers.js';
import { toCsv } from './lib/csv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const REPORTS_DIR = join(__dirname, 'reports');
loadEnv({ path: join(REPO_ROOT, '.env') });

const args = process.argv.slice(2);
const target = args.find((a) => a.startsWith('--target='))?.split('=')[1] ?? 'local';
const dryRun = args.includes('--dry-run');

if (target === 'production' && !args.includes('--confirmo-producao')) {
  console.error(
    '\n[ABORTADO] Você está prestes a migrar dados FINANCEIROS REAIS para PRODUÇÃO.\n' +
    'Rode primeiro contra --target=local, revise os relatórios em scripts/reports/ com o usuário,\n' +
    'e só então repita este comando adicionando --confirmo-producao.\n',
  );
  process.exit(1);
}

const SUPABASE_URL = target === 'local'
  ? (process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321')
  : process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = target === 'local'
  ? process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    `[ERRO] Faltam variáveis de ambiente para target=${target}. ` +
    `Configure ${target === 'local' ? 'SUPABASE_LOCAL_URL/SUPABASE_LOCAL_SERVICE_ROLE_KEY' : 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY'} (ver .env.example).`,
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

interface LegacyCampaign {
  id: number; title: string; category: string; current: number; total: number;
  unit: string; missing: number; progress: number; color?: string; statusText?: string;
  isCompleted?: boolean; isCritical?: boolean; deadline?: string | null;
}
interface LegacyTransaction {
  id: number; date: string; description: string; type: 'Entrada' | 'Saída'; value: string; hasReceipt: boolean;
}
interface LegacyVolunteer {
  id: number; name: string; email: string; skills: string; status: string; date: string;
}
interface LegacyDocument {
  id: number; name: string; description: string; fileName: string; originalName: string;
  mimeType: string; fileSize: string; uploadDate: string;
}
interface LegacyData {
  campaigns: LegacyCampaign[];
  transactions: LegacyTransaction[];
  volunteers: LegacyVolunteer[];
  documents: LegacyDocument[];
}

function loadLegacyData(): LegacyData {
  const path = join(REPO_ROOT, 'backend', 'data.json');
  if (!existsSync(path)) {
    console.error(`[ERRO] Não encontrei ${path}. Rode este script a partir do repositório clonado.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const data = loadLegacyData();

  console.log(`\n=== Migração data.json -> Supabase (target=${target}, dry-run=${dryRun}) ===\n`);

  const relatorioCampanhas: Record<string, unknown>[] = [];
  const relatorioTransacoesSuspeitas: Record<string, unknown>[] = [];
  const relatorioDuplicatas: Record<string, unknown>[] = [];
  const relatorioErros: Record<string, unknown>[] = [];

  let campanhasCriadas = 0;
  let transacoesCriadas = 0;
  let transacoesSuspeitasIgnoradas = 0;
  let voluntariosCriados = 0;
  let documentosMigrados = 0;

  // --- Campanhas -------------------------------------------------------
  for (const c of data.campaigns) {
    const currentPlausivel = c.current >= 0 && c.current <= c.total * 3;
    if (!currentPlausivel) {
      relatorioCampanhas.push({
        id_legado: c.id, titulo: c.title, current_original: c.current, total: c.total,
        acao: 'current descartado (fora do plausível) — meta migrada, saldo inicial zerado, requer revisão manual',
      });
    }

    if (dryRun) {
      campanhasCriadas++;
      continue;
    }

    const { data: novaCampanha, error } = await supabase
      .from('campanhas')
      .insert({
        titulo: c.title,
        categoria: c.category,
        unidade: c.unit,
        meta_quantidade: c.total,
        prazo_limite: c.deadline || null,
        cor: c.color || 'bg-blue-500',
      })
      .select()
      .single();

    if (error || !novaCampanha) {
      relatorioErros.push({ tipo: 'campanha', id_legado: c.id, erro: error?.message });
      continue;
    }
    campanhasCriadas++;

    if (currentPlausivel && c.current > 0) {
      const { error: lancError } = await supabase.from('lancamentos_doacao_item').insert({
        campanha_id: novaCampanha.id,
        quantidade: c.current,
        observacao: `Saldo migrado do sistema legado em ${new Date().toISOString().slice(0, 10)}`,
      });
      if (lancError) {
        relatorioErros.push({ tipo: 'lancamento_inicial', id_legado: c.id, erro: lancError.message });
      }
    }
  }

  // --- Transações --------------------------------------------------------
  const vistos = new Set<string>();
  for (const t of data.transactions) {
    const parsed = parseLegacyValor(t.value);
    const dataIso = parseLegacyDateBR(t.date);
    const chaveDuplicata = `${t.date}|${t.description}|${t.value}`;

    if (vistos.has(chaveDuplicata)) {
      relatorioDuplicatas.push({ id_legado: t.id, data: t.date, descricao: t.description, valor: t.value });
    }
    vistos.add(chaveDuplicata);

    if (!parsed || !dataIso) {
      relatorioErros.push({ tipo: 'transacao', id_legado: t.id, erro: 'valor ou data ilegível', valor_bruto: t.value, data_bruta: t.date });
      continue;
    }

    // O sinal correto vem de `type`; se o texto já vinha negativo, o dado está
    // corrompido (raiz do bug histórico) — não inserimos, só reportamos.
    if (parsed.sinalNegativoNoTexto) {
      relatorioTransacoesSuspeitas.push({
        id_legado: t.id, data: t.date, descricao: t.description, tipo_original: t.type,
        valor_bruto: t.value, valor_absoluto: Math.abs(parsed.valor),
        motivo: 'texto do valor já vinha negativo — sinal contraditório com o campo type, requer decisão manual',
      });
      transacoesSuspeitasIgnoradas++;
      continue;
    }

    if (dryRun) {
      transacoesCriadas++;
      continue;
    }

    const { error } = await supabase.from('transacoes').insert({
      data: dataIso,
      descricao: t.description,
      tipo: t.type === 'Entrada' ? 'entrada' : 'saida',
      valor: parsed.valor,
      tem_recibo: t.hasReceipt,
    });

    if (error) {
      relatorioErros.push({ tipo: 'transacao', id_legado: t.id, erro: error.message });
      continue;
    }
    transacoesCriadas++;
  }

  // --- Voluntários ---------------------------------------------------------
  for (const v of data.volunteers) {
    const dataIso = parseLegacyDateBR(v.date) ?? new Date().toISOString().slice(0, 10);
    if (dryRun) {
      voluntariosCriados++;
      continue;
    }
    const { error } = await supabase.from('voluntarios').insert({
      nome: v.name,
      email: v.email || null,
      habilidades: v.skills || null,
      status: statusVoluntarioLegado(v.status),
      data_inscricao: dataIso,
    });
    if (error) {
      relatorioErros.push({ tipo: 'voluntario', id_legado: v.id, erro: error.message });
      continue;
    }
    voluntariosCriados++;
  }

  // --- Documentos (upload de backend/uploads/*) -----------------------------
  for (const doc of data.documents ?? []) {
    const filePath = join(REPO_ROOT, 'backend', 'uploads', doc.fileName);
    if (!existsSync(filePath)) {
      relatorioErros.push({ tipo: 'documento', id_legado: doc.id, erro: `arquivo ausente em backend/uploads/${doc.fileName}` });
      continue;
    }
    if (dryRun) {
      documentosMigrados++;
      continue;
    }
    const buffer = readFileSync(filePath);
    const storagePath = `migrados/${doc.fileName}`;
    const { error: uploadError } = await supabase.storage.from('documentos').upload(storagePath, buffer, {
      contentType: doc.mimeType,
      upsert: false,
    });
    if (uploadError) {
      relatorioErros.push({ tipo: 'documento', id_legado: doc.id, erro: uploadError.message });
      continue;
    }
    const tamanhoBytes = buffer.byteLength;
    const { error: insertError } = await supabase.from('documentos').insert({
      nome: doc.name,
      descricao: doc.description || null,
      storage_path: storagePath,
      nome_original: doc.originalName,
      mime_type: doc.mimeType,
      tamanho_bytes: tamanhoBytes,
    });
    if (insertError) {
      relatorioErros.push({ tipo: 'documento', id_legado: doc.id, erro: insertError.message });
      continue;
    }
    documentosMigrados++;
  }

  // --- Relatórios ------------------------------------------------------------
  const gravarRelatorio = (nome: string, linhas: Record<string, unknown>[]) => {
    const path = join(REPORTS_DIR, nome);
    writeFileSync(path, toCsv(linhas));
    return path;
  };

  console.log('=== Resumo ===');
  console.log(`Campanhas migradas:              ${campanhasCriadas} / ${data.campaigns.length}`);
  console.log(`Transações migradas:              ${transacoesCriadas} / ${data.transactions.length}`);
  console.log(`Transações suspeitas (ignoradas): ${transacoesSuspeitasIgnoradas}`);
  console.log(`Voluntários migrados:              ${voluntariosCriados} / ${data.volunteers.length}`);
  console.log(`Documentos migrados:                ${documentosMigrados} / ${(data.documents ?? []).length}`);
  console.log(`Erros:                               ${relatorioErros.length}`);

  if (relatorioTransacoesSuspeitas.length > 0) {
    const p = gravarRelatorio('migration-report-transacoes-suspeitas.csv', relatorioTransacoesSuspeitas);
    console.log(`\n[ATENÇÃO] Transações suspeitas gravadas em: ${p}`);
    console.log('Essas transações NÃO foram inseridas. Revise com o usuário antes de decidir o valor correto.');
  }
  if (relatorioDuplicatas.length > 0) {
    const p = gravarRelatorio('migration-report-duplicatas.csv', relatorioDuplicatas);
    console.log(`[ATENÇÃO] Possíveis duplicatas (informativo, nada foi removido): ${p}`);
  }
  if (relatorioCampanhas.length > 0) {
    const p = gravarRelatorio('migration-report-campanhas-corrigidas.csv', relatorioCampanhas);
    console.log(`[ATENÇÃO] Campanhas com dado de progresso descartado: ${p}`);
  }
  if (relatorioErros.length > 0) {
    const p = gravarRelatorio('migration-report-erros.csv', relatorioErros);
    console.log(`[ERRO] Falhas durante a migração: ${p}`);
  }

  if (dryRun) {
    console.log('\n(dry-run: nada foi gravado no banco)');
  }
  console.log('');
}

main().catch((err) => {
  console.error('[ERRO FATAL]', err);
  process.exit(1);
});
