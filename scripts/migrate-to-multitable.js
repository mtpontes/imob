const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Argumentos do script
const isLocal = process.argv.includes('--local');
const isDev = process.argv.includes('--dev');
const isProd = process.argv.includes('--prod');

if (!isLocal && !isDev && !isProd) {
  console.error("Erro: É necessário especificar o ambiente usando uma das flags: --local, --dev ou --prod");
  console.error("Uso:");
  console.error("  node scripts/migrate-to-multitable.js --local");
  console.error("  node scripts/migrate-to-multitable.js --dev");
  console.error("  node scripts/migrate-to-multitable.js --prod");
  process.exit(1);
}

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

// Configurações das tabelas a partir da flag passada
let stage = 'dev';
let isLocalDb = false;

if (isLocal) {
  isLocalDb = true;
} else if (isDev) {
  stage = 'dev';
} else if (isProd) {
  stage = 'prod';
}

const endpointOption = isLocalDb ? '--endpoint-url http://localhost:8000' : '';

// Garante credenciais válidas para o AWS CLI local se for modo local
if (isLocalDb) {
  process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
  process.env.AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
} else {
  // Garante o uso do profile correto definido no projeto quando executado fora do local
  process.env.AWS_PROFILE = process.env.AWS_PROFILE || 'imob';
}

const stackName = `imob-app-infra-${stage}`;

// Nomes das tabelas
const oldTableName = isLocalDb ? 'ImobAppDB' : `${stackName}-DB`;
const workspacesTable = isLocalDb ? 'ImobWorkspaces' : `${stackName}-Workspaces`;
const propertiesTable = isLocalDb ? 'ImobProperties' : `${stackName}-Properties`;
const evaluationsTable = isLocalDb ? 'ImobEvaluations' : `${stackName}-Evaluations`;
const scriptsTable = isLocalDb ? 'ImobScripts' : `${stackName}-Scripts`;
const invitesTable = isLocalDb ? 'ImobInvites' : `${stackName}-Invites`;
const userProfilesTable = isLocalDb ? 'ImobUserProfiles' : `${stackName}-UserProfiles`;
const relationsTable = isLocalDb ? 'ImobUserWorkspaceRelations' : `${stackName}-UserWorkspaceRelations`;

console.log(`=== Iniciando migração de dados no DynamoDB ===`);
let modeName = 'LOCAL (http://localhost:8000)';
if (isDev) modeName = 'DESENVOLVIMENTO AWS';
if (isProd) modeName = 'PRODUÇÃO AWS';
console.log(`Modo: ${modeName}`);
console.log(`Tabela Antiga: ${oldTableName}`);
console.log(`Tabelas Novas:`);
console.log(`  - Workspaces: ${workspacesTable}`);
console.log(`  - Properties: ${propertiesTable}`);
console.log(`  - Evaluations: ${evaluationsTable}`);
console.log(`  - Scripts: ${scriptsTable}`);
console.log(`  - Invites: ${invitesTable}`);
console.log(`  - UserProfiles: ${userProfilesTable}`);
console.log(`  - UserWorkspaceRelations: ${relationsTable}`);
console.log(`===============================================`);

const tempDir = path.join(__dirname, 'temp_migration');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

