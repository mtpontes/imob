# Script para subir a infraestrutura e o backend do ImobApp no Windows
$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host " Iniciando Infraestrutura e Backend (Quarkus) " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

# 1. Subir os containers do Docker Compose
Write-Host "`n[1/4] Subindo containers Docker..." -ForegroundColor Cyan
docker compose -f "$PSScriptRoot/../docker-compose.yml" up -d localstack dynamodb
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha ao iniciar os containers do Docker Compose."
    exit 1
}

# Funcao auxiliar: aguarda uma porta TCP estar acessivel
function Wait-Port {
    param([int]$Port, [string]$Label)
    Write-Host "Aguardando $Label na porta $Port..." -ForegroundColor Cyan
    while ($true) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $result = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($result.AsyncWaitHandle.WaitOne(300, $false) -and $tcp.Connected) {
                $tcp.Close()
                break
            }
            $tcp.Close()
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    # Aguarda adicional para o servico estar pronto para processar requisicoes HTTP
    Start-Sleep -Seconds 2
    Write-Host "$Label esta online!" -ForegroundColor Green
}

# Funcao: chama DynamoDB Local via curl.exe (built-in do Windows 10/11)
# Retorna o HTTP status code da resposta
function Invoke-DynamoDb-Curl {
    param([string]$Target, [string]$Body)
    $statusCode = curl.exe -s -o NUL -w "%{http_code}" `
        -X POST "http://localhost:8000/" `
        -H "Content-Type: application/x-amz-json-1.0" `
        -H "X-Amz-Target: DynamoDB_20120810.$Target" `
        -H "X-Amz-Date: 20240101T000000Z" `
        -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/dynamodb/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=fakesig" `
        --data $Body
    return $statusCode
}

# 2. Aguardar e inicializar o DynamoDB Local (Porta 8000)
Wait-Port -Port 8000 -Label "DynamoDB Local"

Write-Host "Verificando tabela 'ImobAppDB'..." -ForegroundColor Gray
$describeStatus = Invoke-DynamoDb-Curl -Target "DescribeTable" -Body '{"TableName":"ImobAppDB"}'

if ($describeStatus -ne "200") {
    Write-Host "Criando tabela 'ImobAppDB'..." -ForegroundColor Yellow
    $createBody = '{"TableName":"ImobAppDB","AttributeDefinitions":[{"AttributeName":"PK","AttributeType":"S"},{"AttributeName":"SK","AttributeType":"S"}],"KeySchema":[{"AttributeName":"PK","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"BillingMode":"PAY_PER_REQUEST"}'
    $createStatus = Invoke-DynamoDb-Curl -Target "CreateTable" -Body $createBody
    if ($createStatus -eq "200") {
        Write-Host "Tabela 'ImobAppDB' criada com sucesso!" -ForegroundColor Green
    } else {
        Write-Error "Falha ao criar a tabela (HTTP $createStatus)."
        exit 1
    }
} else {
    Write-Host "Tabela 'ImobAppDB' ja existe." -ForegroundColor Green
}

# 3. Aguardar e inicializar o LocalStack S3 (Porta 4566)
Wait-Port -Port 4566 -Label "LocalStack (S3)"

Write-Host "Verificando bucket 'imob-app-bucket'..." -ForegroundColor Gray
$headStatus = curl.exe -s -o NUL -w "%{http_code}" `
    -X HEAD "http://localhost:4566/imob-app-bucket" `
    -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=fakesig" `
    -H "X-Amz-Date: 20240101T000000Z"

if ($headStatus -ne "200") {
    Write-Host "Criando bucket 'imob-app-bucket'..." -ForegroundColor Yellow
    $putStatus = curl.exe -s -o NUL -w "%{http_code}" `
        -X PUT "http://localhost:4566/imob-app-bucket" `
        -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=fakesig" `
        -H "X-Amz-Date: 20240101T000000Z"
    if ($putStatus -eq "200") {
        Write-Host "Bucket 'imob-app-bucket' criado com sucesso!" -ForegroundColor Green
    } else {
        Write-Error "Falha ao criar o bucket (HTTP $putStatus)."
        exit 1
    }
} else {
    Write-Host "Bucket 'imob-app-bucket' ja existe." -ForegroundColor Green
}

# Aplicar politica de CORS no bucket local do S3 para permitir uploads a partir do frontend (localhost:4200)
Write-Host "Configurando CORS para o bucket 'imob-app-bucket'..." -ForegroundColor Gray
$corsBody = '<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule><AllowedOrigin>*</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>POST</AllowedMethod><AllowedMethod>DELETE</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule></CORSConfiguration>'
$corsStatus = curl.exe -s -o NUL -w "%{http_code}" `
    -X PUT "http://localhost:4566/imob-app-bucket?cors" `
    -H "Content-Type: application/xml" `
    -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20240101/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=fakesig" `
    -H "X-Amz-Date: 20240101T000000Z" `
    -d $corsBody

if ($corsStatus -eq "200" -or $corsStatus -eq "204") {
    Write-Host "CORS configurado com sucesso no LocalStack S3!" -ForegroundColor Green
} else {
    Write-Warning "Falha ao configurar CORS no bucket local (HTTP $corsStatus)."
}


# 4. Iniciar o Backend Quarkus em modo dev
Write-Host "`n[4/4] Inicializando o Quarkus Dev Server..." -ForegroundColor Yellow
mvn -f "$PSScriptRoot/../backend/api/pom.xml" quarkus:dev
