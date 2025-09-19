interface BreadcrumbItemProps {
  label: string;
  isLast?: boolean;
  onClick?: () => void;
}

/**
 * BreadcrumbItem Atom
 * Individual breadcrumb item for navigation
 */
export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  label,
  isLast = false,
  onClick
}) => {
  const handleClick = (): void => {
    if (onClick && !isLast) {
      onClick();
    }
  };

  return (
    <span className="flex items-center">
      <button
        type="button"
        onClick={handleClick}
        className={`text-sm font-medium ${
          isLast 
            ? 'text-gray-900 cursor-default' 
            : 'text-blue-600 hover:text-blue-800 cursor-pointer'
        }`}
        disabled={isLast}
      >
        {label}
      </button>
      {!isLast && (
        <svg
          className="w-4 h-4 mx-2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </span>
  );
};