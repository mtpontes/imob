# ImobApp - Plataforma de Avaliação de Imóveis

Este é um monorepo que contém o frontend e o backend da ImobApp, um sistema serverless de alta performance focado na criação e execução de protocolos de avaliação (Templates) de imóveis visitados.

O sistema suporta versionamento de formulários dinâmicos, cálculo automático de pontuação por pesos, registro de dados do imóvel e upload direto de fotos para o Amazon S3 utilizando URLs pré-assinadas (Pre-Signed URLs).

---

## Estrutura do Repositório

O projeto está estruturado no formato de monorepo:

*   **[backend/](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/backend):** Código-fonte em Java 25 utilizando o framework Quarkus compilado para Imagem Nativa (GraalVM), empacotado para execução em ambiente AWS Lambda (Fat Lambda). Também contém o arquivo de infraestrutura do AWS SAM (`template.yaml`).
*   **[frontend/](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/frontend):** Aplicação Single Page Application (SPA) desenvolvida em Angular configurada como Progressive Web App (PWA) e hospedada na Vercel.
*   **[push-bolt/](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/push-bolt):** Projeto de referência utilizado como base para o desenvolvimento das pipelines de CI/CD.

---

## Pré-requisitos para Desenvolvimento Local

Para rodar o projeto localmente, certifique-se de possuir instalado:

*   Java Development Kit (JDK) 25
*   Maven 3.9+
*   Node.js (LTS) e npm
*   Docker e Docker Compose
*   AWS CLI e AWS SAM CLI

---

## Como Executar o Projeto Localmente

### 1. Inicializar os Serviços Locais (DynamoDB e S3)

O projeto utiliza um container com DynamoDB Local e LocalStack (para o S3 simulado) no desenvolvimento local. Suba esses recursos utilizando o Docker Compose:

```bash
docker compose up -d
```
ou utilizando o Makefile:
```bash
make infra-up
```

### 2. Inicializar o Banco de Dados e Bucket Locais

Execute o script de inicialização para criar as tabelas no DynamoDB Local e o bucket no S3 simulado:

**No Linux/macOS:**
```bash
chmod +x start-backend.sh
./start-backend.sh
```

**No Windows (PowerShell):**
```powershell
./start-backend.ps1
```

### 3. Executar o Backend (Quarkus Dev Mode)

Acesse a pasta do backend e inicie o Quarkus em modo de desenvolvimento. O modo de desenvolvimento local habilita o bypass de autenticação por padrão (`imob.mock.auth=true`), simulando um token com e-mail corporativo:

```bash
cd backend
mvn quarkus:dev
```
O backend estará disponível em `http://localhost:8080`.

### 4. Executar o Frontend (Angular)

Instale as dependências e inicie o servidor de desenvolvimento do Angular. O frontend está configurado com um proxy local (`proxy.conf.json`) para redirecionar todas as chamadas de `/api/*` para o backend rodando em `http://localhost:8080`:

```bash
cd frontend
npm install
npm start
```
O frontend estará disponível em `http://localhost:4200`.

---

## Infraestrutura como Código (IaC) com AWS SAM

A infraestrutura serverless na AWS é provisionada via **AWS SAM** a partir do arquivo [backend/template.yaml](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/backend/template.yaml). Ele declara os seguintes recursos:

*   **ImobAppTable (DynamoDB):** Tabela no padrão Single-Table Design usando chaves genéricas `PK` e `SK` com modo de cobrança sob demanda (`PAY_PER_REQUEST`).
*   **ImobAppBucket (S3):** Bucket para armazenamento de fotos das vistorias, configurado com regras de CORS estritas e bloqueio de acesso público direto (acesso binário via URLs pré-assinadas de PUT e GET).
*   **ImobAppUserPool e UserPoolClient (Cognito):** Provedor de Identidade configurado para login via e-mail e senha.
*   **ImobAppHttpApi (API Gateway):** Gateway de API HTTP integrado via proxy com a Lambda. Por padrão, a validação de assinatura de JWT Cognito está configurada como não-obrigatória no Gateway para permitir o uso de logins simulados em ambientes de staging.
*   **ImobAppFunction (Lambda):** Função executando o Quarkus em Imagem Nativa (GraalVM) sob o runtime customizado `provided.al2023`. Recebe os nomes dos recursos criados dinamicamente via variáveis de ambiente (`IMOB_TABLE_NAME` e `IMOB_BUCKET_NAME`).

Para validar a integridade do arquivo SAM localmente, execute:
```bash
cd backend
sam validate --template-file template.yaml
```

---

## Pipelines de CI/CD (GitHub Actions)

As pipelines de deploy automatizado estão disponíveis na pasta `.github/workflows`:

### 1. Deploy do Backend e Infraestrutura
Localização: [.github/workflows/deploy-backend.yml](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/.github/workflows/deploy-backend.yml)

Disparada via `workflow_dispatch` (manual), esta pipeline:
1. Configura o JDK 25 e realiza o cache do Maven.
2. Compila a imagem nativa do Quarkus dentro de um container Docker, gerando o artefato `backend/target/function.zip`.
3. Instala e configura o AWS SAM CLI.
4. Realiza o deploy da infraestrutura e código na AWS usando o comando `sam deploy`.

### 2. Deploy do Frontend
Localização: [.github/workflows/deploy-frontend.yml](file:///e:/projetos/vibecode/app-de-avaliar-imoveis/.github/workflows/deploy-frontend.yml)

Disparada via `workflow_dispatch` (manual) após o deploy com sucesso do backend, esta pipeline:
1. Configura o Node.js e instala as dependências do frontend.
2. Consulta a stack do CloudFormation correspondente no AWS SAM para obter a URL gerada para a API Gateway.
3. Cria dinamicamente o arquivo de configuração `vercel.json` no diretório do frontend, aplicando a regra de reescrita proxy que direciona as chamadas de `/api/*` da Vercel para a URL da API Gateway da AWS correspondente.
4. Realiza o build e o deploy da aplicação Angular na Vercel através da CLI da Vercel.

### Secrets Necessárias no Repositório do GitHub

Para a execução correta das pipelines, configure os seguintes segredos nas definições de segredos do GitHub (Actions Secrets):

*   `AWS_ACCESS_KEY_ID`: Chave de acesso AWS com permissões para provisionamento e deploy de recursos (SAM).
*   `AWS_SECRET_ACCESS_KEY`: Chave secreta AWS.
*   `AWS_DEFAULT_REGION`: Região padrão da AWS (ex: `us-east-1`).
*   `VERCEL_TOKEN`: Token de autenticação da sua conta Vercel.
*   `VERCEL_ORG_ID`: ID da Organização na Vercel associada ao projeto.
*   `VERCEL_PROJECT_ID`: ID do Projeto na Vercel associada ao frontend.
