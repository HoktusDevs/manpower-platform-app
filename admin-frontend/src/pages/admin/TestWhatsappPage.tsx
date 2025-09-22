import React, { useState } from 'react';

const WHATSAPP_API_BASE = 'https://whatsappchatbothardcoded-production.up.railway.app';

export const TestWhatsappPage = () => {
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<'normal' | 'template'>('normal');
  const [templateName, setTemplateName] = useState('send_documents_missing_3378594');
  const [userName, setUserName] = useState('');
  const [response, setResponse] = useState<any>(null);

  const handleSendNormalMessage = async () => {
    if (!message.trim() || !phoneNumber.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // Usar mode: 'cors' y manejar CORS explícitamente
      const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/send_message`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          phone_user: phoneNumber.replace(/\D/g, ''),
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.error('Error details:', error);
      setResponse({ 
        error: 'Error al enviar mensaje: ' + error,
        details: 'Posible problema de CORS. Verifica que el servidor permita requests desde este dominio.',
        suggestion: 'Contacta al administrador del servidor para configurar CORS o usa un proxy.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTemplateMessage = async () => {
    if (!phoneNumber.trim() || !userName.trim()) {
      alert('Por favor, completa el número de teléfono y nombre del usuario');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/send_template_message`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            userData: {
              phone: phoneNumber.replace(/\D/g, ''),
              name_user: userName
            },
            messageData: {
              template_name: templateName,
              template_parameters: [
                { type: "text", text: userName },
                { type: "text", text: "Nombre archivo 1" },
                { type: "text", text: "Nombre archivo 2" },
                { type: "text", text: "Nombre archivo 3" },
                { type: "text", text: "Nombre archivo 4" },
                { type: "text", text: "Nombre archivo 5" },
                { type: "text", text: "Nombre archivo 6" },
                { type: "text", text: "Nombre archivo 7" },
                { type: "text", text: "-" },
                { type: "text", text: "-" }
              ],
              template_type: "normal"
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      console.error('Error details:', error);
      setResponse({ 
        error: 'Error al enviar mensaje de plantilla: ' + error,
        details: 'Posible problema de CORS. Verifica que el servidor permita requests desde este dominio.',
        suggestion: 'Contacta al administrador del servidor para configurar CORS o usa un proxy.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = () => {
    setMessage('Hola! Este es un mensaje de prueba desde la plataforma administrativa.');
    setPhoneNumber('+56912345678');
    setUserName('Usuario de Prueba');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test WhatsApp</h1>
          <p className="text-gray-600">
            Prueba la funcionalidad de envío de mensajes por WhatsApp usando los endpoints reales
          </p>
        </div>

        {/* Tipo de mensaje */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de mensaje</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="normal"
                checked={messageType === 'normal'}
                onChange={(e) => setMessageType(e.target.value as 'normal' | 'template')}
                className="mr-2"
              />
              Mensaje Normal
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="template"
                checked={messageType === 'template'}
                onChange={(e) => setMessageType(e.target.value as 'normal' | 'template')}
                className="mr-2"
              />
              Mensaje de Plantilla
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {/* Número de teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Número de teléfono
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+56912345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Nombre del usuario (solo para plantillas) */}
          {messageType === 'template' && (
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del usuario
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nombre del usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Nombre de la plantilla (solo para plantillas) */}
          {messageType === 'template' && (
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la plantilla
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="send_documents_missing_3378594"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Mensaje (solo para mensajes normales) */}
          {messageType === 'normal' && (
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-4">
            <button
              onClick={messageType === 'normal' ? handleSendNormalMessage : handleSendTemplateMessage}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : `Enviar ${messageType === 'normal' ? 'Mensaje Normal' : 'Plantilla'}`}
            </button>
            
            <button
              onClick={handleTestMessage}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cargar datos de prueba
            </button>
          </div>

          {/* Respuesta de la API */}
          {response && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Respuesta de la API:</h3>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Información:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Mensaje Normal:</strong> Para conversaciones activas (24 horas)</li>
            <li>• <strong>Mensaje de Plantilla:</strong> Para mensajes fuera del período de 24 horas</li>
            <li>• El número debe incluir el código de país (ej: +56912345678)</li>
            <li>• Los mensajes se envían a través de la API de WhatsApp Business</li>
            <li>• Útil para probar notificaciones y comunicaciones con postulantes</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Nota sobre CORS:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Si ves errores "Failed to fetch", es un problema de CORS</li>
            <li>• El servidor de WhatsApp debe permitir requests desde este dominio</li>
            <li>• <strong>Solución temporal:</strong> Usar un proxy o extensión de CORS</li>
            <li>• <strong>Solución definitiva:</strong> Configurar CORS en el servidor de WhatsApp</li>
            <li>• Contacta al administrador del servidor para resolver este problema</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
