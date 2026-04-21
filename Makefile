.PHONY: help db-up db-down db-logs db-connect db-reset prisma-generate prisma-push prisma-migrate prisma-studio prisma-seed

# Cores para output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

help: ## Mostra esta ajuda
	@echo "$(GREEN)Comandos disponíveis:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'

# ============================================================
# DOCKER / DATABASE
# ============================================================

db-up: ## Inicia o PostgreSQL (e pgAdmin)
	@echo "$(GREEN)Iniciando containers...$(RESET)"
	docker-compose up -d
	@echo "$(GREEN)✓ PostgreSQL rodando em localhost:5432$(RESET)"
	@echo "$(GREEN)✓ pgAdmin disponível em http://localhost:5050$(RESET)"
	@echo "  Email: admin@financeiro.local"
	@echo "  Senha: admin"

db-down: ## Para o PostgreSQL (mantém os dados)
	@echo "$(YELLOW)Parando containers...$(RESET)"
	docker-compose down

db-logs: ## Mostra os logs do PostgreSQL
	docker-compose logs -f postgres

db-connect: ## Conecta ao PostgreSQL via psql
	docker-compose exec postgres psql -U postgres -d financeiro

db-reset: ## ⚠️  CUIDADO: Deleta TODOS os dados e recria o banco
	@echo "$(YELLOW)⚠️  ATENÇÃO: Isso vai deletar TODOS os dados!$(RESET)"
	@read -p "Tem certeza? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose up -d; \
		echo "$(GREEN)✓ Banco resetado$(RESET)"; \
	else \
		echo "$(YELLOW)Cancelado$(RESET)"; \
	fi

# ============================================================
# PRISMA
# ============================================================

prisma-generate: ## Gera o Prisma Client
	@echo "$(GREEN)Gerando Prisma Client...$(RESET)"
	npm run db:generate

prisma-push: ## Sincroniza o schema com o banco (dev)
	@echo "$(GREEN)Sincronizando schema...$(RESET)"
	npm run db:push

prisma-migrate: ## Cria uma migration
	@echo "$(GREEN)Criando migration...$(RESET)"
	@read -p "Nome da migration: " name; \
	npx prisma migrate dev --name $$name

prisma-studio: ## Abre o Prisma Studio (interface visual)
	@echo "$(GREEN)Abrindo Prisma Studio em http://localhost:5555$(RESET)"
	npm run db:studio

prisma-seed: ## Popula o banco com dados de exemplo
	@echo "$(GREEN)Executando seed...$(RESET)"
	npm run db:seed

# ============================================================
# SETUP INICIAL
# ============================================================

setup: db-up prisma-generate prisma-push ## Setup completo do projeto
	@echo ""
	@echo "$(GREEN)════════════════════════════════════════$(RESET)"
	@echo "$(GREEN)✓ Setup concluído com sucesso!$(RESET)"
	@echo "$(GREEN)════════════════════════════════════════$(RESET)"
	@echo ""
	@echo "Próximos passos:"
	@echo "  1. Configure o .env.local com suas credenciais"
	@echo "  2. Execute 'npm run dev' para iniciar o servidor"
	@echo ""
	@echo "URLs úteis:"
	@echo "  • App:      http://localhost:3000"
	@echo "  • pgAdmin:  http://localhost:5050"
	@echo "  • Prisma:   npm run db:studio"
	@echo ""
