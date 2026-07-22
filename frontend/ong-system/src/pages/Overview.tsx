import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Heart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, LabelList } from "recharts";
import { listarTransacoes, type Transacao } from "../lib/services/transacoes";
import { listarVoluntarios, type Voluntario } from "../lib/services/voluntarios";
import { listarItensAtivosComMenorProgresso, type CampanhaItemResumo } from "../lib/services/campanhaItens";
import { formatBRLWithSymbol } from "../lib/currency";

export default function Overview() {
  const navigate = useNavigate();
  const [itensCampanhas, setItensCampanhas] = useState<CampanhaItemResumo[]>([]);
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [volunteers, setVolunteers] = useState<Voluntario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listarItensAtivosComMenorProgresso(4), listarTransacoes(), listarVoluntarios()])
      .then(([i, t, v]) => {
        setItensCampanhas(i);
        setTransactions(t);
        setVolunteers(v);
      })
      .catch((err) => console.error("Erro ao carregar visão geral:", err))
      .finally(() => setLoading(false));
  }, []);

  const saldoAtual = transactions.reduce(
    (acc, t) => acc + (t.tipo === 'entrada' ? t.valor : -t.valor),
    0,
  );

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const mesAnteriorDate = new Date(anoAtual, mesAtual - 1, 1);

  const transacoesDoMes = (mes: number, ano: number) =>
    transactions.filter((t) => {
      const d = new Date(t.data + 'T00:00:00');
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

  const entradasMesAtual = transacoesDoMes(mesAtual, anoAtual).filter((t) => t.tipo === 'entrada');
  const entradasMesAnterior = transacoesDoMes(mesAnteriorDate.getMonth(), mesAnteriorDate.getFullYear()).filter((t) => t.tipo === 'entrada');

  const totalEntradasMesAtual = entradasMesAtual.reduce((acc, t) => acc + t.valor, 0);
  const totalEntradasMesAnterior = entradasMesAnterior.reduce((acc, t) => acc + t.valor, 0);

  const crescimentoMes = totalEntradasMesAnterior > 0
    ? Math.round(((totalEntradasMesAtual - totalEntradasMesAnterior) / totalEntradasMesAnterior) * 100)
    : null;

  const voluntariosAtivos = volunteers.filter((v) => v.status === 'ativo').length;

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const cashFlowData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anoAtual, mesAtual - i, 1);
    const total = transacoesDoMes(d.getMonth(), d.getFullYear()).reduce(
      (acc, t) => acc + (t.tipo === 'entrada' ? t.valor : -t.valor),
      0,
    );
    cashFlowData.push({ name: monthNames[d.getMonth()], total: Math.round(total) });
  }

  const goalsData = itensCampanhas.map((item) => {
    const label = `${item.campanha_titulo ?? 'Campanha'} · ${item.nome ?? 'Item'}`;
    return {
      name: label.length > 22 ? label.substring(0, 20) + '…' : label,
      current: item.quantidade_atual ?? 0,
      max: item.meta_quantidade ?? 0,
    };
  });

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Carregando visão geral...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Hoje é um ótimo dia para ajudar!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
            <h2 className="text-2xl font-bold mt-1">{formatBRLWithSymbol(saldoAtual)}</h2>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Doações este mês</p>
            <h2 className="text-2xl font-bold mt-1">{entradasMesAtual.length}</h2>
          </div>
          <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
            <Heart className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Voluntários Ativos</p>
            <h2 className="text-2xl font-bold mt-1">{voluntariosAtivos}</h2>
          </div>
          <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-500">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Crescimento (mês)</p>
            {crescimentoMes === null ? (
              <p className="text-sm mt-1 text-muted-foreground">Dados insuficientes</p>
            ) : (
              <h2 className={`text-2xl font-bold mt-1 ${crescimentoMes >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {crescimentoMes >= 0 ? '+' : ''}{crescimentoMes}%
              </h2>
            )}
          </div>
          <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
            {crescimentoMes !== null && crescimentoMes < 0 ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg">Fluxo de Caixa (6 meses)</h3>
            <button onClick={() => navigate("/financeiro")} className="text-sm text-primary font-medium hover:underline">Ver relatórios {">"}</button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a260" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00a260" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} tickFormatter={(val) => `R$ ${val}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <Area type="monotone" dataKey="total" stroke="#00a260" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg">Metas de Doação</h3>
            <button onClick={() => navigate("/campanhas")} className="text-sm text-primary font-medium hover:underline">Ver todas {">"}</button>
          </div>
          <div className="h-[300px]">
            {goalsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma campanha cadastrada ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalsData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                  <BarXAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} />
                  <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#555" }} />
                  <Bar dataKey="current" fill="#e2e8f0" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="current" position="right" fill="#00a260" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
