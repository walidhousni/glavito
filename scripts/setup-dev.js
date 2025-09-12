#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkCommand(command, name) {
  try {
    execSync(command, { stdio: 'ignore' });
    log(`✅ ${name} is available`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${name} is not available`, colors.red);
    return false;
  }
}

function checkFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${name} exists`, colors.green);
    return true;
  } else {
    log(`❌ ${name} missing`, colors.red);
    return false;
  }
}

async function main() {
  log('🚀 Glavito Development Setup', colors.bright);
  log('============================', colors.bright);
  console.log();

  // Check prerequisites
  log('📋 Checking prerequisites...', colors.blue);
  const checks = [
    checkCommand('node --version', 'Node.js'),
    checkCommand('npm --version', 'npm'),
    checkCommand('docker --version', 'Docker'),
    checkCommand('docker-compose --version', 'Docker Compose'),
  ];

  if (!checks.every(Boolean)) {
    log('❌ Please install missing prerequisites', colors.red);
    process.exit(1);
  }
  console.log();

  // Check project structure
  log('📁 Checking project structure...', colors.blue);
  const structureChecks = [
    checkFile('package.json', 'package.json'),
    checkFile('nx.json', 'nx.json'),
    checkFile('docker-compose.yml', 'docker-compose.yml'),
    checkFile('prisma/schema.prisma', 'Prisma schema'),
    checkFile('api-gateway/src/main.ts', 'API Gateway'),
    checkFile('apps/admin-dashboard/package.json', 'Admin Dashboard'),
  ];

  if (!structureChecks.every(Boolean)) {
    log('❌ Project structure is incomplete', colors.red);
    process.exit(1);
  }
  console.log();

  // Install dependencies
  log('📦 Installing dependencies...', colors.blue);
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed', colors.green);
  } catch (error) {
    log('❌ Failed to install dependencies', colors.red);
    process.exit(1);
  }
  console.log();

  // Setup environment
  log('⚙️  Setting up environment...', colors.blue);
  const envLocalPath = '.env.development.local';
  if (!fs.existsSync(envLocalPath)) {
    fs.writeFileSync(envLocalPath, `# Development Environment Configuration
DATABASE_URL="postgresql://glavito:glavito123@localhost:5432/glavito"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-jwt-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-key-change-in-production"
NODE_ENV="development"
`);
    log('✅ Created .env.development.local', colors.green);
  } else {
    log('✅ .env.development.local already exists', colors.green);
  }
  console.log();

  // Generate Prisma client
  log('🔧 Setting up database...', colors.blue);
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    log('✅ Prisma client generated', colors.green);
  } catch (error) {
    log('❌ Failed to generate Prisma client', colors.red);
    process.exit(1);
  }
  console.log();

  // Success message
  log('🎉 Setup complete!', colors.green);
  log('==================', colors.green);
  console.log();
  log('Next steps:', colors.bright);
  log('1. Start development environment: npm run dev:docker', colors.cyan);
  log('2. Or start manually:', colors.cyan);
  log('   - Terminal 1: npm run dev:api', colors.dim);
  log('   - Terminal 2: npm run dev:admin', colors.dim);
  log('3. Visit http://localhost:3000 for Admin Dashboard', colors.cyan);
  log('4. Visit http://localhost:3001/api for API', colors.cyan);
  log('5. Visit http://localhost:5555 for Prisma Studio', colors.cyan);
  console.log();
  log('📖 Full guide: See DEVELOPMENT.md', colors.yellow);
}

main().catch(console.error);