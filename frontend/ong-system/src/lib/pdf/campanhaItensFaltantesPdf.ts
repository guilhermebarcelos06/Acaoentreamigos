import { jsPDF } from "jspdf";
import { desenharCabecalho, desenharRodape, desenharCabecalhoTabela } from "./pdfShared";
import type { CampanhaResumo } from "../services/campanhas";
import type { CampanhaItemResumo } from "../services/campanhaItens";

/** Gera um PDF com os itens que ainda faltam para a campanha atingir a meta. */
export function gerarPdfItensFaltantes(campanha: CampanhaResumo, itens: CampanhaItemResumo[]) {
  const doc = new jsPDF();
  const titulo = campanha.titulo ?? "Campanha sem título";
  desenharCabecalho(doc, `Itens Faltantes — Campanha "${titulo}"`);

  const itensComFalta = itens.filter((i) => (i.quantidade_faltante ?? 0) > 0);

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 35, 182, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("RESUMO DA CAMPANHA", 18, 41);
  doc.setFont("helvetica", "normal");
  doc.text(`Itens cadastrados: ${itens.length}`, 18, 48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38);
  doc.text(`Itens com meta pendente: ${itensComFalta.length}`, 120, 48);

  let y = 68;
  desenharCabecalhoTabela(doc, [
    { label: "ITEM", x: 18 },
    { label: "CATEGORIA", x: 90 },
    { label: "UNIDADE", x: 130 },
    { label: "FALTANTE", x: 160 },
  ], y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  if (itensComFalta.length === 0) {
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text("Todos os itens já atingiram a meta — nenhum item pendente nesta campanha.", 18, y);
  } else {
    itensComFalta.forEach((item) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(51, 65, 85);
      let nome = item.nome ?? "";
      if (nome.length > 30) nome = nome.substring(0, 27) + "...";
      doc.text(nome, 18, y);
      doc.text(item.categoria ?? "", 90, y);
      doc.text(item.unidade ?? "", 130, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(String(item.quantidade_faltante), 160, y);
      doc.setFont("helvetica", "normal");
      y += 8;
    });
  }

  desenharRodape(doc);
  doc.save(`itens-faltantes-${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
