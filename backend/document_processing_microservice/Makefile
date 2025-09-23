# Document Processing Microservice - Makefile

.PHONY: help install test lint format clean docker-build docker-up docker-down

# Variables
PYTHON := python3
PIP := pip3
DOCKER_COMPOSE := docker-compose

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Instalar dependencias
	$(PIP) install -r requirements.txt

install-dev: ## Instalar dependencias de desarrollo
	$(PIP) install -r requirements.txt
	$(PIP) install pytest pytest-cov black flake8 mypy

test: ## Ejecutar tests
	pytest tests/ -v --cov=src --cov-report=html

test-unit: ## Ejecutar solo tests unitarios
	pytest tests/unit/ -v

test-integration: ## Ejecutar solo tests de integración
	pytest tests/integration/ -v

lint: ## Ejecutar linter
	flake8 src/ tests/
	mypy src/

format: ## Formatear código
	black src/ tests/
	flake8 src/ tests/ --max-line-length=88

clean: ## Limpiar archivos temporales
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .pytest_cache/

# Docker commands removed - using AWS Lambda instead

# Local development commands removed - using serverless offline instead

offline: ## Ejecutar en modo offline (desarrollo local)
	serverless offline

deploy: ## Desplegar a AWS
	./scripts/deploy.sh deploy dev

deploy-prod: ## Desplegar a producción
	./scripts/deploy.sh deploy prod

remove: ## Eliminar despliegue
	./scripts/deploy.sh remove dev

logs: ## Ver logs de Lambda
	./scripts/deploy.sh logs dev

info: ## Mostrar información del despliegue
	./scripts/deploy.sh info dev

setup-env: ## Configurar archivo .env
	cp env.example .env
	@echo "Archivo .env creado. Por favor, configura las variables de entorno."

dev-setup: install-dev setup-env ## Configurar entorno de desarrollo completo

ci: lint test ## Ejecutar pipeline de CI
