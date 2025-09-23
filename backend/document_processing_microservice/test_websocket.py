#!/usr/bin/env python3
"""
Script de prueba para WebSocket del document_processing_microservice.
"""

import asyncio
import json
import websockets
import requests
from datetime import datetime

# Configuración
WEBSOCKET_URL = "wss://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev"
NOTIFY_URL = "https://sr4qzksrak.execute-api.us-east-1.amazonaws.com/dev/api/v1/websocket/notify"

async def test_websocket_connection():
    """Prueba la conexión WebSocket."""
    print("🔌 Conectando a WebSocket...")
    
    try:
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ Conexión WebSocket establecida")
            
            # Enviar mensaje de ping
            ping_message = {
                "type": "ping",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(ping_message))
            print("📤 Enviado: ping")
            
            # Enviar suscripción a documentos
            subscribe_message = {
                "type": "subscribe_documents",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(subscribe_message))
            print("📤 Enviado: subscribe_documents")
            
            # Escuchar mensajes por 10 segundos
            print("👂 Escuchando mensajes...")
            try:
                async for message in websocket:
                    data = json.loads(message)
                    print(f"📥 Recibido: {data}")
                    
                    if data.get('type') == 'pong':
                        print("✅ Ping/Pong funcionando correctamente")
                    elif data.get('type') == 'subscription_confirmed':
                        print("✅ Suscripción confirmada")
                    elif data.get('type') == 'document_processing_update':
                        print("🎉 ¡Notificación de documento recibida!")
                        print(f"   Documento: {data.get('documentId')}")
                        print(f"   Estado: {data.get('status')}")
                        print(f"   Decisión: {data.get('finalDecision')}")
                    
            except asyncio.TimeoutError:
                print("⏰ Timeout esperando mensajes")
                
    except Exception as e:
        print(f"❌ Error en WebSocket: {e}")

def test_notify_endpoint():
    """Prueba el endpoint de notificación."""
    print("\n📡 Probando endpoint de notificación...")
    
    notification_data = {
        "documentId": "test-doc-123",
        "status": "completed",
        "processingStatus": "COMPLETED",
        "finalDecision": "APPROVED",
        "documentType": "Cédula de Identidad",
        "ownerUserName": "Usuario de Prueba",
        "fileName": "cedula.pdf",
        "ocrResult": {
            "success": True,
            "confidence": 95,
            "extractedText": "Texto extraído de prueba"
        },
        "extractedData": {
            "nombre": "Juan Pérez",
            "rut": "12.345.678-9"
        },
        "observations": [],
        "processingTime": 2.5
    }
    
    try:
        response = requests.post(
            NOTIFY_URL,
            json=notification_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Notificación enviada exitosamente")
        else:
            print("❌ Error enviando notificación")
            
    except Exception as e:
        print(f"❌ Error en notificación: {e}")

async def main():
    """Función principal de prueba."""
    print("🧪 INICIANDO PRUEBAS DE WEBSOCKET")
    print("=" * 50)
    
    # Probar conexión WebSocket
    await test_websocket_connection()
    
    # Probar endpoint de notificación
    test_notify_endpoint()
    
    print("\n🏁 PRUEBAS COMPLETADAS")

if __name__ == "__main__":
    asyncio.run(main())
