import { useState, useEffect } from "react";
import { Package, Plus, Minus, CheckCircle2, Search, X, Calendar, AlertTriangle, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export default function Donations() {
  const [campaignList, setCampaignList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedCampaignForLaunch, setSelectedCampaignForLaunch] = useState<any>(null);
  const [launchAmount, setLaunchAmount] = useState("");
  
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    category: "ALIMENTOS",
    current: "",
    total: "",
    unit: "unidades",
    deadline: "",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/campaigns`)
      .then(res => res.json())
      .then(data => setCampaignList(data))
      .catch(err => console.error("Error fetching campaigns:", err));
  }, []);

  const filteredCampaigns = campaignList.filter(campaign => 
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRemainingDays = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const deadlineDate = new Date(deadlineStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const currentNum = parseInt(newCampaign.current) || 0;
    const totalNum = parseInt(newCampaign.total) || 0;
    const progress = totalNum > 0 ? Math.round((currentNum / totalNum) * 100) : 0;
    
    const colors = ["bg-blue-500", "bg-primary", "bg-red-500", "bg-amber-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const campaignData = {
      title: newCampaign.title,
      category: newCampaign.category,
      current: currentNum,
      total: totalNum,
      unit: newCampaign.unit,
      missing: Math.max(0, totalNum - currentNum),
      progress: progress,
      color: currentNum >= totalNum ? "bg-primary" : randomColor,
      statusText: currentNum >= totalNum ? "Meta Atingida!" : "Falta Arrecadar",
      isCompleted: currentNum >= totalNum,
      isCritical: currentNum < totalNum && (currentNum / totalNum) < 0.3,
      deadline: newCampaign.deadline || null,
    };

    fetch(`${API_BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    })
    .then(res => res.json())
    .then(data => {
      setCampaignList([...campaignList, data]);
      setIsModalOpen(false);
      setNewCampaign({
        title: "",
        category: "ALIMENTOS",
        current: "",
        total: "",
        unit: "unidades",
        deadline: "",
      });
    })
    .catch(err => console.error("Error adding campaign:", err));
  };

  const handleLaunchDonation = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(launchAmount) || 0;
    if (selectedCampaignForLaunch) {
      const updatedCampaign = {
        ...selectedCampaignForLaunch,
        current: selectedCampaignForLaunch.current + amountNum,
        missing: Math.max(0, selectedCampaignForLaunch.total - (selectedCampaignForLaunch.current + amountNum)),
        progress: Math.round(((selectedCampaignForLaunch.current + amountNum) / selectedCampaignForLaunch.total) * 100),
        isCompleted: (selectedCampaignForLaunch.current + amountNum) >= selectedCampaignForLaunch.total,
        statusText: (selectedCampaignForLaunch.current + amountNum) >= selectedCampaignForLaunch.total ? "Meta Atingida!" : "Falta Arrecadar"
      };

      fetch(`${API_BASE_URL}/api/campaigns/${selectedCampaignForLaunch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCampaign)
      })
      .then(res => res.json())
      .then(data => {
        setCampaignList(campaignList.map(c => c.id === data.id ? data : c));
        setIsLaunchModalOpen(false);
        setLaunchAmount("");
      })
      .catch(err => console.error("Error launching donation:", err));
    }
  };

  const handleIncrementCurrent = () => {
    const val = parseInt(newCampaign.current) || 0;
    setNewCampaign({ ...newCampaign, current: (val + 1).toString() });
  };

  const handleDecrementCurrent = () => {
    const val = parseInt(newCampaign.current) || 0;
    setNewCampaign({ ...newCampaign, current: Math.max(0, val - 1).toString() });
  };

  const handleIncrementTotal = () => {
    const val = parseInt(newCampaign.total) || 0;
    setNewCampaign({ ...newCampaign, total: (val + 1).toString() });
  };

  const handleDecrementTotal = () => {
    const val = parseInt(newCampaign.total) || 0;
    setNewCampaign({ ...newCampaign, total: Math.max(0, val - 1).toString() });
  };

  // Filtrar campanhas ativas e com prazo para alertas de urgência
  const activeCampaignsWithDeadline = campaignList.filter(c => {
    const isCompleted = c.isCompleted || c.current >= c.total;
    return !isCompleted && c.deadline;
  });

  const redCampaigns = activeCampaignsWithDeadline.filter(c => {
    const days = getRemainingDays(c.deadline);
    return days !== null && days <= 7;
  });

  const yellowCampaigns = activeCampaignsWithDeadline.filter(c => {
    const days = getRemainingDays(c.deadline);
    return days !== null && days > 7 && days <= 14;
  });

  return (
    <div className="space-y-6 font-sans text-foreground">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas e Doações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe as metas e o que foi doado recentemente.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full sm:w-48 bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>
      </div>

      {/* Alertas de Prazos Próximos / Críticos */}
      {(redCampaigns.length > 0 || yellowCampaigns.length > 0) && (
        <div className="space-y-3">
          {redCampaigns.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 dark:border-red-950/50 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 shadow-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">Alerta Crítico: Campanhas com prazo urgente ou vencido!</h4>
                <p className="text-xs mt-1">
                  As seguintes campanhas estão a menos de 1 semana do prazo ou já venceram e precisam de doações:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {redCampaigns.map(c => {
                    const days = getRemainingDays(c.deadline);
                    const formattedDate = new Date(c.deadline + "T00:00:00").toLocaleDateString('pt-BR');
                    return (
                      <span 
                        key={c.id} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900"
                      >
                        <Calendar className="w-3 h-3" />
                        {c.title}: {formattedDate} ({days !== null && days < 0 ? `Vencida há ${Math.abs(days)}d` : days === 0 ? "Vence hoje!" : `Falta apenas ${days}d`})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {yellowCampaigns.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-950/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 shadow-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-sm">Atenção: Campanhas se aproximando do prazo limite</h4>
                <p className="text-xs mt-1">
                  As seguintes campanhas estão a menos de 2 semanas do prazo final e necessitam de engajamento:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {yellowCampaigns.map(c => {
                    const days = getRemainingDays(c.deadline);
                    const formattedDate = new Date(c.deadline + "T00:00:00").toLocaleDateString('pt-BR');
                    return (
                      <span 
                        key={c.id} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                      >
                        <Calendar className="w-3 h-3" />
                        {c.title}: {formattedDate} (Faltam {days}d)
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => {
          const days = getRemainingDays(campaign.deadline);
          const isCompleted = campaign.isCompleted || campaign.current >= campaign.total;
          
          let borderStyle = "border-border";
          let alertLabel = null;
          
          if (!isCompleted && days !== null) {
            if (days <= 7) {
              borderStyle = "border-red-500/40 dark:border-red-500/20 ring-1 ring-red-500/20";
              alertLabel = (
                <span className="absolute top-6 right-6 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-950/50 px-2 py-1 rounded border border-red-200 dark:border-red-900">
                  {days < 0 ? "VENCIDO" : "CRÍTICO"}
                </span>
              );
            } else if (days <= 14) {
              borderStyle = "border-amber-500/40 dark:border-amber-500/20 ring-1 ring-amber-500/20";
              alertLabel = (
                <span className="absolute top-6 right-6 text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-950/50 px-2 py-1 rounded border border-amber-200 dark:border-amber-900">
                  ATENÇÃO
                </span>
              );
            }
          }
          
          if (!alertLabel && campaign.isCritical) {
            alertLabel = (
              <span className="absolute top-6 right-6 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                CRÍTICO
              </span>
            );
          }

          return (
            <div key={campaign.id} className={`bg-card border rounded-2xl p-6 shadow-sm flex flex-col relative transition-all duration-300 hover:shadow-md ${borderStyle}`}>
              {alertLabel}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-primary/10 text-primary' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-500'}`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold">{campaign.title}</h3>
                  <p className="text-xs text-muted-foreground font-medium tracking-wider">{campaign.category}</p>
                </div>
              </div>

              <div className="mb-2 flex justify-between items-end">
                <div>
                  <span className="text-2xl font-bold">{campaign.current}</span>
                  <span className="text-sm text-muted-foreground ml-1">{campaign.unit}</span>
                </div>
                <span className="text-sm font-semibold">{campaign.progress}%</span>
              </div>

              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mb-6">
                <div className={`h-full ${campaign.color} rounded-full`} style={{ width: `${campaign.progress}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-xs mt-auto pt-4 border-t border-dashed">
                <div>
                  <p className="text-muted-foreground">Meta Total</p>
                  <p className="font-medium text-foreground">{campaign.total} {campaign.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">{campaign.statusText}</p>
                  <p className={`font-semibold ${isCompleted ? 'text-primary' : campaign.isCritical ? 'text-red-500' : 'text-amber-600'}`}>
                    {isCompleted ? campaign.statusText : `${campaign.missing} ${campaign.unit}`}
                  </p>
                </div>
              </div>

              {campaign.deadline && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground border-t border-dashed pt-3">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    Prazo: <strong>{new Date(campaign.deadline + "T00:00:00").toLocaleDateString('pt-BR')}</strong>
                    {(() => {
                      if (isCompleted) return <span className="text-primary ml-1.5 font-medium">(Meta Atingida)</span>;
                      if (days === null) return null;
                      if (days < 0) {
                        return <span className="text-red-500 font-bold ml-1.5">(Vencido há {Math.abs(days)}d)</span>;
                      } else if (days === 0) {
                        return <span className="text-red-500 font-bold ml-1.5">(Vence hoje!)</span>;
                      } else if (days <= 7) {
                        return <span className="text-red-500 font-bold ml-1.5">({days}d restantes)</span>;
                      } else if (days <= 14) {
                        return <span className="text-amber-500 font-semibold ml-1.5">({days}d restantes)</span>;
                      } else {
                        return <span className="text-muted-foreground ml-1.5">({days}d restantes)</span>;
                      }
                    })()}
                  </span>
                </div>
              )}

              <div className="mt-4 flex justify-end border-t pt-3">
                <button 
                  onClick={() => { setSelectedCampaignForLaunch(campaign); setIsLaunchModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded border border-primary/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lançar Doação
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative text-foreground max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Nova Meta de Doação</h2>
            <form onSubmit={handleAddCampaign} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <input 
                  type="text" 
                  required
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder="Ex: Arroz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select 
                  value={newCampaign.category}
                  onChange={(e) => setNewCampaign({...newCampaign, category: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="ALIMENTOS">ALIMENTOS</option>
                  <option value="VESTUÁRIO">VESTUÁRIO</option>
                  <option value="INFANTIL">INFANTIL</option>
                  <option value="HIGIENE">HIGIENE</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Campo Atual com +/- */}
                <div>
                  <label className="text-sm font-medium">Atual</label>
                  <div className="flex items-center mt-1">
                    <button
                      type="button"
                      onClick={handleDecrementCurrent}
                      className="px-3 py-2 border border-r-0 rounded-l-md hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center h-[38px] bg-card border-border"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number" 
                      required
                      value={newCampaign.current}
                      onChange={(e) => setNewCampaign({...newCampaign, current: e.target.value})}
                      className="w-full px-2 py-2 border rounded-none text-center text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-[38px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-border"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={handleIncrementCurrent}
                      className="px-3 py-2 border border-l-0 rounded-r-md hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center h-[38px] bg-card border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Campo Meta Total com +/- */}
                <div>
                  <label className="text-sm font-medium">Meta Total</label>
                  <div className="flex items-center mt-1">
                    <button
                      type="button"
                      onClick={handleDecrementTotal}
                      className="px-3 py-2 border border-r-0 rounded-l-md hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center h-[38px] bg-card border-border"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      type="number" 
                      required
                      value={newCampaign.total}
                      onChange={(e) => setNewCampaign({...newCampaign, total: e.target.value})}
                      className="w-full px-2 py-2 border rounded-none text-center text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-[38px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-border"
                      placeholder="100"
                    />
                    <button
                      type="button"
                      onClick={handleIncrementTotal}
                      className="px-3 py-2 border border-l-0 rounded-r-md hover:bg-muted text-muted-foreground transition-colors flex items-center justify-center h-[38px] bg-card border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <input 
                  type="text" 
                  required
                  value={newCampaign.unit}
                  onChange={(e) => setNewCampaign({...newCampaign, unit: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder="Ex: kg, unidades"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prazo Limite</label>
                <input 
                  type="date" 
                  value={newCampaign.deadline}
                  onChange={(e) => setNewCampaign({...newCampaign, deadline: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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

      {/* Launch Modal */}
      {isLaunchModalOpen && selectedCampaignForLaunch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative text-foreground max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsLaunchModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2">Lançar Doação</h2>
            <p className="text-sm text-muted-foreground mb-4">Adicionar progresso para: <span className="font-semibold text-foreground">{selectedCampaignForLaunch.title}</span></p>
            <form onSubmit={handleLaunchDonation} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantidade / Valor</label>
                <input 
                  type="number" 
                  required
                  value={launchAmount}
                  onChange={(e) => setLaunchAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  placeholder={`Ex: 10 (${selectedCampaignForLaunch.unit})`}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50 text-foreground bg-card"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
                >
                  Lançar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
