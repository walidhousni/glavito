#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

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

async function checkEndpoint(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      log(`${success ? '✅' : '❌'} ${name}: ${res.statusCode}`, success ? colors.green : colors.red);
      resolve(success);
    });
    
    req.on('error', () => {
      log(`❌ ${name}: Connection failed`, colors.red);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      log(`❌ ${name}: Timeout`, colors.red);
      resolve(false);
    });
  });
}

function checkDockerService(serviceName) {
  try {
    const output = execSync(`docker-compose ps --services --filter "status=running" | grep "^${serviceName}$"`, { encoding: 'utf8' });
    const isRunning = output.trim() === serviceName;
    log(`${isRunning ? '✅' : '❌'} ${serviceName} is running`, isRunning ? colors.green : colors.red);
    return isRunning;
  } catch (error) {
    log(`❌ ${serviceName} is not running`, colors.red);
    return false;
  }
}

async function main() {
  log('🔍 Verifying Glavito Development Setup', colors.bright);
  log('=======================================', colors.bright);
  console.log();

  // Check Docker services
  log('🐳 Checking Docker services...', colors.blue);
  const services = ['postgres', 'redis', 'zookeeper', 'kafka'];
  const serviceChecks = services.map(service => checkDockerService(service));
  console.log();

  // Check API endpoints
  log('🔗 Checking API endpoints...', colors.blue);
  const endpoints = [
    { url: 'http://localhost:3001/api/health', name: 'API Health' },
    { url: 'http://localhost:3001/api/health/ready', name: 'API Ready' },
    { url: 'http://localhost:3001/api/health/live', name: 'API Live' },
  ];
  
  const endpointChecks = await Promise.all(
    endpoints.map(endpoint => checkEndpoint(endpoint.url, endpoint.name))
  );
  console.log();

  // Check Admin Dashboard
  log('🖥️  Checking Admin Dashboard...', colors.blue);
  const adminCheck = await checkEndpoint('http://localhost:3000', 'Admin Dashboard');
  console.log();

  // Summary
  log('📊 Verification Summary', colors.bright);
  log('=======================', colors.bright);
  
  const totalChecks = serviceChecks.length + endpointChecks.length + 1;
  const passedChecks = [...serviceChecks, ...endpointChecks, adminCheck].filter(Boolean).length;
  
  log(`Passed: ${passedChecks}/${totalChecks}`, colors.green);
  
  if (passedChecks === totalChecks) {
    log('🎉 All checks passed! Your setup is ready!', colors.green);
  } else {
    log('⚠️  Some checks failed. Check the logs above.', colors.yellow);
  }
  
  console.log();
  log('📖 Quick commands:', colors.cyan);
  log('  npm run dev:docker    # Start all services', colors.dim);
  log('  npm run dev:api       # Start API only', colors.dim);
  log('  npm run dev:admin     # Start Admin only', colors.dim);
  log('  npm run dev:setup     # Run setup script', colors.dim);
}

main().catch(console.error);