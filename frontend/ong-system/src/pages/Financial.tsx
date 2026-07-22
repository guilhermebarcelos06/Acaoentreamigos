import { useState, useEffect } from "react";
import { Plus, Download, Search, X, Paperclip, Eye } from "lucide-react";
import { jsPDF } from "jspdf";
import { useAuth } from "../contexts/AuthContext";
import { listarTransacoes, criarTransacao, anexarRecibo, urlAssinadaRecibo, type Transacao } from "../lib/services/transacoes";
import { formatCurrencyInputMask, parseBRLInput, formatBRLWithSymbol, formatBRL } from "../lib/currency";
import { parseLocalDate, formatDateBR } from "../lib/dates";

export default function Financial() {
  const { user, podeFazer, isAdmin, isAdminMaster } = useAuth();
  const [transactionList, setTransactionList] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);

  const podeCriar = isAdmin || isAdminMaster || podeFazer('financeiro', 'criar');

  const [newTransaction, setNewTransaction] = useState({
    descricao: "",
    tipo: "entrada" as 'entrada' | 'saida',
    valor: "",
    data: new Date().toISOString().slice(0, 10),
  });

  const carregar = () => {
    setLoading(true);
    listarTransacoes().then(setTransactionList).catch((err) => console.error("Erro ao carregar transações:", err)).finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const filteredTransactions = transactionList.filter((t) =>
    (t.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tipo.includes(searchTerm.toLowerCase())
  );

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      await criarTransacao({
        descricao: newTransaction.descricao,
        tipo: newTransaction.tipo,
        valor: parseBRLInput(newTransaction.valor),
        data: newTransaction.data,
        criado_por: user?.id,
      });
      setIsModalOpen(false);
      setNewTransaction({ descricao: "", tipo: "entrada", valor: "", data: new Date().toISOString().slice(0, 10) });
      carregar();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao lançar transação.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadRecibo = async (id: string, file: File) => {
    setUploadingReceiptId(id);
    try {
      await anexarRecibo(id, file);
      carregar();
    } catch (err) {
      console.error("Erro ao anexar recibo:", err);
      alert("Falha ao anexar recibo.");
    } finally {
      setUploadingReceiptId(null);
    }
  };

  const handleVerRecibo = async (path: string) => {
    try {
      const url = await urlAssinadaRecibo(path);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar link do recibo.");
    }
  };

  const gerarExtratoPDF = () => {
    const doc = new jsPDF();
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    const last3MonthsTrans = transactionList.filter((t) => parseLocalDate(t.data) >= threeMonthsAgo);
    const sortedTrans = [...last3MonthsTrans].sort(
      (a, b) => parseLocalDate(a.data).getTime() - parseLocalDate(b.data).getTime(),
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text("Ação Entre Amigos", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Relatório Oficial de Transações - Fluxo de Caixa (Últimos 3 Meses)", 14, 26);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 30, 196, 30);

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
    doc.text("RESUMO FINANCEIRO DO PERÍODO", 18, 41);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total de Entradas: R$ ${formatBRL(totalIn)}`, 18, 48);
    doc.text(`Total de Saídas: R$ ${formatBRL(totalOut)}`, 18, 54);

    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Final Líquido: R$ ${formatBRL(balance)}`, 120, 48);
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

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Documento emitido digitalmente em ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`, 14, 290);

    doc.save("extrato-3-meses.pdf");
  };

  const hoje = new Date();
  const transacoesDoMes = transactionList.filter((t) => {
    const d = new Date(t.data + 'T00:00:00');
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });

  const somaPor = (lista: Transacao[], tipo: 'entrada' | 'saida') =>
    lista.filter((t) => t.tipo === tipo).reduce((acc, t) => acc + t.valor, 0);

  const entradasMes = somaPor(transacoesDoMes, 'entrada');
  const saidasMes = somaPor(transacoesDoMes, 'saida');
  const entradasTotal = somaPor(transactionList, 'entrada');
  const saidasTotal = somaPor(transactionList, 'saida');
  const saldoTotal = entradasTotal - saidasTotal;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro & Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Gerencie entradas, saídas e recibos (notas fiscais).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button onClick={gerarExtratoPDF} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground">
            <Download className="w-4 h-4" /> Extrato (Últimos 3 Meses)
          </button>
          {podeCriar && (
            <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nova Transação
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Entradas (Mês atual)</p>
          <h2 className="text-2xl font-bold text-primary">+ {formatBRLWithSymbol(entradasMes)}</h2>
          <p className="text-xs text-muted-foreground mt-1">Total geral: {formatBRLWithSymbol(entradasTotal)}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Saídas (Mês atual)</p>
          <h2 className="text-2xl font-bold text-red-500">- {formatBRLWithSymbol(saidasMes)}</h2>
          <p className="text-xs text-muted-foreground mt-1">Total geral: {formatBRLWithSymbol(saidasTotal)}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Saldo Total</p>
          <h2 className="text-2xl font-bold text-foreground">{formatBRLWithSymbol(saldoTotal)}</h2>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <h3 className="font-semibold text-lg text-foreground">Histórico de Transações</h3>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar transação..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full sm:w-64 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-medium">DATA</th>
                <th className="px-6 py-4 font-medium">DESCRIÇÃO</th>
                <th className="px-6 py-4 font-medium text-center">TIPO</th>
                <th className="px-6 py-4 font-medium">VALOR</th>
                <th className="px-6 py-4 font-medium text-right">RECIBO</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">Carregando...</td></tr>
              )}
              {!loading && filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 text-muted-foreground">{formatDateBR(t.data)}</td>
                  <td className="px-6 py-4 font-medium">{t.descricao}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.tipo === 'entrada' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                      {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold ${t.tipo === 'entrada' ? 'text-primary' : 'text-foreground'}`}>
                    {t.tipo === 'entrada' ? '+' : '-'} {formatBRLWithSymbol(t.valor)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.tem_recibo && t.recibo_storage_path ? (
                      <button onClick={() => handleVerRecibo(t.recibo_storage_path!)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Eye className="w-3.5 h-3.5" /> Ver recibo
                      </button>
                    ) : podeCriar ? (
                      <label className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5" />
                        {uploadingReceiptId === t.id ? "Enviando..." : "Anexar"}
                        <input type="file" className="hidden" accept="application/pdf,image/*"
                          onChange={(e) => e.target.files?.[0] && handleUploadRecibo(t.id, e.target.files[0])} />
                      </label>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem recibo</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredTransactions.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">Nenhuma transação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex justify-between items-center text-sm text-muted-foreground bg-muted/10">
          <p>Mostrando {filteredTransactions.length} de {transactionList.length} transações</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative text-foreground max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <input type="text" required value={newTransaction.descricao} onChange={(e) => setNewTransaction({ ...newTransaction, descricao: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Doação Anônima" />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select value={newTransaction.tipo} onChange={(e) => setNewTransaction({ ...newTransaction, tipo: e.target.value as 'entrada' | 'saida' })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Valor</label>
                <input type="text" required value={newTransaction.valor}
                  onChange={(e) => setNewTransaction({ ...newTransaction, valor: formatCurrencyInputMask(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: 1.500,00" />
              </div>
              <div>
                <label className="text-sm font-medium">Data</label>
                <input type="date" required value={newTransaction.data} onChange={(e) => setNewTransaction({ ...newTransaction, data: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50 text-foreground bg-card">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
