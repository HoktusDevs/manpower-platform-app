/**
 * Script de limpieza de datos huérfanos y basura
 *
 * Este script limpia:
 * 1. Documentos en folders de test (ocr-temp-folder, test-folder-documents)
 * 2. Folders de postulantes sin aplicación asociada
 * 3. Archivos de prueba en S3
 * 4. Archivos S3 sin registro en DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

const REGION = 'us-east-1';
const DOCUMENTS_TABLE = 'manpower-documents-dev';
const FOLDERS_TABLE = 'manpower-folders-dev';
const APPLICATIONS_TABLE = 'manpower-applications-dev';
const S3_BUCKET = 'manpower-documents-dev';

const dynamoClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: REGION });

interface Document {
  documentId: string;
  userId: string;
  folderId: string;
  fileName: string;
  s3Key?: string;
}

interface Folder {
  folderId: string;
  userId: string;
  name: string;
  type: string;
  metadata?: {
    applicationId?: string;
  };
}

interface Application {
  applicationId: string;
  userId: string;
}

// Configuración de limpieza
const TEST_FOLDER_IDS = ['ocr-temp-folder', 'test-folder-documents'];
const DRY_RUN = false; // Cambiar a false para ejecutar realmente

async function scanTable<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);
    if (response.Items) {
      items.push(...(response.Items as T[]));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function deleteDocument(documentId: string, userId: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would delete document: ${documentId}`);
    return;
  }

  const command = new DeleteCommand({
    TableName: DOCUMENTS_TABLE,
    Key: { documentId, userId },
  });

  await docClient.send(command);
  console.log(`✅ Deleted document: ${documentId}`);
}

async function deleteFolder(folderId: string, userId: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would delete folder: ${folderId}`);
    return;
  }

  const command = new DeleteCommand({
    TableName: FOLDERS_TABLE,
    Key: { folderId, userId },
  });

  await docClient.send(command);
  console.log(`✅ Deleted folder: ${folderId}`);
}

async function deleteS3Object(key: string): Promise<void> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would delete S3 object: ${key}`);
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  console.log(`✅ Deleted S3 object: ${key}`);
}

async function cleanupTestDocuments(): Promise<number> {
  console.log('\n📄 Limpiando documentos de test...');

  const allDocuments = await scanTable<Document>(DOCUMENTS_TABLE);
  const testDocuments = allDocuments.filter(doc =>
    TEST_FOLDER_IDS.includes(doc.folderId)
  );

  console.log(`Encontrados ${testDocuments.length} documentos de test`);

  for (const doc of testDocuments) {
    await deleteDocument(doc.documentId, doc.userId);

    // También eliminar archivo de S3 si existe
    if (doc.s3Key) {
      await deleteS3Object(doc.s3Key);
    }
  }

  return testDocuments.length;
}

async function cleanupOrphanedPostulantFolders(): Promise<number> {
  console.log('\n📁 Limpiando folders de postulantes huérfanos...');

  const allFolders = await scanTable<Folder>(FOLDERS_TABLE);
  const allApplications = await scanTable<Application>(APPLICATIONS_TABLE);

  const applicationIds = new Set(allApplications.map(app => app.applicationId));

  const postulantFolders = allFolders.filter(folder => folder.type === 'Postulante');
  const orphanedFolders = postulantFolders.filter(folder => {
    const appId = folder.metadata?.applicationId;
    return appId && !applicationIds.has(appId);
  });

  console.log(`Encontrados ${orphanedFolders.length} folders de postulantes huérfanos`);

  for (const folder of orphanedFolders) {
    console.log(`  - ${folder.name} (appId: ${folder.metadata?.applicationId})`);
    await deleteFolder(folder.folderId, folder.userId);

    // También eliminar documentos asociados
    const folderDocuments = await scanTable<Document>(DOCUMENTS_TABLE);
    const docsInFolder = folderDocuments.filter(doc => doc.folderId === folder.folderId);

    for (const doc of docsInFolder) {
      await deleteDocument(doc.documentId, doc.userId);
      if (doc.s3Key) {
        await deleteS3Object(doc.s3Key);
      }
    }
  }

  return orphanedFolders.length;
}

async function cleanupTestFilesFromS3(): Promise<number> {
  console.log('\n☁️  Limpiando archivos de prueba de S3...');

  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: 'uploads/',
  });

  const response = await s3Client.send(command);
  const objects = response.Contents || [];

  // Identificar archivos de test por nombre
  const testFiles = objects.filter(obj => {
    const key = obj.Key || '';
    return key.includes('test') ||
           key.includes('prueba') ||
           key.endsWith('.txt');
  });

  console.log(`Encontrados ${testFiles.length} archivos de test en S3`);

  for (const file of testFiles) {
    if (file.Key) {
      console.log(`  - ${file.Key}`);
      await deleteS3Object(file.Key);
    }
  }

  return testFiles.length;
}

async function cleanupOrphanedS3Files(): Promise<number> {
  console.log('\n☁️  Limpiando archivos S3 huérfanos (sin registro en DynamoDB)...');

  // Obtener todos los s3Keys registrados en DynamoDB
  const allDocuments = await scanTable<Document>(DOCUMENTS_TABLE);
  const registeredS3Keys = new Set(
    allDocuments
      .filter(doc => doc.s3Key)
      .map(doc => doc.s3Key as string)
  );

  // Obtener todos los archivos de S3
  const command = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: 'uploads/',
  });

  const response = await s3Client.send(command);
  const objects = response.Contents || [];

  // Encontrar archivos huérfanos
  const orphanedFiles = objects.filter(obj => {
    const key = obj.Key || '';
    return !registeredS3Keys.has(key);
  });

  console.log(`Encontrados ${orphanedFiles.length} archivos S3 huérfanos`);

  for (const file of orphanedFiles) {
    if (file.Key) {
      console.log(`  - ${file.Key}`);
      await deleteS3Object(file.Key);
    }
  }

  return orphanedFiles.length;
}

async function main() {
  console.log('🧹 INICIANDO LIMPIEZA DE DATOS HUÉRFANOS Y BASURA');
  console.log(`Modo: ${DRY_RUN ? 'DRY RUN (simulación)' : 'EJECUCIÓN REAL'}`);
  console.log('='.repeat(60));

  try {
    let totalCleaned = 0;

    // 1. Limpiar documentos de test
    const testDocsDeleted = await cleanupTestDocuments();
    totalCleaned += testDocsDeleted;

    // 2. Limpiar folders de postulantes huérfanos
    const orphanedFoldersDeleted = await cleanupOrphanedPostulantFolders();
    totalCleaned += orphanedFoldersDeleted;

    // 3. Limpiar archivos de prueba de S3
    const testFilesDeleted = await cleanupTestFilesFromS3();
    totalCleaned += testFilesDeleted;

    // 4. Limpiar archivos S3 huérfanos
    const orphanedFilesDeleted = await cleanupOrphanedS3Files();
    totalCleaned += orphanedFilesDeleted;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ LIMPIEZA COMPLETADA`);
    console.log(`Total de elementos ${DRY_RUN ? 'que se eliminarían' : 'eliminados'}: ${totalCleaned}`);
    console.log(`  - Documentos de test: ${testDocsDeleted}`);
    console.log(`  - Folders huérfanos: ${orphanedFoldersDeleted}`);
    console.log(`  - Archivos S3 de test: ${testFilesDeleted}`);
    console.log(`  - Archivos S3 huérfanos: ${orphanedFilesDeleted}`);

    if (DRY_RUN) {
      console.log('\n⚠️  Esto fue una simulación. Para ejecutar realmente, cambia DRY_RUN = false');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar
main();
