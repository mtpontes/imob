#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${YELLOW}=================================================="
echo -e " Iniciando Infraestrutura e Backend (Quarkus) "
echo -e "==================================================${RESET}"

# 1. Subir o container LocalStack (DynamoDB + S3)
echo -e "\n${CYAN}[1/4] Subindo container LocalStack...${RESET}"
docker compose -f "$(dirname "$0")/../docker-compose.yml" up -d

# 2. Aguardar LocalStack S3 (4566) e DynamoDB Local (8000) estarem prontos
echo -e "\n${CYAN}[2/4] Aguardando LocalStack S3 na porta 4566...${RESET}"
until docker exec localstack bash -c "echo > /dev/tcp/localhost/4566" 2>/dev/null; do
    sleep 1
done
echo -e "${GREEN}LocalStack S3 esta online!${RESET}"

echo -e "\n${CYAN}Aguardando DynamoDB Local na porta 8000...${RESET}"
until docker exec localstack bash -c "echo > /dev/tcp/dynamodb/8000" 2>/dev/null; do
    sleep 1
done
echo -e "${GREEN}DynamoDB Local esta online!${RESET}"

# 3. Criar tabela DynamoDB se nao existir (usando awslocal no localstack apontando para o dynamodb)
echo -e "\n${CYAN}[3/4] Provisionando recursos AWS locais...${RESET}"

echo -e "Verificando tabela 'ImobAppDB'..."
if docker exec localstack awslocal dynamodb describe-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobAppDB > /dev/null 2>&1; then
    echo -e "${GREEN}Tabela 'ImobAppDB' ja existe.${RESET}"
else
    echo -e "${YELLOW}Criando tabela 'ImobAppDB'...${RESET}"
    docker exec localstack awslocal dynamodb create-table \
        --endpoint-url http://dynamodb:8000 \
        --table-name ImobAppDB \
        --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
        --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST > /dev/null
    echo -e "${GREEN}Tabela 'ImobAppDB' criada!${RESET}"
fi

# Criar bucket S3 se nao existir
echo -e "Verificando bucket 'imob-app-bucket'..."
if docker exec localstack awslocal s3api head-bucket \
    --bucket imob-app-bucket > /dev/null 2>&1; then
    echo -e "${GREEN}Bucket 'imob-app-bucket' ja existe.${RESET}"
else
    echo -e "${YELLOW}Criando bucket 'imob-app-bucket'...${RESET}"
    docker exec localstack awslocal s3 mb s3://imob-app-bucket > /dev/null
    echo -e "${GREEN}Bucket 'imob-app-bucket' criado!${RESET}"
fi

# Configurar CORS no S3 local para permitir uploads a partir do frontend (localhost:4200)
echo -e "Configurando CORS para o bucket 'imob-app-bucket'..."
CORS_CONFIG='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["ETag"]}]}'
docker exec localstack awslocal s3api put-bucket-cors \
    --bucket imob-app-bucket \
    --cors-configuration "$CORS_CONFIG"
echo -e "${GREEN}CORS configurado com sucesso no LocalStack S3!${RESET}"


echo -e "\n${GREEN}Infraestrutura pronta. Backend pode ser iniciado.${RESET}"
