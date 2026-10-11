import React, { useState } from 'react';
import { 
  X, PlusCircle, ShieldCheck, ArrowRight, ArrowLeft, 
  CheckCircle2, AlertCircle, Info, Sparkles, DollarSign 
} from 'lucide-react';
import { COIN_LIST, FIAT_CURRENCIES, PAYMENT_METHODS, REFERENCE_PRICES } from './P2PTypes';

interface P2PPostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSubmitAd: (adData: any) => Promise<void>;
  isSubmitting: boolean;
}

export default function P2PPostAdModal({
  isOpen,
  onClose,
  currentUser,
  onSubmitAd,
  isSubmitting
}: P2PPostAdModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [pricingType, setPricingType] = useState<'fixed' | 'floating'>('fixed');
  const [floatingMargin, setFloatingMargin] = useState('100'); // 100% of market
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const userRealBalance = Number(currentUser?.real_balance ?? currentUser?.balance ?? 0);

  const [adForm, setAdForm] = useState({
    type: 'sell', // 'sell' = user sells crypto (displays under BUY tab for others), 'buy' = user buys crypto (displays under SELL tab)
    coin: 'USDT',
    amount: userRealBalance > 0 ? Math.min(1000, userRealBalance).toString() : '0',
    price: '1.00',
    fiat_currency: 'USD',
    paymentMethod: 'Bank Transfer',
    payment_time_limit: '15',
    merchant_name: currentUser?.fullName || 'My_Trading_Desk',
    min_limit: '10',
    max_limit: '1000',
    payment_details: 'Bank of America | Acct: 1234 5678 9012 | Name: ' + (currentUser?.fullName || 'Trader'),
    terms: 'Strictly no third-party payments. Instant escrow release once funds reflect in account.',
    auto_reply: 'Hello! I am ready to process this trade. Please transfer the exact amount and provide reference.',
    required_kyc: true,
    required_min_trades: '0',
    status: 'open'
  });

  if (!isOpen) return null;

  const currentRefPrice = REFERENCE_PRICES[adForm.coin] || 1;

  const handlePriceTypeChange = (type: 'fixed' | 'floating') => {
    setPricingType(type);
    if (type === 'floating') {
      const computed = (currentRefPrice * (parseFloat(floatingMargin) / 100)).toFixed(2);
      setAdForm(prev => ({ ...prev, price: computed }));
    }
  };

  const handleFloatingMarginChange = (val: string) => {
    setFloatingMargin(val);
    const marginNum = parseFloat(val) || 100;
    const computed = (currentRefPrice * (marginNum / 100)).toFixed(2);
    setAdForm(prev => ({ ...prev, price: computed }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setBalanceError(null);
    if (currentStep === 1) {
      if (!parseFloat(adForm.price) || parseFloat(adForm.price) <= 0) {
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const amountVal = parseFloat(adForm.amount);
      if (!amountVal || amountVal <= 0) {
        setBalanceError('Please enter a valid trading quantity.');
        return;
      }
      if (adForm.type === 'sell' && amountVal > userRealBalance) {
        setBalanceError(`Insufficient funds: You have $${userRealBalance.toFixed(2)} in your Real Account. You cannot post an ad to sell $${amountVal.toFixed(2)}.`);
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const amountVal = parseFloat(adForm.amount);
    if (adForm.type === 'sell' && amountVal > userRealBalance) {
      setBalanceError(`Insufficient funds: You have $${userRealBalance.toFixed(2)} in your Real Account. You cannot post an ad to sell $${amountVal.toFixed(2)}.`);
      return;
    }

    onSubmitAd({
      ...adForm,
      amount: parseFloat(adForm.amount),
      price: parseFloat(adForm.price),
      min_limit: parseFloat(adForm.min_limit) || 10,
      max_limit: parseFloat(adForm.max_limit) || (parseFloat(adForm.amount) * parseFloat(adForm.price)),
      required_min_trades: parseInt(adForm.required_min_trades, 10) || 0,
      required_kyc: adForm.required_kyc ? 1 : 0
    });
  };

  const totalFiatValue = (parseFloat(adForm.amount || '0') * parseFloat(adForm.price || '0')).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-2xl p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header with Title and Close */}
        <div className="flex items-center justify-between border-b border-[#2b313a] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-[#fcd535] border border-yellow-400/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Post P2P Advertisement</h3>
              <p className="text-xs text-slate-400 font-mono">Knex Standard 3-Step Publisher Wizard</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2b313a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Knex Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono">
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            currentStep === 1 
              ? 'bg-[#fcd535]/10 border-[#fcd535] text-[#fcd535]' 
              : currentStep > 1 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-[#0b0e11] border-[#2b313a] text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span className="font-bold truncate">1. Type & Price</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            currentStep === 2 
              ? 'bg-[#fcd535]/10 border-[#fcd535] text-[#fcd535]' 
              : currentStep > 2 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-[#0b0e11] border-[#2b313a] text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span className="font-bold truncate">2. Amount & Payment</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            currentStep === 3 
              ? 'bg-[#fcd535]/10 border-[#fcd535] text-[#fcd535]' 
              : 'bg-[#0b0e11] border-[#2b313a] text-slate-500'
          }`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span className="font-bold truncate">3. Terms & Publish</span>
          </div>
        </div>

        {/* Wizard Form Content */}
        <form onSubmit={handleNext} className="space-y-5 text-xs font-mono">
          
          {/* ========================================================================= */}
          {/* STEP 1: TYPE, ASSET, FIAT & PRICING                                      */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Ad Type Switcher */}
              <div>
                <label className="text-slate-400 block mb-2 font-bold uppercase tracking-wider text-[11px]">
                  Ad Type (Orderbook Direction)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdForm({ ...adForm, type: 'sell' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      adForm.type === 'sell'
                        ? 'bg-[#f6465d]/10 border-[#f6465d] text-[#f6465d] shadow-sm'
                        : 'bg-[#0b0e11] border-[#2b313a] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-black text-sm flex items-center justify-between mb-1">
                      <span>I Want to SELL</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                        Receive Fiat
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Your ad appears under the <strong>BUY</strong> tab. Users buy crypto from you with fiat transfer.
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-rose-500/20 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Available Real Balance:</span>
                      <span className={`font-bold ${userRealBalance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${userRealBalance.toFixed(2)} USDT
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdForm({ ...adForm, type: 'buy' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      adForm.type === 'buy'
                        ? 'bg-[#0ecb81]/10 border-[#0ecb81] text-[#0ecb81] shadow-sm'
                        : 'bg-[#0b0e11] border-[#2b313a] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-black text-sm flex items-center justify-between mb-1">
                      <span>I Want to BUY</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        Pay Fiat
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      Your ad appears under the <strong>SELL</strong> tab. Users sell crypto to you and receive your fiat.
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Settlement:</span>
                      <span className="font-bold text-emerald-400">External Escrow Rail</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Asset & Fiat Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Crypto Asset</label>
                  <select
                    value={adForm.coin}
                    onChange={(e) => {
                      const newCoin = e.target.value;
                      const ref = REFERENCE_PRICES[newCoin] || 1;
                      setAdForm({ ...adForm, coin: newCoin, price: ref.toString() });
                    }}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-bold"
                  >
                    {COIN_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">With Fiat Currency</label>
                  <select
                    value={adForm.fiat_currency}
                    onChange={(e) => setAdForm({ ...adForm, fiat_currency: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-bold"
                  >
                    {FIAT_CURRENCIES.filter(f => f.code !== 'ALL').map(f => (
                      <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Type & Setting */}
              <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Price Configuration</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePriceTypeChange('fixed')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        pricingType === 'fixed' ? 'bg-[#fcd535] text-[#0b0e11]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fixed Price
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePriceTypeChange('floating')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        pricingType === 'floating' ? 'bg-[#fcd535] text-[#0b0e11]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Floating Price
                    </button>
                  </div>
                </div>

                {pricingType === 'floating' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Margin Percentage (%)</span>
                      <span className="text-[#fcd535] font-bold">{floatingMargin}% of Market Rate</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="120"
                      step="0.5"
                      value={floatingMargin}
                      onChange={(e) => handleFloatingMarginChange(e.target.value)}
                      className="w-full accent-yellow-400 cursor-pointer"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="text-slate-400 block mb-1">Your Unit Price ({adForm.fiat_currency})</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adForm.price}
                      onChange={(e) => setAdForm({ ...adForm, price: e.target.value })}
                      className="w-full bg-[#181a20] border border-[#2b313a] focus:border-[#fcd535] rounded-xl px-3.5 py-2.5 text-white font-mono text-base font-bold outline-none"
                    />
                    <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">
                      {adForm.fiat_currency} / {adForm.coin}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                    <span>Index Reference: ${currentRefPrice.toLocaleString()} USD</span>
                    <span className="text-emerald-400">Competitive rate ensures high order volume</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: AMOUNT, ORDER LIMITS & PAYMENT DETAILS                           */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Total Trading Quantity */}
              <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Total Trading Quantity ({adForm.coin})
                  </label>
                  <div className="flex items-center gap-2">
                    {adForm.type === 'sell' && (
                      <span className="text-[11px] font-mono text-slate-400">
                        Available: <strong className={userRealBalance > 0 ? 'text-emerald-400' : 'text-rose-400'}>${userRealBalance.toFixed(2)}</strong>
                      </span>
                    )}
                    <span className="text-xs text-[#fcd535] font-bold">
                      ≈ {totalFiatValue} {adForm.fiat_currency}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={adForm.amount}
                    onChange={(e) => {
                      setBalanceError(null);
                      setAdForm({ ...adForm, amount: e.target.value });
                    }}
                    className={`w-full bg-[#181a20] border rounded-xl pl-3.5 pr-20 py-2.5 text-white font-mono text-base font-bold outline-none ${
                      balanceError ? 'border-rose-500 focus:border-rose-400' : 'border-[#2b313a] focus:border-[#fcd535]'
                    }`}
                  />
                  <div className="absolute right-3 top-2 flex items-center gap-1.5">
                    {adForm.type === 'sell' && (
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceError(null);
                          setAdForm({ ...adForm, amount: userRealBalance.toString() });
                        }}
                        className="px-2 py-1 rounded bg-[#fcd535]/15 hover:bg-[#fcd535]/25 text-[#fcd535] text-[10px] font-black font-mono cursor-pointer transition-colors"
                      >
                        MAX
                      </button>
                    )}
                    <span className="text-xs text-slate-400 font-bold">
                      {adForm.coin}
                    </span>
                  </div>
                </div>

                {balanceError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{balanceError}</span>
                  </div>
                )}
              </div>

              {/* Order Limits in Fiat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Min Order Limit ({adForm.fiat_currency})</label>
                  <input
                    type="number"
                    required
                    value={adForm.min_limit}
                    onChange={(e) => setAdForm({ ...adForm, min_limit: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Max Order Limit ({adForm.fiat_currency})</label>
                  <input
                    type="number"
                    required
                    value={adForm.max_limit}
                    onChange={(e) => setAdForm({ ...adForm, max_limit: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white"
                  />
                </div>
              </div>

              {/* Payment Methods & Rails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Payment Method</label>
                  <select
                    value={adForm.paymentMethod}
                    onChange={(e) => setAdForm({ ...adForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-bold"
                  >
                    {PAYMENT_METHODS.filter(p => p !== 'All Payments').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Payment Time Limit</label>
                  <select
                    value={adForm.payment_time_limit}
                    onChange={(e) => setAdForm({ ...adForm, payment_time_limit: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-bold"
                  >
                    <option value="15">15 Minutes (Standard)</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Payment Credentials */}
              <div>
                <label className="text-slate-400 block mb-1">Your Receiving Account / Payment Details</label>
                <input
                  type="text"
                  required
                  value={adForm.payment_details}
                  onChange={(e) => setAdForm({ ...adForm, payment_details: e.target.value })}
                  placeholder="e.g. Bank: Chase, Account: 98124401, Name: Vincent K. / M-Pesa 0712345678"
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This will be shown only to verified counterparties inside the secure escrow room.
                </span>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: REMARKS, COUNTERPARTY CONDITIONS & PUBLISHING                    */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Display Merchant Name */}
              <div>
                <label className="text-slate-400 block mb-1">Merchant Display Name</label>
                <input
                  type="text"
                  value={adForm.merchant_name}
                  onChange={(e) => setAdForm({ ...adForm, merchant_name: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2 text-white font-bold"
                />
              </div>

              {/* Auto Reply & Terms */}
              <div>
                <label className="text-slate-400 block mb-1">Auto-Reply Message (Sent in Live Chat)</label>
                <input
                  type="text"
                  value={adForm.auto_reply}
                  onChange={(e) => setAdForm({ ...adForm, auto_reply: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2 text-white font-sans text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Terms of Trade (Visible before order placement)</label>
                <textarea
                  rows={2}
                  value={adForm.terms}
                  onChange={(e) => setAdForm({ ...adForm, terms: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2 text-white font-sans text-xs"
                />
              </div>

              {/* Counterparty Requirements */}
              <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-3">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Counterparty Conditions</span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-200">Require Completed KYC Identity Verification</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adForm.required_kyc}
                    onChange={(e) => setAdForm({ ...adForm, required_kyc: e.target.checked })}
                    className="w-4 h-4 accent-yellow-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Publication Summary Card */}
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#fcd535] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Ad Summary Ready For Order Book</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-400/20 text-[#fcd535] font-bold uppercase">
                    {adForm.type === 'sell' ? 'Selling Crypto' : 'Buying Crypto'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
                  <div>Quantity: <strong className="text-white">{adForm.amount} {adForm.coin}</strong></div>
                  <div>Unit Price: <strong className="text-white">{adForm.price} {adForm.fiat_currency}</strong></div>
                  <div>Order Limits: <strong className="text-white">{adForm.min_limit} - {adForm.max_limit} {adForm.fiat_currency}</strong></div>
                  <div>Payment: <strong className="text-white">{adForm.paymentMethod}</strong></div>
                </div>
              </div>

            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2b313a]">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-[#2b313a] text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] font-black rounded-xl cursor-pointer shadow-md flex items-center gap-1.5 ml-auto"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-black rounded-xl cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2 ml-auto disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing Advertisement...' : 'Publish Advertisement'}</span>
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
