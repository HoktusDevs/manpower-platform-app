import React, { useState, useEffect, useRef } from 'react';
import { useFoldersState } from '../FoldersAndFiles/hooks/useFoldersState';
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
  const { folders, isLoading } = useFoldersState();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyOption[]>([]);
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

    // Sort by hierarchy (root folders first, then by name)
    return options.sort((a, b) => {
      // Root folders first
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      
      // Then by depth (shorter paths first)
      if (a.path.length !== b.path.length) {
        return a.path.length - b.path.length;
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
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

      {/* Dropdown */}
      {isOpen && !isLoading && filteredCompanies.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-72 overflow-y-auto">
          {filteredCompanies.map((company) => {
            const isSubfolder = company.parentId !== null;
            const depth = company.path.length - 1;
            
            return (
              <div
                key={company.id}
                onClick={() => handleCompanySelect(company)}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                  isSubfolder ? 'bg-gray-25' : ''
                }`}
                style={{ paddingLeft: `${16 + (depth * 20)}px` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      {/* Folder icon with hierarchy indicator */}
                      <div className="mr-2">
                        {isSubfolder ? (
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {company.path[company.path.length - 1]}
                        </div>
                        {company.path.length > 1 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            en {company.path.slice(0, -1).join(' > ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 ml-6">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {company.type}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
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