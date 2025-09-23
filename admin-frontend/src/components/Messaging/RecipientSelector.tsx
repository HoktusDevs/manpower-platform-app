import React, { useState, useEffect, useRef } from 'react';
import { User, Recipient } from '../../types/messaging';

interface RecipientSelectorProps {
  selectedRecipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  availableUsers: User[];
}

export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  selectedRecipients,
  onRecipientsChange,
  availableUsers
}) => {
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    (user.phone && user.phone.includes(recipientSearch)) ||
    (user.email && user.email.toLowerCase().includes(recipientSearch.toLowerCase()))
  );

  const addRecipient = (user: User) => {
    if (!selectedRecipients.find(r => r.id === user.id)) {
      onRecipientsChange([...selectedRecipients, user]);
    }
    setRecipientSearch('');
    setShowRecipientDropdown(false);
  };

  const removeRecipient = (id: string) => {
    onRecipientsChange(selectedRecipients.filter(r => r.id !== id));
  };

  const addNewContact = () => {
    if (recipientSearch.trim()) {
      const newContact: Recipient = {
        id: `new-${Date.now()}`,
        name: recipientSearch.trim(),
        phone: recipientSearch.includes('+') ? recipientSearch : undefined
      };
      onRecipientsChange([...selectedRecipients, newContact]);
      setRecipientSearch('');
      setShowRecipientDropdown(false);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecipientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Recipients tags */}
      {selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedRecipients.map((recipient) => (
            <span
              key={recipient.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {recipient.name}
              {recipient.phone && ` (${recipient.phone})`}
              <button
                onClick={() => removeRecipient(recipient.id)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* Search input */}
      <input
        type="text"
        placeholder="Buscar o agregar destinatario..."
        value={recipientSearch}
        onChange={(e) => {
          setRecipientSearch(e.target.value);
          setShowRecipientDropdown(true);
        }}
        onFocus={() => setShowRecipientDropdown(true)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {/* Dropdown with search results */}
      {showRecipientDropdown && recipientSearch && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => addRecipient(user)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">
                    {user.phone} • {user.email}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500">
              No se encontraron contactos
            </div>
          )}
          
          {/* Add new contact option */}
          {recipientSearch.trim() && (
            <div
              onClick={addNewContact}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-t border-gray-200 text-blue-600 font-medium"
            >
              + Agregar "{recipientSearch.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
