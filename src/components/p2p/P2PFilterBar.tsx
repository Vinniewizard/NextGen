import React from 'react';
import { RefreshCw, Search, ChevronDown, Check, ShieldCheck } from 'lucide-react';
import { COIN_LIST, FIAT_CURRENCIES, PAYMENT_METHODS, REFERENCE_PRICES } from './P2PTypes';

interface P2PFilterBarProps {
  tradeDirection: 'buy' | 'sell';
  onTradeDirectionChange: (dir: 'buy' | 'sell') => void;
  selectedCoin: string;
  onCoinChange: (coin: string) => void;
  amountFilter: string;
  onAmountFilterChange: (val: string) => void;
  fiatCurrency: string;
  onFiatCurrencyChange: (val: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (val: string) => void;
  sortBy: 'price' | 'completion' | 'orders';
  onSortByChange: (sort: 'price' | 'completion' | 'orders') => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verified: boolean) => void;
  refreshCountdown: number;
  onRefreshClick: () => void;
  advertiserSearch?: string;
  onAdvertiserSearchChange?: (val: string) => void;
  isDark: boolean;
}

export default function P2PFilterBar({
  tradeDirection,
  onTradeDirectionChange,
  selectedCoin,
  onCoinChange,
  amountFilter,
  onAmountFilterChange,
  fiatCurrency,
  onFiatCurrencyChange,
  paymentFilter,
  onPaymentFilterChange,
  sortBy,
  onSortByChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  refreshCountdown,
  onRefreshClick,
  advertiserSearch = '',
  onAdvertiserSearchChange,
  isDark
}: P2PFilterBarProps) {
  const currentFiatObj = FIAT_CURRENCIES.find(f => f.code === fiatCurrency) || FIAT_CURRENCIES[1];

  return (
    <div className={`p-4 md:p-5 rounded-2xl border space-y-4 font-sans ${
      isDark ? 'bg-[#181a20] border-[#2b313a]' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Top Row: Buy / Sell Big Buttons + Crypto Coin Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#2b313a]">
        
        {/* Buy / Sell Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0b0e11] rounded-xl border border-[#2b313a] shrink-0">
          <button
            onClick={() => onTradeDirectionChange('buy')}
            className={`px-6 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tradeDirection === 'buy'
                ? 'bg-[#0ecb81] text-[#0b0e11] shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#0b0e11]" />
            <span>BUY</span>
          </button>
          
          <button
            onClick={() => onTradeDirectionChange('sell')}
            className={`px-6 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tradeDirection === 'sell'
                ? 'bg-[#f6465d] text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>SELL</span>
          </button>
        </div>

        {/* Crypto Coin Tabs with Reference Prices */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          {COIN_LIST.map(coin => {
            const active = selectedCoin === coin;
            const refPrice = REFERENCE_PRICES[coin];
            return (
              <button
                key={coin}
                onClick={() => onCoinChange(coin)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#fcd535]/15 border-[#fcd535] text-[#fcd535]'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-[#2b313a]/50'
                }`}
              >
                <span>{coin}</span>
                {refPrice && (
                  <span className="ml-1.5 text-[10px] text-slate-500 font-normal">
                    ≈${refPrice.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Row: Search/Merchant, Amount, Fiat, Payment, Sort, Verified, Refresh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        
        {/* Advertiser / Keyword Search Input */}
        <div className="lg:col-span-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search merchant or bank..."
            value={advertiserSearch}
            onChange={(e) => onAdvertiserSearchChange && onAdvertiserSearchChange(e.target.value)}
            className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#fcd535] font-mono"
          />
        </div>

        {/* Amount Input */}
        <div className="lg:col-span-2 relative">
          <input
            type="number"
            placeholder="Amount"
            value={amountFilter}
            onChange={(e) => onAmountFilterChange(e.target.value)}
            className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl pl-3 pr-12 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#fcd535] font-mono"
          />
          <span className="absolute right-2.5 top-2 text-[10px] font-mono font-bold text-slate-400">
            {currentFiatObj.code === 'ALL' ? 'USD' : currentFiatObj.code}
          </span>
        </div>

        {/* Fiat Currency Selector */}
        <div className="lg:col-span-2 relative">
          <select
            value={fiatCurrency}
            onChange={(e) => onFiatCurrencyChange(e.target.value)}
            className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#fcd535] appearance-none cursor-pointer"
          >
            {FIAT_CURRENCIES.map(f => (
              <option key={f.code} value={f.code}>
                {f.code} ({f.symbol})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Payment Method Selector */}
        <div className="lg:col-span-2 relative">
          <select
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange(e.target.value)}
            className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#fcd535] appearance-none cursor-pointer"
          >
            {PAYMENT_METHODS.map(pm => (
              <option key={pm} value={pm === 'All Payments' ? 'all' : pm}>
                {pm}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Sort Selector */}
        <div className="lg:col-span-1.5 relative">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as any)}
            className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-2 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-[#fcd535] appearance-none cursor-pointer"
          >
            <option value="price">Best Price</option>
            <option value="completion">Completion</option>
            <option value="orders">Orders</option>
          </select>
        </div>

        {/* Verified Merchants & Auto Refresh */}
        <div className="lg:col-span-1.5 flex items-center justify-end gap-2">
          <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer select-none" title="Verified Merchants Only">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => onVerifiedOnlyChange(e.target.checked)}
              className="accent-[#fcd535] rounded w-3.5 h-3.5"
            />
            <span className="flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3 text-[#fcd535]" />
              <span>Pro</span>
            </span>
          </label>

          <button
            onClick={onRefreshClick}
            className="px-2 py-1.5 bg-[#0b0e11] hover:bg-[#2b313a] text-slate-400 hover:text-white rounded-xl border border-[#2b313a] transition-colors flex items-center gap-1 text-[11px] font-mono cursor-pointer"
            title="Refresh order book"
          >
            <RefreshCw className="w-3 h-3 text-[#fcd535]" />
            <span>{refreshCountdown}s</span>
          </button>
        </div>

      </div>
    </div>
  );
}
