import React, { useState } from 'react';
import { 
  EnvelopeIcon, 
  PaperAirplaneIcon, 
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  // EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  type: 'email' | 'sms' | 'whatsapp' | 'internal';
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
}

export const MessagingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'messages' | 'templates'>('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  // Mock data - En producción esto vendría de la API
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      participantId: 'user-1',
      participantName: 'Juan Pérez',
      participantEmail: 'juan.perez@email.com',
      lastMessage: 'Gracias por la información sobre el puesto...',
      lastMessageTime: '2025-09-22T15:30:00Z',
      unreadCount: 2,
      type: 'email',
      status: 'active'
    },
    {
      id: '2',
      participantId: 'user-2',
      participantName: 'María González',
      participantEmail: 'maria.gonzalez@email.com',
      lastMessage: '¿Cuándo es la entrevista?',
      lastMessageTime: '2025-09-22T14:15:00Z',
      unreadCount: 0,
      type: 'whatsapp',
      status: 'active'
    },
    {
      id: '3',
      participantId: 'user-3',
      participantName: 'Carlos Rodríguez',
      participantEmail: 'carlos.rodriguez@email.com',
      lastMessage: 'Necesito más información sobre los beneficios...',
      lastMessageTime: '2025-09-22T12:45:00Z',
      unreadCount: 1,
      type: 'sms',
      status: 'active'
    }
  ]);

  const [messages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'admin',
      senderName: 'Administrador',
      recipientId: 'user-1',
      recipientName: 'Juan Pérez',
      subject: 'Confirmación de entrevista',
      content: 'Hola Juan, te confirmamos que tu entrevista está programada para el lunes 25 de septiembre a las 10:00 AM.',
      timestamp: '2025-09-22T15:30:00Z',
      isRead: true,
      priority: 'high',
      type: 'email'
    },
    {
      id: '2',
      senderId: 'user-1',
      senderName: 'Juan Pérez',
      recipientId: 'admin',
      recipientName: 'Administrador',
      subject: 'Re: Confirmación de entrevista',
      content: 'Gracias por la confirmación. ¿Podrían enviarme la dirección exacta?',
      timestamp: '2025-09-22T15:45:00Z',
      isRead: false,
      priority: 'medium',
      type: 'email'
    }
  ]);

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participantEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mensajería</h1>
          <p className="text-gray-600">
            Gestiona comunicaciones con candidatos y empleados
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'conversations', name: 'WhatsApp', count: conversations.length },
                { id: 'messages', name: 'Emails', count: messages.length },
                { id: 'templates', name: 'Plantillas', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FunnelIcon className="w-4 h-4" />
              Filtro
            </button>
            <button 
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              Nuevo Mensaje
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          {activeTab === 'conversations' && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Conversaciones</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedConversation === conversation.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(conversation.type)}
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conversation.participantName}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {conversation.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conversation.lastMessageTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ventana de conversación WhatsApp */}
          {activeTab === 'conversations' && (
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
                        {selectedConversation 
                          ? conversations.find(c => c.id === selectedConversation)?.participantName || 'WhatsApp Business'
                          : 'WhatsApp Business'
                        }
                      </h3>
                      <p className="text-sm text-green-100">En línea</p>
                    </div>
                  </div>
                </div>

                {/* Área de mensajes */}
                <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
                  <div className="space-y-3">
                    {selectedConversation ? (
                      <>
                        {/* Mensaje del sistema */}
                        <div className="flex justify-center">
                          <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                            Conversación iniciada
                          </div>
                        </div>

                        {/* Mensaje de ejemplo del sistema */}
                        <div className="flex justify-end">
                          <div className="bg-green-500 text-white max-w-xs p-3 rounded-lg rounded-br-none">
                            <p className="text-sm">Hola! ¿En qué puedo ayudarte hoy?</p>
                            <p className="text-xs text-green-100 mt-1">14:30</p>
                          </div>
                        </div>

                        {/* Respuesta del usuario */}
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-800 max-w-xs p-3 rounded-lg rounded-bl-none shadow-sm">
                            <p className="text-sm">Hola, tengo una consulta sobre mi postulación</p>
                            <p className="text-xs text-gray-500 mt-1">14:32</p>
                          </div>
                        </div>

                        {/* Mensaje del sistema */}
                        <div className="flex justify-end">
                          <div className="bg-green-500 text-white max-w-xs p-3 rounded-lg rounded-br-none">
                            <p className="text-sm">Perfecto! Estoy aquí para ayudarte. ¿Cuál es tu consulta específica?</p>
                            <p className="text-xs text-green-100 mt-1">14:33</p>
                          </div>
                        </div>
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                    <button className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages List */}
          {activeTab === 'messages' && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Mensajes</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {messages.map((message) => (
                    <div key={message.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {message.senderName}
                            </p>
                            <span className="text-gray-400">→</span>
                            <p className="text-sm text-gray-600">
                              {message.recipientName}
                            </p>
                            {!message.isRead && (
                              <BellIcon className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {message.subject}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {message.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {message.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Templates */}
          {activeTab === 'templates' && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Plantillas de Mensajes</h3>
                  <div className="text-center py-12">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay plantillas disponibles</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Crear Primera Plantilla
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Nuevo Mensaje</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Para
                  </label>
                  <input
                    type="text"
                    placeholder="Seleccionar destinatario..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    placeholder="Asunto del mensaje..."
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
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Enviar Mensaje
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
