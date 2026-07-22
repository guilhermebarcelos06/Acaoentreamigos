import { jsPDF } from "jspdf";
import { desenharCabecalho, desenharRodape, desenharCabecalhoTabela } from "./pdfShared";
import type { CampanhaResumo } from "../services/campanhas";
import type { CampanhaItemResumo } from "../services/campanhaItens";
import { formatDateBR } from "../dates";

interface LancamentoComItem {
  data: string;
  quantidade: number;
  campanha_itens?: { nome: string; unidade: string } | null;
  doadores?: { nome: string } | null;
}

interface TransacaoResumo {
  data: string;
  descricao: string;
  tipo: string;
  valor: number;
}

/** Gera o PDF de resumo consolidado de uma campanha: itens, financeiro e doadores. */
export function gerarPdfResumoCampanha(
  campanha: CampanhaResumo,
  itens: CampanhaItemResumo[],
  lancamentos: LancamentoComItem[],
  transacoes: TransacaoResumo[],
) {
  const doc = new jsPDF();
  const titulo = campanha.titulo ?? "Campanha sem título";
  desenharCabecalho(doc, `Resumo da Campanha — "${titulo}"`);

  const statusLabel = campanha.status === 'finalizada' ? "Finalizada" : campanha.status === 'cancelada' ? "Cancelada" : "Ativa";
  const periodo = campanha.data_inicio && campanha.data_fim
    ? `${formatDateBR(campanha.data_inicio)} a ${formatDateBR(campanha.data_fim)}`
    : "Sem período definido";

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("STATUS GERAL", 18, 41);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${statusLabel}   |   Período: ${periodo}`, 18, 48);
  doc.text(`Itens: ${campanha.itens_completos ?? 0} de ${campanha.total_itens ?? 0} completos`, 18, 54);
  doc.text(`Arrecadado (R$): ${(campanha.valor_arrecadado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 60);
  doc.text(`Gasto (R$): ${(campanha.valor_gasto ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 66);
  doc.setFont("helvetica", "bold");
  doc.text(`Saldo financeiro: R$ ${(campanha.saldo_financeiro ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 120, 60);

  let y = 82;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Itens da campanha", 14, y);
  y += 6;

  desenharCabecalhoTabela(doc, [
    { label: "ITEM", x: 16 },
    { label: "CATEGORIA", x: 75 },
    { label: "ATUAL/META", x: 125 },
    { label: "%", x: 175 },
  ], y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  itens.forEach((item) => {
    if (y > 270) { doc.addPage(); y = 20; }
    let nome = item.nome ?? "";
    if (nome.length > 25) nome = nome.substring(0, 22) + "...";
    doc.text(nome, 16, y);
    doc.text(item.categoria ?? "", 75, y);
    doc.text(`${item.quantidade_atual}/${item.meta_quantidade} ${item.unidade}`, 125, y);
    doc.text(`${item.progresso_percentual_bruto}%`, 175, y);
    y += 7;
  });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Lançamentos de item", 14, y);
  y += 6;

  if (lancamentos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhum lançamento de item registrado.", 18, y);
    y += 8;
  } else {
    desenharCabecalhoTabela(doc, [
      { label: "DATA", x: 16 },
      { label: "ITEM", x: 55 },
      { label: "QUANTIDADE", x: 110 },
      { label: "DOADOR", x: 150 },
    ], y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    lancamentos.slice(0, 15).forEach((l) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(formatDateBR(l.data), 16, y);
      doc.text(l.campanha_itens?.nome || "—", 55, y);
      doc.text(String(l.quantidade), 110, y);
      doc.text(l.doadores?.nome || "Não identificado", 150, y);
      y += 7;
    });
    y += 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Transações financeiras vinculadas", 14, y);
  y += 6;

  if (transacoes.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhuma transação vinculada a esta campanha.", 18, y);
  } else {
    desenharCabecalhoTabela(doc, [
      { label: "DATA", x: 16 },
      { label: "DESCRIÇÃO", x: 55 },
      { label: "TIPO", x: 140 },
      { label: "VALOR", x: 165 },
    ], y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    transacoes.slice(0, 20).forEach((t) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(51, 65, 85);
      doc.text(formatDateBR(t.data), 16, y);
      let desc = t.descricao;
      if (desc.length > 35) desc = desc.substring(0, 32) + "...";
      doc.text(desc, 55, y);
      doc.text(t.tipo === 'entrada' ? 'Entrada' : 'Saída', 140, y);
      doc.setTextColor(t.tipo === 'entrada' ? 22 : 220, t.tipo === 'entrada' ? 163 : 38, t.tipo === 'entrada' ? 74 : 38);
      doc.text(`R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 165, y);
      y += 7;
    });
  }

  desenharRodape(doc);
  doc.save(`resumo-campanha-${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
