export interface NotificationSettings {
  tradeSettlement: boolean;
  balanceUpdate: boolean;
  promotion: boolean;
  broadcastFrequency: 'realtime' | '30m' | '1h';
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'syndicate' | 'forex' | 'crypto';
  price: number;
  change: number; // percentage
  volatility: number; // multiplier for random walks
  trendBias: number; // typical trend direction bias
  decimals: number;
  description: string;
}

export type ContractType = 'rise-fall' | 'higher-lower' | 'touch-no-touch' | 'digit-over-under' | 'digit-matches-differs' | 'digit-even-odd';

export interface Tick {
  time: number;
  price: number;
}

export interface Contract {
  id: string;
  assetId: string;
  assetName: string;
  assetSymbol: string;
  type: ContractType;
  direction: 'rise' | 'fall' | 'call' | 'put' | 'buy' | 'sell' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under' | 'matches' | 'differs' | 'even' | 'odd';
  stake: number;
  multiplier?: number;
  payout: number;
  basis: 'stake' | 'payout';
  barrier?: number; // visual or actual trigger level
  barrierOffset?: number; // e.g. +0.50
  targetDigit?: number; // For digit games (0-9)
  entryPrice: number;
  entryTime: number;
  duration: number; // count
  durationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
  expiryTime: number;
  status: 'active' | 'won' | 'lost' | 'sold' | 'draw';
  currentPrice: number;
  currentProfit: number;
  sellPrice?: number;
  ticksPassed: number;
  ticksHistory: { time: number; price: number }[];
  exitPrice?: number;
  exitTime?: number;
  stopLoss?: number; // Stop Loss percentage limit (e.g. 10 for 10% movement / loss)
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface TradeHistoryItem {
  id: string;
  assetName: string;
  assetSymbol: string;
  type: ContractType;
  direction: 'rise' | 'fall' | 'call' | 'put' | 'buy' | 'sell' | 'higher' | 'lower' | 'touch' | 'no-touch' | 'over' | 'under' | 'matches' | 'differs' | 'even' | 'odd';
  stake: number;
  payout: number;
  profit: number;
  status: 'won' | 'lost' | 'sold' | 'draw';
  entryPrice: number;
  exitPrice: number;
  purchaseTime: number;
  targetDigit?: number;
}

export interface Account {
  mode: 'demo' | 'real';
  balance: number;
  currency: string;
  id: string;
}

export interface IndicatorConfig {
  sma: { enabled: boolean; period: number };
  ema: { enabled: boolean; period: number };
  rsi: { enabled: boolean; period: number };
}

export interface CopilotMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: number;
}

export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isTriggered: boolean;
  notifyEmail?: boolean;
  createdAt: number;
}

export interface PendingLimitOrder {
  id: string;
  assetId: string;
  assetName: string;
  assetSymbol: string;
  direction: 'buy' | 'sell';
  stake: number;
  duration: number;
  durationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
  limitPrice: number;
  stopLoss?: number;
  createdAt: number;
}

export enum AccentColor {
  EMERALD = 'emerald',
  RUBY = 'ruby',
  CYAN = 'cyan',
  AMETHYST = 'amethyst',
  INDIGO = 'indigo'
}

export enum ChartStyle {
  BULLISH = 'bullish',
  VOLATILE = 'volatile',
  EXPONENTIAL = 'exponential',
  CANDLES = 'candles',
  LINE = 'line',
  MOUNTAIN = 'mountain'
}

export interface BannerConfig {
  accentColor: AccentColor;
  title?: string;
  subtitle?: string;
  chartStyle?: ChartStyle;
  showGrid?: boolean;
  showGlow?: boolean;
  customBadge?: string;
  platformName?: string;
  headline?: string;
  subHeadline?: string;
  bullets?: string[];
  minDeposit?: string;
  minStake?: string;
}

export interface CaptionConfig {
  headline?: string;
  body?: string;
  cta?: string;
  marketingLink?: string;
  minDepositValue?: string;
  vipLevels?: string;
  minStakeValue?: string;
  includeMpesa?: boolean;
  includeCrypto?: boolean;
}

export interface StoryboardScene {
  id: string | number;
  title?: string;
  duration?: number;
  startSec?: number;
  endSec?: number;
  voiceoverText?: string;
  overlayText?: string;
  actionTitle?: string;
  timeRange?: string;
  actionDesc?: string;
}

