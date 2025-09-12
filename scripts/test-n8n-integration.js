#!/usr/bin/env node

const axios = require('axios');
const { execSync } = require('child_process');

/**
 * Test script for n8n integration with Glavito
 * This script verifies that n8n is properly configured and accessible
 */

async function testN8nIntegration() {
  console.log('🧪 Testing n8n Integration...');
  
  const N8N_URL = process.env.N8N_URL || 'http://localhost:5678';
  const N8N_API_KEY = process.env.N8N_API_KEY;
  
  if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY environment variable is not set');
    console.log('💡 Please set your n8n API key in the .env file');
    process.exit(1);
  }
  
  try {
    // Test 1: Check n8n health
    console.log('1️⃣ Checking n8n health...');
    const healthResponse = await axios.get(`${N8N_URL}/healthz`, {
      timeout: 5000
    });
    
    if (healthResponse.status === 200) {
      console.log('✅ n8n is healthy and accessible');
    }
    
    // Test 2: Test API authentication
    console.log('2️⃣ Testing API authentication...');
    const authResponse = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      },
      timeout: 5000
    });
    
    if (authResponse.status === 200) {
      console.log('✅ API authentication successful');
      console.log(`📊 Found ${authResponse.data.data.length} existing workflows`);
    }
    
    // Test 3: Create a test workflow
    console.log('3️⃣ Creating test workflow...');
    const testWorkflow = {
      name: 'Glavito Test Workflow',
      nodes: [
        {
          id: 'start',
          type: 'n8n-nodes-base.start',
          name: 'Start',
          parameters: {},
          position: [240, 300]
        },
        {
          id: 'webhook',
          type: 'n8n-nodes-base.webhook',
          name: 'Test Webhook',
          parameters: {
            path: 'glavito-test',
            httpMethod: 'POST'
          },
          position: [460, 300]
        }
      ],
      connections: {
        'Start': {
          main: [['Test Webhook']]
        }
      },
      active: false
    };
    
    const createResponse = await axios.post(`${N8N_URL}/api/v1/workflows`, testWorkflow, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    if (createResponse.status === 200 || createResponse.status === 201) {
      const workflowId = createResponse.data.id;
      console.log(`✅ Test workflow created with ID: ${workflowId}`);
      
      // Test 4: Activate the workflow
      console.log('4️⃣ Activating test workflow...');
      const activateResponse = await axios.patch(
        `${N8N_URL}/api/v1/workflows/${workflowId}`,
        { active: true },
        {
          headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      if (activateResponse.status === 200) {
        console.log('✅ Test workflow activated successfully');
      }
      
      // Test 5: Clean up - delete test workflow
      console.log('5️⃣ Cleaning up test workflow...');
      await axios.delete(`${N8N_URL}/api/v1/workflows/${workflowId}`, {
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        },
        timeout: 5000
      });
      console.log('✅ Test workflow deleted');
    }
    
    // Test 6: Check Glavito AI Automation Service
    console.log('6️⃣ Testing Glavito AI Automation Service...');
    try {
      const glavitoResponse = await axios.get('http://localhost:3001/api/v1/health', {
        timeout: 5000
      });
      
      if (glavitoResponse.status === 200) {
        console.log('✅ Glavito API is accessible');
      }
    } catch (glavitoError) {
      console.log('⚠️  Glavito API not accessible (this is OK if not running)');
    }
    
    console.log('\n🎉 n8n Integration Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ n8n service is healthy');
    console.log('✅ API authentication works');
    console.log('✅ Workflow creation/activation works');
    console.log('✅ Integration is ready for use');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start your Glavito application: docker-compose up -d');
    console.log('2. Create workflows in n8n UI: http://localhost:5678');
    console.log('3. Use the AI Automation Service to manage workflows programmatically');
    
  } catch (error) {
    console.error('❌ n8n Integration Test Failed:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - is n8n running?');
      console.log('💡 Try: docker-compose up -d n8n');
    } else if (error.response?.status === 401) {
      console.error('🔐 Authentication failed - check your API key');
      console.log('💡 Generate a new API key in n8n Settings > API Keys');
    } else if (error.response?.status === 404) {
      console.error('🔍 API endpoint not found - check n8n version');
    } else {
      console.error('📝 Error details:', error.message);
      if (error.response?.data) {
        console.error('📄 Response data:', error.response.data);
      }
    }
    
    console.log('\n🛠️  Troubleshooting:');
    console.log('1. Ensure n8n is running: docker-compose ps n8n');
    console.log('2. Check n8n logs: docker-compose logs n8n');
    console.log('3. Verify API key in .env file');
    console.log('4. Test n8n UI access: http://localhost:5678');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testN8nIntegration();
}

module.exports = { testN8nIntegration };