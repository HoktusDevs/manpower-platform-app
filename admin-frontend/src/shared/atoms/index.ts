// Wrapper pattern - for complex forms with custom inputs
export { FormField, type FormFieldProps } from './FormField';

// Direct input pattern - for simple forms (compatible with JobManagement)
export { TextInput, type TextInputProps } from './TextInput';
export { TextArea, type TextAreaProps } from './TextArea';

// Consolidated empty state - replaces all duplicates
export { EmptyState, type EmptyStateProps } from './EmptyStateSimple';

export { Label, type LabelProps } from './Label';