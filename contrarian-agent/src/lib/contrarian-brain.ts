/**
 * Contrarian Brain Module
 * Implements smug, arrogant personality traits and reasoning generation
 */

import { IContrarianBrain, ContrarianSignal, SentimentData } from '../types/index.js';

export class ContrarianBrain implements IContrarianBrain {
  private readonly smugnessLevel: number;
  private readonly personalityMode: 'SMUG' | 'SUPERIOR' | 'CYNICAL';
  private readonly baseCatchphrases: string[];
  private readonly extremeCatchphrases: string[];

  constructor(
    smugnessLevel: number = 8,
    personalityMode: 'SMUG' | 'SUPERIOR' | 'CYNICAL' = 'SMUG'
  ) {
    this.smugnessLevel = Math.max(1, Math.min(10, smugnessLevel));
    this.personalityMode = personalityMode;
    
    this.baseCatchphrases = [
      "sheep",
      "retail",
      "inverse the herd",
      "liquidity exit",
      "max pain for retail",
      "thanks for the cheap coins",
      "fade the noise",
      "contrarian alpha",
      "when others are greedy, be fearful",
      "when others are fearful, be greedy",
      "the crowd is always wrong",
      "retail FOMO",
      "smart money moves",
      "institutional accumulation",
      "weak hands",
      "diamond hands",
      "paper hands panic",
      "euphoria top signal",
      "capitulation bottom",
      "market psychology 101"
    ];

    this.extremeCatchphrases = [
      "MAXIMUM PAIN FOR RETAIL",
      "PEAK EUPHORIA - TIME TO DUMP",
      "BLOOD IN THE STREETS - TIME TO BUY",
      "RETAIL CAPITULATION COMPLETE",
      "SMART MONEY LOADING UP",
      "GENERATIONAL BUYING OPPORTUNITY",
      "TOP IS IN - FADE THE HYPE",
      "BOTTOM IS IN - INVERSE THE FEAR",
      "TEXTBOOK CONTRARIAN SETUP",
      "THIS IS WHY RETAIL GETS REKT"
    ];
  }

  /**
   * Generates smug rant with market analysis and contrarian reasoning
   */
  generateSmugRant(signal: ContrarianSignal, sentimentData: SentimentData): string {
    const isExtreme = signal.triggerConditions.isExtremeCondition;
    const fearGreedValue = sentimentData.fearGreedIndex.value;
    const classification = sentimentData.fearGreedIndex.classification;
    
    let rant = this.getOpeningStatement(signal.signalType, isExtreme);
    
    // Add market analysis
    rant += this.generateMarketAnalysis(sentimentData, signal);
    
    // Add contrarian logic explanation
    rant += this.generateContrarianLogic(signal, sentimentData);
    
    // Add personality-specific commentary
    rant += this.generatePersonalityCommentary(signal, isExtreme);
    
    // Add closing statement with catchphrases
    rant += this.generateClosingStatement(signal, isExtreme);
    
    return rant;
  }

