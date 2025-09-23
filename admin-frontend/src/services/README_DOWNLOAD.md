# Servicio de Descarga de ZIP

Este servicio permite descargar carpetas y archivos seleccionados como archivos ZIP directamente desde el frontend.

## Características

- ✅ Descarga de todo el contenido
- ✅ Descarga de elementos seleccionados
- ✅ Creación de ZIP en el frontend usando JSZip
- ✅ Indicador de progreso en tiempo real
- ✅ Manejo de errores
- ✅ Interfaz de usuario intuitiva

## Uso

### Hook useDownloadZip

```typescript
import { useDownloadZip } from '../hooks/useDownloadZip';

const MyComponent = () => {
  const {
    isDownloading,
    progress,
    downloadAllContent,
    downloadSelectedItems,
    clearProgress
  } = useDownloadZip();

  const handleDownloadAll = async () => {
    try {
      await downloadAllContent();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDownloadSelected = async (selectedIds: string[], allFolders: Folder[]) => {
    try {
      await downloadSelectedItems(selectedIds, allFolders);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {progress && (
        <DownloadProgressComponent
          progress={progress}
          onClose={clearProgress}
        />
      )}
    </div>
  );
};
```

### Servicio Directo

```typescript
import { downloadZipService } from '../services/downloadZipService';

// Descargar todo el contenido
await downloadZipService.downloadAllContent((progress) => {
  console.log('Progreso:', progress);
});

// Descargar elementos seleccionados
await downloadZipService.downloadSelectedItems(
  ['folder1', 'folder2'], 
  allFolders,
  (progress) => {
    console.log('Progreso:', progress);
  }
);
```

## Estados de Progreso

- `preparing`: Preparando la descarga
- `downloading`: Descargando archivos
- `creating-zip`: Creando archivo ZIP
- `completed`: Descarga completada
- `error`: Error en la descarga

## Componentes

### DownloadProgressComponent

Muestra el progreso de la descarga con:
- Barra de progreso
- Estado actual
- Elemento siendo procesado
- Mensajes de éxito/error

### DownloadDropdown

Dropdown con opciones de descarga:
- "Todo el contenido"
- "Contenido seleccionado"

## Configuración

El servicio está configurado para:
- Usar JSZip para crear archivos ZIP
- Integrar con el servicio de documentos existente
- Mostrar progreso en tiempo real
- Manejar errores gracefully

## Dependencias

- `jszip`: Para crear archivos ZIP
- Servicios existentes: `documentsService`, `foldersApiService`
