import React, { useState, useEffect, useRef } from 'react';

interface ManualActionSelectorProps {
  currentDecision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING';
  onDecisionChange: (decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING') => void;
  disabled?: boolean;
}

const ManualActionSelector: React.FC<ManualActionSelectorProps> = ({
  currentDecision,
  onDecisionChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(currentDecision);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar selectedDecision con currentDecision
  useEffect(() => {
    setSelectedDecision(currentDecision);
  }, [currentDecision]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = [
    { value: 'PENDING', label: 'Pendiente', color: 'bg-gray-100 text-gray-800' },
    { value: 'REJECTED', label: 'Rechazar', color: 'bg-red-100 text-red-800' },
    { value: 'APPROVED', label: 'Aprobar', color: 'bg-green-100 text-green-800' },
    { value: 'MANUAL_REVIEW', label: 'Revisión Manual', color: 'bg-yellow-100 text-yellow-800' },
  ];

  const currentOption = options.find(opt => opt.value === selectedDecision) || options[0];
  const hasChanges = selectedDecision !== currentDecision;

  const handleOptionClick = (option: typeof options[0]) => {
    setSelectedDecision(option.value);
    setIsOpen(false);
  };

  const handleUpdateState = () => {
    onDecisionChange(selectedDecision as 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'PENDING');
  };

  if (disabled) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        {currentOption.label}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-fit">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentOption.color} hover:opacity-80 transition-opacity`}
      >
        {currentOption.label}
        <svg
          className={`ml-1 h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                selectedDecision === option.value ? 'bg-blue-50' : ''
              }`}
            >
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasChanges && (
        <button
          type="button"
          onClick={handleUpdateState}
          className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        >
          Actualizar
        </button>
      )}
    </div>
  );
};

export default ManualActionSelector;
