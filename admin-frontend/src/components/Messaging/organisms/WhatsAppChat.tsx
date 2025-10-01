import React, { useState } from 'react';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: 'user' | 'system';
  type: 'text' | 'system';
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  type: 'email' | 'sms' | 'whatsapp' | 'internal';
  status: 'active' | 'archived' | 'blocked';
  messages: Message[];
}

interface WhatsAppChatProps {
  selectedConversation: string | null;
  conversations: Conversation[];
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  selectedConversation,
  conversations
}) => {
  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const [messageText, setMessageText] = useState('');

  const currentMessages = selectedConv?.messages || [];

  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
        {/* Header de la conversación */}
        <div className="bg-green-500 text-white p-4 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">
                {selectedConv?.participantName || 'WhatsApp Business'}
              </h3>
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          <div className="space-y-3">
            {selectedConversation ? (
              <>
                {/* Mensaje del sistema - Conversación iniciada */}
                <div className="flex justify-center">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    Conversación iniciada
                  </div>
                </div>

                {/* Historial de mensajes específico de la conversación */}
                {currentMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender === 'system' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs p-3 rounded-lg ${
                      message.sender === 'system' 
                        ? 'bg-green-500 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'system' 
                          ? 'text-green-100' 
                          : 'text-gray-500'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Selecciona una conversación para ver los mensajes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input de mensaje */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
            <button 
              disabled={!messageText.trim()}
              className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 ${
                messageText.trim() 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
