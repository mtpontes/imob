const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Carrega as variáveis de ambiente locais do arquivo .env se existir na raiz para consistência
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

console.log(`=== Sincronizando endpoints da stack AWS CloudFormation [${stackName}] ===`);

try {
  // Executa o AWS CLI para ler as propriedades da stack
  const command = `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} --output json`;
  console.log(`Executando: ${command}`);
  
  const data = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  const stackInfo = JSON.parse(data);
  const stack = stackInfo.Stacks[0];

  if (!stack || !stack.Outputs) {
    console.error(`Erro: Nenhuma saída (Output) encontrada para a stack ${stackName}.`);
    process.exit(1);
  }

  let userPoolId = '';
  let userPoolClientId = '';
  let cognitoDomain = '';
  let apiUrl = '';

  for (const output of stack.Outputs) {
    if (output.OutputKey === 'UserPoolId') userPoolId = output.OutputValue;
    if (output.OutputKey === 'UserPoolClientId') userPoolClientId = output.OutputValue;
    if (output.OutputKey === 'CognitoDomain') cognitoDomain = output.OutputValue;
    if (output.OutputKey === 'ApiUrl') apiUrl = output.OutputValue;
  }

  if (!userPoolId || !userPoolClientId || !cognitoDomain) {
    console.warn("Aviso: Algumas variáveis do Cognito estão ausentes nos outputs da stack.");
  }

  // Gera o arquivo .env do frontend
  const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env');
  const frontendEnvContent = `# Gerado automaticamente via 'make fetch-outputs' em ${new Date().toISOString()}
NG_APP_COGNITO_USER_POOL_ID=${userPoolId}
NG_APP_COGNITO_CLIENT_ID=${userPoolClientId}
NG_APP_COGNITO_DOMAIN=${cognitoDomain}
`;

  fs.writeFileSync(frontendEnvPath, frontendEnvContent, 'utf8');
  console.log(`Arquivo de variáveis do frontend atualizado em: ${frontendEnvPath}`);
  console.log(`UserPoolId: ${userPoolId}`);
  console.log(`UserPoolClientId: ${userPoolClientId}`);
  console.log(`CognitoDomain: ${cognitoDomain}`);
  if (apiUrl) console.log(`ApiUrl: ${apiUrl}`);
  console.log("=== Sincronização concluída com sucesso ===");

} catch (error) {
  console.error(`Erro ao buscar outputs da stack CloudFormation: ${error.message}`);
  console.error("Certifique-se de que a stack está implantada na AWS e que você possui credenciais válidas configuradas.");
  process.exit(1);
}
