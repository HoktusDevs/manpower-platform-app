import React, { useState } from 'react';
import { RecipientSelector } from './RecipientSelector';

interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Recipient {
  id: string;
  name: string;
  phone?: string;
}

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'conversations' | 'messages' | 'templates';
  availableUsers: User[];
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  isOpen,
  onClose,
  activeTab,
  availableUsers
}) => {
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [templateName, setTemplateName] = useState('send_documents_missing_3378594');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<unknown>(null);

  const handleSendTemplateMessage = async () => {
    if (selectedRecipients.length === 0) {
      alert('Por favor, selecciona al menos un destinatario');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      // Enviar plantilla a cada destinatario
      for (const recipient of selectedRecipients) {
        const response = await fetch('https://whatsappchatbothardcoded-production.up.railway.app/whatsapp/send_template_message', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            data: {
              userData: {
                phone: recipient.phone || recipient.name,
                name_user: recipient.name
              },
              messageData: {
                template_name: templateName,
                template_parameters: [
                  { type: "text", text: recipient.name },
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
        setResponse(prev => [...(prev || []), { recipient: recipient.name, data }]);
      }
    } catch (error) {
      setResponse({ 
        error: 'Error al enviar mensaje de plantilla: ' + error,
        details: 'Posible problema de CORS. Verifica que el servidor permita requests desde este dominio.',
        suggestion: 'Contacta al administrador del servidor para configurar CORS o usa un proxy.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab === 'conversations' ? 'Nueva conversación' : 'Nuevo Mensaje'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar destinatario/s
            </label>
            <RecipientSelector
              selectedRecipients={selectedRecipients}
              onRecipientsChange={setSelectedRecipients}
              availableUsers={availableUsers}
            />
          </div>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSendTemplateMessage}
            disabled={isLoading || selectedRecipients.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enviando...' : 'Enviar Plantilla'}
          </button>
        </div>

        {/* Respuesta de la API */}
        {response && (
          <div className="p-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Respuesta de la API:</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-40">
              {typeof response === 'object' && response !== null ? JSON.stringify(response, null, 2) : String(response)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
