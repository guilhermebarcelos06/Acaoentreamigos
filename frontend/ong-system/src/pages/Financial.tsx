import { useState, useEffect } from "react";
import { Plus, Download, Search, Paperclip, FileText, X } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export default function Financial() {
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

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

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const valueNum = parseFloat(newTransaction.value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro & Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Gerencie entradas, saídas e recibos (notas fiscais).</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card">
            <Download className="w-4 h-4" />
            Extrato (Últimos 3 Meses)
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
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
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Histórico de Transações</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar transação..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-64 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
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
            <tbody className="divide-y">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 text-muted-foreground">{t.date}</td>
                  <td className="px-6 py-4 font-medium">{t.description}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'Entrada' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold ${t.type === 'Entrada' ? 'text-primary' : 'text-foreground'}`}>
                    {t.value}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {t.hasReceipt ? (
                      <button 
                        onClick={() => { setSelectedReceipt(t); setIsReceiptModalOpen(true); }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded border border-primary/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver Recibo
                      </button>
                    ) : (
                      <button className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary px-3 py-1.5 rounded border">
                        <Paperclip className="w-3.5 h-3.5" />
                        Anexar
                      </button>
                    )}
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
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative">
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
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Doação Anônima"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select 
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
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
                  onChange={(e) => setNewTransaction({...newTransaction, value: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: 1500,00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data</label>
                <input 
                  type="text" 
                  required
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50"
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

      {/* Receipt Modal */}
      {isReceiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative">
            <button 
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Recibo de Transação</h2>
            <div className="space-y-4 border p-4 rounded-lg bg-muted/10">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Descrição:</span>
                <span className="text-sm font-medium">{selectedReceipt.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Data:</span>
                <span className="text-sm font-medium">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tipo:</span>
                <span className="text-sm font-medium">{selectedReceipt.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="text-sm font-bold text-primary">{selectedReceipt.value}</span>
              </div>
              <div className="border-t pt-4 mt-4 text-center text-xs text-muted-foreground">
                Comprovante fiscal digitalizado.
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
