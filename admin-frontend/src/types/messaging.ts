export interface Message {
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

export interface Conversation {
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

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Recipient {
  id: string;
  name: string;
  phone?: string;
}
