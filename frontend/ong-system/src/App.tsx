import { useState } from "react";
import { LayoutDashboard, Heart, DollarSign, Users, Settings, LogOut } from "lucide-react";
import Overview from "./pages/Overview";
import Donations from "./pages/Donations";
import Financial from "./pages/Financial";
import Volunteers from "./pages/Volunteers";
import SettingsPage from "./pages/Settings";

function App() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
    { id: "donations", label: "Doações", icon: Heart },
    { id: "financial", label: "Financeiro", icon: DollarSign },
    { id: "volunteers", label: "Voluntários", icon: Users },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r bg-card h-full">
        <div className="p-6 flex items-center gap-2">
          <div className="bg-primary text-white p-1 rounded-md flex items-center justify-center">
            <span className="font-bold text-xs tracking-wider">ONG</span>
          </div>
          <span className="font-semibold text-lg">Sistema</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-[#F8FAFC]">
        <div className="p-8 max-w-7xl mx-auto h-full">
          {activeTab === "overview" && <Overview setActiveTab={setActiveTab} />}
          {activeTab === "donations" && <Donations />}
          {activeTab === "financial" && <Financial />}
          {activeTab === "volunteers" && <Volunteers />}
          {activeTab === "settings" && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
