import { useState } from "react";
import { CaptionConfig, AccentColor } from "../types";
import { Copy, Check, FileText, Smartphone, Send, Twitter, Eye, ExternalLink } from "lucide-react";

interface CaptionHubProps {
  config: CaptionConfig;
  onChange: (updater: (prev: CaptionConfig) => CaptionConfig) => void;
  accentColor: AccentColor;
}

export default function CaptionHub({ config, onChange, accentColor }: CaptionHubProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const getAccentColorHex = (color: AccentColor) => {
    switch (color) {
      case AccentColor.EMERALD: return "text-emerald-400";
      case AccentColor.RUBY: return "text-red-400";
      case AccentColor.CYAN: return "text-cyan-400";
      case AccentColor.AMETHYST: return "text-purple-400";
    }
  };

  const getButtonBgClass = (color: AccentColor) => {
    switch (color) {
      case AccentColor.EMERALD: return "bg-emerald-500 hover:bg-emerald-400 text-slate-950";
      case AccentColor.RUBY: return "bg-red-500 hover:bg-red-400 text-slate-950";
      case AccentColor.CYAN: return "bg-cyan-500 hover:bg-cyan-400 text-slate-950";
      case AccentColor.AMETHYST: return "bg-purple-500 hover:bg-purple-400 text-slate-950";
    }
  };

  const getBorderColorClass = (color: AccentColor) => {
    switch (color) {
      case AccentColor.EMERALD: return "focus:border-emerald-500";
      case AccentColor.RUBY: return "focus:border-red-500";
      case AccentColor.CYAN: return "focus:border-cyan-500";
      case AccentColor.AMETHYST: return "focus:border-purple-500";
    }
  };

  // 1. Generate TikTok/Reels caption dynamically
  const getTiktokCaption = () => {
    return `If you’re still using trading platforms built in 2012, it is time for an upgrade. 😮💨📈

We just launched the cleanest, fastest trading platform for synthetic indices and major currencies.

Why smart traders are moving over:
⚡ Dynamic Charts: Ultra-responsive trajectory tracking with no lag.
🧭 Guided Tour: Step-by-step interactive walkthrough so you never trade confused.
🔒 Instant Withdrawals: Smooth, secure processing for both M-Pesa & Crypto.

Tap the link in our bio to log in, take the interactive tour, and start compounding your balance today! 👇
🔗 ${config.marketingLink}

#TradingPlatform #ForexTrading #SyntheticIndices #DayTrading #CryptoDayTrader #BinaryTrading #FinancialFreedom #TraderLife`;
  };

  // 2. Generate Twitter/X short hype post dynamically
  const getTwitterCaption = () => {
    return `Meet the cleanest trading platform on your feed. ⚡

Real-time synthetic indices, responsive multi-column trade execution, and an active community tour that shows you exactly how to trade like a VIP. 📈

Best part? Instant Mobile Money (M-Pesa) & Crypto deposits start at just ${config.minDepositValue}. 💸

Join the future of trading now: ${config.marketingLink} 🚀

$BTC $EURUSD #Trading`;
  };

  // 3. Generate Telegram Broadcast channel copy dynamically
  const getTelegramCaption = () => {
    return `📢 ATTENTION TRADERS: A New Standard Has Arrived 📢

We have officially updated and optimized our trading platform to provide the ultimate high-performance experience.

What's New in This Update?
✅ Guided Platform Tour: Added a gorgeous interactive onboarding system to guide you through the asset selector, live charting, and trade controls.
✅ VIP Trading Portals: Upgraded processing speeds and customized profile tiers (${config.vipLevels}).
✅ Flexible Limits: Free accounts up to elite positions. Minimal stakes started at just ${config.minStakeValue} up to major positions.
✅ Protected Configurations: Backend-secured administrative control ensures your platform remains persistent, trusted, and rock-solid.

Getting Started is Easy:
1️⃣ Click the link below to enter.
2️⃣ Launch the Platform Tour from your user profile menu to master the interface.
3️⃣ Fund your wallet using M-Pesa or Crypto and take control of the markets!

👉 Choose your status and start trading now:
⚡ ${config.marketingLink}

Always trade responsibly. Your success is our mission.`;
  };

  // Copy helper
  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="caption-hub">
      
      {/* Parameters Sidebar selector (4 Columns) */}
      <div className="lg:col-span-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-display font-medium text-white">Caption Variables</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Campaign Bio Link</label>
            <div className="relative">
              <input
                type="text"
                value={config.marketingLink}
                onChange={(e) => onChange(prev => ({ ...prev, marketingLink: e.target.value }))}
                className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none font-mono ${getBorderColorClass(accentColor)}`}
              />
              <span className="absolute right-3.5 top-2.5 text-slate-500">
                <ExternalLink className="w-4 h-4" />
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Pre-filled with your target launch domain.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Min Deposit</label>
              <input
                type="text"
                value={config.minDepositValue}
                onChange={(e) => onChange(prev => ({ ...prev, minDepositValue: e.target.value }))}
                className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono ${getBorderColorClass(accentColor)}`}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Min Stake</label>
              <input
                type="text"
                value={config.minStakeValue}
                onChange={(e) => onChange(prev => ({ ...prev, minStakeValue: e.target.value }))}
                className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono ${getBorderColorClass(accentColor)}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">VIP Tiers Text list</label>
            <input
              type="text"
              value={config.vipLevels}
              onChange={(e) => onChange(prev => ({ ...prev, vipLevels: e.target.value }))}
              className={`w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${getBorderColorClass(accentColor)}`}
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Comma-separated levels.
            </span>
          </div>

          {/* Deposit checkboxes overlays */}
          <div className="space-y-2 border-t border-slate-800/80 pt-4">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.includeMpesa}
                onChange={(e) => onChange(prev => ({ ...prev, includeMpesa: e.target.checked }))}
                className="accent-emerald-500 rounded border-slate-800"
              />
              Accept automated Safaricom M-Pesa
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.includeCrypto}
                onChange={(e) => onChange(prev => ({ ...prev, includeCrypto: e.target.checked }))}
                className="accent-emerald-500 rounded border-slate-800"
              />
              Support Bitcoin / Cryptos
            </label>
          </div>
        </div>
      </div>

      {/* Social Previews Grid Section (8 Columns) */}
      <div className="lg:col-span-8 space-y-6 w-full">
        
        {/* Row 1: TikTok / Reels Copy segment */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 font-bold uppercase">
              <Smartphone className="w-4 h-4 text-pink-500" />
              TikTok & Reels Caption
            </span>
            <button
              onClick={() => handleCopy(getTiktokCaption(), "tiktok")}
              className={`p-2 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition flex items-center gap-1 bg-slate-950 border border-slate-850 ${
                copiedSection === "tiktok" ? "text-emerald-400 border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {copiedSection === "tiktok" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Text!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Caption
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={getTiktokCaption()}
              className="w-full h-44 bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-300 font-sans focus:outline-none select-all relative overflow-y-auto leading-relaxed"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-mono">
            💡 Perfect for engaging vertical hooks with high search hashtags.
          </span>
        </div>

        {/* Row 2: Twitter / X short and punchy */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 font-bold uppercase">
              <Twitter className="w-4 h-4 text-cyan-400" />
              Twitter / X Hype Post
            </span>
            <button
              onClick={() => handleCopy(getTwitterCaption(), "twitter")}
              className={`p-2 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition flex items-center gap-1 bg-slate-950 border border-slate-850 ${
                copiedSection === "twitter" ? "text-emerald-400 border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {copiedSection === "twitter" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Hype!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Post
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={getTwitterCaption()}
              className="w-full h-32 bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-300 font-sans focus:outline-none select-all relative overflow-y-auto leading-relaxed"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-mono">
            💡 Designed with relevant index and crypto tickers to capture algorithmic feeds.
          </span>
        </div>

        {/* Row 3: Telegram channel Broadcast */}
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 font-bold uppercase">
              <Send className="w-4 h-4 text-blue-400" />
              Telegram Broadcast Copy
            </span>
            <button
              onClick={() => handleCopy(getTelegramCaption(), "telegram")}
              className={`p-2 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer transition flex items-center gap-1 bg-slate-950 border border-slate-850 ${
                copiedSection === "telegram" ? "text-emerald-400 border-emerald-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {copiedSection === "telegram" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Broadcast!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Broadcast
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={getTelegramCaption()}
              className="w-full h-44 bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-300 font-sans focus:outline-none select-all relative overflow-y-auto leading-relaxed"
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-mono">
            💡 Full professional layout optimized for private groups or broadcasting channels.
          </span>
        </div>

      </div>
    </div>
  );
}
