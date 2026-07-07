const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente locais do arquivo .env se existir na raiz
const rootEnvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...values] = trimmed.split('=');
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const stage = process.env.STAGE || 'dev';
const stackName = process.env.STACK_NAME || `imob-app-infra-${stage}`;
const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';

console.log(`=== Iniciando Deploy com AWS SAM [Stack: ${stackName}] ===`);

// 1. Verificar credenciais do Google OAuth2
const credsPath = path.join(__dirname, '..', 'credentials', 'google-credentials-oath-client-imob.json');
let googleClientId = '';
let googleClientSecret = '';

if (fs.existsSync(credsPath)) {
  try {
    const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (credsData.web) {
      googleClientId = credsData.web.client_id || '';
      googleClientSecret = credsData.web.client_secret || '';
      console.log("Credenciais do Google OAuth2 encontradas localmente.");
    }
    
    if (!googleClientId || !googleClientSecret) {
      throw new Error("client_id ou client_secret ausentes no JSON de credenciais.");
    }
  } catch (error) {
    console.error(`Erro ao processar arquivo de credenciais do Google em ${credsPath}: ${error.message}`);
    process.exit(1);
  }
} else {
  console.error(`Erro: Arquivo de credenciais do Google não encontrado em: ${credsPath}`);
  console.error("Para realizar o deploy, configure o arquivo com as credenciais do Google OAuth.");
  process.exit(1);
}

// 2. Compilar o Quarkus Backend (Imagem Nativa)
console.log("Compilando imagem nativa do Quarkus (isso pode levar alguns minutos)...");
const isWindows = process.platform === 'win32';
const mvnCmd = isWindows ? 'mvnw.cmd' : './mvnw';
const apiPath = path.join(__dirname, '..', 'backend', 'api');

try {
  // Executa o empacotamento nativo do Quarkus
  const buildProcess = execSync(`${mvnCmd} clean package -Pnative,lambda -DskipTests -Dquarkus.native.container-build=true`, {
    cwd: apiPath,
    stdio: 'inherit'
  });
  console.log("Compilação nativa concluída com sucesso.");
} catch (error) {
  console.error("Erro durante a compilação do backend Java:", error.message);
  process.exit(1);
}

// 3. Executar o SAM Deploy
console.log("Preparando deploy com o AWS SAM CLI...");

const parameterOverrides = `EnableMockAuth=false GoogleClientId="${googleClientId}" GoogleClientSecret="${googleClientSecret}"`;

// Define os argumentos do comando SAM
const samArgs = [
  'deploy',
  '--template-file', path.join(__dirname, '..', 'backend', 'template.yaml'),
  '--stack-name', stackName,
  '--region', region,
  '--resolve-s3',
  '--capabilities', 'CAPABILITY_IAM',
  '--no-confirm-changeset',
  '--no-fail-on-empty-changeset',
  '--parameter-overrides', parameterOverrides
];

console.log(`Executando: sam ${samArgs.join(' ')}`);

const samProcess = spawn('sam', samArgs, { stdio: 'inherit', shell: true });

samProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Erro: O comando sam deploy falhou com código ${code}.`);
    process.exit(code);
  }

  console.log("Deploy do SAM concluído com sucesso.");

  // 4. Executar a sincronização dos outputs para o frontend
  try {
    console.log("Sincronizando outputs com o frontend...");
    execSync('node ' + path.join(__dirname, 'sync.js'), { stdio: 'inherit' });
  } catch (syncError) {
    console.error("Erro ao sincronizar outputs com o frontend:", syncError.message);
  }
});