try {
  // 1. Lê os dados a partir do arquivo CSV de backup
  const csvPath = path.join(__dirname, '..', 'backup', 'results.csv');
  console.log(`Lendo dados de backup do arquivo CSV: ${csvPath}`);
  if (!fs.existsSync(csvPath)) {
    console.error(`\nErro: O arquivo de backup '${csvPath}' não existe.`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length <= 1) {
    console.log(`O arquivo CSV de backup está vazio. Nada para migrar.`);
    process.exit(0);
  }

  // Parser simples de linha CSV respeitando aspas
  function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Higieniza e limpa aspas duplicadas e de escape do CSV
  function sanitizeCsvValue(val) {
    if (!val) return '';
    let cleaned = val;
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    cleaned = cleaned.replace(/""+/g, '"');
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned;
  }

  // Mapeamento de tipos para atributos numéricos
  function toAttributeValue(fieldName, val) {
    const numberFields = ['price', 'sqm', 'bedrooms', 'bathrooms', 'parking', 'expiresAt'];
    if (numberFields.includes(fieldName)) {
      return { N: val.toString() };
    }
    return { S: val };
  }

  const headers = parseCsvLine(lines[0]).map(h => sanitizeCsvValue(h));
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const item = {};
    headers.forEach((header, idx) => {
      const rawValue = cols[idx];
      const value = sanitizeCsvValue(rawValue);
      if (value !== undefined && value !== '') {
        item[header] = value;
      }
    });
    if (item.PK && item.SK) {
      items.push(item);
    }
  }

  console.log(`Encontrados ${items.length} itens no CSV para processar.`);

  let stats = {
    workspaces: 0,
    properties: 0,
    evaluations: 0,
    scripts: 0,
    invites: 0,
    profiles: 0,
    relations: 0,
    skipped: 0
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pk = item.PK;
    const sk = item.SK;

    let targetTable = '';
    let processedItem = {};

    // Mapeia todas as colunas que têm dados para o formato do DynamoDB
    Object.keys(item).forEach(key => {
      if (key !== 'PK' && key !== 'SK') {
        processedItem[key] = toAttributeValue(key, item[key]);
      }
    });

    // Determina o tipo de entidade com base nas chaves PK/SK
    if (pk.startsWith('USER#') && sk === 'PROFILE') {
      // 1. UserProfileEntity
      targetTable = userProfilesTable;
      processedItem.email = { S: pk.substring('USER#'.length) };
      stats.profiles++;
    } else if (pk.startsWith('USER#') && sk.startsWith('WORKSPACE#')) {
      // 2. UserWorkspaceRelationEntity
      targetTable = relationsTable;
      processedItem.email = { S: pk.substring('USER#'.length) };
      processedItem.workspaceId = { S: sk.substring('WORKSPACE#'.length) };
      stats.relations++;
    } else if (pk.startsWith('WORKSPACE#') && sk === 'METADATA') {
      // 3. WorkspaceEntity
      targetTable = workspacesTable;
      processedItem.id = { S: pk.substring('WORKSPACE#'.length) };
      stats.workspaces++;
    } else if (pk.startsWith('WORKSPACE#') && sk.startsWith('PROPERTY#')) {
      // 4. PropertyEntity
      targetTable = propertiesTable;
      processedItem.workspaceId = { S: pk.substring('WORKSPACE#'.length) };
      processedItem.id = { S: sk.substring('PROPERTY#'.length) };
      stats.properties++;
    } else if (pk.startsWith('WORKSPACE#') && sk.startsWith('SCRIPT#')) {
      // 5. ScriptEntity
      targetTable = scriptsTable;
      processedItem.workspaceId = { S: pk.substring('WORKSPACE#'.length) };
      processedItem.id = { S: sk.substring('SCRIPT#'.length) };
      stats.scripts++;
    } else if (pk.startsWith('INVITE#') && sk === 'METADATA') {
      // 6. InviteEntity
      targetTable = invitesTable;
      processedItem.token = { S: pk.substring('INVITE#'.length) };
      stats.invites++;
    } else if (pk.startsWith('WORKSPACE#') && sk.startsWith('EVALUATION#')) {
      // 7. EvaluationEntity
      targetTable = evaluationsTable;
      processedItem.workspaceId = { S: pk.substring('WORKSPACE#'.length) };

      const propertyId = item.propertyId;
      const createdAt = item.createdAt;
      processedItem.propertyId_createdAt = { S: `${propertyId}#${createdAt}` };
      stats.evaluations++;
    } else {
      stats.skipped++;
      continue;
    }

    // Serializa o JSON escapando caracteres não-ASCII em sequências Unicode
    function asciiStringify(obj) {
      const jsonString = JSON.stringify(obj);
      return jsonString.replace(/[^\x00-\x7F]/g, (char) => {
        return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
      });
    }

    // Salva o item temporariamente em um arquivo JSON e executa o put-item para evitar erros de escape
    const tempFilePath = path.join(tempDir, `item_${i}.json`);
    fs.writeFileSync(tempFilePath, asciiStringify(processedItem), 'utf8');

    try {
      const fileUrl = tempFilePath.replace(/\\/g, '/');
      const putCommand = `aws dynamodb put-item --table-name ${targetTable} ${endpointOption} --item file://${fileUrl}`;
      execSync(putCommand);
    } catch (putErr) {
      console.error(`Erro ao inserir item ${i} na tabela ${targetTable}: ${putErr.message}`);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  console.log(`===============================================`);
  console.log(`Migração concluída com sucesso!`);
  console.log(`Estatísticas de importação:`);
  console.log(`  - Workspaces: ${stats.workspaces}`);
  console.log(`  - Properties: ${stats.properties}`);
  console.log(`  - Evaluations: ${stats.evaluations}`);
  console.log(`  - Scripts: ${stats.scripts}`);
  console.log(`  - Invites: ${stats.invites}`);
  console.log(`  - UserProfiles: ${stats.profiles}`);
  console.log(`  - UserWorkspaceRelations: ${stats.relations}`);
  console.log(`  - Ignorados: ${stats.skipped}`);
  console.log(`===============================================`);

} catch (err) {
  const errMsg = err.message || '';
  const errStderr = err.stderr ? err.stderr.toString() : '';
  if (errMsg.includes('ResourceNotFoundException') || errStderr.includes('ResourceNotFoundException')) {
    console.error(`\nErro: Uma das novas tabelas de destino não foi encontrada no DynamoDB.`);
    console.error(`Certifique-se de que a nova infraestrutura Multi-Table está implantada no ambiente (${stage}) da AWS.`);
  } else {
    console.error(`Erro geral na execução do script de migração: ${err.message}`);
  }
  process.exit(1);
} finally {
  // Limpa o diretório temporário
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
