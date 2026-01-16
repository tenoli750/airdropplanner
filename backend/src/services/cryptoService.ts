// Crypto API Service - Binance API only
// Fixed 4 coins: BTC, ETH, SOL, DOGE

const BINANCE_API = 'https://api.binance.com/api/v3';

// Fixed 4 coins for daily races
export const RACE_COINS = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    binanceSymbol: 'BTCUSDT',
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    binanceSymbol: 'ETHUSDT',
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    binanceSymbol: 'SOLUSDT',
  },
  {
    id: 'doge',
    symbol: 'DOGE',
    name: 'Dogecoin',
    image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    binanceSymbol: 'DOGEUSDT',
  },
];

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  openPrice: number;      // Price at 00:00 UTC
  currentPrice: number;   // Current price
  closePrice?: number;    // Price at 23:59 UTC (for completed days)
  percentChange: number;  // Daily % change
}

interface BinanceTradingDayTicker {
  symbol: string;
  openPrice: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
}

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open price
  2: string;  // High price
  3: string;  // Low price
  4: string;  // Close price
  5: string;  // Volume
  6: number;  // Close time
  // ... more fields
}

/**
 * Get today's live prices from Binance (tradingDay endpoint)
 * Returns prices that reset at 00:00 UTC
 */
export async function getTodayPrices(): Promise<CoinPrice[]> {
  try {
    const symbols = RACE_COINS.map(c => c.binanceSymbol);
    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));

    const response = await fetch(`${BINANCE_API}/ticker/tradingDay?symbols=${symbolsParam}`);

    if (!response.ok) {
      console.error(`Binance API error: ${response.status}`);
      return getEmptyPrices();
    }

    const data = (await response.json()) as BinanceTradingDayTicker[];
    
    return RACE_COINS.map(coin => {
      const ticker = data.find(t => t.symbol === coin.binanceSymbol);
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        openPrice: ticker ? parseFloat(ticker.openPrice) : 0,
        currentPrice: ticker ? parseFloat(ticker.lastPrice) : 0,
        percentChange: ticker ? parseFloat(ticker.priceChangePercent) : 0,
      };
    });
  } catch (error) {
    console.error('Error fetching today prices:', error);
    return getEmptyPrices();
  }
}

/**
 * Get yesterday's prices from Binance (klines endpoint)
 * Returns open and close prices for yesterday
 */
export async function getYesterdayPrices(): Promise<CoinPrice[]> {
  try {
    const results: CoinPrice[] = [];
    
    // Calculate yesterday's timestamps
    const now = new Date();
    const yesterdayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const yesterdayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));
    
    for (const coin of RACE_COINS) {
      try {
        // Get daily kline for yesterday
        const response = await fetch(
          `${BINANCE_API}/klines?symbol=${coin.binanceSymbol}&interval=1d&startTime=${yesterdayStart.getTime()}&endTime=${yesterdayEnd.getTime()}&limit=1`
        );

        if (!response.ok) {
          results.push({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            openPrice: 0,
            currentPrice: 0,
            closePrice: 0,
            percentChange: 0,
          });
          continue;
        }

        const data = (await response.json()) as BinanceKline[];
        
        if (data.length > 0) {
          const kline = data[0];
          const openPrice = parseFloat(kline[1]);
          const closePrice = parseFloat(kline[4]);
          const percentChange = ((closePrice - openPrice) / openPrice) * 100;
          
          results.push({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            openPrice,
            currentPrice: closePrice,
            closePrice,
            percentChange,
          });
        } else {
          results.push({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            openPrice: 0,
            currentPrice: 0,
            closePrice: 0,
            percentChange: 0,
          });
        }
      } catch (err) {
        console.error(`Error fetching yesterday price for ${coin.symbol}:`, err);
        results.push({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          image: coin.image,
          openPrice: 0,
          currentPrice: 0,
          closePrice: 0,
          percentChange: 0,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching yesterday prices:', error);
    return getEmptyPrices();
  }
}

/**
 * Get current prices only (for quick updates)
 */
export async function getCurrentPrices(): Promise<Record<string, number>> {
  try {
    const symbols = RACE_COINS.map(c => c.binanceSymbol);
    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));

    const response = await fetch(`${BINANCE_API}/ticker/price?symbols=${symbolsParam}`);

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as Array<{ symbol: string; price: string }>;
    
    const prices: Record<string, number> = {};
    for (const ticker of data) {
      const coin = RACE_COINS.find(c => c.binanceSymbol === ticker.symbol);
      if (coin) {
        prices[coin.id] = parseFloat(ticker.price);
      }
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching current prices:', error);
    return {};
  }
}

function getEmptyPrices(): CoinPrice[] {
  return RACE_COINS.map(coin => ({
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
    openPrice: 0,
    currentPrice: 0,
    percentChange: 0,
  }));
}

// Legacy exports for compatibility
export async function fetchCoinsInMarketCapRange() {
  return getTodayPrices();
}

export async function fetchCoinPrices(coinIds: string[]): Promise<Record<string, number>> {
  return getCurrentPrices();
}

export async function fetchCoinPriceChanges(coinIds: string[]): Promise<Record<string, { price: number; change24h: number }>> {
  const todayPrices = await getTodayPrices();
  const result: Record<string, { price: number; change24h: number }> = {};
  
  for (const price of todayPrices) {
    result[price.id] = {
      price: price.currentPrice,
      change24h: price.percentChange,
    };
  }
  
  return result;
}

export async function getRandomCoinsForRace() {
  return getTodayPrices();
}
