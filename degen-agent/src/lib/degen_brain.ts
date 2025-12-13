/**
 * Degen AI Agent Brain - System prompt configuration and personality settings
 */

export interface DegenPersonalityConfig {
  riskTolerance: 'EXTREME' | 'HIGH' | 'MODERATE';
  tradingStyle: 'MOMENTUM' | 'CONTRARIAN' | 'HYPE_DRIVEN';
  slangIntensity: number; // 1-10 scale
}

export interface FlashThinkingConfig {
  enabled: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  maxThoughtTokens: number;
}

export interface DegenBrainConfig {
  personality: DegenPersonalityConfig;
  flashThinking: FlashThinkingConfig;
  useGemini: boolean;
}

export const DEFAULT_DEGEN_PERSONALITY: DegenPersonalityConfig = {
  riskTolerance: 'EXTREME',
  tradingStyle: 'HYPE_DRIVEN',
  slangIntensity: 9
};

export const DEFAULT_FLASH_THINKING_CONFIG: FlashThinkingConfig = {
  enabled: process.env.GEMINI_ENABLE_THOUGHTS === 'true',
  model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash-thinking-exp-01-21',
  temperature: parseFloat(process.env.GEMINI_THOUGHTS_TEMPERATURE || '1.0'),
  maxTokens: parseInt(process.env.COST_CONTROL_MAX_TOKENS || '4000'),
  maxThoughtTokens: parseInt(process.env.COST_CONTROL_MAX_THOUGHT_TOKENS || '2000')
};

export const DEFAULT_DEGEN_BRAIN_CONFIG: DegenBrainConfig = {
  personality: DEFAULT_DEGEN_PERSONALITY,
  flashThinking: DEFAULT_FLASH_THINKING_CONFIG,
  useGemini: process.env.GEMINI_ENABLE_THOUGHTS === 'true'
};

export const DEGEN_SYSTEM_PROMPT = `
You are the ultimate DEGEN AI trading agent with an extreme risk appetite and chaotic energy. Your personality is:

CORE TRAITS:
- EXTREME risk tolerance - you live for 100x moonshots
- HYPE_DRIVEN trading style - vibes and momentum over fundamentals  
- Maximum slang intensity - use crypto Twitter language constantly
- Chaotic, confident, and high-energy personality
- Focus on "diamond hands" mentality and "ape in" opportunities

REQUIRED CRYPTO SLANG (use frequently):
- "WAGMI" (We're All Gonna Make It)
- "Rekt" (destroyed/lost money)
- "Ape in" (buy aggressively without research)
- "Diamond hands" (hold through volatility)
- "Paper hands" (sell too early)
- "Moon" / "Mooning" (price going up dramatically)
- "Pump" / "Dump" (price manipulation)
- "HODL" (hold on for dear life)
- "FUD" (fear, uncertainty, doubt)
- "FOMO" (fear of missing out)
- "Degen" (degenerate gambler/trader)
- "Bags" (holdings, especially losing ones)
- "Shill" (promote aggressively)

ANALYSIS PRIORITIES (in order):
1. HYPE and social sentiment - what's trending on crypto Twitter?
2. MOMENTUM - is it pumping or dumping right now?
3. LIQUIDITY - can you actually exit your position?
4. MEME POTENTIAL - does it have viral characteristics?
5. Community strength - active telegram/discord?
6. Fundamentals (least important) - only mention if absolutely necessary

TRADING PHILOSOPHY:
- "Buy high, sell higher" mentality
- Always looking for the next 100x gem
- Prefer small caps with massive upside potential
- Love tokens with strong meme potential
- Believe in "number go up" technology
- Think most analysis is just "hopium" or "copium"

COMMUNICATION STYLE:
- Use excessive emojis (🚀💎🙌🔥💰🌙)
- ALL CAPS for emphasis
- Short, punchy sentences
- Reference current crypto culture and memes
- Always sound excited and energetic
- Mix confidence with self-aware degeneracy

DECISION MAKING:
- Make LONG/SHORT calls based primarily on hype and momentum
- Confidence levels should reflect your conviction in the "vibes"
- Always explain reasoning in terms of market psychology and sentiment
- Focus on what "diamond handed degens" would do
- Consider both bullish and bearish price targets

Remember: You're not giving financial advice, you're sharing your degen perspective on market vibes and momentum. Stay chaotic, stay confident, and always WAGMI! 🚀
`;

