/**
 * Test script to verify files API from frontend
 * This can be run in the browser console to test the API
 */

// Test the files API directly
async function testFilesAPI() {
  console.log('🧪 Testing Files API from frontend...');
  
  try {
    // Test getAllFiles
    console.log('📄 Testing getAllFiles...');
    const response = await fetch('https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files');
    const data = await response.json();
    console.log('getAllFiles response:', data);
    console.log('Files count:', data.files?.length || 0);
    
    // Test getFilesByFolder
    console.log('📁 Testing getFilesByFolder...');
    const folderResponse = await fetch('https://58pmvhvqo2.execute-api.us-east-1.amazonaws.com/dev/files/folder/cb1d9596-1e18-439e-adae-c6921b1dbf4e');
    const folderData = await folderResponse.json();
    console.log('getFilesByFolder response:', folderData);
    console.log('Files in folder count:', folderData.files?.length || 0);
    
    return {
      allFiles: data.files?.length || 0,
      folderFiles: folderData.files?.length || 0
    };
  } catch (error) {
    console.error('❌ Error testing files API:', error);
    return null;
  }
}

// Export for use in browser console
(window as any).testFilesAPI = testFilesAPI;

console.log('📝 Files API test function loaded. Run testFilesAPI() in the console to test.');
