import React, { useState, useRef } from 'react';

export const TestOCRPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setOcrResult(null);
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = async () => {
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo primero');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simular procesamiento OCR (reemplazar con endpoint real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Resultado simulado - reemplazar con llamada real a API
      const mockResult = {
        success: true,
        text: `Texto extraído de la imagen:
        
        Este es un texto de ejemplo extraído mediante OCR.
        La imagen contenía texto que fue procesado y convertido
        a formato digital para su posterior análisis.
        
        Características detectadas:
        - Número de líneas: 4
        - Número de palabras: 25
        - Confianza: 95%`,
        confidence: 95,
        processingTime: '2.1s',
        language: 'es',
        metadata: {
          width: 800,
          height: 600,
          format: selectedFile.type,
          size: selectedFile.size
        }
      };

      setOcrResult(mockResult);
    } catch (err) {
      setError('Error al procesar la imagen: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTestImage = () => {
    // Crear una imagen de prueba con texto
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 200;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText('Documento de Prueba', 20, 40);
    ctx.fillText('Nombre: Juan Pérez', 20, 70);
    ctx.fillText('RUT: 12.345.678-9', 20, 100);
    ctx.fillText('Fecha: 15/12/2024', 20, 130);
    ctx.fillText('Este es un texto de prueba para OCR', 20, 160);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'test-document.png', { type: 'image/png' });
        setSelectedFile(file);
        setPreviewUrl(canvas.toDataURL());
        setError(null);
        setOcrResult(null);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test OCR</h1>
          <p className="text-gray-600">
            Prueba la funcionalidad de reconocimiento óptico de caracteres (OCR) para extraer texto de imágenes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo - Subida de archivos */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar imagen
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Seleccionar archivo
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  Formatos soportados: JPG, PNG, PDF
                </p>
              </div>
            </div>

            {selectedFile && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Archivo seleccionado:</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm"><strong>Nombre:</strong> {selectedFile.name}</p>
                  <p className="text-sm"><strong>Tamaño:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <p className="text-sm"><strong>Tipo:</strong> {selectedFile.type}</p>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleOCR}
                disabled={!selectedFile || isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Procesando...' : 'Procesar OCR'}
              </button>
              
              <button
                onClick={handleTestImage}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Imagen de prueba
              </button>
              
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Panel derecho - Preview y resultados */}
          <div className="space-y-6">
            {/* Preview de imagen */}
            {previewUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Vista previa:</h3>
                <div className="border rounded-md p-2 bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-auto max-h-64 mx-auto rounded"
                  />
                </div>
              </div>
            )}

            {/* Resultados OCR */}
            {ocrResult && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Resultado OCR:</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Confianza:</span>
                      <span className="text-sm text-green-600">{ocrResult.confidence}%</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Tiempo de procesamiento:</span>
                      <span className="text-sm text-gray-600">{ocrResult.processingTime}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Idioma detectado:</span>
                      <span className="text-sm text-gray-600">{ocrResult.language}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Texto extraído:</label>
                    <textarea
                      value={ocrResult.text}
                      readOnly
                      rows={8}
                      className="w-full mt-2 p-3 border border-gray-300 rounded-md bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Información sobre OCR:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>OCR (Optical Character Recognition):</strong> Tecnología para extraer texto de imágenes</li>
            <li>• Útil para digitalizar documentos, formularios y textos impresos</li>
            <li>• Puede procesar documentos, capturas de pantalla, fotos de documentos</li>
            <li>• La precisión depende de la calidad de la imagen y el tipo de fuente</li>
            <li>• Ideal para automatizar la entrada de datos desde documentos físicos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
