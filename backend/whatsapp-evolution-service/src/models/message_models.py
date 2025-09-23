"""
Modelos de datos para mensajes de WhatsApp.
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any

class WhatsAppMessage(BaseModel):
    """
    Modelo para mensaje de WhatsApp.
    """
    phone_number: str
    message: str
    message_type: str = "text"
    template_name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class WhatsAppTemplate(BaseModel):
    """
    Modelo para template de WhatsApp.
    """
    name: str
    content: str
    parameters: Optional[Dict[str, Any]] = None

class ConnectionStatus(BaseModel):
    """
    Modelo para estado de conexión.
    """
    connected: bool
    instance_name: str
    last_seen: Optional[str] = None
