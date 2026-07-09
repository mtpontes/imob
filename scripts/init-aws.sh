#!/bin/bash
echo "=== Inicializando recursos AWS locais (S3 e DynamoDB) ==="

# Aguardar DynamoDB local estar online (porta 8000 do container dynamodb)
until bash -c "echo > /dev/tcp/dynamodb/8000" 2>/dev/null; do
    echo "Aguardando DynamoDB Local em http://dynamodb:8000..."
    sleep 2
done

# Criar tabela antiga no DynamoDB Local (para compatibilidade e migracao)
echo "Criando tabela antiga 'ImobAppDB'..."
awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobAppDB \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Criar novas tabelas no DynamoDB Local (Multi-Table Design)
echo "Criando novas tabelas Multi-Table..."

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobWorkspaces \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobProperties \
    --attribute-definitions AttributeName=workspaceId,AttributeType=S AttributeName=id,AttributeType=S \
    --key-schema AttributeName=workspaceId,KeyType=HASH AttributeName=id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobEvaluations \
    --attribute-definitions AttributeName=workspaceId,AttributeType=S AttributeName=propertyId_createdAt,AttributeType=S \
    --key-schema AttributeName=workspaceId,KeyType=HASH AttributeName=propertyId_createdAt,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobScripts \
    --attribute-definitions AttributeName=workspaceId,AttributeType=S AttributeName=id,AttributeType=S \
    --key-schema AttributeName=workspaceId,KeyType=HASH AttributeName=id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobInvites \
    --attribute-definitions AttributeName=token,AttributeType=S \
    --key-schema AttributeName=token,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobUserProfiles \
    --attribute-definitions AttributeName=email,AttributeType=S \
    --key-schema AttributeName=email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobUserWorkspaceRelations \
    --attribute-definitions AttributeName=email,AttributeType=S AttributeName=workspaceId,AttributeType=S \
    --key-schema AttributeName=email,KeyType=HASH AttributeName=workspaceId,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"WorkspaceIndex\", \"KeySchema\": [{\"AttributeName\": \"workspaceId\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"email\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST

# Criar bucket S3
echo "Criando bucket 'imob-app-bucket'..."
awslocal s3 mb s3://imob-app-bucket

# Configurar CORS no S3
echo "Configurando CORS no bucket 'imob-app-bucket'..."
CORS_CONFIG='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["ETag"]}]}'
awslocal s3api put-bucket-cors \
    --bucket imob-app-bucket \
    --cors-configuration "$CORS_CONFIG"

echo "=== Recursos AWS locais inicializados com sucesso ==="
