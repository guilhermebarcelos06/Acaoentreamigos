import { useState, useEffect } from "react";
import {
  Search, Plus, Download, Trash2, FileText, Calendar,
  AlertCircle, UploadCloud, X, Eye, FileDigit, FolderOpen
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  listarDocumentos,
  enviarDocumento,
  excluirDocumento,
  urlAssinadaDocumento,
  type Documento,
} from "../lib/services/documentos";

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDocuments = () => {
    setLoading(true);
    listarDocumentos().then(setDocuments).catch((err) => console.error("Erro ao carregar documentos:", err)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const formatDateGroup = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return "Sem data de upload";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dateObj.toDateString() === today.toDateString()) return "Hoje";
    if (dateObj.toDateString() === yesterday.toDateString()) return "Ontem";
    return dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return setErrorMessage("Por favor, selecione um arquivo.");
    if (!newName.trim()) return setErrorMessage("Por favor, insira o nome do documento.");
    if (!user) return;

    setUploading(true);
    setErrorMessage("");
    try {
      await enviarDocumento({ nome: newName, descricao: newDescription, arquivo: selectedFile, enviadoPor: user.id });
      setSuccessMessage("Documento enviado com sucesso!");
      setNewName("");
      setNewDescription("");
      setSelectedFile(null);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage("");
        loadDocuments();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao realizar upload do arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documento: Documento) => {
    try {
      await excluirDocumento(documento);
      setIsDeletingId(null);
      loadDocuments();
    } catch (err) {
      console.error(err);
      alert("Falha ao excluir o documento.");
    }
  };

  const handleAbrir = async (path: string) => {
    try {
      const url = await urlAssinadaDocumento(path);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar link do documento.");
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
      if (!newName) {
        setNewName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    }
  };

  const filteredDocs = documents.filter((doc) =>
    (doc.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.nome_original || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedDocs = filteredDocs.reduce((acc: Record<string, Documento[]>, doc) => {
    const dateKey = doc.criado_em ? doc.criado_em.substring(0, 10) : "Sem Data";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(doc);
    return acc;
  }, {});

  const sortedDateKeys = Object.keys(groupedDocs).sort((a, b) => b.localeCompare(a));

  const totalCount = documents.length;
  const pdfCount = documents.filter((d) => d.mime_type.toLowerCase().includes("pdf") || d.nome_original.endsWith(".pdf")).length;
  const wordCount = documents.filter((d) =>
    d.mime_type.toLowerCase().includes("word") ||
    d.mime_type.toLowerCase().includes("officedocument") ||
    d.nome_original.endsWith(".doc") ||
    d.nome_original.endsWith(".docx")
  ).length;

  const getDocTypeInfo = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return { color: "bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/30", label: "PDF", badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" };
    }
    return { color: "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-900/30", label: "Word", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" };
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos & Arquivos</h1>
          <p className="text-sm text-muted-foreground mt-1">Anexe, armazene e acesse atas, relatórios e arquivos oficiais da ONG.</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setErrorMessage(""); setSuccessMessage(""); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
          <Plus className="w-4 h-4" /> Anexar Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><FolderOpen className="w-6 h-6" /></div>
          <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Arquivos</p><h2 className="text-2xl font-bold text-foreground mt-0.5">{totalCount}</h2></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6" /></div>
          <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Arquivos PDF</p><h2 className="text-2xl font-bold text-foreground mt-0.5">{pdfCount}</h2></div>
        </div>
        <div className="bg-card p-5 rounded-2xl border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0"><FileDigit className="w-6 h-6" /></div>
          <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documentos Word</p><h2 className="text-2xl font-bold text-foreground mt-0.5">{wordCount}</h2></div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-xs p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nome do documento ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 border rounded-xl text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </div>
        <div className="text-xs text-muted-foreground font-medium self-end sm:self-center">{filteredDocs.length} de {totalCount} documento{totalCount !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Carregando documentos...</div>
      ) : sortedDateKeys.length > 0 ? (
        <div className="space-y-8">
          {sortedDateKeys.map((dateKey) => {
            const dateDocs = groupedDocs[dateKey];
            return (
              <div key={dateKey} className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold pl-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{formatDateGroup(dateDocs[0].criado_em)}</span>
                  <span className="text-xs font-normal text-muted-foreground/70">({dateDocs.length} arquivo{dateDocs.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {dateDocs.map((doc) => {
                    const docInfo = getDocTypeInfo(doc.nome_original);
                    return (
                      <div key={doc.id} className="bg-card border hover:border-primary/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-xs group">
                        <div className="flex items-start gap-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${docInfo.color}`}><FileText className="w-5.5 h-5.5" /></div>
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight truncate">{doc.nome}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${docInfo.badge}`}>{docInfo.label}</span>
                            </div>
                            {doc.descricao && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{doc.descricao}</p>}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 mt-1">
                              <span className="font-medium">{formatFileSize(doc.tamanho_bytes)}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="truncate">Arq: {doc.nome_original}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t md:border-none pt-3 md:pt-0">
                          {doc.nome_original.endsWith('.pdf') && (
                            <button onClick={() => handleAbrir(doc.storage_path)} className="p-2 border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Visualizar Documento">
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button onClick={() => handleAbrir(doc.storage_path)} className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl hover:bg-muted font-medium text-xs text-muted-foreground hover:text-foreground transition-colors bg-card" title="Fazer Download">
                            <Download className="w-4 h-4" /> Baixar
                          </button>
                          <button onClick={() => setIsDeletingId(doc.id)} className="p-2 border border-red-100 hover:border-red-200 dark:border-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-red-500 transition-colors" title="Excluir Documento">
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
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-4"><FolderOpen className="w-8 h-8" /></div>
          <h3 className="font-semibold text-lg text-foreground">Nenhum documento anexado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {searchTerm ? "Nenhum arquivo corresponde à sua pesquisa." : "Comece anexando atas, estatutos ou relatórios oficiais da ONG."}
          </p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg p-6 rounded-2xl border shadow-xl relative text-foreground flex flex-col max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { if (!uploading) setIsModalOpen(false); }} disabled={uploading} className="absolute top-4 right-4 p-1.5 rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold mb-1">Anexar Novo Documento</h2>
            <p className="text-xs text-muted-foreground mb-5">Armazene documentos oficiais no formato Word ou PDF.</p>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivo</label>
                <div className="relative border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-muted/10 group">
                  <input type="file" required accept=".pdf,.doc,.docx" onChange={handleFileChange} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform"><UploadCloud className="w-6 h-6" /></div>
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Documento</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} disabled={uploading}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50" placeholder="Ex: Ata da Assembleia Geral 2026" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição (Opcional)</label>
                <textarea rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} disabled={uploading}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 resize-none" />
              </div>
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 text-red-500 border border-red-200/50 dark:border-red-950/20 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><p className="font-medium leading-normal">{errorMessage}</p>
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2.5 p-3.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /><p className="font-semibold">{successMessage}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={uploading} className="px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-muted text-foreground bg-card transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={uploading} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-70">
                  {uploading ? "Anexando..." : "Salvar Documento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeletingId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm p-6 rounded-2xl border shadow-xl text-center relative text-foreground">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6" /></div>
            <h3 className="font-bold text-lg text-foreground">Excluir Documento?</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">Esta ação é permanente e removerá o arquivo do armazenamento.</p>
            <div className="flex gap-3 mt-6 justify-center">
              <button onClick={() => setIsDeletingId(null)} className="px-4 py-2 border rounded-xl font-medium text-xs text-muted-foreground hover:bg-muted transition-colors bg-card">Voltar</button>
              <button onClick={() => { const doc = documents.find((d) => d.id === isDeletingId); if (doc) handleDelete(doc); }} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
