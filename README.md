# 🛫 GSMVIAGEM HUB

Bem-vindo ao repositório do **GSMVIAGEM HUB**, o painel operacional centralizado para gestão de passagens aéreas e emissões. O sistema é focado em produtividade, automação e consulta rápida.

Este projeto tem uma aparência premium, estilo "Command Center" / "Mission Control" com tema dark (Black, Azul Escuro, Cyan e Verde Neon).

---

## 🚀 Tecnologias e Stack
- **Frontend / Backend / API**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/)
- **Ícones**: Lucide React
- **Banco de Dados & Autenticação**: [Supabase](https://supabase.com/)
- **Deploy Otimizado**: [Vercel](https://vercel.com/)

---

## 📁 Estrutura do Projeto

O projeto foi organizado para escalabilidade e manutenção clara:

```text
gsmviagem-hub/
├── .env.example                  # Exemplo das variáveis de ambiente
├── supabase_schema.sql           # Schema SQL pronto para ser rodado no Supabase
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Layout Global (Sidebar, Topbar e Theme)
│   │   ├── page.tsx              # Dashboard Principal Módulo
│   │   ├── auto-extrator/        # Módulo: Gerenciamento de Robôs/Scraping
│   │   ├── busca/                # Módulo: Pesquisa de Passagens em tempo real
│   │   ├── emissoes/             # Módulo: Tabela mestre de emissões isoladas
│   │   ├── planilha/             # Módulo: Sync com Google Sheets
│   │   └── configuracoes/        # Módulo: Configurações, Segurança e Chaves
│   ├── components/
│   │   ├── layout/               # Sidebar.tsx, Topbar.tsx
│   │   └── ui/                   # [shadcn/ui] Buttons, Cards, Inputs, Tables...
│   └── lib/
│       ├── utils.ts              # Utilitários do Tailwind/Shadcn
│       └── mockData.ts           # ⚠️ Seed local das simulações visuais para o MVP
└── ...
```

---

## 📊 Status Atual do MVP

- **Mockado Visualmente**: Toda a interface foi preenchida com dados do arquivo `src/lib/mockData.ts` para entregar uma navegação de alto nível visual de um "Hub Real".
- **Pronto para Integração**: O banco de dados já está totalmente modelado (`supabase_schema.sql`). 
- **Auto-Extrator / Scraping**: A interface do auto-extrator permite simular validação de SMS para a Smiles, forçar o resync da Azul ou LATAM e rodar execuções. O próximo passo é linkar as actions de botões a lambdas via Puppeteer/Playwright.

---

## 🛠️ Como Iniciar Localmente

### 1. Pré-Requisitos
Você precisará ter instalado na sua máquina:
- [Node.js](https://nodejs.org/en/) (v20+ recomendado)
- Um projeto limpo criado no [Supabase](https://database.new)

### 2. Configurando o Banco de Dados (Supabase)
1. Crie seu projeto no Supabase.
2. Abra o menu **SQL Editor**.
3. Copie o conteúdo do arquivo local `supabase_schema.sql` (na raiz do repositório) e execute. Isso vai gerar:
   - Tabelas `profiles`, `airline_integrations`, `airline_sessions`, `extracted_bookings`, etc.
4. No Dashboard do Supabase, vá em **Project Settings > API** e pegue:
   - *Project URL*
   - *Project API Key (anon/public)*

### 3. Setup do Repositório
Abra o terminal e execute:

```bash
# Clone ou acesse o repositório existente
cd gsmviagem-hub

# Instale todas as dependências do shadcn, Next.js, tailwind e supabase
npm install

# Copie o arquivo de exemplo de ambiente
cp .env.example .env.local
```

Edite o arquivo `.env.local` e insira suas chaves do Supabase capturadas no Passo 2:
```env
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon-publica"
```

### 4. Rodando
```bash
npm run dev
```
Acesse `http://localhost:3000` e aproveite!

---

## ☁️ Deploy na Vercel

O projeto foi configurado com a premissa de funcionar fluído na Vercel (provedora oficial do Next.js).

1. Faça o commit de todo o seu código para o seu repositório no GitHub.
2. Acesse a [Vercel](https://vercel.com/new) e crie um novo projeto importando seu repositório do GitHub recém-criado.
3. No passo de "Environment Variables", adicione as exatas chaves do seu arquivo `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Clique em **Deploy**.
5. Pronto! A Vercel cuidará do build inteligente. A aplicação estará ativa globalmente via CDN.

---

## 🧠 Arquitetura para Scraping Futuro
- Foi deixada a tabela `airline_sessions` para comportar a longa vida dos cookies/tokens da **Smiles** baseados em SMS 2FA.
- O Frontend consome `runs` da tabela `extraction_runs`. Você pode ligar uma Cloud Function (ou Vercel Cron Job) diário chamando e extraindo dados, que vão jogar os resultados em `extracted_bookings`.

**Engenharia sugerida para os scrapers**: Utilize *Axiom / Apify / Google Cloud Run + Puppeteer stealth* chamando endpoints secretos em sua API (`/api/cron/extract-azul`) e escrevendo seguro pelo back-end no Supabase.
