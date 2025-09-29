import { APIGatewayProxyEvent } from 'aws-lambda';

interface ParsedFormData {
  folderName: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  explanation?: string;
  file: {
    name: string;
    type: string;
    data: Buffer;
  };
}

/**
 * Parse multipart/form-data from API Gateway event
 */
export const parseMultipartFormData = async (
  event: APIGatewayProxyEvent
): Promise<ParsedFormData | null> => {
  try {
    const contentType = event.headers['Content-Type'] || event.headers['content-type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.error('❌ Content-Type is not multipart/form-data');
      return null;
    }

    // Extract boundary from Content-Type header
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      console.error('❌ No boundary found in Content-Type');
      return null;
    }

    // Get body data
    let bodyBuffer: Buffer;
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(event.body || '', 'base64');
    } else {
      bodyBuffer = Buffer.from(event.body || '', 'utf-8');
    }

    // Parse multipart data
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;

    while (true) {
      const boundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start);
      if (boundaryIndex === -1) break;

      if (start > 0) {
        parts.push(bodyBuffer.slice(start, boundaryIndex));
      }
      start = boundaryIndex + boundaryBuffer.length;
    }

    // Parse each part
    const formData: any = {};
    let fileData: { name: string; type: string; data: Buffer } | null = null;

    for (const part of parts) {
      const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEndIndex === -1) continue;

      const headerSection = part.slice(0, headerEndIndex).toString();
      const bodySection = part.slice(headerEndIndex + 4);

      // Remove trailing \r\n
      const cleanBodySection = bodySection.slice(0, -2);

      // Parse Content-Disposition header
      const dispositionMatch = headerSection.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/);
      if (!dispositionMatch) continue;

      const fieldName = dispositionMatch[1];
      const fileName = dispositionMatch[2];

      if (fileName) {
        // This is a file field
        const contentTypeMatch = headerSection.match(/Content-Type: ([^\r\n]+)/);
        const fileContentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

        fileData = {
          name: fileName,
          type: fileContentType,
          data: cleanBodySection
        };
      } else {
        // This is a regular form field
        formData[fieldName] = cleanBodySection.toString();
      }
    }

    // Validate required fields
    if (!formData.folderName || !formData.status || !fileData) {
      console.error('❌ Missing required fields in multipart data');
      return null;
    }

    console.log(`✅ Parsed multipart data: folder="${formData.folderName}", status="${formData.status}", file="${fileData.name}"`);

    return {
      folderName: formData.folderName,
      status: formData.status as 'APPROVED' | 'REJECTED' | 'PENDING',
      explanation: formData.explanation,
      file: fileData
    };

  } catch (error) {
    console.error('❌ Error parsing multipart form data:', error);
    return null;
  }
};