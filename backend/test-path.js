const path = require('path');
const fs = require('fs');

console.log('--- Path Debugging ---');
console.log('Current __dirname (simulating routes/):', path.join(__dirname, 'routes'));
const simulatedUploadDir = path.join(__dirname, 'uploads', 'resumes');
console.log('Target Upload Dir:', simulatedUploadDir);

try {
  fs.mkdirSync(simulatedUploadDir, { recursive: true });
  console.log('Successfully created/verified directory.');
  const testFile = path.join(simulatedUploadDir, 'test.txt');
  fs.writeFileSync(testFile, 'Path test successful');
  console.log('Successfully wrote a test file to:', testFile);
  
  if (fs.existsSync(testFile)) {
    console.log('CONFIRMED: File exists at that path.');
  } else {
    console.log('ERROR: File does not exist after writing!');
  }
} catch (err) {
  console.error('Error during path test:', err);
}
