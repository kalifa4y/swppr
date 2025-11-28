import { Coin, Rate, CreateExchangeResponse, TransactionStatus } from '../types';

// SwapSpace API Configuration
const API_URL = 'https://api.swapspace.co/api/v2';
const API_KEY = ''; // Enter your SwapSpace API Key here if you have one

// Fallback Mock Data (Used if API fails or no key provided)
const MOCK_COINS: Coin[] = [
  { ticker: 'BTC', name: 'Bitcoin', image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'ETH', name: 'Ethereum', image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'USDT', name: 'Tether USD', image: 'https://cryptologos.cc/logos/tether-usdt-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'USDC', name: 'USD Coin', image: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'XMR', name: 'Monero', image: 'https://cryptologos.cc/logos/monero-xmr-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'LTC', name: 'Litecoin', image: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'DOGE', name: 'Dogecoin', image: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'SOL', name: 'Solana', image: 'https://cryptologos.cc/logos/solana-sol-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'ADA', name: 'Cardano', image: 'https://cryptologos.cc/logos/cardano-ada-logo.png', hasExternalId: false, isFiat: false },
  { ticker: 'TRX', name: 'Tron', image: 'https://cryptologos.cc/logos/tron-trx-logo.png', hasExternalId: false, isFiat: false },
];

const MOCK_RATES: Rate[] = [
  { adapter: 'ChangeNow', rate: 0.054, min: 0.002, max: 100, limit_min: 0.002, limit_max: 100, time_limit: 10 },
  { adapter: 'SimpleSwap', rate: 0.0538, min: 0.001, max: 50, limit_min: 0.001, limit_max: 50, time_limit: 15 },
  { adapter: 'StealthEX', rate: 0.0535, min: 0.005, max: 200, limit_min: 0.005, limit_max: 200, time_limit: 12 },
  { adapter: 'LetsExchange', rate: 0.0542, min: 0.01, max: 500, limit_min: 0.01, limit_max: 500, time_limit: 8 },
];

// In-memory store for mock transactions
const mockTransactions: Record<string, TransactionStatus> = {};

// Helper for headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': API_KEY, // SwapSpace usually uses Authorization header or x-api-key
});

export const fetchCoins = async (): Promise<Coin[]> => {
  try {
    // If no key, default to mock immediately to save network call
    if (!API_KEY) throw new Error("No API Key");

    const response = await fetch(`${API_URL}/currencies`, {
      headers: getHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to fetch currencies');
    
    const data = await response.json();
    
    // SwapSpace returns array of objects
    return data
      .filter((c: any) => !c.extraIdName) // Simple filter for demo
      .slice(0, 50) // Limit to top 50 to avoid heavy rendering
      .map((c: any) => ({
        ticker: c.code.toUpperCase(),
        name: c.name,
        image: c.icon || `https://ui-avatars.com/api/?name=${c.code}&background=random&color=fff`,
        hasExternalId: !!c.extraIdName,
        isFiat: false
      }));

  } catch (error) {
    console.warn("API Error (fetchCoins): switching to fallback data.", error);
    return MOCK_COINS;
  }
};

export const getRates = async (from: string, to: string, amount: number): Promise<Rate[]> => {
  try {
    if (!API_KEY) throw new Error("No API Key");

    const response = await fetch(`${API_URL}/amounts?amount=${amount}&from=${from.toLowerCase()}&to=${to.toLowerCase()}`, {
      headers: getHeaders()
    });

    if (!response.ok) throw new Error('Failed to fetch rates');
    
    const data = await response.json();
    
    // SwapSpace returns { list: [...] }
    if (data.list && Array.isArray(data.list)) {
        return data.list.map((offer: any) => ({
            adapter: offer.partner,
            rate: offer.estimatedAmount / amount,
            min: offer.minAmount || 0,
            max: offer.maxAmount || 0,
            limit_min: offer.minAmount || 0,
            limit_max: offer.maxAmount || 0,
            time_limit: offer.duration ? parseInt(offer.duration) : 15
        })).sort((a: Rate, b: Rate) => b.rate - a.rate); // Best rate first
    }
    return [];

  } catch (error) {
    console.warn("API Error (getRates): switching to fallback data.", error);
    
    // Mock logic: vary the mock rates slightly based on inputs to feel "live"
    const randomFactor = (num: number) => num * (0.98 + Math.random() * 0.04);
    
    // Calculate a rough relative price based on hardcoded approximation
    // This ensures that even in mock mode, BTC -> ETH isn't 1:1
    const prices: Record<string, number> = { 'BTC': 65000, 'ETH': 3500, 'USDT': 1, 'USDC': 1, 'SOL': 140, 'DOGE': 0.12, 'XMR': 160 };
    const p1 = prices[from.toUpperCase()] || 1;
    const p2 = prices[to.toUpperCase()] || 1;
    const baseRate = p1 / p2;

    return MOCK_RATES.map(r => ({
        ...r,
        rate: randomFactor(baseRate), // Adjust mock rate to be realistic for the pair
        min: 0.001, // Mock limits
        max: 1000
    })).sort((a, b) => b.rate - a.rate);
  }
};

export const createExchange = async (
  from: string, 
  to: string, 
  amount: number, 
  address: string,
  refundAddress?: string
): Promise<CreateExchangeResponse> => {
  
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1500));

  // If we had a key, we would POST to /exchange/create here
  /*
  const response = await fetch(`${API_URL}/exchange`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          amount,
          address,
          refundAddress
      })
  });
  */

  // Generate Mock Response
  const id = 'swsp_' + Math.random().toString(36).substr(2, 9);
  const mockDepositAddress = '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

  mockTransactions[id] = {
    id,
    status: 'waiting',
    createdAt: new Date().toISOString()
  };

  simulateProgress(id);

  return {
    id,
    addressDeposit: mockDepositAddress,
    amountDeposit: amount.toString(),
    currencyDeposit: from,
    currencyReceive: to,
    addressReceive: address,
  };
};

const simulateProgress = (id: string) => {
  const steps: TransactionStatus['status'][] = ['waiting', 'confirming', 'exchanging', 'sending', 'finished'];
  let currentStepIndex = 0;

  const interval = setInterval(() => {
    currentStepIndex++;
    if (mockTransactions[id]) {
      mockTransactions[id].status = steps[currentStepIndex];
      if (currentStepIndex >= steps.length - 1) {
        clearInterval(interval);
      }
    } else {
      clearInterval(interval);
    }
  }, 4000);
};

export const getExchangeStatus = async (id: string): Promise<TransactionStatus> => {
  // Simulate delay
  await new Promise(r => setTimeout(r, 500));
  
  if (mockTransactions[id]) {
    return mockTransactions[id];
  }
  
  // Real API implementation would be:
  // const response = await fetch(`${API_URL}/exchange/${id}`, { headers: getHeaders() });
  
  throw new Error("Transaction not found");
};
