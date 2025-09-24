export const TABLE_HEADERS = [
  { key: 'document', label: 'Documento' },
  { key: 'status', label: 'Estado' },
  { key: 'time', label: 'Tiempo' },
  { key: 'actions', label: 'Acciones' }
] as const;

export const SKELETON_ROWS_COUNT = 3;

export const TABLE_CLASSES = {
  container: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
  table: 'min-w-full divide-y divide-gray-200',
  header: 'bg-gray-50 sticky top-0 z-10',
  headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  body: 'bg-white divide-y divide-gray-200',
  row: 'hover:bg-gray-50',
  processingRow: 'opacity-60',
  cell: 'px-6 py-4 whitespace-nowrap',
  documentTitle: 'text-sm font-medium text-gray-900',
  documentFileName: 'text-sm text-gray-500',
  timeText: 'text-sm text-gray-900',
  actionsContainer: 'flex space-x-2'
} as const;
