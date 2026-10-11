import React from 'react';
import { Asset } from '../types';

interface QuickTradePanelProps {
  theme?: 'dark' | 'light';
  activeAsset: Asset;
  assetsList: Asset[];
  onSelectAsset: (asset: Asset) => void;
  spotDuration: number;
  spotDurationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
  onChangeDuration: (dur: number, unit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days') => void;
  spotAmountUsd: string;
  onChangeUsd: (val: string) => void;
  onPresetPercentage: (pct: number) => void;
  freeBalance: number;
  payoutRate: number;
  minStake: number;
  maxStake: number;
  autoMartingale: boolean;
  onToggleAutoMartingale: () => void;
  autoCashoutPercent: number;
  onChangeAutoCashout: (pct: number) => void;
  onExecuteTrade: (dir: 'call' | 'put') => void;
  lastTradeConfig: { stake: number; direction: string } | null;
  onRepeatTrade: (multiplier: number, reverse?: boolean) => void;
}

export const QuickTradePanel: React.FC<QuickTradePanelProps> = ({
  activeAsset,
  assetsList,
  onSelectAsset,
  spotDuration,
  spotDurationUnit,
  onChangeDuration,
  spotAmountUsd,
  onChangeUsd,
  onPresetPercentage,
  freeBalance,
  payoutRate = 95.5,
  minStake = 1,
  maxStake = 5000,
  autoMartingale,
  onToggleAutoMartingale,
  autoCashoutPercent,
  onChangeAutoCashout,
  onExecuteTrade,
  lastTradeConfig,
  onRepeatTrade
}) => {
  const stakeNum = parseFloat(spotAmountUsd) || 10;
  const payoutVal = stakeNum * (1 + payoutRate / 100);
  const netProfit = stakeNum * (payoutRate / 100);
  const assetDecimals = activeAsset?.decimals ?? 2;
  const currentSpotPrice = activeAsset?.price ?? 0;

  const quickDurations = [
    { label: '⚡ 1 Tick', dur: 1, unit: 'ticks' as const },
    { label: '5 Ticks', dur: 5, unit: 'ticks' as const },
    { label: '15s', dur: 15, unit: 'seconds' as const },
    { label: '30s', dur: 30, unit: 'seconds' as const },
    { label: '1m', dur: 1, unit: 'minutes' as const }
  ];

  const quickStakes = [1, 5, 10, 25, 50, 100];

  return (
    <div className="space-y-3 p-3 rounded-lg bg-slate-950/25 border border-slate-900 flex-1 overflow-y-auto">
      {/* 1. Quick Asset Chips */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
          <span>Select Market</span>
          <span className="text-amber-400 font-mono font-bold">
            Spot: ${currentSpotPrice.toFixed(assetDecimals)}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {assetsList.slice(0, 5).map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAsset(a)}
              className={`rounded py-1.5 px-1 text-[9px] font-mono font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeAsset.id === a.id
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                  : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className="leading-tight">{a.symbol}</span>
              <span className="text-[8px] opacity-75 font-normal leading-none mt-0.5">
                ${(a.price ?? 0).toFixed(a.decimals > 2 ? 4 : 2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Quick Expiry Selection */}
      <div className="space-y-1 p-2 rounded-lg border border-slate-900 bg-slate-950/40">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
            Expiry Duration
          </label>
          <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {spotDuration} {spotDurationUnit}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 pt-0.5">
          {quickDurations.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onChangeDuration(item.dur, item.unit)}
              className={`rounded py-1.5 text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                spotDuration === item.dur && spotDurationUnit === item.unit
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                  : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Stake Selector & Multipliers */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
            Stake Amount
          </label>
          <span className="text-[9px] text-slate-400 font-mono">
            Avail: ${freeBalance.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const stepVal = stakeNum > 50 ? 25 : stakeNum > 20 ? 10 : 5;
              const next = Math.max(minStake, stakeNum - stepVal);
              onChangeUsd(next.toString());
            }}
            className="h-10 px-3 rounded-lg border border-slate-900 bg-slate-950 text-slate-300 font-mono font-bold hover:bg-slate-900 hover:text-white transition-all cursor-pointer active:scale-95 text-sm"
            title="Decrease stake"
          >
            -
          </button>

          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-sm md:text-base">$</span>
            <input 
              type="number" 
              step="1"
              min={minStake}
              max={maxStake}
              placeholder="10.00"
              value={spotAmountUsd} 
              onChange={(e) => onChangeUsd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-lg text-center font-mono text-base md:text-lg font-black py-2 px-7 text-white focus:outline-none focus:border-amber-500/70 focus:bg-slate-900 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" 
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const stepVal = stakeNum >= 50 ? 25 : stakeNum >= 20 ? 10 : 5;
              const next = Math.min(maxStake, stakeNum + stepVal);
              onChangeUsd(next.toString());
            }}
            className="h-10 px-3 rounded-lg border border-slate-900 bg-slate-950 text-slate-300 font-mono font-bold hover:bg-slate-900 hover:text-white transition-all cursor-pointer active:scale-95 text-sm"
            title="Increase stake"
          >
            +
          </button>
        </div>

        {/* Quick Dollar Chips */}
        <div className="grid grid-cols-6 gap-1">
          {quickStakes.map((val) => (
            <button 
              key={val} 
              type="button"
              onClick={() => onChangeUsd(val.toString())}
              className={`rounded py-1 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                stakeNum === val
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                  : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 hover:bg-slate-900'
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Multiplier Chips */}
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => {
              const halved = Math.max(minStake, Math.floor((stakeNum / 2) * 100) / 100);
              onChangeUsd(halved.toString());
            }}
            className="rounded py-1 text-[9px] font-mono font-bold border border-slate-900 bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title="Halve Stake (Hotkey: H)"
          >
            ½ Halve
          </button>
          <button
            type="button"
            onClick={() => {
              const doubled = Math.min(maxStake, stakeNum * 2);
              onChangeUsd(doubled.toString());
            }}
            className="rounded py-1 text-[9px] font-mono font-bold border border-slate-900 bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title="Double Stake (Hotkey: D)"
          >
            2× Double
          </button>
          <button
            type="button"
            onClick={() => onPresetPercentage(25)}
            className="rounded py-1 text-[9px] font-mono font-bold border border-slate-900 bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            25% Bal
          </button>
          <button 
            type="button"
            onClick={() => {
              const maxVal = Math.min(maxStake, Math.floor(freeBalance));
              onChangeUsd(Math.max(minStake, maxVal).toString());
            }}
            className="rounded py-1 text-[9px] font-mono font-black border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer uppercase"
            title="Max Available Balance (Hotkey: M)"
          >
            Max
          </button>
        </div>

        {/* Stake warning if exceeds balance */}
        {stakeNum > freeBalance && (
          <div className="p-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-[9px] font-mono text-rose-300 flex justify-between items-center">
            <span>Stake exceeds free balance (${freeBalance.toFixed(2)})</span>
            <button
              type="button"
              onClick={() => onChangeUsd(Math.max(minStake, Math.floor(freeBalance)).toString())}
              className="text-amber-400 underline font-bold"
            >
              Use Max
            </button>
          </div>
        )}
      </div>

      {/* 4. Smart Strategy & Protection Strip */}
      <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-900 text-[9px] font-mono">
        <button
          type="button"
          onClick={onToggleAutoMartingale}
          className={`p-1.5 rounded border transition-all cursor-pointer text-left flex flex-col justify-between ${
            autoMartingale 
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <span className="font-bold flex items-center justify-between">
            <span>⚡ Martingale</span>
            <span className={autoMartingale ? 'text-amber-400 font-extrabold' : 'text-slate-500'}>
              {autoMartingale ? 'ON' : 'OFF'}
            </span>
          </span>
          <span className="text-[8px] opacity-75 mt-0.5">2x on loss, reset on win</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const next = autoCashoutPercent === 0 ? 75 : autoCashoutPercent === 75 ? 90 : 0;
            onChangeAutoCashout(next);
          }}
          className={`p-1.5 rounded border transition-all cursor-pointer text-left flex flex-col justify-between ${
            autoCashoutPercent > 0 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
          }`}
        >
          <span className="font-bold flex items-center justify-between">
            <span>🛡 Auto Cashout</span>
            <span className={autoCashoutPercent > 0 ? 'text-emerald-400 font-extrabold' : 'text-slate-500'}>
              {autoCashoutPercent > 0 ? `+${autoCashoutPercent}%` : 'OFF'}
            </span>
          </span>
          <span className="text-[8px] opacity-75 mt-0.5">Locks win before reversal</span>
        </button>
      </div>

      {/* 5. MASSIVE DUAL CALL / PUT ACTION BUTTONS */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* BUY CALL / UP */}
        <button
          type="button"
          onClick={() => onExecuteTrade('call')}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] active:scale-[0.98] text-white p-3.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-emerald-500/40"
        >
          <div className="flex justify-between items-center w-full">
            <span className="font-black text-sm uppercase tracking-wider flex items-center gap-1">
              CALL / UP <span className="text-base">▲</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
              +{payoutRate.toFixed(0)}%
            </span>
          </div>
          <div className="mt-2.5 pt-1.5 border-t border-white/15 flex justify-between items-baseline font-mono">
            <span className="text-[10px] opacity-80">Payout:</span>
            <span className="font-black text-sm text-white">
              ${payoutVal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[8px] opacity-80 mt-1">
            <span>Win if Spot &gt; Entry</span>
            <span className="font-mono bg-black/25 px-1 rounded">[W / ↑]</span>
          </div>
        </button>

        {/* BUY PUT / DOWN */}
        <button
          type="button"
          onClick={() => onExecuteTrade('put')}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] active:scale-[0.98] text-white p-3.5 shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-rose-500/40"
        >
          <div className="flex justify-between items-center w-full">
            <span className="font-black text-sm uppercase tracking-wider flex items-center gap-1">
              PUT / DOWN <span className="text-base">▼</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
              +{payoutRate.toFixed(0)}%
            </span>
          </div>
          <div className="mt-2.5 pt-1.5 border-t border-white/15 flex justify-between items-baseline font-mono">
            <span className="text-[10px] opacity-80">Payout:</span>
            <span className="font-black text-sm text-white">
              ${payoutVal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[8px] opacity-80 mt-1">
            <span>Win if Spot &lt; Entry</span>
            <span className="font-mono bg-black/25 px-1 rounded">[S / ↓]</span>
          </div>
        </button>
      </div>

      {/* 6. Instant Re-Entry / Repeat Bar */}
      {lastTradeConfig && (
        <div className="pt-2 border-t border-slate-900/60 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onRepeatTrade(1)}
            className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
            title="Repeat previous trade (Space)"
          >
            <span>↺ Repeat (${lastTradeConfig.stake.toFixed(2)})</span>
          </button>
          <button
            type="button"
            onClick={() => onRepeatTrade(2)}
            className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-black transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
            title="Double stake (Martingale recovery) (D)"
          >
            <span>⚡ 2x (${(lastTradeConfig.stake * 2).toFixed(2)})</span>
          </button>
          <button
            type="button"
            onClick={() => onRepeatTrade(1, true)}
            className="py-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
            title="Reverse previous trade direction"
          >
            <span>⇄ Flip Dir</span>
          </button>
        </div>
      )}

      {/* 7. Summary Info */}
      <div className="p-2 rounded bg-slate-950/60 border border-slate-900/70 font-mono text-[9px] text-slate-400 flex justify-between items-center">
        <span>Draw Rule: Expiry == Entry (100% Refunded)</span>
        <span className="text-emerald-400 font-bold">Net Profit: +${netProfit.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default QuickTradePanel;
