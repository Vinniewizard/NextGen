import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { P2POrder } from './P2PTypes';

interface P2POrderRowProps {
  order: P2POrder;
  tradeDirection: 'buy' | 'sell';
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenModal?: (order: P2POrder) => void;
  onInitiateTrade: (order: P2POrder, cryptoAmount: number) => Promise<void>;
  onViewMerchantProfile?: (merchantId: string, merchantName: string) => void;
  userBalance: number;
  currentUser: any;
  isSubmitting: boolean;
  isDark: boolean;
}

export default function P2POrderRow({
  order,
  tradeDirection,
  isExpanded,
  onToggleExpand,
  onOpenModal,
  onInitiateTrade,
  onViewMerchantProfile,
  userBalance,
  currentUser,
  isSubmitting,
  isDark
}: P2POrderRowProps) {
  const mName = order.merchant_name || `Merchant_${order.user_id.substring(0, 5)}`;
  const compRate = order.completion_rate ?? 99.4;
  const orderCount = order.orders_count ?? 1840;
  const releaseMins = order.avg_release_time ?? 2;
  const rating = order.positive_rating ?? 99.5;
  const fiatSym = order.fiat_currency || 'USD';
  const minLim = order.min_limit ?? 10;
  const maxLim = order.max_limit ?? (order.amount * order.price);

  // Drawer calculator state
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize initial default values when expanded
  useEffect(() => {
    if (isExpanded) {
      const defaultFiat = minLim.toString();
      setFiatAmount(defaultFiat);
      if (order.price > 0) {
        setCryptoAmount((minLim / order.price).toFixed(4));
      }
      setValidationError(null);
    }
  }, [isExpanded, minLim, order.price]);

  // Handle fiat input change
  const handleFiatChange = (val: string) => {
    setFiatAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && order.price > 0) {
      const cryptoVal = num / order.price;
      setCryptoAmount(cryptoVal.toFixed(4));
      validateAmount(num, cryptoVal);
    } else {
      setCryptoAmount('');
      setValidationError(null);
    }
  };

  // Handle crypto input change
  const handleCryptoChange = (val: string) => {
    setCryptoAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && order.price > 0) {
      const fiatVal = num * order.price;
      setFiatAmount(fiatVal.toFixed(2));
      validateAmount(fiatVal, num);
    } else {
      setFiatAmount('');
      setValidationError(null);
    }
  };

  // Set maximum allowed
  const handleSetMax = () => {
    if (tradeDirection === 'sell') {
      // Selling: cannot exceed either max limit or user's wallet balance
      const maxPossibleCrypto = Math.min(order.amount, userBalance, maxLim / order.price);
      handleCryptoChange(maxPossibleCrypto.toFixed(4));
    } else {
      // Buying: up to max limit
      handleFiatChange(maxLim.toFixed(2));
    }
  };

  // Limit and balance validation
  const validateAmount = (fiatVal: number, cryptoVal: number) => {
    if (fiatVal < minLim) {
      setValidationError(`Amount is below minimum limit (${minLim.toLocaleString()} ${fiatSym})`);
      return false;
    }
    if (fiatVal > maxLim) {
      setValidationError(`Amount exceeds maximum limit (${maxLim.toLocaleString()} ${fiatSym})`);
      return false;
    }
    if (tradeDirection === 'sell') {
      if (userBalance < cryptoVal) {
        setValidationError(`Insufficient balance (${userBalance.toFixed(4)} ${order.coin} available)`);
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = () => {
    const cryptoNum = parseFloat(cryptoAmount);
    const fiatNum = parseFloat(fiatAmount);
    if (!cryptoNum || !fiatNum) return;
    if (!validateAmount(fiatNum, cryptoNum)) return;
    onInitiateTrade(order, cryptoNum);
  };

  // Payment badge accent colors matching Binance
  const getPaymentStyle = (pm: string) => {
    const lower = (pm || '').toLowerCase();
    if (lower.includes('bank')) return 'border-l-4 border-l-yellow-400 bg-yellow-500/10 text-yellow-300';
    if (lower.includes('m-pesa')) return 'border-l-4 border-l-emerald-400 bg-emerald-500/10 text-emerald-300';
    if (lower.includes('revolut')) return 'border-l-4 border-l-cyan-400 bg-cyan-500/10 text-cyan-300';
    if (lower.includes('wise')) return 'border-l-4 border-l-blue-400 bg-blue-500/10 text-blue-300';
    if (lower.includes('chipper')) return 'border-l-4 border-l-purple-400 bg-purple-500/10 text-purple-300';
    if (lower.includes('binance')) return 'border-l-4 border-l-[#fcd535] bg-yellow-400/15 text-[#fcd535]';
    return 'border-l-4 border-l-slate-500 bg-slate-800/40 text-slate-300';
  };

  return (
    <div className={`transition-colors border-b border-[#2b313a]/70 font-sans ${
      isExpanded ? 'bg-[#1e2329]/60' : 'hover:bg-[#1e2329]/30'
    }`}>
      {/* Main Order Row View */}
      <div className="p-4 md:px-6 md:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center">
        
        {/* 1. Advertiser Column */}
        <div 
          className="md:col-span-4 flex items-start gap-3 cursor-pointer group"
          onClick={() => {
            if (onViewMerchantProfile) {
              onViewMerchantProfile(order.user_id, mName);
            }
          }}
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2b313a] to-[#363d47] border border-slate-600 flex items-center justify-center font-bold text-white text-sm group-hover:border-[#fcd535] transition-colors">
              {mName.substring(0, 2).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#181a20]" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white truncate group-hover:text-[#fcd535] transition-colors">
                {mName}
              </span>
              {order.is_verified ? (
                <span title="Knex Verified Merchant" className="text-[#fcd535]">
                  <Award className="w-3.5 h-3.5 fill-[#fcd535]/20 text-[#fcd535]" />
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{orderCount.toLocaleString()} orders</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">{compRate}% completion</span>
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span>⏱ {releaseMins} min avg</span>
              <span className="text-slate-600">·</span>
              <span>👍 {rating}%</span>
            </div>
          </div>
        </div>

        {/* 2. Price Column */}
        <div className="md:col-span-2 flex md:block items-baseline justify-between">
          <span className="md:hidden text-xs text-slate-400 font-mono">Price:</span>
          <div className="font-mono">
            <div className="text-base md:text-lg font-black text-white tracking-tight">
              {order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-400 ml-1.5">{fiatSym}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">0% fee</span>
          </div>
        </div>

        {/* 3. Available & Limits Column */}
        <div className="md:col-span-3 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between md:justify-start gap-2">
            <span className="text-slate-400">Available</span>
            <span className="font-bold text-slate-200">
              {order.amount.toLocaleString()} {order.coin}
            </span>
          </div>
          <div className="flex items-center justify-between md:justify-start gap-2">
            <span className="text-slate-400">Limit</span>
            <span className="font-medium text-slate-300">
              {minLim.toLocaleString()} - {maxLim.toLocaleString()} {fiatSym}
            </span>
          </div>
        </div>

        {/* 4. Payment Method Column */}
        <div className="md:col-span-2 flex flex-wrap gap-1.5">
          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${getPaymentStyle(order.paymentMethod)}`}>
            {order.paymentMethod || 'Bank Transfer'}
          </span>
        </div>

        {/* 5. Trade Action Button */}
        <div className="md:col-span-1 text-right flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpenModal ? onOpenModal(order) : onToggleExpand()}
            className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1 ${
              tradeDirection === 'buy'
                ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] shadow-emerald-500/10'
                : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white shadow-rose-500/10'
            }`}
          >
            <span>{tradeDirection === 'buy' ? `Buy ${order.coin}` : `Sell ${order.coin}`}</span>
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* THE OVERS - Authentic Knex Order Drawer */}
      {/* ======================================================== */}
      {isExpanded && (
        <div className="p-5 md:p-6 bg-[#181a20] border-t border-[#2b313a] animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Terms, Payment Limits & Security */}
            <div className="lg:col-span-5 space-y-4 pr-0 lg:pr-4 border-b lg:border-b-0 lg:border-r border-[#2b313a] pb-5 lg:pb-0">
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Advertiser Terms & Instructions
                </h4>
                <div className="p-3.5 rounded-xl bg-[#0b0e11] border border-[#2b313a] text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                  {order.terms || '1. Strictly no third-party accounts.\n2. Your account name must match your Knex Trading KYC name.\n3. Automatic escrow release immediately once funds reflect.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-[#0b0e11] border border-[#2b313a]">
                  <span className="text-[10px] text-slate-400 block">Payment Window</span>
                  <span className="text-[#fcd535] font-bold text-sm">15 Minutes</span>
                </div>
                <div className="p-3 rounded-lg bg-[#0b0e11] border border-[#2b313a]">
                  <span className="text-[10px] text-slate-400 block">Avg. Release</span>
                  <span className="text-emerald-400 font-bold text-sm">{releaseMins} Minutes</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block text-emerald-200">100% Escrow Protected</span>
                  The seller's crypto is held safely in escrow during the entire trade.
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Order Calculator & Submit */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  {tradeDirection === 'buy' ? `Purchase ${order.coin}` : `Sell ${order.coin}`}
                </h4>
                {tradeDirection === 'sell' && (
                  <span className="text-xs font-mono text-slate-400">
                    Available: <strong className="text-white">{userBalance.toFixed(4)} {order.coin}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Input 1: Fiat */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{tradeDirection === 'buy' ? 'I want to pay' : 'I will receive'}</span>
                    <span className="text-slate-400">{fiatSym}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={fiatAmount}
                      onChange={(e) => handleFiatChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#fcd535]"
                    />
                    <button
                      type="button"
                      onClick={handleSetMax}
                      className="absolute right-2.5 top-2.5 text-[10px] font-mono font-bold text-[#fcd535] hover:text-yellow-300 px-1.5 py-0.5 rounded bg-yellow-400/10 cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Input 2: Crypto */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>{tradeDirection === 'buy' ? 'I will receive' : 'I want to sell'}</span>
                    <span className="text-slate-400">{order.coin}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cryptoAmount}
                      onChange={(e) => handleCryptoChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#fcd535]"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-mono text-slate-400 font-bold uppercase">
                      {order.coin}
                    </span>
                  </div>
                </div>

              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Summary Strip */}
              <div className="p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Unit Price</span>
                  <span className="text-white font-bold">{order.price.toFixed(2)} {fiatSym}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Trading Fee</span>
                  <span className="text-emerald-400 font-bold">0.00 (0%)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Payment Method</span>
                  <span className="text-[#fcd535] font-bold">{order.paymentMethod || 'Bank Transfer'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Limits</span>
                  <span className="text-slate-300 font-medium">{minLim.toLocaleString()} - {maxLim.toLocaleString()} {fiatSym}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl border border-[#2b313a] hover:bg-[#2b313a] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !!validationError || !parseFloat(cryptoAmount)}
                  onClick={handleSubmit}
                  className={`px-6 py-2.5 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    tradeDirection === 'buy'
                      ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] shadow-emerald-500/20'
                      : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white shadow-rose-500/20'
                  }`}
                >
                  {isSubmitting 
                    ? 'Locking Escrow & Opening Chat Room...' 
                    : (
                      <>
                        <span>
                          {tradeDirection === 'buy' 
                            ? `Buy ${order.coin} & Enter Live Chat Room` 
                            : `Sell ${order.coin} & Enter Live Chat Room`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )
                  }
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
