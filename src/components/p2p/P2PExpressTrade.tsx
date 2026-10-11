import React, { useState } from 'react';
import { Zap, ArrowUpDown, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { P2POrder, COIN_LIST, FIAT_CURRENCIES, REFERENCE_PRICES } from './P2PTypes';

interface P2PExpressTradeProps {
  orders: P2POrder[];
  currentUser: any;
  userBalance: number;
  onInitiateTrade: (order: P2POrder, cryptoAmount: number) => Promise<void>;
  isSubmitting: boolean;
  isDark: boolean;
  onTriggerToast: (msg: string, success?: boolean) => void;
}

export default function P2PExpressTrade({
  orders,
  currentUser,
  userBalance,
  onInitiateTrade,
  isSubmitting,
  isDark,
  onTriggerToast
}: P2PExpressTradeProps) {
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [selectedCoin, setSelectedCoin] = useState('USDT');
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [fiatAmount, setFiatAmount] = useState('100');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Bank Transfer');

  // Find best order matching direction, coin, and fiat
  const availableOrders = orders.filter(o => {
    const requiredType = direction === 'buy' ? 'sell' : 'buy';
    return o.type === requiredType && o.coin === selectedCoin && (o.fiat_currency || 'USD') === fiatCurrency;
  }).sort((a, b) => direction === 'buy' ? a.price - b.price : b.price - a.price);

  const bestOrder = availableOrders[0] || null;
  const unitPrice = bestOrder ? bestOrder.price : (REFERENCE_PRICES[selectedCoin] || 1);
  const cryptoCalculated = parseFloat(fiatAmount) && unitPrice > 0 ? (parseFloat(fiatAmount) / unitPrice).toFixed(4) : '0.00';

  const handleExecuteExpress = () => {
    if (!currentUser) {
      onTriggerToast('Please sign in to execute Express trades.', false);
      return;
    }
    if (!bestOrder) {
      onTriggerToast('No matching liquidity merchant found for this pair.', false);
      return;
    }
    const cAmount = parseFloat(cryptoCalculated);
    if (!cAmount || cAmount <= 0) {
      onTriggerToast('Please enter a valid amount.', false);
      return;
    }
    if (direction === 'sell' && userBalance < cAmount) {
      onTriggerToast(`Insufficient balance. You need ${cAmount} ${selectedCoin}.`, false);
      return;
    }
    onInitiateTrade(bestOrder, cAmount);
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 md:p-8 rounded-2xl border space-y-6 font-sans ${
      isDark ? 'bg-[#181a20] border-[#2b313a]' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Express Header */}
      <div className="flex items-center justify-between border-b border-[#2b313a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#fcd535]" />
            <h2 className="text-lg font-black text-white">Knex Express P2P</h2>
          </div>
          <p className="text-xs text-slate-400">One-click trade at the best verified market price with zero fees.</p>
        </div>

        {/* Direction Switcher */}
        <div className="flex items-center p-1 bg-[#0b0e11] rounded-xl border border-[#2b313a]">
          <button
            onClick={() => setDirection('buy')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              direction === 'buy'
                ? 'bg-[#0ecb81] text-[#0b0e11] font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setDirection('sell')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              direction === 'sell'
                ? 'bg-[#f6465d] text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Input Blocks */}
      <div className="space-y-4">
        {/* Pay Input */}
        <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{direction === 'buy' ? 'I want to spend' : 'I want to sell'}</span>
            {direction === 'sell' && (
              <span>Available: <strong className="text-white">{userBalance.toFixed(4)} {selectedCoin}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
            />
            <select
              value={fiatCurrency}
              onChange={(e) => setFiatCurrency(e.target.value)}
              className="bg-[#181a20] border border-[#2b313a] text-white text-xs font-bold font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {FIAT_CURRENCIES.filter(f => f.code !== 'ALL').map(f => (
                <option key={f.code} value={f.code}>{f.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Arrow Indicator */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-[#181a20] border border-[#2b313a] flex items-center justify-center text-slate-400">
            <ArrowUpDown className="w-4 h-4" />
          </div>
        </div>

        {/* Receive Output */}
        <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{direction === 'buy' ? 'I will receive approximately' : 'Estimated fiat proceeds'}</span>
            <span className="text-emerald-400 font-bold">0% Trading Fee</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full text-xl font-bold font-mono text-[#fcd535]">
              {cryptoCalculated}
            </div>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
              className="bg-[#181a20] border border-[#2b313a] text-white text-xs font-bold font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              {COIN_LIST.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Best Match Information */}
      <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2.5 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Best Reference Price:</span>
          <span className="text-white font-bold">{unitPrice.toFixed(2)} {fiatCurrency} / {selectedCoin}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Auto-Matched Merchant:</span>
          <span className="text-white font-bold">{bestOrder?.merchant_name || 'Knex Verified Liquidity'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Payment Rail:</span>
          <span className="text-[#fcd535] font-bold">{bestOrder?.paymentMethod || 'Bank Transfer'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Escrow Security:</span>
          <span className="text-emerald-400 font-bold">100% Protected</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        disabled={isSubmitting || !parseFloat(fiatAmount) || !bestOrder}
        onClick={handleExecuteExpress}
        className={`w-full py-3.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
          direction === 'buy'
            ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] shadow-emerald-500/20'
            : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white shadow-rose-500/20'
        }`}
      >
        {isSubmitting
          ? 'Locking Escrow...'
          : bestOrder
            ? `${direction === 'buy' ? 'Buy' : 'Sell'} ${selectedCoin} with 0 Fee`
            : 'No Active Orders for this Pair'
        }
      </button>
    </div>
  );
}
