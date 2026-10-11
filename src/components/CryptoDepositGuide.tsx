import React from 'react';
import { X, ShieldCheck, Zap, ArrowRight, Wallet, CheckCircle2, Percent } from 'lucide-react';

interface CryptoDepositGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCashier?: () => void;
  theme: 'dark' | 'light';
}

export function CryptoDepositGuide({ isOpen, onClose, onOpenCashier, theme }: CryptoDepositGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 md:p-8 text-left ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-slate-900'}`}>
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900 transition-all border border-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NOWPayments Gateway
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Secure & Instant
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">External Wallet Crypto Deposit Guide</h2>
          </div>
        </div>

        <p className="text-xs md:text-sm text-slate-400 mb-6 leading-relaxed">
          Easily fund your Knex trading account using any external crypto wallet (MetaMask, TrustWallet, Binance, Coinbase, etc.). Our integrated NOWPayments gateway ensures instant blockchain verification, automatic fee channeling, and immediate balance crediting.
        </p>

        {/* Fee Structure Highlight Box */}
        <div className={`p-4 rounded-xl border mb-6 ${theme === 'dark' ? 'bg-indigo-950/30 border-indigo-800/40' : 'bg-indigo-50 border-indigo-200'}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-indigo-400 uppercase tracking-wide">Transparent 1% Service Fee Structure</h4>
              <p className="text-xs text-slate-300 dark:text-slate-300 mt-1 leading-relaxed">
                To maintain high-speed settlement infrastructure, escrow protection, and 24/7 liquidity, a nominal <strong className="text-emerald-400">1.0% service fee</strong> is automatically retained on incoming external crypto deposits. The remaining <strong className="text-emerald-400">99.0% net amount</strong> is credited instantly to your live trading real balance.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-indigo-500/20">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Net Credited to User</span>
                  <div className="text-base font-mono font-bold text-emerald-400">99.0%</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Business / Escrow Pool</span>
                  <div className="text-base font-mono font-bold text-indigo-400">1.0%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Step-by-Step Deposit Walkthrough</h3>

          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border flex items-start gap-3.5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-200">Open Cashier & Select Crypto Deposit</h5>
                <p className="text-xs text-slate-400 mt-0.5">Navigate to your account Cashier, click on the <strong>Deposit</strong> tab, and select your preferred cryptocurrency (e.g., USDT TRC-20, BTC, ETH, or BNB).</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-start gap-3.5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-200">Generate Secure Deposit Address / QR Code</h5>
                <p className="text-xs text-slate-400 mt-0.5">Enter your deposit amount in USD. NOWPayments will instantly generate a unique deposit address and QR code with the exact crypto equivalent.</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-start gap-3.5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-200">Transfer from Your External Wallet</h5>
                <p className="text-xs text-slate-400 mt-0.5">Open your external wallet (MetaMask, TrustWallet, Binance), paste the address or scan the QR code, and send the exact funds over the chosen network.</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-start gap-3.5 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-200">Instant Verification & 99% Net Credit</h5>
                <p className="text-xs text-slate-400 mt-0.5">Once confirmed on the blockchain (typically 1-2 network confirmations), our system automatically records the deposit, deducts the 1% service fee, and credits your real balance instantly!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Close Guide
          </button>
          {onOpenCashier && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCashier();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <span>Open Deposit Cashier</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
