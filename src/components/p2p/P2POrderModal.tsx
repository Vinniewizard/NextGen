import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Award, Clock, AlertTriangle, ArrowRight, Zap, CheckCircle2 
} from 'lucide-react';
import { P2POrder } from './P2PTypes';

interface P2POrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: P2POrder | null;
  tradeDirection: 'buy' | 'sell';
  onInitiateTrade: (order: P2POrder, cryptoAmount: number) => Promise<void>;
  userBalance: number;
  currentUser: any;
  isSubmitting: boolean;
  isDark: boolean;
}

export default function P2POrderModal({
  isOpen,
  onClose,
  order,
  tradeDirection,
  onInitiateTrade,
  userBalance,
  currentUser,
  isSubmitting,
  isDark
}: P2POrderModalProps) {
  const [fiatAmount, setFiatAmount] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const mName = order?.merchant_name || (order?.user_id ? `Merchant_${order.user_id.substring(0, 5)}` : 'Merchant');
  const compRate = order?.completion_rate ?? 99.4;
  const orderCount = order?.orders_count ?? 1840;
  const releaseMins = order?.avg_release_time ?? 2;
  const rating = order?.positive_rating ?? 99.5;
  const fiatSym = order?.fiat_currency || 'USD';
  const minLim = order?.min_limit ?? 10;
  const maxLim = order ? (order.max_limit ?? (order.amount * order.price)) : 1000;

  // Initialize with minimum limit so user can immediately click with 1-click
  useEffect(() => {
    if (!order) return;
    const defaultFiat = minLim.toString();
    setFiatAmount(defaultFiat);
    if (order.price > 0) {
      setCryptoAmount((minLim / order.price).toFixed(4));
    }
    setValidationError(null);
  }, [order?.id, minLim, order?.price]);

  if (!isOpen || !order) return null;

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

  const handleSetMax = () => {
    if (tradeDirection === 'sell') {
      const maxPossibleCrypto = Math.min(order.amount, userBalance, maxLim / order.price);
      handleCryptoChange(maxPossibleCrypto.toFixed(4));
    } else {
      handleFiatChange(maxLim.toFixed(2));
    }
  };

  const validateAmount = (fiatVal: number, cryptoVal: number) => {
    if (fiatVal < minLim) {
      setValidationError(`Minimum order is ${minLim.toLocaleString()} ${fiatSym}`);
      return false;
    }
    if (fiatVal > maxLim) {
      setValidationError(`Maximum order is ${maxLim.toLocaleString()} ${fiatSym}`);
      return false;
    }
    if (tradeDirection === 'sell') {
      if (userBalance < cryptoVal) {
        setValidationError(`Insufficient wallet balance (${userBalance.toFixed(4)} ${order.coin} available)`);
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    const cryptoNum = parseFloat(cryptoAmount);
    const fiatNum = parseFloat(fiatAmount);
    if (!cryptoNum || !fiatNum) return;
    if (!validateAmount(fiatNum, cryptoNum)) return;
    await onInitiateTrade(order, cryptoNum);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#181a20] border-[#2b313a] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-[#2b313a] flex items-center justify-between bg-[#1e2329]/60">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg ${
              tradeDirection === 'buy'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}>
              {tradeDirection === 'buy' ? 'BUY CRYPTO' : 'SELL CRYPTO'}
            </span>
            <div className="flex items-center gap-1.5 text-base font-black text-white">
              <span>{tradeDirection === 'buy' ? `Buy ${order.coin}` : `Sell ${order.coin}`}</span>
              <span className="text-xs font-normal text-slate-400">with {fiatSym}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b313a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Advertiser Identity Card */}
          <div className="p-3.5 rounded-xl bg-[#0b0e11] border border-[#2b313a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#2b313a] border border-slate-600 flex items-center justify-center font-bold text-white text-sm">
                  {mName.substring(0, 2).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#181a20]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">{mName}</span>
                  {order.is_verified ? (
                    <span title="Verified Merchant" className="inline-flex">
                      <Award className="w-4 h-4 fill-[#fcd535]/20 text-[#fcd535]" />
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                  <span>{orderCount.toLocaleString()} orders</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">{compRate}% completion</span>
                  <span>·</span>
                  <span>⏱ {releaseMins}m avg</span>
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">Unit Price</div>
              <div className="text-base font-black text-white">
                {order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {fiatSym}
              </div>
            </div>
          </div>

          {/* Calculator Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Input 1: Fiat */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>{tradeDirection === 'buy' ? 'I want to pay' : 'I will receive'}</span>
                <span className="text-[#fcd535] font-bold">{fiatSym}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={fiatAmount}
                  onChange={(e) => handleFiatChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#fcd535]"
                />
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="absolute right-2.5 top-2.5 text-[10px] font-mono font-bold text-[#fcd535] hover:text-yellow-300 px-2 py-1 rounded bg-yellow-400/10 cursor-pointer"
                >
                  MAX
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                Limit: {minLim.toLocaleString()} - {maxLim.toLocaleString()} {fiatSym}
              </span>
            </div>

            {/* Input 2: Crypto */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>{tradeDirection === 'buy' ? 'I will receive' : 'I want to sell'}</span>
                <span className="text-emerald-400 font-bold">{order.coin}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => handleCryptoChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#fcd535]"
                />
                <span className="absolute right-3.5 top-3.5 text-xs font-mono text-slate-400 font-bold uppercase">
                  {order.coin}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                Available: {order.amount.toLocaleString()} {order.coin}
              </span>
            </div>

          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Payment Rail & Protection Strip */}
          <div className="p-3.5 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment Method:</span>
              <span className="text-white font-bold">{order.paymentMethod || 'Bank Transfer'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Payment Time Limit:</span>
              <span className="text-[#fcd535] font-bold">15 Minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Trading Fee:</span>
              <span className="text-emerald-400 font-bold">0.00 (0% Fee)</span>
            </div>
          </div>

          {/* Terms & Conditions Notice */}
          <div className="p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a] text-xs text-slate-300 font-sans whitespace-pre-line leading-relaxed">
            <span className="font-bold text-slate-400 block mb-1 text-[11px] font-mono uppercase">
              Advertiser Terms:
            </span>
            {order.terms || '1. Strictly no third-party accounts.\n2. Funds released immediately once payment reflects.'}
          </div>

          {/* Escrow Guarantee Highlight */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="text-emerald-200 block">Instant Knex Escrow & Live Chat Room</strong>
              Upon clicking below, {cryptoAmount || '0'} {order.coin} is locked in the system vault and you are directly directed to the live Trade & Chat Room with the seller.
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-[#2b313a] bg-[#1e2329]/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl border border-[#2b313a] hover:bg-[#2b313a] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || !!validationError || !parseFloat(cryptoAmount)}
            onClick={handleSubmit}
            className={`px-7 py-3 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              tradeDirection === 'buy'
                ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] shadow-emerald-500/20'
                : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white shadow-rose-500/20'
            }`}
          >
            {isSubmitting ? (
              <span>Locking Escrow & Opening Chat Room...</span>
            ) : (
              <>
                <span>
                  {tradeDirection === 'buy'
                    ? `Buy ${order.coin} & Go To Live Chat Room`
                    : `Sell ${order.coin} & Go To Live Chat Room`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
