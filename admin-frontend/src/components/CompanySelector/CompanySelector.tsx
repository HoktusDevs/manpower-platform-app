import React, { useState, useEffect, useRef } from 'react';
import { useFoldersContext } from '../FoldersAndFiles';
import type { FolderRow } from '../FoldersAndFiles/types';

interface CompanySelectorProps {
  value: string;
  onChange: (companyName: string, folderId?: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
  placeholder?: string;
  hasError?: boolean;
}

interface CompanyOption {
  id: string;
  name: string;
  type: string;
  path: string[]; // Array of parent folder names for breadcrumb
  parentId?: string | null;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  className = '',
  placeholder = 'Buscar empresa...',
  hasError = false
}) => {
  const { folders, isLoading } = useFoldersContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyOption[]>([]);
  // Removed expandedFolders state as we're now showing all companies in a simple list
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build company options from folders
  const buildCompanyOptions = (folders: FolderRow[]): CompanyOption[] => {
    const options: CompanyOption[] = [];
    
    // Create a map for quick parent lookup
    const folderMap = new Map<string, FolderRow>();
    folders.forEach(folder => folderMap.set(folder.id, folder));
    
    // Function to build path from folder to root
    const buildPath = (folderId: string): string[] => {
      const path: string[] = [];
      let currentId: string | undefined = folderId;
      
      while (currentId) {
        const folder = folderMap.get(currentId);
        if (folder) {
          path.unshift(folder.name);
          currentId = folder.parentId || undefined;
        } else {
          break;
        }
      }
      
      return path;
    };

    // Include all folders as potential company options
    folders.forEach(folder => {
      const path = buildPath(folder.id);
      
      // Create a display name that shows hierarchy
      let displayName = folder.name;
      if (path.length > 1) {
        // Show parent structure for context: "ParentCompany > Department"
        displayName = path.join(' > ');
      }
      
      options.push({
        id: folder.id,
        name: displayName,
        type: folder.type,
        path: path,
        parentId: folder.parentId
      });
    });

    // Simple sort by name for accordion display (hierarchy is handled visually)
    const sortedOptions = [...options].sort((a, b) => {
      const aFolderName = a.path[a.path.length - 1] || '';
      const bFolderName = b.path[b.path.length - 1] || '';
      return aFolderName.localeCompare(bFolderName);
    });
    
    return sortedOptions;
  };

  useEffect(() => {
    const companies = buildCompanyOptions(folders);
    const filtered = companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [folders, searchTerm]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    // Allow typing custom company names
    onChange(newValue);
  };

  const handleCompanySelect = (company: CompanyOption) => {
    // Use the full path for display to show hierarchy
    const displayName = company.path.join(' > ');
    setSearchTerm(displayName);
    onChange(displayName, company.id);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Removed accordion functions as we're now using a simple list view

  // Function to render companies with proper hierarchy
  const renderHierarchicalCompanies = () => {
    // Get root companies (no parent)
    const rootCompanies = filteredCompanies.filter(company => !company.parentId);

    // Function to get children of a folder
    const getChildren = (parentId: string): CompanyOption[] => {
      return filteredCompanies.filter(company => company.parentId === parentId);
    };

    // Function to render a company and its children recursively
    const renderCompanyWithChildren = (company: CompanyOption, level: number = 0): React.JSX.Element[] => {
      const children = getChildren(company.id);
      const paddingLeft = level * 16; // 16px per level

      const elements: React.JSX.Element[] = [];

      // Render the company itself
      elements.push(
        <div
          key={company.id}
          onClick={() => handleCompanySelect(company)}
          className="flex items-center py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
          style={{ paddingLeft: `${16 + paddingLeft}px`, paddingRight: '16px' }}
        >
          {/* Indentation indicators */}
          {level > 0 && (
            <div className="flex items-center mr-2">
              {Array.from({ length: level }).map((_, i) => (
                <div key={i} className="w-4 h-4 flex items-center justify-center">
                  {i === level - 1 ? (
                    <div className="w-2 h-2 border-l border-b border-gray-300"></div>
                  ) : (
                    <div className="w-px h-full bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mr-3">
            <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{company.path[company.path.length - 1]}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {company.type}
              </span>
              {children.length > 0 && (
                <span className="ml-2 text-gray-400">
                  {children.length} subcarpeta{children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      );

      // Render children recursively
      children.forEach(child => {
        elements.push(...renderCompanyWithChildren(child, level + 1));
      });

      return elements;
    };

    // Render all root companies and their hierarchies
    const allElements: React.JSX.Element[] = [];
    rootCompanies.forEach(rootCompany => {
      allElements.push(...renderCompanyWithChildren(rootCompany));
    });

    return allElements;
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handleInputBlur = () => {
    // Delay blur to allow for option selection
    setTimeout(() => {
      onBlur?.();
    }, 150);
  };

  const baseClassName = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
    hasError 
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
  } ${className}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={baseClassName}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-green-500 rounded-full"></div>
        </div>
      )}

      {/* Company Dropdown with Hierarchy */}
      {isOpen && !isLoading && filteredCompanies.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {renderHierarchicalCompanies()}
        </div>
      )}

      {/* No results message */}
      {isOpen && !isLoading && searchTerm && filteredCompanies.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-sm">
            No se encontraron empresas. Puedes escribir el nombre manualmente.
          </div>
        </div>
      )}
    </div>
  );
};