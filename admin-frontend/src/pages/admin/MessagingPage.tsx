import React, { useState } from 'react';
import { 
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BellIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { ConversationList, WhatsAppChat, MessageComposer } from '../../components/Messaging';
import type { Conversation, Message, User } from '../../types/messaging';

export const MessagingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'messages' | 'templates'>('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
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

  // Mock data para usuarios disponibles
  const availableUsers: User[] = [
    { id: '1', name: 'Juan Pérez', phone: '+1234567890', email: 'juan.perez@email.com' },
    { id: '2', name: 'María González', phone: '+1234567891', email: 'maria.gonzalez@email.com' },
    { id: '3', name: 'Carlos Rodríguez', phone: '+1234567892', email: 'carlos.rodriguez@email.com' },
    { id: '4', name: 'Ana López', phone: '+1234567893', email: 'ana.lopez@email.com' },
    { id: '5', name: 'Pedro Martínez', phone: '+1234567894', email: 'pedro.martinez@email.com' }
  ];

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participantEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );


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
              {activeTab === 'conversations' ? 'Nueva conversación' : 'Nuevo Mensaje'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          {activeTab === 'conversations' && (
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              onConversationSelect={setSelectedConversation}
            />
          )}

          {/* WhatsApp Chat */}
          {activeTab === 'conversations' && (
            <WhatsAppChat
              selectedConversation={selectedConversation}
              conversations={conversations}
            />
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

        {/* Message Composer Modal */}
        <MessageComposer
          isOpen={showCompose}
          onClose={() => setShowCompose(false)}
          activeTab={activeTab}
          availableUsers={availableUsers}
        />
      </div>
    </div>
  );
};