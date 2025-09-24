import { useState } from 'react';
import * as XLSX from 'xlsx';

const WHATSAPP_API_BASE = 'https://whatsappchatbothardcoded-production.up.railway.app';

export const TestWhatsappPage = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState('send_documents_missing_3378594');
  const [userName, setUserName] = useState('');
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<Array<{ nombre: string; telefono: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSendTemplateMessage = async () => {
    if (!phoneNumber.trim() || !userName.trim()) {
      alert('Por favor, completa el número de teléfono y nombre del usuario');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/send_template_message`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            userData: {
              phone: phoneNumber.replace(/\D/g, ''),
              name_user: userName
            },
            messageData: {
              template_name: templateName,
              template_parameters: [
                { type: "text", text: userName },
                { type: "text", text: "Nombre archivo 1" },
                { type: "text", text: "Nombre archivo 2" },
                { type: "text", text: "Nombre archivo 3" },
                { type: "text", text: "Nombre archivo 4" },
                { type: "text", text: "Nombre archivo 5" },
                { type: "text", text: "Nombre archivo 6" },
                { type: "text", text: "Nombre archivo 7" },
                { type: "text", text: "-" },
                { type: "text", text: "-" }
              ],
              template_type: "normal"
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data);
    } catch (error) {
      setResponse({ 
        error: 'Error al enviar mensaje de plantilla: ' + error,
        details: 'Posible problema de CORS. Verifica que el servidor permita requests desde este dominio.',
        suggestion: 'Contacta al administrador del servidor para configurar CORS o usa un proxy.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = () => {
    setPhoneNumber('+56912345678');
    setUserName('Test User');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const excelFile = files.find(file =>
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls')
    );

    if (excelFile) {
      processExcelFile(excelFile);
    } else {
      alert('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const processExcelFile = async (file: File) => {
    setExcelFile(file);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Procesar el archivo Excel real usando la librería xlsx
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Tomar la primera hoja del Excel
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

          if (jsonData.length === 0) {
            alert('El archivo Excel está vacío');
            return;
          }

          // La primera fila debería contener los headers
          const headers = jsonData[0];
          // Buscar las columnas de Nombre y Telefono (case-insensitive)
          const nombreIndex = headers.findIndex((header: string) =>
            header && header.toString().toLowerCase().includes('nombre')
          );
          const telefonoIndex = headers.findIndex((header: string) =>
            header && (
              header.toString().toLowerCase().includes('telefono') ||
              header.toString().toLowerCase().includes('teléfono') ||
              header.toString().toLowerCase().includes('celular') ||
              header.toString().toLowerCase().includes('phone')
            )
          );

          if (nombreIndex === -1 || telefonoIndex === -1) {
            alert('No se encontraron las columnas "Nombre" y "Telefono". Asegúrate de que el Excel tenga estas columnas en la primera fila.');
            return;
          }

          // Procesar las filas de datos (excluyendo la primera fila de headers)
          const contacts = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const nombre = row[nombreIndex]?.toString().trim();
            const telefono = row[telefonoIndex]?.toString().trim();

            // Solo agregar si ambos campos tienen datos
            if (nombre && telefono && nombre !== '' && telefono !== '') {
              // Formatear el teléfono si no tiene código de país
              let formattedPhone = telefono;
              if (!telefono.startsWith('+')) {
                // Si el número no empieza con +, agregar +56 para Chile
                if (telefono.startsWith('56')) {
                  formattedPhone = '+' + telefono;
                } else if (telefono.startsWith('9') && telefono.length === 9) {
                  formattedPhone = '+56' + telefono;
                } else {
                  formattedPhone = '+56' + telefono;
                }
              }

              contacts.push({
                nombre: nombre,
                telefono: formattedPhone
              });
            }
          }

          if (contacts.length === 0) {
            alert('No se encontraron contactos válidos en el archivo Excel. Verifica que las filas tengan datos en las columnas Nombre y Telefono.');
            return;
          }

          setExcelData(contacts);
          } catch (parseError) {
          alert('Error al procesar el contenido del archivo Excel. Asegúrate de que sea un archivo Excel válido.');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert('Error al procesar el archivo Excel');
    }
  };

  const handleSendToSelectedUsers = async () => {
    if (selectedUsers.length === 0) {
      alert('Por favor, selecciona al menos un usuario');
      return;
    }

    setIsLoading(true);
    const results = [];
    const selectedContacts = excelData.filter(contact => selectedUsers.includes(contact.telefono));

    for (const contact of selectedContacts) {
      try {
        const response = await fetch(`${WHATSAPP_API_BASE}/whatsapp/send_template_message`, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            data: {
              userData: {
                phone: contact.telefono.replace(/\D/g, ''),
                name_user: contact.nombre
              },
              messageData: {
                template_name: templateName,
                template_parameters: [
                  { type: "text", text: contact.nombre },
                  { type: "text", text: "Nombre archivo 1" },
                  { type: "text", text: "Nombre archivo 2" },
                  { type: "text", text: "Nombre archivo 3" },
                  { type: "text", text: "Nombre archivo 4" },
                  { type: "text", text: "Nombre archivo 5" },
                  { type: "text", text: "Nombre archivo 6" },
                  { type: "text", text: "Nombre archivo 7" },
                  { type: "text", text: "-" },
                  { type: "text", text: "-" }
                ],
                template_type: "normal"
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          results.push({ nombre: contact.nombre, telefono: contact.telefono, success: true, data });
        } else {
          results.push({ nombre: contact.nombre, telefono: contact.telefono, success: false, error: `HTTP ${response.status}` });
        }
      } catch (error) {
        results.push({ nombre: contact.nombre, telefono: contact.telefono, success: false, error: String(error) });
      }

      // Pausa de 1 segundo entre mensajes para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setResponse({
      bulk: true,
      total: selectedUsers.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

    setIsLoading(false);
  };

  const clearExcelData = () => {
    setExcelFile(null);
    setExcelData([]);
    setSelectedUsers([]);
  };

  const handleUserSelection = (telefono: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, telefono]);
    } else {
      setSelectedUsers(prev => prev.filter(t => t !== telefono));
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === excelData.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(excelData.map(contact => contact.telefono));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Test WhatsApp</h1>
          <p className="text-gray-600">
            Prueba la funcionalidad de envío de mensajes por WhatsApp usando los endpoints reales
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel izquierdo - Envío individual */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Envío Individual</h2>

            {/* Número de teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Número de teléfono
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+56912345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Nombre del usuario */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del usuario
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nombre del usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Nombre de la plantilla */}
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la plantilla
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="send_documents_missing_3378594"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Botones */}
            <div className="flex space-x-4">
              <button
                onClick={handleSendTemplateMessage}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar Plantilla'}
              </button>

              <button
                onClick={handleTestMessage}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cargar datos de prueba
              </button>
            </div>
          </div>

          {/* Panel derecho - Envío desde Excel */}
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900">Cargar Contactos desde Excel</h2>

            {/* Drag and Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo Excel con contactos
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('excel-file-input')?.click()}
              >
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Arrastra tu archivo Excel aquí
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Formatos: .xlsx, .xls
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Archivo cargado */}
            {excelFile && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{excelFile.name}</p>
                      <p className="text-xs text-green-600">{excelData.length} contacto(s) encontrado(s)</p>
                    </div>
                  </div>
                  <button
                    onClick={clearExcelData}
                    className="text-green-600 hover:text-green-800"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Lista de contactos seleccionables */}
            {excelData.length > 0 && (
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Seleccionar destinatarios:</h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedUsers.length === excelData.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {excelData.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`contact-${index}`}
                          checked={selectedUsers.includes(contact.telefono)}
                          onChange={(e) => handleUserSelection(contact.telefono, e.target.checked)}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`contact-${index}`} className="flex-1 cursor-pointer">
                          <div className="text-sm font-medium text-gray-900">{contact.nombre}</div>
                          <div className="text-xs text-gray-500">{contact.telefono}</div>
                        </label>
                      </div>

                      {selectedUsers.includes(contact.telefono) && (
                        <div className="text-green-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Contador de seleccionados */}
                <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  {selectedUsers.length} de {excelData.length} contacto(s) seleccionado(s)
                </div>
              </div>
            )}

            {/* Botón de envío a usuarios seleccionados */}
            <button
              onClick={handleSendToSelectedUsers}
              disabled={isLoading || selectedUsers.length === 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? `Enviando ${selectedUsers.length} mensajes...`
                : selectedUsers.length > 0
                  ? `Enviar plantilla a ${selectedUsers.length} contacto(s)`
                  : 'Selecciona contactos para enviar'
              }
            </button>
          </div>
        </div>

        {/* Respuesta de la API */}
        {response && (
          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-800 mb-2">
              {response.bulk ? 'Resultado del Envío Masivo:' : 'Respuesta de la API:'}
            </h3>

            {response.bulk ? (
              <div className="space-y-4">
                {/* Resumen del envío masivo */}
                <div className="bg-white p-4 rounded border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{response.total}</div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{response.successful}</div>
                      <div className="text-sm text-gray-500">Exitosos</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{response.failed}</div>
                      <div className="text-sm text-gray-500">Fallidos</div>
                    </div>
                  </div>
                </div>

                {/* Detalles de los envíos */}
                <div className="bg-white rounded border max-h-60 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Teléfono</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(response.results as Array<{ nombre: string; telefono: string; success: boolean }>).map((result, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="px-3 py-2 text-gray-800">{result.nombre}</td>
                          <td className="px-3 py-2 text-gray-800">{result.telefono}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.success ? 'Enviado' : 'Error'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                {JSON.stringify(response, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
