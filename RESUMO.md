# Resumo das Implementações

Este resumo detalha as alterações feitas para criar o backend e integrá-lo com o frontend do sistema da ONG.

## Backend
- Criado um servidor Express em `backend/index.js` rodando na porta 3001.
- Endpoints implementados para:
    - Campanhas (Listar, Criar, Atualizar)
    - Transações (Listar, Criar)
    - Voluntários (Listar)
    - Usuários (Listar, Criar, Deletar)
- Persistência de dados em arquivo JSON (`data.json`).

## Frontend
- Integração de todas as páginas com a API do backend:
    - `Overview.tsx` (Dashboard dinâmico com cálculo de saldo e fluxo de caixa).
    - `Donations.tsx` (Listagem e lançamento de doações para metas).
    - `Financial.tsx` (Listagem, criação e resumo de transações dinâmicos).
    - `Volunteers.tsx` (Listagem de voluntários).
    - `Settings.tsx` (Gestão de usuários).
- Correção de bug de localização no parse de valores monetários com ponto separador de milhar.

## Como Executar
1. Na raiz do projeto, execute o backend:
   ```powershell
   node backend/index.js
   ```
2. Em outro terminal, na pasta `frontend/ong-system`, execute o frontend:
   ```powershell
   npm run dev
   ```
