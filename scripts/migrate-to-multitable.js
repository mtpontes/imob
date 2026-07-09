const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Argumentos do script
const isLocal = process.argv.includes('--local');

// Garante credenciais válidas para o AWS CLI local se for modo local
if (isLocal) {
  process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE';
  process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
  process.env.AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
}

const endpointOption = isLocal ? '--endpoint-url http://localhost:8000' : '';

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

// Configurações das tabelas a partir de variáveis de ambiente ou valores padrão
const stage = process.env.STAGE || 'dev';
const stackName = process.env.STACK_NAME || `imob-app-infra-${stage}`;

// Nomes das tabelas
const oldTableName = isLocal ? 'ImobAppDB' : `${stackName}-DB`;
const workspacesTable = isLocal ? 'ImobWorkspaces' : `${stackName}-Workspaces`;
const propertiesTable = isLocal ? 'ImobProperties' : `${stackName}-Properties`;
const evaluationsTable = isLocal ? 'ImobEvaluations' : `${stackName}-Evaluations`;
const scriptsTable = isLocal ? 'ImobScripts' : `${stackName}-Scripts`;
const invitesTable = isLocal ? 'ImobInvites' : `${stackName}-Invites`;
const userProfilesTable = isLocal ? 'ImobUserProfiles' : `${stackName}-UserProfiles`;
const relationsTable = isLocal ? 'ImobUserWorkspaceRelations' : `${stackName}-UserWorkspaceRelations`;

console.log(`=== Iniciando migração de dados no DynamoDB ===`);
console.log(`Modo: ${isLocal ? 'LOCAL (http://localhost:8000)' : 'PRODUÇÃO AWS'}`);
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
  // 1. Executa o Scan para recuperar todos os dados da tabela antiga
  const scanCommand = `aws dynamodb scan --table-name ${oldTableName} ${endpointOption} --output json`;
  console.log(`Escaneando tabela antiga...`);
  const scanOutput = execSync(scanCommand, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
  const result = JSON.parse(scanOutput);

  if (!result.Items || result.Items.length === 0) {
    console.log(`A tabela antiga '${oldTableName}' está vazia. Nada para migrar.`);
    process.exit(0);
  }

  const items = result.Items;
  console.log(`Encontrados ${items.length} itens para processar.`);

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
    if (!item.PK || !item.SK) {
      stats.skipped++;
      continue;
    }

    const pk = item.PK.S;
    const sk = item.SK.S;

    let targetTable = '';
    let processedItem = { ...item };
    delete processedItem.PK;
    delete processedItem.SK;

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
      
      const propertyId = item.propertyId.S;
      const createdAt = item.createdAt.S;
      processedItem.propertyId_createdAt = { S: `${propertyId}#${createdAt}` };
      stats.evaluations++;
    } else {
      stats.skipped++;
      continue;
    }

    // Salva o item temporariamente em um arquivo JSON e executa o put-item para evitar erros de escape
    const tempFilePath = path.join(tempDir, `item_${i}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(processedItem), 'utf8');

    try {
      const fileUrl = tempFilePath.replace(/\\/g, '/');
      const putCommand = `aws dynamodb put-item --table-name ${targetTable} ${endpointOption} --item file://${fileUrl}`;
      execSync(putCommand, { stdio: 'ignore' });
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
  console.error(`Erro geral na execução do script de migração: ${err.message}`);
  process.exit(1);
} finally {
  // Limpa o diretório temporário
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
