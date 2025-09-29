import React, { useState, useEffect, useRef } from 'react';

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
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
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


  const handleShowNewContactForm = () => {
    setNewContactName(recipientSearch.trim());
    setNewContactPhone('');
    setShowNewContactForm(true);
    setShowRecipientDropdown(false);
  };

  const handleAddNewContactWithDetails = () => {
    if (newContactName.trim()) {
      const newContact: Recipient = {
        id: `new-${Date.now()}`,
        name: newContactName.trim(),
        phone: newContactPhone.trim() || undefined
      };
      onRecipientsChange([...selectedRecipients, newContact]);
      setNewContactName('');
      setNewContactPhone('');
      setShowNewContactForm(false);
      setRecipientSearch('');
    }
  };

  const handleCancelNewContact = () => {
    setNewContactName('');
    setNewContactPhone('');
    setShowNewContactForm(false);
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
          
          {/* Add new contact options */}
          {recipientSearch.trim() && (
            <div className="border-t border-gray-200">
              <div
                onClick={handleShowNewContactForm}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-blue-600 font-medium"
              >
                + Agregar "{recipientSearch.trim()}" con teléfono
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Contact Form Modal */}
      {showNewContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Agregar Nuevo Contacto</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelNewContact}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddNewContactWithDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Agregar Contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
