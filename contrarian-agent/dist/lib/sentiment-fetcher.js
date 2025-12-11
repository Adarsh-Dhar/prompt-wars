/**
 * Sentiment Fetcher Module
 * Handles API calls to external sentiment sources with retry logic and caching
 */
export class SentimentFetcher {
    constructor(cacheRefreshIntervalMinutes = 5) {
        this.cache = {};
        this.maxRetries = 3;
        this.baseRetryDelay = 1000; // 1 second
        this.maxRetryDelay = 60000; // 60 seconds
        this.requestTimeout = 30000; // 30 seconds
        this.cacheRefreshInterval = cacheRefreshIntervalMinutes * 60 * 1000; // Convert to milliseconds
    }
    /**
     * Fetches Fear & Greed Index from api.alternative.me
     * Implements exponential backoff retry strategy
     */
    async getFearGreedIndex() {
        const cacheKey = 'fearGreedIndex';
        // Check cache first
        if (this.cache[cacheKey] && this.isCacheValid(this.cache[cacheKey])) {
            return this.cache[cacheKey].data;
        }
        let lastError = null;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
                const response = await fetch('https://api.alternative.me/fng/', {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'ContrarianAgent/1.0'
                    }
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
                    throw new Error('Invalid API response format');
                }
                const fearGreedData = {
                    value: parseInt(data.data[0].value),
                    value_classification: data.data[0].value_classification,
                    timestamp: data.data[0].timestamp,
                    time_until_update: data.data[0].time_until_update
                };
                if (!this.validateSentimentData(fearGreedData)) {
                    throw new Error('Invalid Fear & Greed Index data');
                }
                // Cache the result
                this.cache[cacheKey] = {
                    data: fearGreedData,
                    timestamp: new Date(),
                    expiresAt: new Date(Date.now() + this.cacheRefreshInterval)
                };
                return fearGreedData;
            }
            catch (error) {
                lastError = error;
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.warn(`Fear & Greed API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
                    await this.sleep(delay);
                }
            }
        }
        // If all retries failed, try to use cached data even if stale
        if (this.cache[cacheKey]) {
            console.warn('Using stale cached Fear & Greed data due to API failures');
            return this.cache[cacheKey].data;
        }
        throw new Error(`Failed to fetch Fear & Greed Index after ${this.maxRetries} attempts: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
    }
    /**
     * Fetches community sentiment for a specific token from CoinGecko API
     */
    async getCommunitysentiment(tokenSymbol) {
        var _a, _b;
        const cacheKey = `community_${tokenSymbol.toLowerCase()}`;
        // Check cache first
        if ((_a = this.cache.communityData) === null || _a === void 0 ? void 0 : _a.has(cacheKey)) {
            const cached = this.cache.communityData.get(cacheKey);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
        }
        let lastError = null;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
                // CoinGecko API endpoint for coin data
                const coinId = await this.getCoinId(tokenSymbol);
                const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'ContrarianAgent/1.0'
                    }
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    if (response.status === 429) {
                        // Rate limited, use longer delay
                        const delay = this.calculateRetryDelay(attempt, true);
                        console.warn(`CoinGecko API rate limited, retrying in ${delay}ms`);
                        await this.sleep(delay);
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                // Extract sentiment data from CoinGecko response
                const communityData = {
                    tokenSymbol: tokenSymbol.toUpperCase(),
                    sentiment: this.extractSentimentScore(data),
                    bullishPercentage: this.extractBullishPercentage(data),
                    bearishPercentage: this.extractBearishPercentage(data),
                    source: 'coingecko'
                };
                // Initialize community cache if needed
                if (!this.cache.communityData) {
                    this.cache.communityData = new Map();
                }
                // Cache the result
                this.cache.communityData.set(cacheKey, {
                    data: communityData,
                    timestamp: new Date(),
                    expiresAt: new Date(Date.now() + this.cacheRefreshInterval)
                });
                return communityData;
            }
            catch (error) {
                lastError = error;
                if (attempt < this.maxRetries - 1) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.warn(`CoinGecko API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
                    await this.sleep(delay);
                }
            }
        }
        // If all retries failed, try to use cached data even if stale
        if ((_b = this.cache.communityData) === null || _b === void 0 ? void 0 : _b.has(cacheKey)) {
            console.warn(`Using stale cached community data for ${tokenSymbol} due to API failures`);
            return this.cache.communityData.get(cacheKey).data;
        }
        throw new Error(`Failed to fetch community sentiment for ${tokenSymbol} after ${this.maxRetries} attempts: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
    }
    /**
     * Validates sentiment data to ensure it meets requirements
     */
    validateSentimentData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        // Validate Fear & Greed Index data
        if ('value' in data) {
            const value = typeof data.value === 'string' ? parseInt(data.value) : data.value;
            return typeof value === 'number' && value >= 0 && value <= 100;
        }
        // Validate Community data
        if ('sentiment' in data) {
            return typeof data.sentiment === 'number' &&
                data.sentiment >= 0 &&
                data.sentiment <= 100;
        }
        return false;
    }
    /**
     * Combines Fear & Greed Index and community data into SentimentData
     */
    async fetchCombinedSentiment(tokenSymbol) {
        const fearGreedData = await this.getFearGreedIndex();
        const sentimentData = {
            fearGreedIndex: {
                value: fearGreedData.value,
                classification: fearGreedData.value_classification,
                timestamp: new Date(parseInt(fearGreedData.timestamp) * 1000)
            }
        };
        if (tokenSymbol) {
            try {
                const communityData = await this.getCommunitysentiment(tokenSymbol);
                sentimentData.communityData = communityData;
            }
            catch (error) {
                console.warn(`Failed to fetch community data for ${tokenSymbol}:`, error);
                // Continue without community data
            }
        }
        return sentimentData;
    }
    /**
     * Helper method to get CoinGecko coin ID from symbol
     */
    async getCoinId(symbol) {
        // Simple mapping for common tokens
        const symbolMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'ADA': 'cardano',
            'DOT': 'polkadot',
            'LINK': 'chainlink',
            'UNI': 'uniswap',
            'AVAX': 'avalanche-2',
            'MATIC': 'matic-network',
            'ATOM': 'cosmos'
        };
        return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    }
    /**
     * Extract sentiment score from CoinGecko data
     */
    extractSentimentScore(data) {
        var _a, _b;
        // Use market cap rank and price change as sentiment indicators
        const priceChange24h = ((_a = data.market_data) === null || _a === void 0 ? void 0 : _a.price_change_percentage_24h) || 0;
        const priceChange7d = ((_b = data.market_data) === null || _b === void 0 ? void 0 : _b.price_change_percentage_7d) || 0;
        // Simple sentiment calculation based on price performance
        const avgChange = (priceChange24h + priceChange7d) / 2;
        // Convert to 0-100 scale (50 = neutral)
        const sentiment = Math.max(0, Math.min(100, 50 + (avgChange * 2)));
        return Math.round(sentiment);
    }
    /**
     * Extract bullish percentage from CoinGecko data
     */
    extractBullishPercentage(data) {
        const sentiment = this.extractSentimentScore(data);
        return sentiment;
    }
    /**
     * Extract bearish percentage from CoinGecko data
     */
    extractBearishPercentage(data) {
        const sentiment = this.extractSentimentScore(data);
        return 100 - sentiment;
    }
    /**
     * Check if cached data is still valid
     */
    isCacheValid(cacheEntry) {
        return new Date() < cacheEntry.expiresAt;
    }
    /**
     * Calculate exponential backoff delay
     */
    calculateRetryDelay(attempt, isRateLimit = false) {
        const baseDelay = isRateLimit ? this.baseRetryDelay * 10 : this.baseRetryDelay;
        const delay = Math.min(baseDelay * Math.pow(2, attempt), this.maxRetryDelay);
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return Math.round(delay + jitter);
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = new Date();
        // Clear fear & greed cache if expired
        if (this.cache.fearGreedIndex && now >= this.cache.fearGreedIndex.expiresAt) {
            delete this.cache.fearGreedIndex;
        }
        // Clear expired community data
        if (this.cache.communityData) {
            for (const [key, entry] of this.cache.communityData.entries()) {
                if (now >= entry.expiresAt) {
                    this.cache.communityData.delete(key);
                }
            }
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        var _a;
        return {
            fearGreedCached: !!this.cache.fearGreedIndex && this.isCacheValid(this.cache.fearGreedIndex),
            communityCacheSize: ((_a = this.cache.communityData) === null || _a === void 0 ? void 0 : _a.size) || 0
        };
    }
}
