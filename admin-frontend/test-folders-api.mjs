#!/usr/bin/env node

/**
 * Test script to verify folders-service API integration
 * Run with: node test-folders-api.mjs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve('.env') });

const API_BASE_URL = process.env.VITE_FOLDERS_API_URL;

if (!API_BASE_URL) {
  console.error('❌ Error: VITE_FOLDERS_API_URL not found in .env file');
  process.exit(1);
}

async function testFoldersAPI() {
  console.log('🧪 Testing Folders API Integration\n');
  console.log(`📍 API URL: ${API_BASE_URL}\n`);

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    console.log(`   Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Health check passed:', healthData.message || 'Service is healthy');
    } else {
      console.log('   ⚠️ Health check returned status:', healthResponse.status);
    }
    console.log();

    // Test 2: Get all folders
    console.log('2️⃣ Testing GET /folders...');
    const foldersResponse = await fetch(`${API_BASE_URL}/folders`);
    console.log(`   Status: ${foldersResponse.status}`);
    const foldersData = await foldersResponse.json();
    console.log(`   ✅ Response:`, {
      success: foldersData.success,
      message: foldersData.message,
      foldersCount: foldersData.folders?.length || 0
    });
    console.log();

    // Test 3: Create a test folder
    console.log('3️⃣ Testing POST /folders...');
    const testFolder = {
      name: `Test Folder ${Date.now()}`,
      type: 'Test Type'
    };
    const createResponse = await fetch(`${API_BASE_URL}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testFolder)
    });
    console.log(`   Status: ${createResponse.status}`);
    const createData = await createResponse.json();
    console.log(`   ${createData.success ? '✅' : '❌'} Response:`, {
      success: createData.success,
      message: createData.message,
      folderId: createData.folder?.folderId
    });

    // Test 4: Get root folders
    console.log('\n4️⃣ Testing GET /folders/root...');
    const rootResponse = await fetch(`${API_BASE_URL}/folders/root`);
    console.log(`   Status: ${rootResponse.status}`);
    const rootData = await rootResponse.json();
    console.log(`   ✅ Root folders count:`, rootData.folders?.length || 0);

    console.log('\n✨ All tests completed!');

  } catch (error) {
    console.error('\n❌ Error during tests:', error.message);
  }
}

// Run tests
testFoldersAPI();