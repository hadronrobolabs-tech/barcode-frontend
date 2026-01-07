const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Log startup information
console.log('='.repeat(50));
console.log('🚀 Starting Express server...');
console.log('📦 Node version:', process.version);
console.log('📁 Current directory:', __dirname);
console.log('🌐 Port:', PORT);
console.log('='.repeat(50));

// Function to delete .htaccess file (it interferes with Node.js)
const deleteHtaccess = () => {
  const htaccessPath = path.join(__dirname, '.htaccess');
  if (fs.existsSync(htaccessPath)) {
    try {
      fs.unlinkSync(htaccessPath);
      console.log('⚠️  Deleted .htaccess file (interferes with Node.js)');
      return true;
    } catch (err) {
      console.error('⚠️  Could not delete .htaccess:', err.message);
      return false;
    }
  }
  return false;
};

// Delete .htaccess on startup
deleteHtaccess();

// Delete .htaccess periodically (every 2 minutes) to catch auto-creation
setInterval(() => {
  deleteHtaccess();
}, 2 * 60 * 1000); // 2 minutes

// Try multiple possible locations for dist directory
const possibleDistPaths = [
  path.join(__dirname, 'dist'),                    // Same directory as server.js
  path.join(__dirname, '..', 'public_html', 'dist'), // public_html/dist (Hostinger)
  path.join(process.cwd(), 'dist'),                // Current working directory
  path.join(process.cwd(), 'public_html', 'dist'), // public_html/dist from cwd
  '/home/u610043941/domains/lightgray-marten-597756.hostingersite.com/public_html/dist', // Absolute path
];

let distPath = null;
let indexPath = null;

// Find the dist directory
for (const testPath of possibleDistPaths) {
  const testIndexPath = path.join(testPath, 'index.html');
  if (fs.existsSync(testPath) && fs.existsSync(testIndexPath)) {
    distPath = testPath;
    indexPath = testIndexPath;
    console.log('✅ Found dist directory at:', distPath);
    break;
  } else {
    console.log('⚠️  Checking:', testPath, '- Not found');
  }
}

if (!distPath || !indexPath) {
  console.error('❌ ERROR: dist directory not found in any expected location!');
  console.error('   Checked paths:');
  possibleDistPaths.forEach(p => console.error('   -', p));
  console.error('   Current __dirname:', __dirname);
  console.error('   Current process.cwd():', process.cwd());
  console.error('   Listing __dirname contents:');
  try {
    const dirContents = fs.readdirSync(__dirname);
    console.error('   -', dirContents.join(', '));
  } catch (e) {
    console.error('   - Cannot read directory:', e.message);
  }
  process.exit(1);
}

console.log('✅ Dist directory found:', distPath);
console.log('✅ index.html found:', indexPath);

// Health check endpoint - MUST be before static middleware
app.get('/health', (req, res) => {
  console.log('📊 Health check requested from:', req.ip);
  // Delete .htaccess on health check (in case it was recreated)
  const htaccessDeleted = deleteHtaccess();
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    distExists: fs.existsSync(distPath),
    indexExists: fs.existsSync(indexPath),
    port: PORT,
    nodeVersion: process.version,
    path: distPath,
    htaccessDeleted: htaccessDeleted
  });
});

// Test endpoint to verify server is running
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint requested from:', req.ip);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    server: 'Express',
    port: PORT
  });
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Serve static files from the dist directory
app.use(express.static(distPath, {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['html', 'js', 'css', 'json', 'ico', 'png', 'jpg', 'svg'],
  index: 'index.html',
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    // Set proper content type for JavaScript files
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    console.log('📦 Serving static file:', filePath);
  }
}));

// Handle Angular routing - return index.html for all routes
app.get('*', (req, res) => {
  console.log('📄 Request for:', req.path);
  // Check if file exists before sending
  if (fs.existsSync(indexPath)) {
    console.log('✅ Sending index.html for route:', req.path);
    res.sendFile(indexPath);
  } else {
    console.error('❌ index.html not found at:', indexPath);
    res.status(404).json({ 
      error: 'index.html not found',
      distPath: distPath,
      indexPath: indexPath,
      __dirname: __dirname,
      cwd: process.cwd()
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ Server started successfully!`);
  console.log(`🚀 Frontend server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Main app: http://0.0.0.0:${PORT}/`);
  console.log('='.repeat(50));
}).on('error', (err) => {
  console.error('='.repeat(50));
  console.error('❌ FAILED TO START SERVER');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  console.error('Port:', PORT);
  console.error('='.repeat(50));
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

