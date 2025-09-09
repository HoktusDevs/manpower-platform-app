interface TypeBadgeProps {
  type: string;
}

/**
 * TypeBadge Atom
 * Pure component for displaying folder type
 * Follows Single Responsibility Principle
 */
export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {type}
    </span>
  );
};