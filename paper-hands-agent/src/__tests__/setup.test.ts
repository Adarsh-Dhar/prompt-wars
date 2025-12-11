/**
 * Basic setup test to verify Jest and TypeScript configuration
 */

describe('PaperHands Agent Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should import types correctly', async () => {
    const types = await import('../types/index');
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });

  it('should import interfaces correctly', async () => {
    const interfaces = await import('../lib/interfaces');
    expect(interfaces).toBeDefined();
    expect(typeof interfaces).toBe('object');
  });
});