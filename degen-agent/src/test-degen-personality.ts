/**
 * Simple Degen personality consistency test
 * Feature: rekto-rich-agent, Property 8: Degen personality consistency
 * Validates: Requirements 4.1
 */

import * as fc from 'fast-check';
import { ChainOfThoughtGenerator } from './lib/chain-of-thought-generator';
import { TokenAnalyzer } from './lib/token-analysis';
import { TradingDecision, DegenAgent } from './types';
import { generateDegenPrompt, DEGEN_SYSTEM_PROMPT } from './lib/degen_brain';

// Test function to validate degen personality consistency
async function validateDegenPersonalityConsistency(): Promise<boolean> {
  console.log('Testing Degen Personality Consistency...');
  
  const tokenAnalyzer = new TokenAnalyzer();
  const cotGenerator = new ChainOfThoughtGenerator(); // No OpenAI key for testing
  
  // Test 1: System prompt contains required slang
  console.log('Test 1: Checking system prompt contains required slang...');
  const prompt = DEGEN_SYSTEM_PROMPT.toLowerCase();
  const requiredSlang = [
    'wagmi',
    'rekt', 
    'ape in',
    'diamond hands',
    'paper hands',
    'moon',
    'pump',
    'dump',
    'hodl',
    'fud',
    'fomo',
    'degen'
  ];
  
  let missingSlang: string[] = [];
  requiredSlang.forEach(slang => {
    if (!prompt.includes(slang.toLowerCase())) {
      missingSlang.push(slang);
    }
  });
  
  if (missingSlang.length > 0) {
    console.log('❌ Missing required slang terms:', missingSlang);
    return false;
  }
  console.log('✅ System prompt contains all required slang terms');
  
  // Test 2: Generated prompts maintain personality
  console.log('Test 2: Testing generated prompts...');
  for (let i = 0; i < 10; i++) {
    const tokenSymbol = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE'][i % 5];
    const currentPrice = Math.random() * 1000 + 1;
    
    const generatedPrompt = generateDegenPrompt(tokenSymbol, currentPrice);
    const lowerPrompt = generatedPrompt.toLowerCase();
    
    if (!lowerPrompt.includes('degen') || 
        !lowerPrompt.includes('wagmi') || 
        !lowerPrompt.includes('diamond hands')) {
      console.log('❌ Generated prompt missing key degen terms');
      return false;
    }
    
    if (!generatedPrompt.includes(tokenSymbol) || 
        !generatedPrompt.includes(currentPrice.toString())) {
      console.log('❌ Generated prompt missing token/price info');
      return false;
    }
  }
  console.log('✅ Generated prompts maintain degen personality');
  
  // Test 3: Chain of Thought contains degen slang
  console.log('Test 3: Testing Chain of Thought generation...');
  
  const sampleDecision: TradingDecision = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tokenSymbol: 'BTC',
    decision: 'LONG',
    confidence: 85,
    timestamp: new Date(),
    currentPrice: 45000.50,
    chainOfThought: undefined,
    isUnlocked: false,
    marketId: undefined
  };
  
  const sampleMetrics = {
    symbol: 'BTC',
    price: 45000.50,
    volume24h: 1000000000,
    marketCap: 900000000000,
    priceChange24h: 5.2,
    socialSentiment: 'BULLISH' as const,
    hypeScore: 85,
    liquidityScore: 90,
    memeScore: 60
  };
  
  const chainOfThought = await cotGenerator.generateChainOfThought(sampleDecision, sampleMetrics);
  
  // Combine all text content for analysis
  const allContent = [
    chainOfThought.reasoning,
    chainOfThought.marketAnalysis,
    chainOfThought.riskAssessment,
    chainOfThought.degenCommentary
  ].join(' ').toLowerCase();
  
  // Check for required crypto slang terms (case insensitive)
  const requiredSlangInContent = [
    'wagmi',
    'rekt',
    'ape in',
    'diamond hands',
    'degen',
    'moon',
    'pump'
  ];
  
  const foundSlang = requiredSlangInContent.filter(slang => 
    allContent.includes(slang.toLowerCase())
  );
  
  if (foundSlang.length < 2) {
    console.log('❌ Chain of Thought missing sufficient degen slang. Found:', foundSlang);
    return false;
  }
  
  // Verify degen energy indicators are present
  const degenIndicators = [
    'hype',
    'vibes',
    'spicy',
    'insane',
    'crazy',
    'maximum',
    'ultra'
  ];
  
  const foundIndicators = degenIndicators.filter(indicator =>
    allContent.includes(indicator.toLowerCase())
  );
  
  if (foundIndicators.length < 1) {
    console.log('❌ Chain of Thought missing degen energy indicators');
    return false;
  }
  
  console.log('✅ Chain of Thought contains required degen slang:', foundSlang);
  console.log('✅ Chain of Thought contains degen energy indicators:', foundIndicators);
  
  // Test 4: Token analysis generates appropriate insights
  console.log('Test 4: Testing token analysis insights...');
  
  const analysis = tokenAnalyzer.analyzeToken(sampleMetrics);
  const insights = tokenAnalyzer.generateDegenInsights(analysis, sampleMetrics);
  
  if (insights.length > 0) {
    const allInsights = insights.join(' ').toLowerCase();
    
    const degenTerms = [
      'hype',
      'rekt',
      'moon',
      'pump',
      'dump',
      'degen',
      'diamond',
      'risk',
      'insane',
      'crazy',
      'spicy'
    ];
    
    const foundTerms = degenTerms.filter(term => 
      allInsights.includes(term)
    );
    
    if (foundTerms.length < 1) {
      console.log('❌ Token analysis insights missing degen terms');
      return false;
    }
    
    console.log('✅ Token analysis insights contain degen terms:', foundTerms);
  }
  
  // Test 5: Degen rating system consistency
  console.log('Test 5: Testing degen rating system...');
  
  // Verify degen rating is valid
  if (!['SAFE', 'RISKY', 'DEGEN', 'ULTRA_DEGEN'].includes(analysis.degenRating)) {
    console.log('❌ Invalid degen rating:', analysis.degenRating);
    return false;
  }
  
  // Verify scores are in valid ranges
  if (analysis.overallHype < 0 || analysis.overallHype > 100) {
    console.log('❌ Invalid hype score:', analysis.overallHype);
    return false;
  }
  
  if (analysis.sentimentScore < -100 || analysis.sentimentScore > 100) {
    console.log('❌ Invalid sentiment score:', analysis.sentimentScore);
    return false;
  }
  
  if (analysis.momentumScore < 0 || analysis.momentumScore > 100) {
    console.log('❌ Invalid momentum score:', analysis.momentumScore);
    return false;
  }
  
  console.log('✅ Degen rating system maintains consistency');
  console.log('   - Degen Rating:', analysis.degenRating);
  console.log('   - Hype Score:', analysis.overallHype);
  console.log('   - Sentiment Score:', analysis.sentimentScore);
  console.log('   - Momentum Score:', analysis.momentumScore);
  
  return true;
}

// Run the test
validateDegenPersonalityConsistency()
  .then(success => {
    if (success) {
      console.log('\n🎉 All Degen Personality Consistency tests PASSED!');
      console.log('Property 8: Degen personality consistency - VALIDATED ✅');
    } else {
      console.log('\n❌ Degen Personality Consistency tests FAILED!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Error running Degen Personality tests:', error);
    process.exit(1);
  });