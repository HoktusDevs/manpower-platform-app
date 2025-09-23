#!/usr/bin/env python3
"""
Script simple para probar la conexión WebSocket
"""

import asyncio
import websockets
import json

async def test_websocket():
    uri = "wss://b3wt34nt9h.execute-api.us-east-1.amazonaws.com/dev"
    
    try:
        print(f"Conectando a: {uri}")
        async with websockets.connect(uri) as websocket:
            print("✅ Conexión WebSocket establecida exitosamente!")
            
            # Enviar un mensaje de prueba
            test_message = {
                "type": "ping",
                "message": "Test connection"
            }
            
            await websocket.send(json.dumps(test_message))
            print("📤 Mensaje enviado:", test_message)
            
            # Esperar respuesta
            response = await websocket.recv()
            print("📥 Respuesta recibida:", response)
            
            # Enviar mensaje de suscripción
            subscribe_message = {
                "type": "subscribe_documents",
                "message": "Subscribe to document updates"
            }
            
            await websocket.send(json.dumps(subscribe_message))
            print("📤 Suscripción enviada:", subscribe_message)
            
            # Esperar respuesta de suscripción
            subscribe_response = await websocket.recv()
            print("📥 Respuesta de suscripción:", subscribe_response)
            
            print("✅ Prueba de WebSocket completada exitosamente!")
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ Conexión cerrada: {e}")
    except websockets.exceptions.InvalidURI as e:
        print(f"❌ URI inválida: {e}")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
