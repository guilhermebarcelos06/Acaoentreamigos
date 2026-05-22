const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Apenas arquivos PDF e Word são permitidos!'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to read data
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    // Initial data
    const initialData = {
      campaigns: [
        { id: 1, title: "Cestas Básicas", category: "ALIMENTOS", current: 150, total: 200, unit: "unidades", missing: 50, progress: 75, color: "bg-blue-500", statusText: "Falta Arrecadar" },
        { id: 2, title: "Arroz", category: "ALIMENTOS", current: 500, total: 500, unit: "kg", missing: 0, progress: 100, color: "bg-primary", statusText: "Meta Atingida!", isCompleted: true },
        { id: 3, title: "Leite", category: "ALIMENTOS", current: 120, total: 300, unit: "litros", missing: 180, progress: 40, color: "bg-blue-500", statusText: "Falta Arrecadar" },
        { id: 4, title: "Roupas de Frio", category: "VESTUÁRIO", current: 850, total: 1000, unit: "peças", missing: 150, progress: 85, color: "bg-blue-500", statusText: "Falta Arrecadar" },
        { id: 5, title: "Brinquedos", category: "INFANTIL", current: 200, total: 500, unit: "unidades", missing: 300, progress: 40, color: "bg-blue-500", statusText: "Falta Arrecadar" },
        { id: 6, title: "Kits de Higiene", category: "HIGIENE", current: 45, total: 150, unit: "kits", missing: 105, progress: 30, color: "bg-red-500", statusText: "Falta Arrecadar", isCritical: true }
      ],
      transactions: [
        { id: 1, date: "10/10/2023", description: "Doação Anônima", type: "Entrada", value: "+ R$ 1.500,00", hasReceipt: false },
        { id: 2, date: "12/10/2023", description: "Pagamento de Luz", type: "Saída", value: "- R$ 350,50", hasReceipt: true },
        { id: 3, date: "15/10/2023", description: "Compra Cestas Básicas", type: "Saída", value: "- R$ 800,00", hasReceipt: true },
        { id: 4, date: "18/10/2023", description: "Campanha Mês das Crianças", type: "Entrada", value: "+ R$ 2.300,00", hasReceipt: false },
        { id: 5, date: "20/10/2023", description: "Manutenção Carro ONG", type: "Saída", value: "- R$ 450,00", hasReceipt: true }
      ],
      volunteers: [
        { id: 1, name: "Maria Silva", email: "maria@email.com", skills: "Aulas de Reforço, Recreação", status: "Ativo", date: "15/05/2023" },
        { id: 2, name: "João Santos", email: "joao@email.com", skills: "Motorista, Organização", status: "Ativo", date: "02/08/2023" },
        { id: 3, name: "Ana Oliveira", email: "ana@email.com", skills: "Cozinha, Limpeza", status: "Inativo", date: "10/01/2023" },
        { id: 4, name: "Pedro Costa", email: "pedro@email.com", skills: "TI, Marketing", status: "Novo (Avaliação)", date: "12/10/2023" }
      ],
      users: [
        { id: 1, name: "Admin Principal", email: "admin@ong.org", role: "Administrador", initials: "A", roleColor: "bg-primary/10 text-primary" },
        { id: 2, name: "Financeiro ONG", email: "financas@ong.org", role: "Financeiro", initials: "F", roleColor: "bg-primary/10 text-primary" },
        { id: 3, name: "Coordenador de Doações", email: "doacoes@ong.org", role: "Editor", initials: "C", roleColor: "bg-primary/10 text-primary" }
      ],
      documents: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

// Helper to write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/campaigns', (req, res) => {
  const data = readData();
  res.json(data.campaigns);
});

app.post('/api/campaigns', (req, res) => {
  const data = readData();
  const newCampaign = req.body;
  newCampaign.id = data.campaigns.length + 1;
  data.campaigns.push(newCampaign);
  writeData(data);
  res.status(201).json(newCampaign);
});

app.put('/api/campaigns/:id', (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const index = data.campaigns.findIndex(c => c.id === id);
  if (index !== -1) {
    data.campaigns[index] = { ...data.campaigns[index], ...req.body };
    writeData(data);
    res.json(data.campaigns[index]);
  } else {
    res.status(404).json({ message: "Campaign not found" });
  }
});

app.get('/api/transactions', (req, res) => {
  const data = readData();
  res.json(data.transactions);
});

app.post('/api/transactions', (req, res) => {
  const data = readData();
  const newTransaction = req.body;
  newTransaction.id = data.transactions.length + 1;
  data.transactions.unshift(newTransaction); // Add to top
  writeData(data);
  res.status(201).json(newTransaction);
});

app.get('/api/volunteers', (req, res) => {
  const data = readData();
  res.json(data.volunteers);
});

app.get('/api/users', (req, res) => {
  const data = readData();
  res.json(data.users);
});

app.post('/api/users', (req, res) => {
  const data = readData();
  const newUser = req.body;
  newUser.id = data.users.length + 1;
  data.users.push(newUser);
  writeData(data);
  res.status(201).json(newUser);
});

app.delete('/api/users/:id', (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  data.users = data.users.filter(u => u.id !== id);
  writeData(data);
  res.status(204).send();
});

// Document endpoints
app.get('/api/documents', (req, res) => {
  const data = readData();
  res.json(data.documents || []);
});

app.post('/api/documents', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado ou tipo de arquivo inválido." });
    }
    const { name, description } = req.body;
    if (!name) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "O nome do documento é obrigatório." });
    }

    const data = readData();
    if (!data.documents) {
      data.documents = [];
    }

    // Format size
    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = sizeInMB === '0.00' 
      ? `${(req.file.size / 1024).toFixed(1)} KB` 
      : `${sizeInMB} MB`;

    const newDoc = {
      id: data.documents.length > 0 ? Math.max(...data.documents.map(d => d.id)) + 1 : 1,
      name: name,
      description: description || "",
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: sizeFormatted,
      uploadDate: new Date().toISOString()
    };

    data.documents.push(newDoc);
    writeData(data);

    res.status(201).json(newDoc);
  } catch (error) {
    console.error("Error uploading document:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Erro interno no servidor ao realizar upload." });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = readData();
    if (!data.documents) {
      data.documents = [];
    }
    const docIndex = data.documents.findIndex(d => d.id === id);
    if (docIndex !== -1) {
      const doc = data.documents[docIndex];
      const filePath = path.join(__dirname, 'uploads', doc.fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      data.documents.splice(docIndex, 1);
      writeData(data);
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Documento não encontrado." });
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ message: "Erro interno ao excluir o documento." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
