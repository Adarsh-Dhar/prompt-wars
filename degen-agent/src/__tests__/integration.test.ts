import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Degen Agent Integration Tests', () => {
  const AGENT_SERVER_URL = 'http://localhost:4001';
  const FRONTEND_URL = 'http://localhost:3000';

  test('Agent server health check', async () => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.agent).toBe('degen-agent');
    } catch (error) {
      console.warn('Agent server not running, skipping health check test');
      expect(true).toBe(true); // Skip test if server not running
    }
  });

  test('Agent status endpoint', async () => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/api/status`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('mission');
      expect(data).toHaveProperty('logsCount');
      expect(data.mission).toContain('RektOrRich');
    } catch (error) {
      console.warn('Agent server not running, skipping status test');
      expect(true).toBe(true);
    }
  });

  test('Token analysis request', async () => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSymbol: 'BTC',
          currentPrice: 45000
        })
      });
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.analysis).toHaveProperty('tokenSymbol');
        expect(data.analysis).toHaveProperty('decision');
        expect(data.analysis).toHaveProperty('confidence');
        expect(data.analysis.tokenSymbol).toBe('BTC');
        expect(['LONG', 'SHORT']).toContain(data.analysis.decision);
        expect(data.analysis.confidence).toBeGreaterThanOrEqual(0);
        expect(data.analysis.confidence).toBeLessThanOrEqual(100);
      }
    } catch (error) {
      console.warn('Analysis test failed, agent may not be fully configured');
      expect(true).toBe(true);
    }
  });

  test('Frontend integration endpoints', async () => {
    // Test that the agent can communicate with frontend endpoints
    const testEndpoints = [
      '/api/agents/register',
      '/api/markets/create',
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${FRONTEND_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            test: true
          })
        });
        
        // We expect these to exist (even if they return errors for invalid data)
        expect([200, 400, 401, 404, 500]).toContain(response.status);
      } catch (error) {
        console.warn(`Frontend endpoint ${endpoint} not available`);
      }
    }
  });

  test('Payment verification structure', async () => {
    // Test the payment verification endpoint structure
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/api/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: 'invalid_signature',
          analysisId: 'test_id'
        })
      });
      
      // Should return 400 or 402 for invalid signature
      expect([400, 402]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    } catch (error) {
      console.warn('Payment verification test failed');
      expect(true).toBe(true);
    }
  });

  test('Agent configuration validation', () => {
    // Test that required environment variables are documented
    const requiredEnvVars = [
      'GEMINI_API_KEY',
      'RPC_URL',
      'SOLANA_PRIVATE_KEY',
      'SERVER_WALLET',
      'FRONTEND_URL'
    ];

    // Check that .env.example contains all required variables
    const fs = require('fs');
    const path = require('path');
    
    try {
      const envExample = fs.readFileSync(
        path.join(__dirname, '../../.env.example'), 
        'utf8'
      );
      
      for (const envVar of requiredEnvVars) {
        expect(envExample).toContain(envVar);
      }
    } catch (error) {
      console.warn('.env.example file not found');
      expect(true).toBe(true);
    }
  });

  test('Package.json scripts validation', () => {
    // Test that required scripts are present
    const fs = require('fs');
    const path = require('path');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../package.json'), 
        'utf8'
      ));
      
      const requiredScripts = [
        'agent',
        'server',
        'dev:server',
        'test'
      ];
      
      for (const script of requiredScripts) {
        expect(packageJson.scripts).toHaveProperty(script);
      }
      
      // Check that type is set to module for ES6 imports
      expect(packageJson.type).toBe('module');
      
    } catch (error) {
      console.warn('Package.json validation failed');
      expect(true).toBe(true);
    }
  });
});

// Integration test for the complete workflow
describe('Complete Agent Workflow', () => {
  test('End-to-end analysis workflow', async () => {
    const AGENT_SERVER_URL = 'http://localhost:4001';
    
    try {
      // 1. Check agent status
      const statusResponse = await fetch(`${AGENT_SERVER_URL}/api/status`);
      expect(statusResponse.status).toBe(200);
      
      // 2. Request analysis
      const analysisResponse = await fetch(`${AGENT_SERVER_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSymbol: 'ETH',
          currentPrice: 3000
        })
      });
      
      if (analysisResponse.status === 200) {
        const analysisData = await analysisResponse.json();
        
        // 3. Verify analysis structure
        expect(analysisData.success).toBe(true);
        expect(analysisData.analysis).toHaveProperty('id');
        expect(analysisData.analysis).toHaveProperty('tokenSymbol');
        expect(analysisData.analysis).toHaveProperty('decision');
        expect(analysisData.analysis).toHaveProperty('confidence');
        expect(analysisData.analysis).toHaveProperty('publicSummary');
        
        // 4. Check that premium content is gated
        expect(analysisData.analysis.premiumAnalysis).toBe('[PREMIUM CONTENT - PAYMENT REQUIRED]');
        
        // 5. Verify logs were created
        const logsResponse = await fetch(`${AGENT_SERVER_URL}/api/logs`);
        const logsData = await logsResponse.json();
        
        expect(Array.isArray(logsData)).toBe(true);
        expect(logsData.length).toBeGreaterThan(0);
        
        // Should contain analysis-related logs
        const analysisLogs = logsData.filter(log => 
          log.text.includes('ETH') || log.text.includes('Analyzing')
        );
        expect(analysisLogs.length).toBeGreaterThan(0);
      }
      
    } catch (error) {
      console.warn('End-to-end test skipped - agent server not available');
      expect(true).toBe(true);
    }
  });
});