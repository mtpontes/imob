#!/bin/bash
echo "=== Inicializando recursos AWS locais (S3 e DynamoDB) ==="

# Aguardar DynamoDB local estar online (porta 8000 do container dynamodb)
until bash -c "echo > /dev/tcp/dynamodb/8000" 2>/dev/null; do
    echo "Aguardando DynamoDB Local em http://dynamodb:8000..."
    sleep 2
done

# Criar tabela no DynamoDB Local
echo "Criando tabela 'ImobAppDB'..."
awslocal dynamodb create-table \
    --endpoint-url http://dynamodb:8000 \
    --table-name ImobAppDB \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
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
