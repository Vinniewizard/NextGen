export interface P2POrder {
  id: string;
  user_id: string;
  merchant_name?: string;
  type: 'buy' | 'sell';
  coin: string;
  amount: number;
  price: number;
  status: 'open' | 'trading' | 'completed' | 'cancelled';
  paymentMethod: string;
  fiat_currency?: string;
  min_limit?: number;
  max_limit?: number;
  payment_details?: string;
  required_kyc: number;
  required_min_trades: number;
  terms: string;
  is_verified?: number;
  completion_rate?: number;
  orders_count?: number;
  avg_release_time?: number;
  positive_rating?: number;
  created_at: string;
}

export interface TradeSession {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  price: number;
  coin: string;
  status: 'open' | 'paid' | 'completed' | 'cancelled' | 'disputed';
  chat_messages: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderEmail?: string;
  text: string;
  timestamp: string;
  attachment?: string;
}

export interface UserInfo {
  balance: number;
  verificationStatus: 'verified' | 'unverified';
  completedTrades: number;
}

export const PAYMENT_METHODS = [
  'All Payments',
  'M-Pesa',
  'Bank Transfer',
  'Chipper Cash',
  'Revolut',
  'Wise',
  'Knex Pay',
  'SEPA Instant',
  'PayPal',
  'Apple Pay'
];

export const FIAT_CURRENCIES = [
  { code: 'ALL', name: 'All Currencies', symbol: '🌐' },
  { code: 'USD', name: 'USD - US Dollar', symbol: '$' },
  { code: 'KES', name: 'KES - Kenyan Shilling', symbol: 'KSh' },
  { code: 'EUR', name: 'EUR - Euro', symbol: '€' },
  { code: 'GBP', name: 'GBP - British Pound', symbol: '£' },
  { code: 'NGN', name: 'NGN - Nigerian Naira', symbol: '₦' },
  { code: 'UGX', name: 'UGX - Ugandan Shilling', symbol: 'USh' },
  { code: 'TZS', name: 'TZS - Tanzanian Shilling', symbol: 'TSh' },
  { code: 'ZAR', name: 'ZAR - South African Rand', symbol: 'R' },
  { code: 'INR', name: 'INR - Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'CAD - Canadian Dollar', symbol: 'C$' },
  { code: 'AED', name: 'AED - UAE Dirham', symbol: 'AED' }
];

export const COIN_LIST = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC'];

export const REFERENCE_PRICES: Record<string, number> = {
  USDT: 1.00,
  BTC: 64250.00,
  ETH: 3450.00,
  BNB: 580.00,
  USDC: 1.00
};
