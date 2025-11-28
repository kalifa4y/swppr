export interface Coin {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isFiat: boolean;
}

export interface Rate {
  adapter: string;
  rate: number;
  min: number;
  max: number;
  limit_min: number;
  limit_max: number;
  time_limit: number;
}

export interface CreateExchangeResponse {
  id: string;
  addressDeposit: string;
  amountDeposit: string;
  currencyDeposit: string;
  currencyReceive: string;
  addressReceive: string;
  extraIdDeposit?: string;
}

export interface TransactionStatus {
  id: string;
  status: 'waiting' | 'confirming' | 'exchanging' | 'sending' | 'finished' | 'failed' | 'refunded';
  hashIn?: string;
  hashOut?: string;
  createdAt: string;
}

export interface ExchangeRecord {
  id: string;
  fromCoin: string;
  toCoin: string;
  amount: number;
  receiveAmountEstimate: number;
  date: string;
  status: TransactionStatus['status'];
  addressDeposit: string;
}

export enum Screen {
  HOME = 'HOME',
  RATES = 'RATES',
  EXCHANGE = 'EXCHANGE',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}