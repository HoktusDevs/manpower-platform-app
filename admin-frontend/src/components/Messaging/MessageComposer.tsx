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
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');

  const handleSubmit = () => {
    // Aquí se manejaría el envío del mensaje
    console.log('Enviando mensaje:', {
      recipients: selectedRecipients,
      subject,
      message: newMessage,
      type: messageType,
      priority
    });
    onClose();
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
              Para
            </label>
            <RecipientSelector
              selectedRecipients={selectedRecipients}
              onRecipientsChange={setSelectedRecipients}
              availableUsers={availableUsers}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asunto
            </label>
            <input
              type="text"
              placeholder="Asunto del mensaje..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje
            </label>
            <textarea
              rows={6}
              placeholder="Escribe tu mensaje aquí..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select 
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'email' | 'sms' | 'whatsapp')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
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
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {activeTab === 'conversations' ? 'Crear Conversación' : 'Enviar Mensaje'}
          </button>
        </div>
      </div>
    </div>
  );
};
