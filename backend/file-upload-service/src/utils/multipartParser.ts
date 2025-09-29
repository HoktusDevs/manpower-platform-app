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
      // For binary data, treat as binary not as UTF-8 to avoid corruption
      bodyBuffer = Buffer.from(event.body || '', 'binary');
    }

    // Parse multipart data using proper boundary splitting
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

    // Split by boundary
    const parts = [];
    let currentPos = 0;

    while (currentPos < bodyBuffer.length) {
      const boundaryIndex = bodyBuffer.indexOf(boundaryBuffer, currentPos);
      if (boundaryIndex === -1) break;

      // Skip the boundary itself
      const contentStart = boundaryIndex + boundaryBuffer.length;

      // Find next boundary or end boundary
      const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, contentStart);
      const endBoundaryIndex = bodyBuffer.indexOf(endBoundaryBuffer, contentStart);

      let contentEnd;
      if (endBoundaryIndex !== -1 && (nextBoundaryIndex === -1 || endBoundaryIndex < nextBoundaryIndex)) {
        contentEnd = endBoundaryIndex;
        currentPos = bodyBuffer.length; // This is the last part
      } else if (nextBoundaryIndex !== -1) {
        contentEnd = nextBoundaryIndex;
        currentPos = nextBoundaryIndex;
      } else {
        break;
      }

      // Extract the content between boundaries
      if (contentStart < contentEnd && contentStart > boundaryIndex) {
        const part = bodyBuffer.slice(contentStart, contentEnd);
        // Skip empty parts and boundary-only parts
        if (part.length > 4) {
          parts.push(part);
        }
      }
    }

    // Parse each part
    const formData: any = {};
    let fileData: { name: string; type: string; data: Buffer } | null = null;

    for (const part of parts) {
      // Skip initial CRLF after boundary
      let actualPart = part;
      if (part.length >= 2 && part[0] === 0x0D && part[1] === 0x0A) {
        actualPart = part.slice(2);
      }

      const headerEndIndex = actualPart.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEndIndex === -1) continue;

      const headerSection = actualPart.slice(0, headerEndIndex).toString();
      const bodySection = actualPart.slice(headerEndIndex + 4);

      // Remove trailing CRLF only if it exists at the very end
      let cleanBodySection = bodySection;
      if (bodySection.length >= 2 &&
          bodySection[bodySection.length - 2] === 0x0D && // \r
          bodySection[bodySection.length - 1] === 0x0A) {  // \n
        cleanBodySection = bodySection.slice(0, -2);
      }

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