import { useState, useEffect } from "react";
import { UserPlus, Shield, Pencil, Trash2, X } from "lucide-react";

export default function Settings() {
  const [userList, setUserList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Editor",
  });

  useEffect(() => {
    fetch('http://localhost:3001/api/users')
      .then(res => res.json())
      .then(data => setUserList(data))
      .catch(err => console.error("Error fetching users:", err));
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = newUser.name.charAt(0).toUpperCase() || "U";
    
    const userData = {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      initials: initials,
      roleColor: "bg-primary/10 text-primary"
    };

    fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    .then(res => res.json())
    .then(data => {
      setUserList([...userList, data]);
      setIsModalOpen(false);
      setNewUser({
        name: "",
        email: "",
        role: "Editor",
      });
    })
    .catch(err => console.error("Error adding user:", err));
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      fetch(`http://localhost:3001/api/users/${id}`, {
        method: 'DELETE'
      })
      .then(() => {
        setUserList(userList.filter(user => user.id !== id));
      })
      .catch(err => console.error("Error deleting user:", err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações & Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie quem tem acesso ao sistema da ONG.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Usuário
        </button>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col mt-8">
        <div className="p-6 border-b bg-muted/10 flex gap-4 items-start">
          <div className="mt-0.5 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Usuários do Sistema</h3>
            <p className="text-sm text-muted-foreground">Pessoas com acesso ao painel administrativo.</p>
          </div>
        </div>

        <div className="divide-y">
          {userList.map((user) => (
            <div key={user.id} className="p-4 px-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary text-foreground font-semibold flex items-center justify-center">
                  {user.initials}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{user.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    <span className="text-muted-foreground text-[10px]">•</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${user.roleColor}`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => alert("Funcionalidade de edição não implementada.")}
                  className="p-2 border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors bg-card"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 border rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors bg-card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
            <h2 className="text-xl font-bold mb-4">Adicionar Usuário</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: joao@ong.org"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Função</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Editor">Editor</option>
                </select>
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
    </div>
  );
}
