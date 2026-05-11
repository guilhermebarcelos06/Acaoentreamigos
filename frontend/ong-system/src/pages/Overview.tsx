import { useState, useEffect } from "react";
import { Wallet, Heart, Users, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, LabelList } from "recharts";

export default function Overview({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/campaigns').then(res => res.json()),
      fetch('http://localhost:3001/api/transactions').then(res => res.json()),
      fetch('http://localhost:3001/api/volunteers').then(res => res.json())
    ]).then(([campaignsData, transactionsData, volunteersData]) => {
      setCampaigns(campaignsData);
      setTransactions(transactionsData);
      setVolunteers(volunteersData);
    }).catch(err => console.error("Error fetching overview data:", err));
  }, []);

  const saldoAtual = transactions.reduce((acc, t) => {
    const valueNum = parseFloat(t.value.replace(/\./g, '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
    return acc + (t.type === 'Entrada' ? valueNum : -valueNum);
  }, 0);

  const doacoesMes = transactions.filter(t => t.type === 'Entrada').length;
  const voluntariosAtivos = volunteers.filter(v => v.status === 'Ativo').length;

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const cashFlowData = [];
  const hardcodedDefaults = [2000, 3000, 2500, 3500, 4000, 4500];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const mName = monthNames[d.getMonth()];
    const mIndex = d.getMonth() + 1; // 1-indexed
    const year = d.getFullYear();

    // Sum transactions for this month
    const monthTransactions = transactions.filter(t => {
      const tDate = t.date.split('/'); // DD/MM/YYYY
      return parseInt(tDate[1]) === mIndex && parseInt(tDate[2]) === year;
    });

    const total = monthTransactions.reduce((acc, t) => {
      const valueNum = parseFloat(t.value.replace(/\./g, '').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      return acc + (t.type === 'Entrada' ? valueNum : -valueNum);
    }, 0);

    const defaultValue = hardcodedDefaults[5 - i];
    
    cashFlowData.push({
      name: mName,
      total: monthTransactions.length > 0 ? Math.round(total) : defaultValue
    });
  }

  const goalsData = campaigns.slice(0, 4).map(c => ({
    name: c.title.substring(0, 10),
    current: c.current,
    max: c.total
  }));
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Hoje é um ótimo dia para ajudar!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
            <h2 className="text-2xl font-bold mt-1">R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Doações este mês</p>
            <h2 className="text-2xl font-bold mt-1">{doacoesMes}</h2>
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
            <h2 className="text-2xl font-bold mt-1 text-primary">+14%</h2>
          </div>
          <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg">Fluxo de Caixa (6 meses)</h3>
            <button onClick={() => setActiveTab("financial")} className="text-sm text-primary font-medium hover:underline">Ver relatórios {">"}</button>
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
            <button onClick={() => setActiveTab("donations")} className="text-sm text-primary font-medium hover:underline">Ver todas {">"}</button>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={goalsData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <BarXAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#888" }} domain={[0, 600]} />
                <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#555" }} />
                <Bar dataKey="current" fill="#e2e8f0" radius={[0, 4, 4, 0]}>
                  {/* Overlaying actual value as a trick or just simple bar, we'll use a single bar with the value label */}
                  <LabelList dataKey="current" position="right" fill="#00a260" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
