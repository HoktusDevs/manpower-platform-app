"""
Configuración del microservicio de WhatsApp.
"""

import os
from typing import Optional

class Settings:
    """
    Configuración centralizada del microservicio.
    """
    
    # --- CONFIGURACIÓN DE LA APLICACIÓN ---
    APP_NAME: str = "WhatsApp Evolution Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # --- CONFIGURACIÓN DE EVOLUTION API ---
    EVOLUTION_API_URL: str = os.getenv("EVOLUTION_API_URL", "")
    EVOLUTION_API_KEY: str = os.getenv("EVOLUTION_API_KEY", "")
    INSTANCE_NAME: str = os.getenv("INSTANCE_NAME", "manpower-whatsapp")
    
    # --- CONFIGURACIÓN DE LOGGING ---
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # --- CONFIGURACIÓN DE MONITOREO ---
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    
    @classmethod
    def validate_config(cls) -> bool:
        """
        Valida que la configuración sea correcta.
        """
        required_vars = [
            "EVOLUTION_API_URL",
            "EVOLUTION_API_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var):
                missing_vars.append(var)
        
        if missing_vars:
            raise ValueError(f"Variables de entorno faltantes: {', '.join(missing_vars)}")
        
        return True

# Instancia global de configuración
settings = Settings()
