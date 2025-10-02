/**
 * Migration Script: Add uniqueKey to existing folders
 *
 * This script backfills the uniqueKey field for all existing folders in DynamoDB.
 * uniqueKey format: userId#name#type#parentId (name is lowercased)
 *
 * Run with: npx ts-node scripts/migrate-unique-keys.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy'
    }
  })
});

const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.FOLDERS_TABLE || `manpower-folders-${process.env.STAGE || 'dev'}`;

function generateUniqueKey(userId: string, name: string, type: string, parentId?: string): string {
  const normalizedName = name.toLowerCase().trim();
  const normalizedParentId = parentId || 'ROOT';
  return `${userId}#${normalizedName}#${type}#${normalizedParentId}`;
}

async function migrateFolders() {
  console.log(`🔄 Starting migration for table: ${tableName}`);

  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let lastEvaluatedKey: any = undefined;

  do {
    // Scan folders in batches
    const scanCommand = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 100 // Process 100 items at a time
    });

    const scanResult = await docClient.send(scanCommand);
    const folders = scanResult.Items || [];

    console.log(`📊 Processing batch of ${folders.length} folders...`);

    // Update each folder
    for (const folder of folders) {
      processedCount++;

      try {
        // Skip if already has uniqueKey
        if (folder.uniqueKey) {
          console.log(`✓ Folder ${folder.folderId} already has uniqueKey, skipping`);
          continue;
        }

        // Generate uniqueKey
        const uniqueKey = generateUniqueKey(
          folder.userId,
          folder.name,
          folder.type,
          folder.parentId
        );

        // Update the folder
        const updateCommand = new UpdateCommand({
          TableName: tableName,
          Key: {
            userId: folder.userId,
            folderId: folder.folderId
          },
          UpdateExpression: 'SET uniqueKey = :uniqueKey',
          ExpressionAttributeValues: {
            ':uniqueKey': uniqueKey
          }
        });

        await docClient.send(updateCommand);
        updatedCount++;

        console.log(`✅ Updated folder ${folder.folderId} (${folder.name})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating folder ${folder.folderId}:`, error);
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;

    if (lastEvaluatedKey) {
      console.log(`⏭️  Moving to next batch...`);
    }

  } while (lastEvaluatedKey);

  console.log(`\n📊 Migration complete!`);
  console.log(`   Total processed: ${processedCount}`);
  console.log(`   Total updated: ${updatedCount}`);
  console.log(`   Total errors: ${errorCount}`);
  console.log(`   Already migrated: ${processedCount - updatedCount - errorCount}`);
}

// Run migration
migrateFolders()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
