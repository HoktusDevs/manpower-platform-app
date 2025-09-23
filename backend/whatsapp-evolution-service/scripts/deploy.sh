#!/bin/bash

# Script de despliegue para WhatsApp Evolution Service

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [comando] [stage]"
    echo ""
    echo "Comandos:"
    echo "  deploy    Desplegar el servicio"
    echo "  remove    Eliminar el servicio"
    echo "  logs      Ver logs del servicio"
    echo "  info      Mostrar información del despliegue"
    echo "  offline   Ejecutar en modo offline"
    echo ""
    echo "Stages:"
    echo "  dev       Desarrollo"
    echo "  prod      Producción"
    echo ""
    echo "Ejemplos:"
    echo "  $0 deploy dev"
    echo "  $0 remove prod"
    echo "  $0 logs dev"
}

# Función para desplegar
deploy() {
    local stage=$1
    echo -e "${GREEN}Desplegando WhatsApp Evolution Service en stage: $stage${NC}"
    
    # Verificar que las variables de entorno estén configuradas
    if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ]; then
        echo -e "${RED}Error: Variables de entorno EVOLUTION_API_URL y EVOLUTION_API_KEY deben estar configuradas${NC}"
        exit 1
    fi
    
    # Instalar dependencias
    echo "Instalando dependencias..."
    npm install
    
    # Desplegar
    echo "Desplegando con Serverless..."
    npx serverless deploy --stage $stage
    
    echo -e "${GREEN}Despliegue completado exitosamente${NC}"
}

# Función para eliminar
remove() {
    local stage=$1
    echo -e "${YELLOW}Eliminando WhatsApp Evolution Service del stage: $stage${NC}"
    
    npx serverless remove --stage $stage
    
    echo -e "${GREEN}Servicio eliminado exitosamente${NC}"
}

# Función para ver logs
logs() {
    local stage=$1
    echo -e "${GREEN}Mostrando logs del stage: $stage${NC}"
    
    npx serverless logs -f webhook --stage $stage
}

# Función para mostrar información
info() {
    local stage=$1
    echo -e "${GREEN}Información del despliegue en stage: $stage${NC}"
    
    npx serverless info --stage $stage
}

# Función para modo offline
offline() {
    echo -e "${GREEN}Ejecutando en modo offline${NC}"
    
    npx serverless offline
}

# Main
case $1 in
    deploy)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Debe especificar el stage (dev/prod)${NC}"
            show_help
            exit 1
        fi
        deploy $2
        ;;
    remove)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Debe especificar el stage (dev/prod)${NC}"
            show_help
            exit 1
        fi
        remove $2
        ;;
    logs)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Debe especificar el stage (dev/prod)${NC}"
            show_help
            exit 1
        fi
        logs $2
        ;;
    info)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Debe especificar el stage (dev/prod)${NC}"
            show_help
            exit 1
        fi
        info $2
        ;;
    offline)
        offline
        ;;
    *)
        show_help
        ;;
esac
