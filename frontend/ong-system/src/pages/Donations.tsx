import { useState, useEffect } from "react";
import { Package, Filter, Plus, CheckCircle2, Search, X } from "lucide-react";

const campaigns = [
  {
    id: 1,
    title: "Cestas Básicas",
    category: "ALIMENTOS",
    current: 150,
    total: 200,
    unit: "unidades",
    missing: 50,
    progress: 75,
    color: "bg-blue-500",
    statusText: "Falta Arrecadar",
  },
  {
    id: 2,
    title: "Arroz",
    category: "ALIMENTOS",
    current: 500,
    total: 500,
    unit: "kg",
    missing: 0,
    progress: 100,
    color: "bg-primary",
    statusText: "Meta Atingida!",
    isCompleted: true,
  },
  {
    id: 3,
    title: "Leite",
    category: "ALIMENTOS",
    current: 120,
    total: 300,
    unit: "litros",
    missing: 180,
    progress: 40,
    color: "bg-blue-500",
    statusText: "Falta Arrecadar",
  },
  {
    id: 4,
    title: "Roupas de Frio",
    category: "VESTUÁRIO",
    current: 850,
    total: 1000,
    unit: "peças",
    missing: 150,
    progress: 85,
    color: "bg-blue-500",
    statusText: "Falta Arrecadar",
  },
  {
    id: 5,
    title: "Brinquedos",
    category: "INFANTIL",
    current: 200,
    total: 500,
    unit: "unidades",
    missing: 300,
    progress: 40,
    color: "bg-blue-500",
    statusText: "Falta Arrecadar",
  },
  {
    id: 6,
    title: "Kits de Higiene",
    category: "HIGIENE",
    current: 45,
    total: 150,
    unit: "kits",
    missing: 105,
    progress: 30,
    color: "bg-red-500",
    statusText: "Falta Arrecadar",
    isCritical: true,
  },
];

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
  });

  useEffect(() => {
    fetch('http://localhost:3001/api/campaigns')
      .then(res => res.json())
      .then(data => setCampaignList(data))
      .catch(err => console.error("Error fetching campaigns:", err));
  }, []);

  const filteredCampaigns = campaignList.filter(campaign => 
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    };

    fetch('http://localhost:3001/api/campaigns', {
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

      fetch(`http://localhost:3001/api/campaigns/${selectedCampaignForLaunch.id}`, {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas e Doações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe as metas e o que foi doado recentemente.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-48 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col relative">
            {campaign.isCritical && (
              <span className="absolute top-6 right-6 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                CRÍTICO
              </span>
            )}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${campaign.isCompleted ? 'bg-primary/10 text-primary' : 'bg-blue-50 text-blue-500'}`}>
                {campaign.isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
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
                <p className={`font-semibold ${campaign.isCompleted ? 'text-primary' : campaign.isCritical ? 'text-red-500' : 'text-amber-600'}`}>
                  {campaign.isCompleted ? campaign.statusText : `${campaign.missing} ${campaign.unit}`}
                </p>
              </div>
            </div>
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
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative">
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
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Arroz"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select 
                  value={newCampaign.category}
                  onChange={(e) => setNewCampaign({...newCampaign, category: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALIMENTOS">ALIMENTOS</option>
                  <option value="VESTUÁRIO">VESTUÁRIO</option>
                  <option value="INFANTIL">INFANTIL</option>
                  <option value="HIGIENE">HIGIENE</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Atual</label>
                  <input 
                    type="number" 
                    required
                    value={newCampaign.current}
                    onChange={(e) => setNewCampaign({...newCampaign, current: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meta Total</label>
                  <input 
                    type="number" 
                    required
                    value={newCampaign.total}
                    onChange={(e) => setNewCampaign({...newCampaign, total: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Unidade</label>
                <input 
                  type="text" 
                  required
                  value={newCampaign.unit}
                  onChange={(e) => setNewCampaign({...newCampaign, unit: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: kg, unidades"
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

      {/* Launch Modal */}
      {isLaunchModalOpen && selectedCampaignForLaunch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl border shadow-lg relative">
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
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={`Ex: 10 (${selectedCampaignForLaunch.unit})`}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted/50"
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
