# WhatsApp Evolution Service - Makefile

.PHONY: help install deploy remove logs test clean

# Variables
STAGE ?= dev
REGION ?= us-east-1

# Colores
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

help: ## Mostrar ayuda
	@echo "WhatsApp Evolution Service - Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

install: ## Instalar dependencias
	@echo "$(GREEN)Instalando dependencias...$(NC)"
	npm install
	pip install -r requirements.txt

deploy: ## Desplegar el servicio
	@echo "$(GREEN)Desplegando en stage: $(STAGE)$(NC)"
	./scripts/deploy.sh deploy $(STAGE)

deploy-dev: ## Desplegar en desarrollo
	@$(MAKE) deploy STAGE=dev

deploy-prod: ## Desplegar en producción
	@$(MAKE) deploy STAGE=prod

remove: ## Eliminar el servicio
	@echo "$(YELLOW)Eliminando servicio del stage: $(STAGE)$(NC)"
	./scripts/deploy.sh remove $(STAGE)

remove-dev: ## Eliminar de desarrollo
	@$(MAKE) remove STAGE=dev

remove-prod: ## Eliminar de producción
	@$(MAKE) remove STAGE=prod

logs: ## Ver logs del servicio
	@echo "$(GREEN)Mostrando logs del stage: $(STAGE)$(NC)"
	./scripts/deploy.sh logs $(STAGE)

logs-dev: ## Ver logs de desarrollo
	@$(MAKE) logs STAGE=dev

logs-prod: ## Ver logs de producción
	@$(MAKE) logs STAGE=prod

info: ## Mostrar información del despliegue
	@echo "$(GREEN)Información del despliegue en stage: $(STAGE)$(NC)"
	./scripts/deploy.sh info $(STAGE)

offline: ## Ejecutar en modo offline
	@echo "$(GREEN)Ejecutando en modo offline...$(NC)"
	./scripts/deploy.sh offline

test: ## Ejecutar tests
	@echo "$(GREEN)Ejecutando tests...$(NC)"
	pytest tests/ -v

test-unit: ## Ejecutar tests unitarios
	@echo "$(GREEN)Ejecutando tests unitarios...$(NC)"
	pytest tests/unit/ -v

test-integration: ## Ejecutar tests de integración
	@echo "$(GREEN)Ejecutando tests de integración...$(NC)"
	pytest tests/integration/ -v

lint: ## Ejecutar linting
	@echo "$(GREEN)Ejecutando linting...$(NC)"
	flake8 src/
	black --check src/

format: ## Formatear código
	@echo "$(GREEN)Formateando código...$(NC)"
	black src/
	isort src/

clean: ## Limpiar archivos temporales
	@echo "$(GREEN)Limpiando archivos temporales...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	rm -rf .serverless/
	rm -rf node_modules/

setup: install ## Configurar proyecto completo
	@echo "$(GREEN)Configurando proyecto...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creando archivo .env desde env.example...$(NC)"; \
		cp env.example .env; \
		echo "$(RED)IMPORTANTE: Configura las variables en .env antes de desplegar$(NC)"; \
	fi

check-env: ## Verificar variables de entorno
	@echo "$(GREEN)Verificando variables de entorno...$(NC)"
	@if [ -f .env ]; then \
		echo "$(GREEN)Archivo .env encontrado$(NC)"; \
		echo "$(YELLOW)Variables requeridas:$(NC)"; \
		echo "  - EVOLUTION_API_URL"; \
		echo "  - EVOLUTION_API_KEY"; \
		echo "  - INSTANCE_NAME"; \
	else \
		echo "$(RED)Archivo .env no encontrado. Ejecuta 'make setup' primero$(NC)"; \
	fi

# Comandos de desarrollo
dev-setup: setup ## Configurar entorno de desarrollo
	@echo "$(GREEN)Configurando entorno de desarrollo...$(NC)"
	@echo "$(YELLOW)Recuerda configurar las variables en .env$(NC)"

dev-deploy: dev-setup deploy-dev ## Configurar y desplegar en desarrollo

prod-deploy: deploy-prod ## Desplegar en producción

# Comandos de monitoreo
monitor: ## Monitorear el servicio
	@echo "$(GREEN)Monitoreando servicio...$(NC)"
	@echo "Logs en tiempo real:"
	@echo "  make logs-$(STAGE)"
	@echo "Información del servicio:"
	@echo "  make info-$(STAGE)"
