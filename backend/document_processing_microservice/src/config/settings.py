"""
Configuración del microservicio de procesamiento de documentos.
"""

import os
from typing import Set

from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()


class Settings:
    """Configuración centralizada del microservicio."""
    
    # --- CONFIGURACIÓN DE LA APLICACIÓN ---
    APP_NAME: str = "Document Processing Microservice"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # --- CONFIGURACIÓN DE SQS ---
    DOCUMENT_PROCESSING_QUEUE_URL: str = os.getenv("DOCUMENT_PROCESSING_QUEUE_URL", "")
    SQS_MAX_RETRIES: int = int(os.getenv("SQS_MAX_RETRIES", "3"))
    SQS_RETRY_DELAY: int = int(os.getenv("SQS_RETRY_DELAY", "1"))
    
    # --- CONFIGURACIÓN DE ENDPOINTS EXTERNOS ---
    DOCUMENT_RESULTS_NOTIFICATION_URL: str = os.getenv(
        "DOCUMENT_RESULTS_NOTIFICATION_URL", 
        "https://callback-service.com/results"
    )
    
    # --- CONFIGURACIÓN DE LÍMITES ---
    MAX_DOCUMENTS_PER_REQUEST: int = int(os.getenv("MAX_DOCUMENTS_PER_REQUEST", "30"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "2"))
    RETRY_DELAY_SECONDS: int = int(os.getenv("RETRY_DELAY_SECONDS", "5"))
    
    # --- CONFIGURACIÓN DE ARCHIVOS ---
    ALLOWED_DOCUMENT_EXTENSIONS: Set[str] = {
        ".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif"
    }
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    
    # --- CONFIGURACIÓN DE AZURE VISION (OCR) ---
    AZURE_VISION_ENDPOINT: str = os.getenv("AZURE_VISION_ENDPOINT", "")
    AZURE_VISION_KEY: str = os.getenv("AZURE_VISION_KEY", "")
    AZURE_VISION_TIMEOUT: int = int(os.getenv("AZURE_VISION_TIMEOUT", "30"))
    
    # --- CONFIGURACIÓN DE MODELOS DE IA ---
    DOCUMENT_IA_PROVIDER: str = os.getenv("DOCUMENT_IA_PROVIDER", "deepseek")
    
    # DeepSeek
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_API_BASE_URL: str = os.getenv("DEEPSEEK_API_BASE_URL", "https://api.deepseek.com/v1")
    DEEPSEEK_MODEL_GENERATION: str = os.getenv("DEEPSEEK_MODEL_GENERATION", "deepseek-chat")
    DEEPSEEK_MODEL_EXTRACTION: str = os.getenv("DEEPSEEK_MODEL_EXTRACTION", "deepseek-chat")
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE_URL: str = os.getenv("OPENAI_API_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL_GENERATION: str = os.getenv("OPENAI_MODEL_GENERATION", "gpt-4")
    OPENAI_MODEL_EXTRACTION: str = os.getenv("OPENAI_MODEL_EXTRACTION", "gpt-4")
    OPENAI_MODEL_TRANSCRIPTION: str = os.getenv("OPENAI_MODEL_TRANSCRIPTION", "whisper-1")
    
    # --- CONFIGURACIÓN DE BOOSTR (Identidad CL) ---
    BOOSTR_API_KEY: str = os.getenv("BOOSTR_API_KEY", "")
    BOOSTR_BASE_URL: str = os.getenv("BOOSTR_BASE_URL", "https://api.boostr.cl")
    BOOSTR_TIMEOUT_SECONDS: int = int(os.getenv("BOOSTR_TIMEOUT_SECONDS", "15"))
    
    # --- CONFIGURACIÓN DE LOGGING ---
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv(
        "LOG_FORMAT", 
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # --- CONFIGURACIÓN DE MONITOREO ---
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    
    # --- CONFIGURACIÓN DE WORKER ---
    WORKER_PREFETCH_COUNT: int = int(os.getenv("WORKER_PREFETCH_COUNT", "3"))
    WORKER_CONSUMER_TIMEOUT: int = int(os.getenv("WORKER_CONSUMER_TIMEOUT", "30"))
    
    @classmethod
    def validate_config(cls) -> bool:
        """Valida que la configuración sea correcta."""
        required_vars = [
            "DOCUMENT_PROCESSING_QUEUE_URL"
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
