import { useState, useEffect } from "react";
import { Search, ExternalLink, Link2, Users, CalendarDays, Mail } from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export default function Volunteers() {
  const [volunteerList, setVolunteerList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/volunteers`)
      .then(res => res.json())
      .then(data => setVolunteerList(data))
      .catch(err => console.error("Error fetching volunteers:", err));
  }, []);

  const filteredVolunteers = volunteerList.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.skills.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Voluntários</h1>
          <p className="text-sm text-muted-foreground mt-1">Dados sincronizados automaticamente com o Google Forms de Inscrição.</p>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Users className="w-4 h-4" />
              32 Ativos
            </div>
            <div className="flex items-center gap-2 text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">
              <CalendarDays className="w-4 h-4" />
              5 Novos este mês
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={() => alert("Abrindo link do formulário...")}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-medium text-sm hover:bg-muted/50 transition-colors bg-card text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Formulário
          </button>
          <button 
            onClick={() => alert("Funcionalidade para vincular novo formulário.")}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            Vincular Form
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col mt-8">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar voluntário por nome ou habilidade.." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-6 py-4 font-medium">NOME & CONTATO</th>
                <th className="px-6 py-4 font-medium">HABILIDADES / INTERESSE</th>
                <th className="px-6 py-4 font-medium">STATUS</th>
                <th className="px-6 py-4 font-medium">DATA DE INSCRIÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredVolunteers.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{v.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="w-3 h-3" />
                      {v.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{v.skills}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium 
                      ${v.status === 'Ativo' ? 'bg-primary/10 text-primary' : 
                        v.status === 'Inativo' ? 'bg-secondary text-muted-foreground' : 
                        'bg-amber-100 text-amber-700'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {v.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