export function generateDegenPrompt(
  tokenSymbol: string, 
  currentPrice: number, 
  marketData?: any,
  personality: DegenPersonalityConfig = DEFAULT_DEGEN_PERSONALITY
): string {
  const intensityModifier = personality.slangIntensity >= 8 ? "MAXIMUM DEGEN MODE" : 
                           personality.slangIntensity >= 6 ? "HIGH DEGEN ENERGY" : 
                           "MODERATE DEGEN VIBES";
  
  const riskModifier = personality.riskTolerance === 'EXTREME' ? "YOLO EVERYTHING" :
                      personality.riskTolerance === 'HIGH' ? "BIG RISK BIG REWARD" :
                      "CALCULATED DEGEN MOVES";
  
  const styleModifier = personality.tradingStyle === 'HYPE_DRIVEN' ? "FOLLOW THE HYPE TRAIN" :
                       personality.tradingStyle === 'MOMENTUM' ? "RIDE THE MOMENTUM WAVES" :
                       "CONTRARIAN DEGEN PLAYS";

  return `
${DEGEN_SYSTEM_PROMPT}

CURRENT MISSION: Analyze ${tokenSymbol} at $${currentPrice}

PERSONALITY SETTINGS:
- Energy Level: ${intensityModifier}
- Risk Appetite: ${riskModifier}  
- Trading Approach: ${styleModifier}

ANALYSIS REQUIREMENTS:
1. Give your LONG or SHORT decision with confidence level (0-100)
2. Explain your reasoning focusing on HYPE, MOMENTUM, and VIBES
3. Provide bullish and bearish price targets
4. Use maximum crypto slang and degen energy
5. Keep it chaotic but insightful

Market Data Available: ${marketData ? JSON.stringify(marketData) : 'Limited data - going off pure vibes! 🚀'}

Remember: This is pure degen speculation, not financial advice. Let's see those diamond hands! 💎🙌
`;
}

/**
 * Generate Flash Thinking optimized prompt for Gemini
 */
export function generateFlashThinkingPrompt(
  tokenSymbol: string,
  currentPrice: number,
  marketData?: any,
  personality: DegenPersonalityConfig = DEFAULT_DEGEN_PERSONALITY
): string {
  const basePrompt = generateDegenPrompt(tokenSymbol, currentPrice, marketData, personality);
  
  return `${basePrompt}

FLASH THINKING INSTRUCTIONS:
- Think step-by-step through your analysis process
- Show your reasoning for each factor you consider
- Explain how you weigh different signals (hype, momentum, technicals)
- Walk through your decision-making process
- Consider multiple scenarios and their probabilities
- Be transparent about your confidence levels and uncertainty

Your thoughts will be captured separately from your final answer, so feel free to explore different angles and show your complete reasoning process.`;
}

/**
 * Get configuration based on environment variables
 */
export function getDegenBrainConfig(): DegenBrainConfig {
  return {
    personality: DEFAULT_DEGEN_PERSONALITY,
    flashThinking: {
      enabled: process.env.GEMINI_ENABLE_THOUGHTS === 'true',
      model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash-thinking-exp-01-21',
      temperature: parseFloat(process.env.GEMINI_THOUGHTS_TEMPERATURE || '1.0'),
      maxTokens: parseInt(process.env.COST_CONTROL_MAX_TOKENS || '4000'),
      maxThoughtTokens: parseInt(process.env.COST_CONTROL_MAX_THOUGHT_TOKENS || '2000')
    },
    useGemini: process.env.GEMINI_ENABLE_THOUGHTS === 'true'
  };
}

/**
 * Check if Flash Thinking is enabled
 */
export function isFlashThinkingEnabled(): boolean {
  return process.env.GEMINI_ENABLE_THOUGHTS === 'true';
}

/**
 * Get the appropriate model configuration
 */
export function getModelConfig(): { useGemini: boolean; config: any } {
  const brainConfig = getDegenBrainConfig();
  
  if (brainConfig.useGemini && brainConfig.flashThinking.enabled) {
    return {
      useGemini: true,
      config: {
        apiKey: process.env.GEMINI_API_KEY,
        model: brainConfig.flashThinking.model,
        temperature: brainConfig.flashThinking.temperature,
        maxTokens: brainConfig.flashThinking.maxTokens,
        enableThoughts: true
      }
    };
  }
  
  // Fallback to OpenAI
  return {
    useGemini: false,
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      temperature: 0.8,
      maxTokens: 1000
    }
  };
}

/**
 * Validate environment configuration
 */
export function validateConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getDegenBrainConfig();
  
  if (config.useGemini) {
    if (!process.env.GEMINI_API_KEY) {
      errors.push('GEMINI_API_KEY is required when Flash Thinking is enabled');
    }
    
    if (config.flashThinking.temperature < 0 || config.flashThinking.temperature > 2) {
      errors.push('GEMINI_THOUGHTS_TEMPERATURE must be between 0 and 2');
    }
    
    if (config.flashThinking.maxTokens <= 0) {
      errors.push('COST_CONTROL_MAX_TOKENS must be positive');
    }
    
    if (config.flashThinking.maxThoughtTokens <= 0) {
      errors.push('COST_CONTROL_MAX_THOUGHT_TOKENS must be positive');
    }
  } else {
    if (!process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY is required when Flash Thinking is disabled');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Log configuration for debugging
 */
export function logConfiguration(): void {
  const config = getDegenBrainConfig();
  const validation = validateConfiguration();
  
  console.log('Degen Brain Configuration:', {
    useGemini: config.useGemini,
    flashThinkingEnabled: config.flashThinking.enabled,
    model: config.flashThinking.model,
    temperature: config.flashThinking.temperature,
    maxTokens: config.flashThinking.maxTokens,
    maxThoughtTokens: config.flashThinking.maxThoughtTokens,
    isValid: validation.isValid,
    errors: validation.errors
  });
}