  /**
   * Gets personality response for general context
   */
  getPersonalityResponse(context: string): string {
    const responses = this.getPersonalityResponses();
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex].replace('{context}', context);
  }

  /**
   * Gets contrarian phrases based on extreme conditions
   */
  getContrarianPhrases(isExtreme: boolean): string[] {
    if (isExtreme) {
      return [...this.extremeCatchphrases];
    }
    return [...this.baseCatchphrases];
  }

  /**
   * Generates opening statement based on signal type and extremity
   */
  private getOpeningStatement(signalType: 'BUY' | 'SELL', isExtreme: boolean): string {
    const intensity = isExtreme ? 'EXTREME' : 'STRONG';
    
    if (signalType === 'BUY') {
      return isExtreme 
        ? `🩸 BLOOD IN THE STREETS! ${intensity} CONTRARIAN BUY SIGNAL ACTIVATED! 🩸\n\n`
        : `📉 The sheep are panicking again. Time for some contrarian alpha. 📉\n\n`;
    } else {
      return isExtreme
        ? `🚨 PEAK EUPHORIA DETECTED! ${intensity} CONTRARIAN SELL SIGNAL! 🚨\n\n`
        : `📈 Retail FOMO is kicking in. Smart money knows what to do. 📈\n\n`;
    }
  }

  /**
   * Generates detailed market analysis section
   */
  private generateMarketAnalysis(sentimentData: SentimentData, signal: ContrarianSignal): string {
    const fearGreed = sentimentData.fearGreedIndex.value;
    const classification = sentimentData.fearGreedIndex.classification;
    const community = sentimentData.communityData;
    
    let analysis = `📊 MARKET ANALYSIS:\n`;
    analysis += `• Fear & Greed Index: ${fearGreed}/100 (${classification})\n`;
    
    if (fearGreed > 80) {
      analysis += `• Market is in EXTREME GREED territory - classic distribution phase\n`;
      analysis += `• Retail is buying the top while smart money exits\n`;
    } else if (fearGreed < 20) {
      analysis += `• Market is in EXTREME FEAR territory - classic accumulation phase\n`;
      analysis += `• Retail is panic selling while smart money accumulates\n`;
    } else if (fearGreed > 60) {
      analysis += `• Greed levels rising - retail starting to FOMO in\n`;
      analysis += `• Time to start taking profits before the sheep arrive\n`;
    } else {
      analysis += `• Fear levels present - retail getting shaken out\n`;
      analysis += `• Opportunity to buy from weak hands\n`;
    }
    
    if (community) {
      analysis += `• Community Sentiment: ${community.bullishPercentage}% bullish\n`;
      
      if (signal.signalType === 'SELL' && community.bullishPercentage > 70) {
        analysis += `• High community bullishness = perfect fade setup\n`;
      } else if (signal.signalType === 'BUY' && community.bullishPercentage < 30) {
        analysis += `• Low community bullishness = contrarian opportunity\n`;
      }
    }
    
    analysis += `• Confidence Level: ${signal.confidence}%\n\n`;
    
    return analysis;
  }

  /**
   * Generates contrarian logic explanation
   */
  private generateContrarianLogic(signal: ContrarianSignal, sentimentData: SentimentData): string {
    let logic = `🧠 CONTRARIAN LOGIC:\n`;
    
    if (signal.signalType === 'BUY') {
      logic += `• When retail is fearful, smart money is greedy\n`;
      logic += `• Fear creates the best buying opportunities\n`;
      logic += `• "Be greedy when others are fearful" - Buffett wasn't wrong\n`;
      logic += `• Maximum pessimism = maximum opportunity\n`;
      
      if (signal.triggerConditions.isExtremeCondition) {
        logic += `• EXTREME fear = EXTREME opportunity for contrarians\n`;
        logic += `• This is when generational wealth is made\n`;
      }
    } else {
      logic += `• When retail is greedy, smart money takes profits\n`;
      logic += `• Greed creates perfect exit liquidity\n`;
      logic += `• "Be fearful when others are greedy" - timeless wisdom\n`;
      logic += `• Maximum optimism = maximum risk\n`;
      
      if (signal.triggerConditions.isExtremeCondition) {
        logic += `• EXTREME greed = EXTREME risk for the unprepared\n`;
        logic += `• This is when retail gets absolutely REKT\n`;
      }
    }
    
    logic += `• The crowd is always wrong at extremes\n`;
    logic += `• Inverse the herd for maximum alpha\n\n`;
    
    return logic;
  }

  /**
   * Generates personality-specific commentary
   */
  private generatePersonalityCommentary(signal: ContrarianSignal, isExtreme: boolean): string {
    let commentary = `💭 CONTRARIAN COMMENTARY:\n`;
    
    switch (this.personalityMode) {
      case 'SMUG':
        commentary += this.generateSmugCommentary(signal, isExtreme);
        break;
      case 'SUPERIOR':
        commentary += this.generateSuperiorCommentary(signal, isExtreme);
        break;
      case 'CYNICAL':
        commentary += this.generateCynicalCommentary(signal, isExtreme);
        break;
    }
    
    return commentary + '\n';
  }

  /**
   * Generates smug personality commentary
   */
  private generateSmugCommentary(signal: ContrarianSignal, isExtreme: boolean): string {
    const phrases = this.getRandomPhrases(isExtreme, 2);
    
    if (signal.signalType === 'BUY') {
      return `• While the ${phrases[0]} are panic selling, I'm accumulating\n` +
             `• Thanks for the cheap coins, ${phrases[1]}!\n` +
             `• This is why 95% of traders lose money - they follow emotions\n` +
             `• I'll be buying your bags at the bottom, as usual\n`;
    } else {
      return `• Time to sell into the ${phrases[0]} FOMO\n` +
             `• ${phrases[1]} always buy the top - it's like clockwork\n` +
             `• I'll be taking profits while you're still "diamond handing"\n` +
             `• This is basic market psychology - but most are too emotional to see it\n`;
    }
  }

  /**
   * Generates superior personality commentary
   */
  private generateSuperiorCommentary(signal: ContrarianSignal, isExtreme: boolean): string {
    const phrases = this.getRandomPhrases(isExtreme, 2);
    
    if (signal.signalType === 'BUY') {
      return `• Superior market positioning while ${phrases[0]} capitulate\n` +
             `• Intellectual capital deployment during ${phrases[1]} panic\n` +
             `• This is what separates sophisticated investors from the masses\n` +
             `• Asymmetric risk-reward favors the prepared mind\n`;
    } else {
      return `• Strategic profit-taking while ${phrases[0]} chase momentum\n` +
             `• Risk management protocols activated as ${phrases[1]} FOMO in\n` +
             `• This is advanced market psychology in action\n` +
             `• Disciplined execution separates professionals from amateurs\n`;
    }
  }

  /**
   * Generates cynical personality commentary
   */
  private generateCynicalCommentary(signal: ContrarianSignal, isExtreme: boolean): string {
    const phrases = this.getRandomPhrases(isExtreme, 2);
    
    if (signal.signalType === 'BUY') {
      return `• Another cycle, another opportunity to buy from ${phrases[0]}\n` +
             `• ${phrases[1]} never learn - they sell every bottom\n` +
             `• The game never changes, only the players get rekt\n` +
             `• Rinse and repeat - fear creates the best entries\n`;
    } else {
      return `• Here we go again - ${phrases[0]} buying the top\n` +
             `• ${phrases[1]} will hold these bags all the way down\n` +
             `• Same story, different cycle - greed creates perfect exits\n` +
             `• The house always wins, and retail always loses\n`;
    }
  }

  /**
   * Generates closing statement with catchphrases
   */
  private generateClosingStatement(signal: ContrarianSignal, isExtreme: boolean): string {
    const phrases = this.getRandomPhrases(isExtreme, 3);
    
    let closing = `🎯 CONTRARIAN ALPHA:\n`;
    closing += `• ${phrases[0].toUpperCase()}\n`;
    closing += `• ${phrases[1].toUpperCase()}\n`;
    
    if (isExtreme) {
      closing += `• ${phrases[2].toUpperCase()}\n`;
      closing += `\n🔥 THIS IS WHY WE INVERSE THE HERD! 🔥\n`;
    } else {
      closing += `\n💎 STAY CONTRARIAN, STAY PROFITABLE 💎\n`;
    }
    
    closing += `\nRemember: This is not financial advice, just superior market psychology. 😏`;
    
    return closing;
  }

  /**
   * Gets random contrarian phrases
   */
  private getRandomPhrases(isExtreme: boolean, count: number): string[] {
    const phrases = isExtreme ? this.extremeCatchphrases : this.baseCatchphrases;
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Gets personality-specific responses for general context
   */
  private getPersonalityResponses(): string[] {
    const baseResponses = [
      "Ah, another {context} situation. Let me guess - retail is doing the opposite of what they should?",
      "Classic {context} setup. The sheep never learn, do they?",
      "I've seen this {context} pattern a thousand times. Contrarian opportunity incoming.",
      "While everyone else panics about {context}, smart money stays calm.",
      "The {context} narrative is just noise. Focus on the contrarian signals."
    ];

    switch (this.personalityMode) {
      case 'SUPERIOR':
        return [
          ...baseResponses,
          "My sophisticated analysis of {context} reveals the obvious contrarian play.",
          "The intellectual approach to {context} is clearly contrarian positioning.",
          "Advanced market psychology suggests {context} is a fade opportunity."
        ];
      case 'CYNICAL':
        return [
          ...baseResponses,
          "Another {context} cycle, another chance to profit from retail mistakes.",
          "The {context} game never changes - only the suckers get recycled.",
          "Same old {context} story - retail buys high, sells low, repeat."
        ];
      default: // SMUG
        return [
          ...baseResponses,
          "Oh look, another {context} situation where I'll be proven right again.",
          "The {context} setup is so obvious, but retail will miss it as usual.",
          "I love {context} moments - easy money from emotional traders."
        ];
    }
  }

  /**
   * Adjusts smugness level dynamically
   */
  adjustSmugnessLevel(newLevel: number): void {
    // Clamp between 1-10
    const clampedLevel = Math.max(1, Math.min(10, newLevel));
    (this as any).smugnessLevel = clampedLevel;
  }

  /**
   * Gets current personality configuration
   */
  getPersonalityConfig(): {
    smugnessLevel: number;
    personalityMode: string;
    totalCatchphrases: number;
  } {
    return {
      smugnessLevel: this.smugnessLevel,
      personalityMode: this.personalityMode,
      totalCatchphrases: this.baseCatchphrases.length + this.extremeCatchphrases.length
    };
  }
}