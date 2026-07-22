/**
 * Importa preços de referência a partir de uma planilha de materiais de
 * doação (colunas esperadas: "Item/Produto", "Unidade de medida",
 * "Finalidade", "Valor Unitário").
 *
 * Uso:
 *   pnpm import-precos -- --file="./Lista_de_Materiais_de_Doação.xlsx" --dry-run
 *   pnpm import-precos -- --file="./Lista_de_Materiais_de_Doação.xlsx" --target=local
 *   pnpm import-precos -- --file="./Lista_de_Materiais_de_Doação.xlsx" --target=production --confirmo-producao
 *
 * A categoria (ALIMENTOS/VESTUÁRIO/INFANTIL/HIGIENE/OUTRO) é inferida por
 * palavra-chave a partir do nome do item — é um ponto de partida editável
 * depois pela tela de Preços de Referência, não uma classificação definitiva.
 * Itens duplicados (mesmo nome, case-insensitive) usam a última ocorrência
 * na planilha. Linhas sem preço numérico válido são ignoradas.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import ExcelJS from 'exceljs';
import { toCsv } from './lib/csv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, 'reports');
loadEnv({ path: join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const getArg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const filePath = getArg('file');
const target = getArg('target') ?? 'local';
const dryRun = args.includes('--dry-run');

if (!filePath) {
  console.error('[ERRO] Use --file="caminho/para/planilha.xlsx"');
  process.exit(1);
}
if (!existsSync(filePath)) {
  console.error(`[ERRO] Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

if (target === 'production' && !args.includes('--confirmo-producao')) {
  console.error(
    '\n[ABORTADO] Rode primeiro contra --target=local, revise os relatórios em scripts/reports/,\n' +
    'e só então repita adicionando --confirmo-producao.\n',
  );
  process.exit(1);
}

const SUPABASE_URL = target === 'local' ? (process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321') : process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = target === 'local' ? process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`[ERRO] Faltam variáveis de ambiente para target=${target}. Ver .env.example.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Ordem importa: regras mais específicas primeiro.
const REGRAS_CATEGORIA: { categoria: string; re: RegExp }[] = [
  { categoria: 'HIGIENE', re: /\b(fralda geriatrica|absorvente|sabonete|shampoo|xampu|condicionador|escova de dente|escova de cabelo|pasta de dente|papel higienico|desodorante|sabao em (barra|po)|detergente|amaciante|agua sanitaria|alvejante|alcool|cotonete|aparelho de barbear|espuma de barbear|locao pos barba|fio dental|hidratante|colonia|perfume|esmalte|pente|lenco umedecido|luvas? de procediment|mascara descartavel|gaze|esparadrapo|curativo|soro fisiologico|pomada|vermifugo|antisseptic|kit higiene|necessaire|batom|estojo de maquiagem|estojo de sombra|pincel para maquiagem|mascara para cilios|prestobarba|toucas descartaveis)\b/ },
  { categoria: 'INFANTIL', re: /\b(infantil|crianca|bebe|mamadeira|brinquedo|boneca|jogo|quebra-cabeca|domino|leite aptamil|leite ninho|leite pregomin|nutricao sabor|calcados infantis|bolsinhas infantis|dvd'?s infantis|caneta hidrocor|canetinha compact|massa de modelar|mini balanca|mini caba|mini fogao|mini pa\b|mini pia|mini vaso|mini radio|mini rodo|chupeta|regua infantil)\b/ },
  { categoria: 'VESTUÁRIO', re: /\b(roupa|camisa|camiseta|calca\b|saia|blusa|cueca|calcinha|soutien|sutia|meia|sapato|tenis|havaiana|bone\b|chapeu|cachecol|casaco|agasalho|edredon|lencol|cobertor\b|manta\b|fronha|toalha de mesa|cinto|bolsa|mochila|mala\b|carteiras?|tecido|enxoval|pares de sapatos|calcados|diadema|tiara|colar|brinco|anel\b|pulseira|chaveiro|oculos)\b/ },
  { categoria: 'ALIMENTOS', re: /\b(arroz|feijao|macarrao|oleo de soja|azeite|acucar|sal\b|farinha|fuba|cafe\b|achocolatado|biscoito|bolacha|pao de|pao\b|molho de tomate|extrato de tomate|tempero|banana|maca fuji|laranja|manga\b|mamao|melancia|morango|uva |uva\b|limao|tomate|cebola|batata|cenoura|alface|couve|quiabo|pimentao|rucula|pimenta|frango|carne|linguica|salsicha|bacon|presunto|mussarela|queijo|ovos?\b|agua \(|refrigerante|suco|doce|bala|chocolate|pacoca|geladinho|dindin|sorvete|creme de leite|leite condensado|leite consensado|leite \(|leite\b|fermento|milho|cuzcuz|cuscuz|aveia|vinagre|ketchup|maionese|mostarda|orega|canela|coentro|alho\b|cheiro verde|amendoim|azeitona|coco ralado|polpa de frutas|sardinha|soja texturizada|caldo de|panetone|chocotone|bombom|guarana|iogurte|manteiga|margarina|requeijao|marmita|bolo|espiga de milho|milharina|flocao|povilho|farinha para kibe)\b/ },
];

function classificarCategoria(nome: string): string {
  const n = normalizar(nome);
  for (const r of REGRAS_CATEGORIA) {
    if (r.re.test(n)) return r.categoria;
  }
  return 'OUTRO';
}

function parseValor(raw: unknown): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = parseFloat(String(raw).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

function celulaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object' && 'text' in (valor as any)) return String((valor as any).text ?? '');
  if (typeof valor === 'object' && 'result' in (valor as any)) return String((valor as any).result ?? '');
  return String(valor);
}

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath!);
  const sheet = workbook.worksheets[0];

  const header = (sheet.getRow(1).values as ExcelJS.CellValue[]).map((v) => celulaTexto(v).trim());
  const idx = (name: string) => header.indexOf(name);
  const iItem = idx('Item/Produto');
  const iUnidade = idx('Unidade de medida');
  const iValor = idx('Valor Unitário');

  if (iItem === -1 || iValor === -1) {
    console.error('[ERRO] Planilha não tem as colunas esperadas ("Item/Produto", "Valor Unitário").');
    process.exit(1);
  }

  const totalLinhas = sheet.rowCount - 1;
  console.log(`\n=== Import de preços de referência (arquivo=${filePath}, target=${target}, dry-run=${dryRun}) ===`);
  console.log(`${totalLinhas} linhas na planilha.\n`);

  const vistos = new Map<string, { item_nome: string; categoria: string; unidade: string; preco_unitario: number }>();
  const relatorioIgnorados: Record<string, unknown>[] = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r).values as ExcelJS.CellValue[];
    const nome = celulaTexto(row[iItem]).trim();
    const unidade = celulaTexto(row[iUnidade]).trim() || 'unidades';
    const valorBruto = celulaTexto(row[iValor]);
    const valor = parseValor(valorBruto);
    const categoria = classificarCategoria(nome);

    if (!nome) continue;
    if (valor === null || valor <= 0) {
      relatorioIgnorados.push({ linha: r, item: nome, motivo: 'sem preço numérico válido', valor_bruto: valorBruto });
      continue;
    }

    vistos.set(nome.toLowerCase(), { item_nome: nome, categoria, unidade, preco_unitario: valor });
  }

  const itens = Array.from(vistos.values()).sort((a, b) => a.item_nome.localeCompare(b.item_nome, 'pt-BR'));

  console.log(`Itens com preço válido: ${itens.length}`);
  const porCategoria: Record<string, number> = {};
  itens.forEach((i) => { porCategoria[i.categoria] = (porCategoria[i.categoria] ?? 0) + 1; });
  console.log('Distribuição por categoria:', porCategoria);

  if (dryRun) {
    writeFileSync(join(REPORTS_DIR, 'precos-referencia-preview.csv'), toCsv(itens));
    console.log(`\n(dry-run) Prévia gravada em scripts/reports/precos-referencia-preview.csv — nada foi gravado no banco.`);
    return;
  }

  let sucesso = 0;
  const relatorioErros: Record<string, unknown>[] = [];

  for (const item of itens) {
    const { error } = await supabase.from('precos_referencia').upsert(
      {
        item_nome: item.item_nome,
        categoria: item.categoria,
        unidade: item.unidade,
        preco_unitario: item.preco_unitario,
        fonte: 'manual',
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'item_nome' },
    );
    if (error) {
      relatorioErros.push({ item: item.item_nome, erro: error.message });
      continue;
    }
    sucesso++;
  }

  console.log(`\n=== Resumo ===`);
  console.log(`Itens gravados com sucesso: ${sucesso} / ${itens.length}`);
  console.log(`Linhas ignoradas (sem preço): ${relatorioIgnorados.length}`);
  console.log(`Erros: ${relatorioErros.length}`);

  if (relatorioIgnorados.length > 0) {
    const p = join(REPORTS_DIR, 'precos-referencia-ignorados.csv');
    writeFileSync(p, toCsv(relatorioIgnorados));
    console.log(`Linhas sem preço válido: ${p}`);
  }
  if (relatorioErros.length > 0) {
    const p = join(REPORTS_DIR, 'precos-referencia-erros.csv');
    writeFileSync(p, toCsv(relatorioErros));
    console.log(`[ERRO] Falhas ao gravar: ${p}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('[ERRO FATAL]', err);
  process.exit(1);
});
