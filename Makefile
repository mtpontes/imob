# Carrega variaveis do arquivo .env se ele existir na raiz
ifneq ("$(wildcard .env)","")
    include .env
    export
endif

STAGE ?= dev
STACK_NAME ?= imob-app-infra-$(STAGE)
AWS_PROFILE ?= imobi
export AWS_PROFILE

.PHONY: run front watch-media down deploy sync

# ==========================================
# 1. Desenvolvimento Local
# ==========================================

# Inicia a infraestrutura local (Docker) e o servidor de backend Quarkus em modo dev
run:
	docker compose up -d localstack dynamodb
	cd backend/api && mvn quarkus:dev

# Inicia o frontend Angular localmente
front:
	cd frontend && npm start

# Inicia o processador de mídias localmente
watch-media:
	cd backend/media-processor && node watch-local.js

# Para e remove todos os containers e volumes locais do Docker
down:
	docker compose down -v --remove-orphans

# ==========================================
# 2. Infraestrutura & Autenticação (AWS CloudFormation)
# ==========================================

# Compila o backend nativo e faz deploy na AWS passando as credenciais do Google OAuth
deploy:
	node scripts/deploy-sam.js

# Sincroniza os endpoints do Cognito remotos criados na AWS para o .env do frontend local
sync:
	node scripts/sync.js
