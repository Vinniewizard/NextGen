import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, PlusCircle, HelpCircle, X, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface P2PNavigationProps {
  activeTab: 'marketplace' | 'express' | 'my-orders' | 'user-center';
  onSelectTab: (tab: 'marketplace' | 'express' | 'my-orders' | 'user-center') => void;
  activeEscrowsCount: number;
  onPostAdClick: () => void;
  isDark: boolean;
}

export default function P2PNavigation({
  activeTab,
  onSelectTab,
  activeEscrowsCount,
  onPostAdClick,
  isDark
}: P2PNavigationProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showNotice, setShowNotice] = useState(true);

  return (
    <div className="space-y-3 font-sans">
      {/* Top Banner Notice */}
      {showNotice && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs ${
          isDark 
            ? 'bg-[#1e2329]/80 border-[#2b313a] text-slate-300' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
            <span className="font-semibold text-yellow-400 shrink-0">Security Notice:</span>
            <span className="truncate text-slate-300">
              Never release crypto before confirming the fiat payment has reflected in your bank account or M-Pesa. Beware of fake SMS!
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-yellow-400 hover:underline font-medium text-xs hidden sm:inline"
            >
              How P2P Works
            </button>
            <button
              onClick={() => setShowNotice(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Knex Navigation Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border ${
        isDark ? 'bg-[#181a20] border-[#2b313a]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#fcd535] text-[#0b0e11] font-black text-sm flex items-center justify-center shadow-lg shadow-yellow-500/10">
            P2P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Knex P2P
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                0% Fee
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trade crypto securely with verified local merchants & bank/mobile rails with instant escrow protection.
            </p>
          </div>
        </div>

        {/* Tab Links */}
        <div className="flex items-center flex-wrap gap-2">
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-[#0b0e11] border-[#2b313a]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => onSelectTab('marketplace')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-[#fcd535] text-[#0b0e11] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              P2P Marketplace
            </button>

            <button
              onClick={() => onSelectTab('express')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'express'
                  ? 'bg-[#fcd535] text-[#0b0e11] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Express</span>
            </button>

            <button
              onClick={() => onSelectTab('my-orders')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'my-orders'
                  ? 'bg-[#fcd535] text-[#0b0e11] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Orders & History</span>
              {activeEscrowsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {activeEscrowsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('user-center')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'user-center'
                  ? 'bg-[#fcd535] text-[#0b0e11] shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Merchant Center
            </button>
          </div>

          {/* Post Ad CTA */}
          <button
            onClick={onPostAdClick}
            className="px-3.5 py-2 bg-[#2b313a] hover:bg-[#363d47] text-white text-xs font-bold rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#fcd535]" />
            <span>Post Ad</span>
          </button>
        </div>
      </div>

      {/* How P2P Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b313a] pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#fcd535]" />
                How Knex P2P Works
              </h3>
              <button onClick={() => setShowHowItWorks(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a]">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm text-white mb-0.5">Place an Order</h4>
                  <p className="text-slate-400">Choose a merchant advertisement. The seller's crypto is locked in Knex Escrow vault immediately upon order creation.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a]">
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-[#fcd535] font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-sm text-white mb-0.5">Pay the Seller</h4>
                  <p className="text-slate-400">Transfer funds to the seller using their specified payment details (Bank Transfer, M-Pesa, Chipper, etc.). Then click "Transferred, notify seller".</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a]">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-sm text-white mb-0.5">Receive Your Crypto</h4>
                  <p className="text-slate-400">The seller confirms the fiat payment in their account and releases the crypto from escrow directly into your funding wallet.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="px-5 py-2 rounded-xl bg-[#fcd535] text-[#0b0e11] font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
