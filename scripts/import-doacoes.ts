/**
 * Importa um arquivo de doações históricas (ex: banco do Rodrigo) para o Supabase.
 *
 * Uso:
 *   pnpm import-doacoes -- --file=./rodrigo-doacoes.csv --mapping=./import-mapping.json --dry-run
 *   pnpm import-doacoes -- --file=./rodrigo-doacoes.csv --mapping=./import-mapping.json --target=local
 *
 * O arquivo de origem deve ser CSV com cabeçalho. Ajuste import-mapping.json
 * (copiado de import-mapping.example.json) para apontar os nomes de coluna do
 * arquivo real. Campanhas são casadas por nome (normalizado); quando não há
 * correspondência, a linha é reportada e não é perdida — fica pendente de
 * decisão manual, sem criar uma campanha nova "adivinhada".
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { parseCsv, encontrarCampanhaSimilar } from './lib/csvParser.js';
import { parseFlexibleMoney, parseFlexibleDate } from './lib/legacyParsers.js';
import { toCsv } from './lib/csv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, 'reports');
loadEnv({ path: join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const getArg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const filePath = getArg('file');
const mappingPath = getArg('mapping') ?? join(__dirname, 'import-mapping.json');
const target = getArg('target') ?? 'local';
const dryRun = args.includes('--dry-run');

if (!filePath) {
  console.error('[ERRO] Use --file=caminho/para/arquivo.csv (exporte o banco do Rodrigo para CSV antes de importar).');
  process.exit(1);
}
if (!existsSync(filePath)) {
  console.error(`[ERRO] Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}
if (!existsSync(mappingPath)) {
  console.error(
    `[ERRO] Mapeamento de colunas não encontrado em ${mappingPath}.\n` +
    'Copie scripts/import-mapping.example.json para scripts/import-mapping.json e ajuste os nomes de coluna.',
  );
  process.exit(1);
}

const mapping = JSON.parse(readFileSync(mappingPath, 'utf8')) as Record<string, string>;

const SUPABASE_URL = target === 'local' ? (process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321') : process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = target === 'local' ? process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`[ERRO] Faltam variáveis de ambiente para target=${target}. Ver .env.example.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

interface LinhaOrigem { [coluna: string]: string; }

function campo(linha: LinhaOrigem, chave: string): string {
  const coluna = mapping[chave];
  return coluna ? (linha[coluna] ?? '').trim() : '';
}

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const csvContent = readFileSync(filePath!, 'utf8');
  const linhas = parseCsv(csvContent);

  console.log(`\n=== Import de doações (arquivo=${filePath}, target=${target}, dry-run=${dryRun}) ===`);
  console.log(`${linhas.length} linhas encontradas.\n`);

  const { data: campanhas } = await supabase.from('campanhas').select('id, titulo');

  const relatorioNaoMapeados: Record<string, unknown>[] = [];
  const relatorioErros: Record<string, unknown>[] = [];
  let sucesso = 0;

  let loteId: string | null = null;
  if (!dryRun) {
    const { data: lote, error } = await supabase.from('import_lotes').insert({
      nome_arquivo: filePath,
      mapeamento_colunas: mapping,
      status: 'processando',
      total_linhas: linhas.length,
    }).select().single();
    if (error) {
      console.error('[ERRO] Não foi possível registrar o lote de importação:', error.message);
      process.exit(1);
    }
    loteId = lote.id;
  }

  for (let i = 0; i < linhas.length; i++) {
    const linhaNum = i + 2; // +1 header, +1 base 1
    const linha = linhas[i];

    const nomeDoador = campo(linha, 'doador');
    const emailDoador = campo(linha, 'email');
    const dataStr = campo(linha, 'data');
    const valorStr = campo(linha, 'valor');
    const nomeCampanha = campo(linha, 'campanha');
    const tipo = (campo(linha, 'tipo') || 'dinheiro').toLowerCase();
    const observacao = campo(linha, 'observacao');

    if (!nomeDoador || !dataStr || !valorStr) {
      relatorioErros.push({ linha: linhaNum, erro: 'campos obrigatórios ausentes (doador/data/valor)', dados: JSON.stringify(linha) });
      continue;
    }

    const valorNumerico = parseFlexibleMoney(valorStr);
    if (valorNumerico === null || valorNumerico <= 0) {
      relatorioErros.push({ linha: linhaNum, erro: `valor inválido: "${valorStr}"`, dados: JSON.stringify(linha) });
      continue;
    }

    const dataIso = parseFlexibleDate(dataStr);
    if (!dataIso) {
      relatorioErros.push({ linha: linhaNum, erro: `data inválida: "${dataStr}" (use YYYY-MM-DD ou DD/MM/YYYY)`, dados: JSON.stringify(linha) });
      continue;
    }

    const campanhaEncontrada = nomeCampanha ? encontrarCampanhaSimilar(nomeCampanha, campanhas ?? []) : null;
    if (nomeCampanha && !campanhaEncontrada) {
      relatorioNaoMapeados.push({ linha: linhaNum, campanha_no_arquivo: nomeCampanha, doador: nomeDoador, valor: valorStr, data: dataStr });
    }

    if (dryRun) {
      sucesso++;
      continue;
    }

    try {
      let doadorId: string;
      const { data: doadorExistente } = await supabase.from('doadores').select('id').ilike('nome', nomeDoador).maybeSingle();
      if (doadorExistente) {
        doadorId = doadorExistente.id;
      } else {
        const { data: novoDoador, error: doadorError } = await supabase.from('doadores').insert({
          nome: nomeDoador, email: emailDoador || null, origem: 'import_rodrigo',
        }).select().single();
        if (doadorError || !novoDoador) throw new Error(doadorError?.message ?? 'falha ao criar doador');
        doadorId = novoDoador.id;
      }

      if (tipo.startsWith('item')) {
        if (!campanhaEncontrada) {
          relatorioErros.push({ linha: linhaNum, erro: 'doação de item sem campanha correspondente — não é possível lançar sem campanha', dados: JSON.stringify(linha) });
          continue;
        }
        const { error } = await supabase.from('lancamentos_doacao_item').insert({
          campanha_id: campanhaEncontrada.id,
          quantidade: valorNumerico,
          doador_id: doadorId,
          data: dataIso,
          observacao: observacao || 'Importado do banco do Rodrigo',
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('transacoes').insert({
          data: dataIso,
          descricao: observacao || `Doação de ${nomeDoador} (importado)`,
          tipo: 'entrada',
          valor: valorNumerico,
          campanha_id: campanhaEncontrada?.id ?? null,
          doador_id: doadorId,
        });
        if (error) throw new Error(error.message);
      }
      sucesso++;
    } catch (err: any) {
      relatorioErros.push({ linha: linhaNum, erro: err.message, dados: JSON.stringify(linha) });
      if (loteId) {
        await supabase.from('import_erros').insert({
          lote_id: loteId, linha_numero: linhaNum, erro_msg: err.message, dados_brutos: linha,
        });
      }
    }
  }

  if (loteId) {
    await supabase.from('import_lotes').update({
      status: relatorioErros.length > 0 ? 'com_erros' : 'concluido',
      total_sucesso: sucesso,
      total_erro: relatorioErros.length,
    }).eq('id', loteId);
  }

  console.log('=== Resumo ===');
  console.log(`Linhas processadas com sucesso: ${sucesso} / ${linhas.length}`);
  console.log(`Linhas com erro:                 ${relatorioErros.length}`);
  console.log(`Campanhas não encontradas:        ${relatorioNaoMapeados.length}`);

  if (relatorioNaoMapeados.length > 0) {
    const p = join(REPORTS_DIR, 'import-report-campanhas-nao-mapeadas.csv');
    writeFileSync(p, toCsv(relatorioNaoMapeados));
    console.log(`\n[ATENÇÃO] Campanhas do arquivo sem correspondência no sistema: ${p}`);
    console.log('Crie a campanha correspondente antes de reimportar, ou ajuste o nome no arquivo de origem.');
  }
  if (relatorioErros.length > 0) {
    const p = join(REPORTS_DIR, 'import-report-erros.csv');
    writeFileSync(p, toCsv(relatorioErros));
    console.log(`[ERRO] Linhas que falharam: ${p}`);
  }
  if (dryRun) console.log('\n(dry-run: nada foi gravado no banco)');
  console.log('');
}

main().catch((err) => {
  console.error('[ERRO FATAL]', err);
  process.exit(1);
});
