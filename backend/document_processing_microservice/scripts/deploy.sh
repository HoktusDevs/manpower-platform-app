#!/bin/bash

# Script de despliegue para el microservicio de procesamiento de documentos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [COMANDO] [STAGE]"
    echo ""
    echo "Comandos:"
    echo "  deploy     Desplegar el microservicio"
    echo "  remove     Eliminar el microservicio"
    echo "  logs       Ver logs de las funciones"
    echo "  info       Mostrar información del despliegue"
    echo "  test       Ejecutar tests"
    echo "  offline    Ejecutar en modo offline"
    echo ""
    echo "Stages:"
    echo "  dev        Desarrollo (por defecto)"
    echo "  prod       Producción"
    echo ""
    echo "Ejemplos:"
    echo "  $0 deploy dev"
    echo "  $0 deploy prod"
    echo "  $0 logs dev"
    echo "  $0 remove prod"
}

# Verificar que serverless esté instalado
check_serverless() {
    if ! command -v serverless &> /dev/null; then
        print_error "Serverless Framework no está instalado."
        print_message "Instalar con: npm install -g serverless"
        exit 1
    fi
}

# Verificar que AWS CLI esté configurado
check_aws() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI no está instalado."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI no está configurado o las credenciales no son válidas."
        exit 1
    fi
}

# Verificar variables de entorno
check_env_vars() {
    local stage=$1
    
    print_message "Verificando variables de entorno para stage: $stage"
    
    # Variables requeridas
    required_vars=(
        "AZURE_VISION_ENDPOINT"
        "AZURE_VISION_KEY"
        "DEEPSEEK_API_KEY"
        "OPENAI_API_KEY"
        "DOCUMENT_RESULTS_NOTIFICATION_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Variables de entorno faltantes:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_message "Configurar variables en .env o exportarlas en el shell"
        exit 1
    fi
    
    print_success "Variables de entorno verificadas"
}

# Instalar dependencias
install_dependencies() {
    print_message "Instalando dependencias..."
    
    if [ -f "package.json" ]; then
        npm install
    fi
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    print_success "Dependencias instaladas"
}

# Ejecutar tests
run_tests() {
    print_message "Ejecutando tests..."
    
    if command -v pytest &> /dev/null; then
        pytest tests/ -v
        print_success "Tests completados"
    else
        print_warning "pytest no encontrado, saltando tests"
    fi
}

# Desplegar
deploy() {
    local stage=$1
    
    print_message "Desplegando microservicio en stage: $stage"
    
    # Verificar configuración
    check_serverless
    check_aws
    check_env_vars "$stage"
    
    # Instalar dependencias
    install_dependencies
    
    # Ejecutar tests
    run_tests
    
    # Desplegar con serverless
    print_message "Ejecutando serverless deploy..."
    serverless deploy --stage "$stage"
    
    print_success "Microservicio desplegado exitosamente en stage: $stage"
    
    # Mostrar información del despliegue
    print_message "Información del despliegue:"
    serverless info --stage "$stage"
}

# Eliminar despliegue
remove() {
    local stage=$1
    
    print_message "Eliminando microservicio del stage: $stage"
    
    check_serverless
    check_aws
    
    serverless remove --stage "$stage"
    
    print_success "Microservicio eliminado del stage: $stage"
}

# Ver logs
logs() {
    local stage=$1
    local function_name=${2:-""}
    
    print_message "Obteniendo logs del stage: $stage"
    
    check_serverless
    
    if [ -n "$function_name" ]; then
        serverless logs -f "$function_name" --stage "$stage"
    else
        serverless logs --stage "$stage"
    fi
}

# Mostrar información
info() {
    local stage=$1
    
    print_message "Información del despliegue en stage: $stage"
    
    check_serverless
    
    serverless info --stage "$stage"
}

# Modo offline
offline() {
    print_message "Iniciando modo offline..."
    
    check_serverless
    
    serverless offline
}

# Función principal
main() {
    local command=${1:-"help"}
    local stage=${2:-"dev"}
    
    case $command in
        "deploy")
            deploy "$stage"
            ;;
        "remove")
            remove "$stage"
            ;;
        "logs")
            logs "$stage" "$3"
            ;;
        "info")
            info "$stage"
            ;;
        "test")
            run_tests
            ;;
        "offline")
            offline
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
