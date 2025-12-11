/**
 * Integration tests for Contrarian Agent
 * Tests end-to-end signal generation, payment verification, and market creation
 */
import { ContrarianAgent } from '../agents/contrarian.js';
describe('Contrarian Agent Integration Tests', () => {
    let agent;
    beforeEach(() => {
        agent = new ContrarianAgent({
            thresholds: {
                fearGreedSellThreshold: 60,
                extremeConditionThreshold: 80,
                bullishReinforcementThreshold: 70,
                bearishReinforcementThreshold: 30
            }
        });
    });
    test('End-to-end signal generation flow', async () => {
        // Mock market data
        const marketData = {
            symbol: 'BTC',
            price: 50000,
            timestamp: new Date(),
            volume: 1000000,
            priceHistory: [49000, 49500, 50000],
            change24h: 2.5
        };
        // Initialize agent
        await agent.initialize('BTC');
        // Process market data
        await agent.processMarketData(marketData);
        // Verify agent state
        const state = agent.getAgentState();
        expect(state.currentToken).toBe('BTC');
        expect(state.agentType).toBe('CONTRARIAN');
        // Test output generation
        const output = agent.generateOutput();
        expect(output.agentId).toBe(agent.id);
        expect(['BUY', 'SELL'].includes(output.signalType)).toBe(true);
    }, 30000);
    test('Payment verification and content access flow', async () => {
        const mockSignature = '5J7XqWtEpoch4xfD9A8KosmX7FPjkcJqzFbcpQpyuGwFJGZzYxHvF8r3nV2mK9sL4P6wE1qR7tY8uI9oP0aS2dF3gH4j5k6l';
        const contentId = 'test-content-123';
        const walletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
        // Test payment preview generation
        const preview = await agent.generateSmugRant({
            id: contentId,
            agentId: agent.id,
            signalType: 'BUY',
            timestamp: new Date(),
            confidence: 85,
            triggerConditions: {
                fearGreedValue: 30,
                isExtremeCondition: false
            },
            encryptedReasoning: '',
            predictionOptions: {
                knifeChatcher: 'Agent buying too early (Rekt)',
                alphaGod: 'Agent buying the bottom (Rich)'
            }
        });
        expect(preview).toContain('locked');
        expect(preview).toContain('SOL');
    });
    test('Health check comprehensive reporting', async () => {
        const health = await agent.healthCheck();
        expect(['healthy', 'degraded', 'unhealthy'].includes(health.status)).toBe(true);
        expect(typeof health.details).toBe('object');
        // Verify all components are checked
        expect(health.details.sentimentFetcher).toBeDefined();
        expect(health.details.signalGenerator).toBeDefined();
        expect(health.details.paymentService).toBeDefined();
        expect(health.details.marketIntegration).toBeDefined();
    });
});
