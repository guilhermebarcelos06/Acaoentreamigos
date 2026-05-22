import { useState, useEffect } from "react";
import { Plus, Download, Search, X } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { jsPDF } from "jspdf";

export default function Financial() {
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newTransaction, setNewTransaction] = useState({
    description: "",
    type: "Entrada",
    value: "",
    date: new Date().toLocaleDateString('pt-BR'),
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/transactions`)
      .then(res => res.json())
      .then(data => setTransactionList(data))
      .catch(err => console.error("Error fetching transactions:", err));
  }, []);

  const filteredTransactions = transactionList.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Máscara monetária em tempo real no padrão pt-BR (ex: 1.500,00)
  const formatCurrencyMask = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseFloat(digits) / 100;
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    // Conversão robusta do valor formatado em Real para número float JavaScript
    const rawValue = newTransaction.value.replace(/\./g, "").replace(",", ".");
    const valueNum = parseFloat(rawValue) || 0;
    const formattedValue = `${newTransaction.type === 'Entrada' ? '+' : '-'} R$ ${valueNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    const transactionData = {
      date: newTransaction.date,
      description: newTransaction.description,
      type: newTransaction.type,
      value: formattedValue,
      hasReceipt: false
    };

    fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    })
    .then(res => res.json())
    .then(data => {
      setTransactionList([data, ...transactionList]);
      setIsModalOpen(false);
      setNewTransaction({
        description: "",
        type: "Entrada",
        value: "",
        date: new Date().toLocaleDateString('pt-BR'),
      });
    })
    .catch(err => console.error("Error adding transaction:", err));
  };

  // Parser robusto de datas DD/MM/AAAA para cálculo do extrato de 3 meses
  const parseDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateStr);
  };

  // Geração do PDF dos Últimos 3 Meses utilizando jsPDF
  const gerarExtratoPDF = () => {
    const doc = new jsPDF();
    const today = new Date();
    
    // Calcula o prazo dos últimos 3 meses
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);

    // Filtra transações correspondentes
    const last3MonthsTrans = transactionList.filter(t => {
      const tDate = parseDDMMYYYY(t.date);
      return tDate >= threeMonthsAgo;
    });

    // Ordenação cronológica (da mais antiga para a mais recente)
    const sortedTrans = [...last3MonthsTrans].sort((a, b) => {
      return parseDDMMYYYY(a.date).getTime() - parseDDMMYYYY(b.date).getTime();
    });

    // Cabeçalho e logotipo do PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Cor verde-primária da ONG
    doc.text("Ação Entre Amigos", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Relatório Oficial de Transações - Fluxo de Caixa (Últimos 3 Meses)", 14, 26);

    // Divisor
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 30, 196, 30);

    // Cálculos de soma
    let totalIn = 0;
    let totalOut = 0;
    sortedTrans.forEach(t => {
      const val = parseFloat(t.value.replace(/\./g, '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      if (t.type === 'Entrada') {
        totalIn += val;
      } else {
        totalOut += val;
      }
    });
    const balance = totalIn - totalOut;

    // Retângulo do resumo do período
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 35, 182, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("RESUMO FINANCEIRO DO PERÍODO", 18, 41);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total de Entradas: R$ ${totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 48);
    doc.text(`Total de Saídas: R$ ${totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, 54);

    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Final Líquido: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 120, 48);
    doc.setFont("helvetica", "normal");
    doc.text(`Transações Registradas: ${sortedTrans.length}`, 120, 54);

    // Cabeçalho da Tabela
    doc.setFillColor(16, 185, 129); // Verde principal
    doc.rect(14, 66, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("DATA", 16, 71);
    doc.text("DESCRIÇÃO", 40, 71);
    doc.text("TIPO", 130, 71);
    doc.text("VALOR", 160, 71);

    // Linhas da Tabela
    let y = 81;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    sortedTrans.forEach((t, index) => {
      // Verificação de quebra de página
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

      // Fundo listrado alternado
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 5, 182, 7.5, "F");
      }

      doc.text(t.date, 16, y);
      
      // Limitação no tamanho da descrição para evitar overlap
      let desc = t.description;
      if (desc.length > 45) {
        desc = desc.substring(0, 42) + "...";
      }
      doc.text(desc, 40, y);
      doc.text(t.type, 130, y);

      // Coloração dinâmica verde (entrada) / vermelha (saída)
      if (t.type === 'Entrada') {
        doc.setTextColor(22, 163, 74);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(t.value, 160, y);
      doc.setTextColor(51, 65, 85); // Reseta a cor para cinza padrão

      y += 8;
    });

    // Rodapé do PDF
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Documento emitido digitalmente em ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`, 14, 290);

    doc.save("extrato-3-meses.pdf");
  };

  const totalEntradas = transactionList
    .filter(t => t.type === 'Entrada')
    .reduce((acc, t) => {
      const valueNum = parseFloat(t.value.replace(/\./g, '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      return acc + valueNum;
    }, 0);

  const totalSaidas = transactionList
    .filter(t => t.type === 'Saída')
    .reduce((acc, t) => {
      const valueNum = parseFloat(t.value.replace(/\./g, '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      return acc + valueNum;
    }, 0);

  const saldoProjetado = totalEntradas - totalSaidas;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro & Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Gerencie entradas, saídas e recibos (notas fiscais).</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={gerarExtratoPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground"
          >
            <Download className="w-4 h-4" />
            Extrato (Últimos 3 Meses)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Entradas (Mês)</p>
          <h2 className="text-2xl font-bold text-primary">+ R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Saídas (Mês)</p>
          <h2 className="text-2xl font-bold text-red-500">- R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Saldo Projetado</p>
          <h2 className="text-2xl font-bold text-foreground">R$ {saldoProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <h3 className="font-semibold text-lg text-foreground">Histórico de Transações</h3>
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar transação..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full sm:w-64 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
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
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 text-muted-foreground">{t.date}</td>
                  <td className="px-6 py-4 font-medium">{t.description}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'Entrada' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold ${t.type === 'Entrada' ? 'text-primary' : 'text-foreground'}`}>
                    {t.value}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground text-xs italic font-medium">
                    Recibo (em manutenção)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex justify-between items-center text-sm text-muted-foreground bg-muted/10">
          <p>Mostrando 1-{filteredTransactions.length} de {filteredTransactions.length} transações</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded bg-card hover:bg-muted/50 disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 border rounded bg-card hover:bg-muted/50" disabled>Próxima</button>
          </div>
        </div>
      </div>

      {/* New Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative text-foreground">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <input 
                  type="text" 
                  required
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Doação Anônima"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select 
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Entrada">Entrada</option>
                  <option value="Saída">Saída</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Valor</label>
                <input 
                  type="text" 
                  required
                  value={newTransaction.value}
                  onChange={(e) => {
                    const formatted = formatCurrencyMask(e.target.value);
                    setNewTransaction({...newTransaction, value: formatted});
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 1.500,00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data</label>
                <input 
                  type="text" 
                  required
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50 text-foreground bg-card"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

