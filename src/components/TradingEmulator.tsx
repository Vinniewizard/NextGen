import { useState, useEffect, useRef, FormEvent } from "react";
import { AccentColor } from "../types";
import { TrendingUp, TrendingDown, DollarSign, ArrowRight, User, ShieldCheck, Zap, Orbit, HelpCircle, ChevronRight, X, ArrowUpRight } from "lucide-react";

interface TradingEmulatorProps {
  platformName: string;
  accentColor: AccentColor;
  minDepositValue: string;
  minStakeValue: string;
}

interface Asset {
  name: string;
  symbol: string;
  category: string;
  change: string;
  isPositive: boolean;
  price: number;
}

export default function TradingEmulator({ platformName, accentColor, minDepositValue, minStakeValue }: TradingEmulatorProps) {
  // Simulator state parameters
  const [balance, setBalance] = useState(10000.00);
  const [activeAsset, setActiveAsset] = useState<Asset>({
    name: "Volatility 75 Index",
    symbol: "v75s",
    category: "Synthetic Indices",
    change: "+4.82%",
    isPositive: true,
    price: 284920.40
  });

  const [stake, setStake] = useState<number>(25);
  const [multiplier, setMultiplier] = useState<number>(500);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("50");
  const [selectedGateway, setSelectedGateway] = useState<"mpesa" | "crypto">("mpesa");
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Active positions state parameters
  const [positions, setPositions] = useState<{
    id: number;
    asset: string;
    type: "CALL" | "PUT";
    stake: number;
    multiplier: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    duration: string;
  }[]>([]);

  // Guided onboarding step tour parameters
  // Removed

  // Live Chart SVG tick point paths state
  const [chartPoints, setChartPoints] = useState<number[]>(Array.from({ length: 30 }, () => 140 + Math.random() * 80));

  // Auto Tick Price effect
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick current assets price
      const priceDelta = (Math.random() - 0.495) * (activeAsset.price * 0.001);
      setActiveAsset((prev) => ({
        ...prev,
        price: Number((prev.price + priceDelta).toFixed(2)),
        change: `${prev.isPositive ? "+" : ""}${(4.8 + Math.sin(Date.now() / 20000) * 0.5).toFixed(2)}%`
      }));

      // 2. Add raw ticking path coordinates to Live Chart line
      setChartPoints((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        // Calculate new coordinate bounds limit
        const rangeDelta = (Math.random() - 0.5) * 22;
        let nextVal = last + rangeDelta;
        if (nextVal < 30) nextVal = 50;
        if (nextVal > 250) nextVal = 210;
        next.push(Number(nextVal.toFixed(1)));
        return next;
      });

      // 3. Tick active open positions PnL parameters with precise Binance Futures / Forex CFD formula
      setPositions((prev) => {
        const delta = (Math.random() - 0.495) * (activeAsset.price * 0.0003);
        const newAssetPrice = Number((activeAsset.price + delta).toFixed(activeAsset.price < 10 ? 4 : 2));
        
        return prev.map((pos) => {
          const directionMultiplier = pos.type === "CALL" ? 1 : -1;
          const priceChangeRatio = pos.entryPrice > 0 ? (newAssetPrice - pos.entryPrice) / pos.entryPrice : 0;
          // Binance Futures / Forex CFD Formula: PnL = (Stake * Multiplier) * Price Change Ratio * Direction
          const notionalSize = pos.stake * pos.multiplier;
          let calculatedPnl = priceChangeRatio * notionalSize * directionMultiplier;
          
          // Isolated Margin Stop Out / Liquidation rule: max loss is bounded by the stake amount
          if (calculatedPnl < -pos.stake) {
            calculatedPnl = -pos.stake;
          }

          return {
            ...pos,
            currentPrice: newAssetPrice,
            pnl: Number(calculatedPnl.toFixed(2))
          };
        });
      });
    }, 450);

    return () => clearInterval(timer);
  }, [activeAsset.price]);

  // Handle transaction order trade calls: Call (Buy)
  const [duration, setDuration] = useState("1m");
  const handleOpenTrade = (type: "CALL" | "PUT") => {
    if (stake < Number(minStakeValue.replace(/[^0-9.]/g, ""))) return;
    
    // Deduct stake balance
    setBalance(prev => Number((prev - stake).toFixed(2)));

    const newPos = {
      id: Date.now(),
      asset: activeAsset.name,
      type,
      stake,
      multiplier,
      entryPrice: activeAsset.price,
      currentPrice: activeAsset.price,
      pnl: 0,
      duration
    };
    setPositions(prev => [newPos, ...prev]);
  };

  // Close open positions
  const handleClosePosition = (id: number, finalPnl: number) => {
    setBalance(prev => Number((prev + finalPnl + stake).toFixed(2)));
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  // Mini asset selectors database
  const assetList: Asset[] = [
    { name: "Volatility 75 Index", symbol: "v75s", category: "Synthetic", price: 284920.40, change: "+4.82%", isPositive: true },
    { name: "Crash 1000 Index", symbol: "c1000", category: "Synthetic", price: 14820.15, change: "-1.14%", isPositive: false },
    { name: "Boom 500 Index", symbol: "b500", category: "Synthetic", price: 8392.50, change: "+2.85%", isPositive: true },
    { name: "Synthetic EUR/USD", symbol: "fEURUSD", category: "Majors", price: 1.0842, change: "+0.24%", isPositive: true },
    { name: "Crypto VIP Index", symbol: "vipCRYP", category: "Elite", price: 68329.10, change: "+5.12%", isPositive: true }
  ];

  // Removed

  const handleDepositSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(depositAmount);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      setBalance(prev => Number((prev + parsedAmount).toFixed(2)));
      setDepositSuccess(true);
      setTimeout(() => {
        setDepositSuccess(false);
        setShowDepositModal(false);
      }, 1500);
    }
  };

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative" id="interactive-emulator">
      
      {/* Top Main navigation emulator bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Orbit className="w-6 h-6 text-indigo-400 rotate-180 animate-spin" style={{ animationDuration: "25s" }} />
          <div>
            <h3 className="text-md font-display font-bold text-white tracking-wide uppercase">{platformName} Terminal</h3>
          </div>
        </div>

        {/* Balance metrics */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-1.5 flex items-center gap-3.5">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Balance</span>
              <span className="text-sm font-bold text-white tracking-widest font-mono">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowDepositModal(true)}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-display font-medium shadow-md shadow-indigo-500/10 active:scale-95 transition cursor-pointer"
            id="secure-gateways"
          >
            Deposit
          </button>
        </div>
      </div>

      {/* Main Terminal Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 px-1 py-1 w-full">
        
        {/* Left LHS Column - Assets Picker (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900/40 p-4 rounded-xl border border-slate-900" id="asset-picker">
          <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800/60 font-bold">
            Assets
          </h4>

          <div className="space-y-1.5 h-[270px] lg:h-[450px] overflow-y-auto pr-1">
            {assetList.map((asset) => {
              const isActive = activeAsset.name === asset.name;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => {
                    setActiveAsset({ ...asset, price: asset.price });
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-slate-900 border-emerald-500/30 text-white"
                      : "bg-slate-950/40 border-slate-850/60 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                  }`}
                >
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">{asset.category}</span>
                    <span className="text-xs font-bold leading-tight block">{asset.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Screen Grid - Graph/Indicator (7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900/20 p-5 rounded-xl border border-slate-900 flex flex-col justify-between" id="interactive-chart">
          
          {/* Active Asset Info row */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xxs font-mono text-emerald-400 block tracking-widest uppercase">
                ACTIVE TRADING INDEX
              </span>
              <h2 className="text-lg font-display font-medium text-white flex items-center gap-1.5">
                {activeAsset.name}
                <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">
                  {activeAsset.symbol.toUpperCase()}
                </span>
              </h2>
            </div>

            <div className="text-right font-mono">
              <span className="text-lg font-bold text-white tracking-widest block">
                ${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold flex items-center gap-0.5 justify-end ${
                activeAsset.isPositive ? "text-indigo-400" : "text-red-400"
              }`}>
                {activeAsset.change}
              </span>
            </div>
          </div>

          {/* SVG Line Chart representing trajectory flow */}
          <div className="w-full h-[240px] bg-slate-950/60 rounded-xl border border-slate-900 relative overflow-hidden flex items-end">
            
            {/* Chart Mesh Background overlay lines */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: "linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }} />
            </div>

            {/* Glowing neon green or neon red accent according to active asset change status */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 300">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeAsset.isPositive ? "#6366f1" : "#EF4444"} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={activeAsset.isPositive ? "#6366f1" : "#EF4444"} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Shaded Area Under Line */}
              <path
                d={`M 0,300 ${chartPoints.map((val, idx) => `L ${(idx / (chartPoints.length - 1)) * 600},${val}`).join(" ")} L 600,300 Z`}
                fill="url(#chartGlow)"
              />

              {/* Chart Line path */}
              <path
                d={chartPoints.map((val, idx) => `${idx === 0 ? "M" : "L"} ${(idx / (chartPoints.length - 1)) * 600},${val}`).join(" ")}
                fill="none"
                stroke={activeAsset.isPositive ? "#6366f1" : "#EF4444"}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Pulse circle on the newest end point coordinate */}
              <circle
                cx="600"
                cy={chartPoints[chartPoints.length - 1]}
                r="6"
                fill="#ffffff"
                stroke={activeAsset.isPositive ? "#6366f1" : "#EF4444"}
                strokeWidth="2.5"
                className="animate-ping"
              />
              <circle
                cx="600"
                cy={chartPoints[chartPoints.length - 1]}
                r="4.5"
                fill="#ffffff"
                stroke={activeAsset.isPositive ? "#6366f1" : "#EF4444"}
                strokeWidth="2"
              />
            </svg>

            {/* Simulated Live Trajectory guide text */}
          </div>
        </div>

        {/* Right RHS Column - Execution Trade Controls (3 Columns) */}
        <div className="lg:col-span-3 bg-slate-900/40 p-4 rounded-xl border border-slate-900 flex flex-col justify-between h-auto gap-4" id="trade-control">
          
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-800/60 font-bold">
              Trade
            </h4>

            {/* Stake Input with multiplier metrics */}
            <div>
              <label className="text-xxs font-mono text-slate-400 uppercase mb-1.5 block">
                Stake Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  min={minStakeValue.replace(/[^0-9.]/g, "")}
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
                />
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-xxs font-mono text-slate-400 uppercase mb-2 block">
                Duration / Expiry
              </label>
              <div className="grid grid-cols-3 gap-1">
                {["15s", "30s", "1m"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-1.5 rounded font-mono text-xs font-bold transition border cursor-pointer ${
                      duration === d
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Multiplier / Leverage Preset buttons */}
            <div>
              <label className="text-xxs font-mono text-slate-400 uppercase mb-2 block">
                Trade Multiplier Factor
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[50, 100, 200, 500].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`py-1.5 rounded font-mono text-xs font-bold transition border cursor-pointer ${
                      multiplier === m
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    x{m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Large colored Execution CTA trigger buttons */}
          <div className="space-y-2.5 pt-4">
            <button
              onClick={() => handleOpenTrade("CALL")}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-display font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-between text-sm tracking-wide shadow-md shadow-indigo-500/10 active:scale-98 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                BUY (CALL)
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleOpenTrade("PUT")}
              className="w-full bg-red-500 hover:bg-red-400 text-white font-display font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-between text-sm tracking-wide shadow-md shadow-red-500/10 active:scale-98 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                SELL (PUT)
              </span>
              <ArrowUpRight className="w-4 h-4 rotate-90" />
            </button>
          </div>

        </div>

      </div>

      {/* Overlaid Active running positions ticket log */}
      <div className="bg-slate-950/80 border-t border-slate-900 px-6 py-4">
        <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3.5 flex items-center gap-2 font-bold">
          <Zap className="w-4.5 h-4.5 text-yellow-400" />
          Active Working Open Positions ({positions.length})
        </h4>

        {positions.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-850 rounded-xl text-center text-xs text-slate-500/80">
            No active trades running. Click Buy (Call) or Sell (Put) to simulate your high-stakes multipliers in real-time!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[145px] overflow-y-auto pr-2">
            {positions.map((pos) => {
              const isProfit = pos.pnl >= 0;
              return (
                <div
                  key={pos.id}
                  className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850/80 flex items-center justify-between transition-colors hover:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${isProfit ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-display text-white">{pos.asset}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          pos.type === "CALL" ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {pos.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        Stake: ${pos.stake} • x{pos.multiplier} • {pos.duration}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className={`text-md font-bold font-mono block ${isProfit ? "text-indigo-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}${pos.pnl.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleClosePosition(pos.id, pos.pnl)}
                      className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-900 transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* 4. Instant Deposit Modal simulation */}
      {showDepositModal && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleDepositSubmit}
            className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 relative shadow-2xl"
          >
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-display font-bold text-white uppercase">Secure Refunding Portal</h3>
            </div>

            {/* Gateway tab choice */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setSelectedGateway("mpesa")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedGateway === "mpesa"
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                💚 M-Pesa Cash-In
              </button>
              <button
                type="button"
                onClick={() => setSelectedGateway("crypto")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedGateway === "crypto"
                    ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                    : "border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                ₿ Cryptos Bitcoin
              </button>
            </div>

            {/* Form details */}
            <div className="space-y-4 mb-6">
              {selectedGateway === "mpesa" ? (
                <div>
                  <label className="text-xxs font-mono text-slate-400 uppercase mb-1.5 block">Safaricom Mobile Number</label>
                  <input
                    type="tel"
                    required
                    defaultValue="+254 712 345 678"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Supported automated instantly across M-Pesa.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="text-xxs font-mono text-slate-400 uppercase mb-1.5 block">Crypto Token Choice</label>
                  <select className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-yellow-500">
                    <option>USDT (TRC-20 Network)</option>
                    <option>Bitcoin (BTC Mainnet)</option>
                    <option>Ethereum (ETH ERC-20)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xxs font-mono text-slate-400 uppercase mb-1.5 block">Funding Amount ($ USD)</label>
                <input
                  type="number"
                  min={minDepositValue.replace(/[^0-9.]/g, "")}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Minimum deposit is {minDepositValue}.
                </span>
              </div>
            </div>

            {depositSuccess ? (
              <div className="bg-indigo-950/20 border border-indigo-900/30 text-indigo-400 p-3 rounded-lg text-xs font-mono text-center mb-4">
                🚀 TRANSACTION FUNDED SUCCESSFULLY!
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wide transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              Verify Direct Payment
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
