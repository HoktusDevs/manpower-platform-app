interface ViewToggleProps {
  currentView: 'table' | 'grid';
  onViewChange: (view: 'table' | 'grid') => void;
}

/**
 * ViewToggle Atom
 * Toggle button for switching between table and grid views
 * Follows Single Responsibility Principle
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange
}) => {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      {/* Table View Button */}
      <button
        type="button"
        onClick={() => onViewChange('table')}
        className={`px-3 py-2 text-sm font-medium rounded-l-lg border ${
          currentView === 'table'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
        aria-label="Vista tabla"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Grid View Button */}
      <button
        type="button"
        onClick={() => onViewChange('grid')}
        className={`px-3 py-2 text-sm font-medium rounded-r-lg border ${
          currentView === 'grid'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
        aria-label="Vista iconos"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );
};