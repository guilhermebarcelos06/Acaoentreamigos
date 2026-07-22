import { jsPDF } from "jspdf";
import { desenharCabecalho, desenharRodape } from "./pdfShared";
import type { CampanhaResumo } from "../services/campanhas";
import { formatBRL } from "../currency";
import { formatDateBR, parseLocalDate } from "../dates";

interface TransacaoResumo {
  data: string;
  descricao: string;
  tipo: string;
  valor: number;
}

/** Extrato financeiro (estilo bancário) das transações vinculadas a uma campanha específica. */
export function gerarExtratoCampanhaPdf(campanha: CampanhaResumo, transacoes: TransacaoResumo[]) {
  const doc = new jsPDF();
  const titulo = campanha.titulo ?? "Campanha sem título";
  desenharCabecalho(doc, `Extrato Financeiro — Campanha "${titulo}"`);

  const sortedTrans = [...transacoes].sort(
    (a, b) => parseLocalDate(a.data).getTime() - parseLocalDate(b.data).getTime(),
  );

  let totalIn = 0;
  let totalOut = 0;
  sortedTrans.forEach((t) => {
    if (t.tipo === 'entrada') totalIn += t.valor;
    else totalOut += t.valor;
  });
  const balance = totalIn - totalOut;

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("RESUMO FINANCEIRO DA CAMPANHA", 18, 41);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de Entradas: R$ ${formatBRL(totalIn)}`, 18, 48);
  doc.text(`Total de Saídas: R$ ${formatBRL(totalOut)}`, 18, 54);
  doc.setFont("helvetica", "bold");
  doc.text(`Saldo Final: R$ ${formatBRL(balance)}`, 120, 48);
  doc.setFont("helvetica", "normal");
  doc.text(`Transações Registradas: ${sortedTrans.length}`, 120, 54);

  doc.setFillColor(16, 185, 129);
  doc.rect(14, 66, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("DATA", 16, 71);
  doc.text("DESCRIÇÃO", 40, 71);
  doc.text("TIPO", 130, 71);
  doc.text("VALOR", 160, 71);

  let y = 81;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  if (sortedTrans.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("Nenhuma transação registrada nesta campanha.", 18, y);
  }

  sortedTrans.forEach((t, index) => {
    if (y > 280) {
      doc.addPage();
      doc.setFillColor(16, 185, 129);
      doc.rect(14, 15, 182, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("DATA", 16, 20);
      doc.text("DESCRIÇÃO", 40, 20);
      doc.text("TIPO", 130, 20);
      doc.text("VALOR", 160, 20);
      y = 30;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 5, 182, 7.5, "F");
    }

    doc.text(formatDateBR(t.data), 16, y);
    let desc = t.descricao;
    if (desc.length > 45) desc = desc.substring(0, 42) + "...";
    doc.text(desc, 40, y);
    doc.text(t.tipo === 'entrada' ? 'Entrada' : 'Saída', 130, y);

    doc.setTextColor(t.tipo === 'entrada' ? 22 : 220, t.tipo === 'entrada' ? 163 : 38, t.tipo === 'entrada' ? 74 : 38);
    doc.text(`${t.tipo === 'entrada' ? '+' : '-'} R$ ${formatBRL(t.valor)}`, 160, y);
    doc.setTextColor(51, 65, 85);

    y += 8;
  });

  desenharRodape(doc);
  doc.save(`extrato-financeiro-${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
