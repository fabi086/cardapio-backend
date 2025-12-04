# Guia de Deploy na Vercel (CORRIGIDO)

Siga este passo a passo para colocar seu projeto no ar na Vercel.

## 1. Preparação no GitHub

Certifique-se de que seu código atual está commitado e enviado para o seu repositório no GitHub.

## 2. Criar Novo Projeto na Vercel

1.  Acesse o [Dashboard da Vercel](https://vercel.com/dashboard).
2.  Clique em **"Add New..."** e selecione **"Project"**.
3.  Importe o repositório do seu projeto (`cardapio-backend` ou o nome que você usou).

## 3. Configurações de Build (CRÍTICO)

Na tela de configuração do projeto ("Configure Project"):

1.  **Root Directory**: **DEIXE EM BRANCO (./)**.
    *   **NÃO** selecione a pasta `frontend`. O projeto deve ser implantado da raiz para que a API funcione.
2.  **Build Command**: `cd frontend && npm install && npm run build` (ou apenas `npm run build` se o `package.json` da raiz já tiver esse script).
    *   *Recomendação*: Use `cd frontend && npm install && npm run build` para garantir.
3.  **Output Directory**: `frontend/dist`.
    *   *Motivo*: O Vite gera os arquivos estáticos nesta pasta.
4.  **Install Command**: `npm install`.

## 4. Variáveis de Ambiente (Environment Variables)

Expanda a seção **"Environment Variables"** e adicione as variáveis necessárias para o seu backend funcionar. Baseie-se no seu arquivo `.env` local.

Exemplos comuns (verifique seu `.env`):
*   `SUPABASE_URL`
*   `SUPABASE_KEY`
*   `OPENAI_API_KEY`
*   `EVOLUTION_API_URL`
*   `EVOLUTION_API_KEY`
*   `VERCEL`: `true` (opcional, mas bom para identificar o ambiente)

## 5. Deploy

1.  Clique em **"Deploy"**.
2.  Aguarde o processo finalizar.

## 6. Verificação

Após o deploy, a Vercel fornecerá uma URL (ex: `https://seu-projeto.vercel.app`).
Acesse essa URL e teste:
1.  O carregamento da página inicial.
2.  O chat (se houver).
3.  O cardápio.

**Observação sobre o Backend:**
Como estamos implantando da raiz, a Vercel lerá o arquivo `api/index.js` e criará as Serverless Functions automaticamente. As rotas da API estarão disponíveis em `/api/...`.
O frontend fará chamadas para `/api/...` (caminho relativo), que funcionará perfeitamente.

Se tiver problemas, verifique os logs na aba "Logs" do seu projeto na Vercel.
