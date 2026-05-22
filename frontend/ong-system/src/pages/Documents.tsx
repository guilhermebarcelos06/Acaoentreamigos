import { useState, useEffect } from "react";
import { 
  Search, Plus, Download, Trash2, FileText, Calendar, 
  AlertCircle, UploadCloud, X, Eye, FileDigit 
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

interface Documento {
  id: number;
  name: string;
  description: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: string;
  uploadDate: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  
  // Form States
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load documents
  const loadDocuments = () => {
    fetch(`${API_BASE_URL}/api/documents`)
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar documentos");
        return res.json();
      })
      .then(data => setDocuments(data))
      .catch(err => console.error("Error fetching documents:", err));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Format date helper to human friendly strings
  const formatDateGroup = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dateObj.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
  };

  // Upload handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Por favor, selecione um arquivo.");
      return;
    }
    if (!newName.trim()) {
      setErrorMessage("Por favor, insira o nome do documento.");
      return;
    }

    setUploading(true);
    setErrorMessage("");
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", newName);
    formData.append("description", newDescription);

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao realizar upload do arquivo.");
      }

      setSuccessMessage("Documento enviado com sucesso!");
      setNewName("");
      setNewDescription("");
      setSelectedFile(null);
      
      // Auto close modal after a brief delay and refresh list
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage("");
        loadDocuments();
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || "Erro na conexão com o servidor.");
    } finally {
      setUploading(false);
    }
  };

  // Delete handler
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir arquivo.");

      setIsDeletingId(null);
      loadDocuments();
    } catch (err) {
      console.error(err);
      alert("Falha ao excluir o documento.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension !== 'pdf' && extension !== 'doc' && extension !== 'docx') {
        setErrorMessage("Tipo de arquivo inválido. Apenas PDF e Word (.doc, .docx) são permitidos.");
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setErrorMessage("");
      
      // Auto fill name if empty
      if (!newName) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setNewName(nameWithoutExt);
      }
    }
  };

  // Filters
  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by upload date YYYY-MM-DD
  const groupedDocs = filteredDocs.reduce((acc: Record<string, Documento[]>, doc) => {
    const dateKey = doc.uploadDate.substring(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(doc);
    return acc;
  }, {});

  // Sort dates descending
  const sortedDateKeys = Object.keys(groupedDocs).sort((a, b) => b.localeCompare(a));

  // Compute stats
  const totalCount = documents.length;
  const pdfCount = documents.filter(d => d.mimeType.toLowerCase().includes("pdf") || d.fileName.endsWith(".pdf")).length;
  const wordCount = documents.filter(d => 
    d.mimeType.toLowerCase().includes("word") || 
    d.mimeType.toLowerCase().includes("officedocument") || 
    d.fileName.endsWith(".doc") || 
    d.fileName.endsWith(".docx")
  ).length;

  // Helper to identify document type styling
  const getDocTypeInfo = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return {
        color: "bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/30",
        iconColor: "text-red-500",
        label: "PDF",
        badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      };
    } else {
      return {
        color: "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-900/30",
        iconColor: "text-blue-500",
        label: "Word",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
      };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos & Arquivos</h1>
          <p className="text-sm text-muted-foreground mt-1">Anexe, armazene e acesse atas, relatórios e arquivos oficiais da ONG.</p>
        </div>
        <button 
          onClick={() => {
            setIsModalOpen(true);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Anexar Documento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <FolderOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Arquivos</p>
            <h2 className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</h2>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Arquivos PDF</p>
            <h2 className="text-2xl font-bold text-foreground mt-0.5">{pdfCount}</h2>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
            <FileDigit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documentos Word</p>
            <h2 className="text-2xl font-bold text-foreground mt-0.5">{wordCount}</h2>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-card border rounded-2xl shadow-xs p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por nome do documento ou descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 border rounded-xl text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">
          {filteredDocs.length} de {totalCount} documento{totalCount !== 1 ? 's' : ''} encontrado{filteredDocs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main documents listing split by upload date */}
      {sortedDateKeys.length > 0 ? (
        <div className="space-y-8">
          {sortedDateKeys.map(dateKey => {
            const dateDocs = groupedDocs[dateKey];
            const dateLabel = formatDateGroup(dateDocs[0].uploadDate);
            
            return (
              <div key={dateKey} className="space-y-3">
                {/* Date Group Header */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold pl-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{dateLabel}</span>
                  <span className="text-xs font-normal text-muted-foreground/70">
                    ({dateDocs.length} arquivo{dateDocs.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Documents Cards Container */}
                <div className="grid grid-cols-1 gap-3">
                  {dateDocs.map(doc => {
                    const docInfo = getDocTypeInfo(doc.fileName);
                    
                    return (
                      <div 
                        key={doc.id}
                        className="bg-card border hover:border-primary/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-xs group"
                      >
                        {/* File details */}
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${docInfo.color}`}>
                            <FileText className="w-5.5 h-5.5" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight truncate">
                                {doc.name}
                              </h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${docInfo.badge}`}>
                                {docInfo.label}
                              </span>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {doc.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 mt-1">
                              <span className="font-medium">{doc.fileSize}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="truncate">Arq: {doc.originalName}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 hidden sm:inline" />
                              <span className="hidden sm:inline">
                                Upload: {new Date(doc.uploadDate).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* File Action buttons */}
                        <div className="flex items-center justify-end gap-2 border-t md:border-none pt-3 md:pt-0">
                          {/* Viewer for PDF */}
                          {doc.fileName.endsWith('.pdf') && (
                            <a 
                              href={`${API_BASE_URL}/uploads/${doc.fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Visualizar Documento"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </a>
                          )}
                          
                          {/* Direct download */}
                          <a 
                            href={`${API_BASE_URL}/uploads/${doc.fileName}`}
                            download={doc.originalName}
                            className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl hover:bg-muted font-medium text-xs text-muted-foreground hover:text-foreground transition-colors bg-card"
                            title="Fazer Download"
                          >
                            <Download className="w-4 h-4" />
                            Baixar
                          </a>

                          {/* Delete button */}
                          <button 
                            onClick={() => setIsDeletingId(doc.id)}
                            className="p-2 border border-red-100 hover:border-red-200 dark:border-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-red-500 transition-colors"
                            title="Excluir Documento"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
            <FolderOpenIcon className="w-8 h-8" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Nenhum documento anexado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm 
              ? "Nenhum arquivo corresponde à sua pesquisa. Tente buscar por outros termos." 
              : "Comece anexando atas de reuniões, estatutos, formulários ou relatórios oficiais da ONG."}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-5 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Anexar Primeiro Arquivo
            </button>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
          <div 
            className="bg-card w-full max-w-lg p-6 rounded-2xl border shadow-xl relative text-foreground flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                if (!uploading) setIsModalOpen(false);
              }}
              disabled={uploading}
              className="absolute top-4 right-4 p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-xl font-bold mb-1">Anexar Novo Documento</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Armazene documentos oficiais no formato Word ou PDF de até 10MB.
            </p>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File input drop zone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivo</label>
                <div className="relative border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-muted/10 group">
                  <input 
                    type="file" 
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 px-4">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                        <p className="text-xs text-muted-foreground">Apenas PDF ou Word (.doc, .docx)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Documento</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Ata da Assembleia Geral 2026"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição / Notas (Opcional)</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva brevemente o conteúdo ou objetivo deste arquivo..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 resize-none"
                />
              </div>

              {/* Status Feedbacks */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 text-red-500 border border-red-200/50 dark:border-red-950/20 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="font-medium leading-normal">{errorMessage}</p>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2.5 p-3.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <p className="font-semibold">{successMessage}</p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted text-foreground bg-card transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-70"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Anexando...
                    </>
                  ) : (
                    "Salvar Documento"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Premium Interface) */}
      {isDeletingId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-xl text-center relative text-foreground">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <h3 className="font-bold text-lg text-foreground">Excluir Documento?</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
              Esta ação é permanente e removerá fisicamente o arquivo do servidor. Você tem certeza de que deseja prosseguir?
            </p>

            <div className="flex gap-3 mt-6 justify-center">
              <button 
                onClick={() => setIsDeletingId(null)}
                className="px-4 py-2 border rounded-xl font-medium text-xs text-muted-foreground hover:bg-muted transition-colors bg-card"
              >
                Voltar
              </button>
              <button 
                onClick={() => handleDelete(isDeletingId)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon fallbacks if FolderOpen is missing
function FolderOpenIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 14h12v6H6z" />
      <path d="M19 6H9L7 3H3v11h18V8a2 2 0 0 0-2-2z" />
    </svg>
  );
}
