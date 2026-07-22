import { jsPDF } from "jspdf";

/** Cabeçalho padrão da ONG, reaproveitado em todos os PDFs gerados pelo sistema. */
export function desenharCabecalho(doc: jsPDF, subtitulo: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text("Ação Entre Amigos", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitulo, 14, 26);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 196, 30);
}

export function desenharRodape(doc: jsPDF) {
  const now = new Date();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento emitido digitalmente em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, 14, 290);
}

export function desenharCabecalhoTabela(doc: jsPDF, colunas: { label: string; x: number }[], y: number) {
  doc.setFillColor(16, 185, 129);
  doc.rect(14, y, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  colunas.forEach((c) => doc.text(c.label, c.x, y + 5.5));
}
