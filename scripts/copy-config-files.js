const fs = require('fs');
const path = require('path');

// Copy JSON configuration files
function copyConfigFiles() {
  // Directory paths
  const sourceDir = path.join(__dirname, '../src/config');
  const targetDir = path.join(__dirname, '../dist/config');

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy JSON files
  try {
    const files = fs.readdirSync(sourceDir);
    let copiedCount = 0;

    files.forEach(file => {
      if (path.extname(file) === '.json') {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied file: ${file}`);
        copiedCount++;
      }
    });

    console.log(`Successfully copied ${copiedCount} JSON files from ${sourceDir} to ${targetDir}`);
  } catch (error) {
    console.error('Error during configuration files copying:', error);
  }
}

// Copy public directory
function copyPublicFiles() {
  // Directory paths
  const sourceDir = path.join(__dirname, '../src/public');
  const targetDir = path.join(__dirname, '../dist/public');

  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.log(`Source directory ${sourceDir} does not exist. Creating empty public directory.`);
    
    // Create empty target directory
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return;
  }

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Recursive file copying
  function copyRecursive(src, dest) {
    // Check if it's a directory
    if (fs.statSync(src).isDirectory()) {
      // Create target directory if it doesn't exist
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      // Get list of files in directory
      const files = fs.readdirSync(src);
      
      // Recursively copy each file/directory
      files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        copyRecursive(srcPath, destPath);
      });
    } else {
      // Copy file
      fs.copyFileSync(src, dest);
    }
  }

  try {
    copyRecursive(sourceDir, targetDir);
    console.log(`Successfully copied public directory from ${sourceDir} to ${targetDir}`);
  } catch (error) {
    console.error('Error during public directory copying:', error);
  }
}

// Run both functions
copyConfigFiles();
copyPublicFiles(); 