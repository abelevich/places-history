#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('🚀 Setting up environment variables for Places History...\n');

// Check if .env.local already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!');
  console.log('Please check that it contains your Mapbox token:');
  console.log('NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here\n');
} else {
  // Create .env.local template
  const envContent = `# Mapbox Access Token
# Get your free token from: https://account.mapbox.com/access-tokens/
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Replace 'your_mapbox_token_here' with your actual Mapbox token
# The token should start with 'pk.'
`;

  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Created .env.local file');
  console.log('📝 Please edit .env.local and add your Mapbox token');
  console.log('🔗 Get a free token from: https://account.mapbox.com/access-tokens/\n');
}

console.log('📋 Next steps:');
console.log('1. Get your Mapbox token from https://account.mapbox.com/access-tokens/');
console.log('2. Edit .env.local and replace "your_mapbox_token_here" with your actual token');
console.log('3. Restart the development server: npm run dev');
console.log('4. Open http://localhost:3000 in your browser\n');

console.log('🎉 Happy mapping!'); 