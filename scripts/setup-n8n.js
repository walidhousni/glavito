#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Setup script for n8n integration with Glavito
 * This script helps configure n8n for workflow automation
 */

console.log('🚀 Setting up n8n for Glavito...');

// Check if docker-compose is available
try {
  execSync('docker-compose --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Docker Compose is required but not installed.');
  process.exit(1);
}

// Create n8n database in PostgreSQL
console.log('📊 Setting up n8n database...');
try {
  // Start PostgreSQL if not running
  execSync('docker-compose up -d postgres', { stdio: 'inherit' });
  
  // Wait a bit for PostgreSQL to be ready
  console.log('⏳ Waiting for PostgreSQL to be ready...');
  setTimeout(() => {
    try {
      // Create n8n database
      execSync(`docker-compose exec -T postgres psql -U walid -d postgres -c "CREATE DATABASE n8n;"`, { stdio: 'inherit' });
      console.log('✅ n8n database created successfully');
    } catch (dbError) {
      console.log('ℹ️  n8n database might already exist, continuing...');
    }
    
    // Start n8n service
    console.log('🔧 Starting n8n service...');
    execSync('docker-compose up -d n8n', { stdio: 'inherit' });
    
    console.log('\n🎉 n8n setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Wait for n8n to start (about 30 seconds)');
    console.log('2. Open http://localhost:5678 in your browser');
    console.log('3. Login with:');
    console.log('   - Username: admin');
    console.log('   - Password: admin123');
    console.log('4. Go to Settings > API Keys and create a new API key');
    console.log('5. Update your .env file with the API key:');
    console.log('   N8N_API_KEY=your-generated-api-key');
    console.log('\n🔗 n8n will be available at: http://localhost:5678');
    console.log('\n⚡ Your Glavito system is now ready for workflow automation!');
    
  }, 5000);
  
} catch (error) {
  console.error('❌ Failed to setup n8n:', error.message);
  process.exit(1);
}