import { useEffect, useRef, useState } from "react";
import { BannerConfig, AccentColor, ChartStyle } from "../types";
import { Download, Check, Sparkles, RefreshCw, Layers, Sliders, Type, Grid } from "lucide-react";

interface BannerDesignerProps {
  config: BannerConfig;
  onChange: (updater: (prev: BannerConfig) => BannerConfig) => void;
}

export default function BannerDesigner({ config, onChange }: BannerDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper colors
  const getColorHex = (color: AccentColor) => {
    switch (color) {
      case AccentColor.EMERALD: return "#10B981";
      case AccentColor.RUBY: return "#EF4444";
      case AccentColor.CYAN: return "#06B6D4";
      case AccentColor.AMETHYST: return "#A855F7";
      case AccentColor.INDIGO: return "#6366f1";
    }
  };

  const getGradientColors = (color: AccentColor): [string, string] => {
    switch (color) {
      case AccentColor.EMERALD: return ["#064e3b", "#022c22"];
      case AccentColor.RUBY: return ["#7f1d1d", "#450a0a"];
      case AccentColor.CYAN: return ["#164e63", "#083344"];
      case AccentColor.AMETHYST: return ["#581c87", "#3b0764"];
      case AccentColor.INDIGO: return ["#312e81", "#1e1b4b"];
    }
  };

  // Draw on Canvas
  const drawBanner = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    const accentHex = getColorHex(config.accentColor);
    const [subDark, deepDark] = getGradientColors(config.accentColor) || ["#064e3b", "#022c22"];

    // 1. Clear background & custom Dark Space gradient
    const bgGradient = ctx.createRadialGradient(
      width / 2, height / 2, 10,
      width / 2, height / 2, width * 0.8
    );
    bgGradient.addColorStop(0, "#0e1628");
    bgGradient.addColorStop(0.5, "#070b13");
    bgGradient.addColorStop(1, "#030408");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Mesh Grid (cyberpunk overlay)
    if (config.showGrid) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.05)";
      ctx.lineWidth = 1.5;
      
      const gridSize = 40;
      // Vertical lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Intersections dots
      ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
      for (let x = 0; x < width; x += gridSize * 2) {
        for (let y = 0; y < height; y += gridSize * 2) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Cyber Ambient Glowing Orbs
    if (config.showGlow) {
      const glowGrad = ctx.createRadialGradient(
        width - 250, height / 2, 50,
        width - 250, height / 2, 450
      );
      glowGrad.addColorStop(0, accentHex + "2E"); // Theme color with high transparency
      glowGrad.addColorStop(0.5, subDark + "12");
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 4. Draw high-tech trading chart backdrop (right-side aligned)
    ctx.save();
    
    // Generate the path based on selected chart style
    const points: { x: number; y: number }[] = [];
    const totalPoints = 16;
    const chartWidth = 650;
    const startX = width - chartWidth - 30;
    const startY = height - 120;

    for (let i = 0; i < totalPoints; i++) {
      const x = startX + (i / (totalPoints - 1)) * chartWidth;
      let y = startY;

      if (config.chartStyle === ChartStyle.BULLISH) {
        y -= (i / (totalPoints - 1)) * 320 + Math.sin(i * 1.2) * 25 + (i === totalPoints - 1 ? 55 : 0);
      } else if (config.chartStyle === ChartStyle.VOLATILE) {
        // High variation swings
        const swings = [0, -60, 40, -140, -80, -260, -180, -320, -140, -360, -220, -420, -380, -480, -420, -500];
        const index = Math.min(i, swings.length - 1);
        y += swings[index] * 0.75;
      } else {
        // Exponential rocket climb
        y -= Math.pow(i / (totalPoints - 1), 3.5) * 380 + Math.cos(i * 2) * 15;
      }
      points.push({ x, y });
    }

    // Draw grid bounds shading & gradient fill under chart
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, height);
      for (const pt of points) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.lineTo(points[points.length - 1].x, height);
      ctx.closePath();

      const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
      areaGrad.addColorStop(0.1, accentHex + "30"); // glowing top
      areaGrad.addColorStop(0.6, accentHex + "08");
      areaGrad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = areaGrad;
      ctx.fill();
    }

    // Draw glowing bezier line
    ctx.shadowBlur = 18;
    ctx.shadowColor = accentHex;
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    // Draw trading candlestick bars in the background
    ctx.restore();
    ctx.save();
    ctx.shadowBlur = 0; // disable shadow for clean blocks
    ctx.lineWidth = 1;

    for (let i = 2; i < points.length - 1; i += 2) {
      const p = points[i];
      const isUp = i % 4 !== 0;
      const blockColor = isUp ? "#10B981" : "#EF4444";
      ctx.strokeStyle = blockColor + "60";
      ctx.fillStyle = blockColor + "30";

      // Wick/Vertical line
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 40);
      ctx.lineTo(p.x, p.y + 45);
      ctx.stroke();

      // Body
      const bodyW = 12;
      const bodyH = 30;
      ctx.fillRect(p.x - bodyW / 2, p.y - bodyH / 2, bodyW, bodyH);
      ctx.strokeRect(p.x - bodyW / 2, p.y - bodyH / 2, bodyW, bodyH);

      // Value label indicators mini
      if (i === points.length - 3) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'JetBrains Mono', Courier, monospace";
        ctx.fillText(`+148.92%`, p.x + 12, p.y - 15);
      }
    }
    ctx.restore();

    // 5. Place text and branding elements (Left Side)
    const textX = 75;

    // Platform Badge top left
    ctx.save();
    const badgeText = (config.customBadge || "Official").toUpperCase();
    ctx.font = "bold 13px 'JetBrains Mono', Courier, monospace";
    const textWidth = ctx.measureText(badgeText).width;
    
    // Gradient outline for badge
    const badgeBg = ctx.createLinearGradient(textX, 0, textX + textWidth + 30, 0);
    badgeBg.addColorStop(0, accentHex);
    badgeBg.addColorStop(1, accentHex + "44");

    ctx.fillStyle = "rgba(14, 21, 38, 0.75)";
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 1.5;
    
    // Draw rounded badge rectangle
    const brX = textX;
    const brY = 75;
    const brW = textWidth + 24;
    const brH = 32;
    const radius = 6;
    
    ctx.beginPath();
    ctx.moveTo(brX + radius, brY);
    ctx.lineTo(brX + brW - radius, brY);
    ctx.quadraticCurveTo(brX + brW, brY, brX + brW, brY + radius);
    ctx.lineTo(brX + brW, brY + brH - radius);
    ctx.quadraticCurveTo(brX + brW, brY + brH, brX + brW - radius, brY + brH);
    ctx.lineTo(brX + radius, brY + brH);
    ctx.quadraticCurveTo(brX, brY + brH, brX, brY + brH - radius);
    ctx.lineTo(brX, brY + radius);
    ctx.quadraticCurveTo(brX, brY, brX + radius, brY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(badgeText, textX + 12, 95);
    ctx.restore();

    // Platform Giant Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(config.platformName || "KNEX", textX, 175);

    // Dynamic glowing line accent under name
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = accentHex;
    ctx.beginPath();
    ctx.moveTo(textX, 195);
    ctx.lineTo(textX + 240, 195);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Headline
    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 32px 'Inter', system-ui, sans-serif";
    ctx.fillText(config.headline || "", textX, 255);

    // Sub-headline
    ctx.fillStyle = "rgba(209, 213, 219, 0.85)";
    ctx.font = "normal 20px 'Inter', system-ui, sans-serif";
    ctx.fillText(config.subHeadline || "", textX, 295);

    // List Bullet features checkmarks
    ctx.font = "semibold 18px 'Inter', sans-serif";
    (config.bullets || []).forEach((bullet, idx) => {
      const yOffset = 360 + idx * 45;
      
      // Draw custom check icon
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.arc(textX + 12, yOffset - 6, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(textX + 7, yOffset - 6);
      ctx.lineTo(textX + 11, yOffset - 2);
      ctx.lineTo(textX + 17, yOffset - 10);
      ctx.stroke();

      // Bullet Text
      ctx.fillStyle = "#f9fafb";
      ctx.fillText(bullet, textX + 38, yOffset);
    });

    // 6. Bottom info bar: Staking and deposits stats indicators
    ctx.save();
    const statY = 540;
    
    // Mini dividers
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;

    // Stat Block 1: Minimum deposit
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("MIN DEPOSIT", textX, statY);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Space Grotesk', sans-serif";
    ctx.fillText(config.minDeposit || "$1.00", textX, statY + 30);

    // Vertical Divider 1
    ctx.beginPath();
    ctx.moveTo(textX + 160, statY - 5);
    ctx.lineTo(textX + 160, statY + 35);
    ctx.stroke();

    // Stat Block 2: Minimum stake
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("MINIMUM STAKE", textX + 190, statY);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Space Grotesk', sans-serif";
    ctx.fillText(config.minStake || "$1.00", textX + 190, statY + 30);

    // Vertical Divider 2
    ctx.beginPath();
    ctx.moveTo(textX + 360, statY - 5);
    ctx.lineTo(textX + 360, statY + 35);
    ctx.stroke();

    // Stat Block 3: VIP Trading Portals
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("ONBOARDING ENGINE", textX + 390, statY);
    ctx.fillStyle = accentHex;
    ctx.font = "bold 24px 'Space Grotesk', sans-serif";
    ctx.fillText("AUTO-WALKTHROUGH 🧭", textX + 390, statY + 30);

    ctx.restore();

    // 7. Right side mini platform mockup border preview
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(14, 21, 38, 0.4)";
    
    // Draw rounded glass card container
    const cardX = width - 420;
    const cardY = 80;
    const cardW = 345;
    const cardH = 340;
    
    ctx.beginPath();
    ctx.roundRect?.(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Premium live telemetry design lines helper inside mockup
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.beginPath();
    ctx.moveTo(cardX + 20, cardY + 50);
    ctx.lineTo(cardX + cardW - 20, cardY + 50);
    ctx.stroke();

    ctx.font = "bold 11px 'JetBrains Mono', Courier, monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.fillText("MOCKUP PREVIEW", cardX + 20, cardY + 30);
    ctx.fillStyle = accentHex;
    ctx.fillText("● SYSTEM ONLINE", cardX + cardW - 125, cardY + 30);

    // Feed custom features mini rows
    const drawMockRow = (rx: number, ry: number, rw: number, rh: number, label: string, val: string, isGreen: boolean) => {
      ctx.fillStyle = "rgba(14, 21, 38, 0.6)";
      ctx.beginPath();
      ctx.roundRect?.(rx, ry, rw, rh, 6);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.fillText(label, rx + 12, ry + 18);

      ctx.fillStyle = isGreen ? "#10B981" : "#f3f4f6";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillText(val, rx + rw - 70, ry + 18);
    };

    drawMockRow(cardX + 20, cardY + 70, cardW - 40, 28, "CURRENCY INDEX", "SYNTH-75", false);
    drawMockRow(cardX + 20, cardY + 110, cardW - 40, 28, "TRIAL ACCOUNT", "+$2,829.40", true);
    drawMockRow(cardX + 20, cardY + 150, cardW - 40, 28, "VIP PROFILE TIER", "LEVEL 5", false);

    // Bottom interactive demo indicators
    ctx.fillStyle = "#10B981" + "25";
    ctx.beginPath();
    ctx.roundRect?.(cardX + 20, cardY + 205, (cardW - 50) / 2, 40, 8);
    ctx.fill();
    ctx.strokeStyle = "#10B981" + "60";
    ctx.stroke();
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 13px 'Space Grotesk', sans-serif";
    ctx.fillText("BUY (CALL)", cardX + 42, cardY + 230);

    ctx.fillStyle = "#EF4444" + "25";
    ctx.beginPath();
    ctx.roundRect?.(cardX + 20 + (cardW - 50) / 2 + 10, cardY + 205, (cardW - 50) / 2, 40, 8);
    ctx.fill();
    ctx.strokeStyle = "#EF4444" + "60";
    ctx.stroke();
    ctx.fillStyle = "#EF4444";
    ctx.fillText("SELL (PUT)", cardX + 20 + (cardW - 50) / 2 + 25, cardY + 230);

    // M-Pesa & Crypto Accepted badges inside mockup
    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillText("SUPPORTED SYSTEMS:", cardX + 20, cardY + 285);

    // M-Pesa badge color green
    ctx.fillStyle = "#48B02C"; // Safaricom green
    ctx.beginPath();
    ctx.roundRect?.(cardX + 20, cardY + 295, 80, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px 'Space Grotesk', sans-serif";
    ctx.fillText("M-PESA", cardX + 40, cardY + 312);

    // Crypto badge
    ctx.fillStyle = "#EAB308"; // Bitcoin yellow
    ctx.beginPath();
    ctx.roundRect?.(cardX + 110, cardY + 295, 90, 24, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px 'Space Grotesk', sans-serif";
    ctx.fillText("CRYPTOS ⚡", cardX + 124, cardY + 312);

    ctx.restore();
  };

  // Re-run draw when configuration options change
  useEffect(() => {
    drawBanner();
  }, [config]);

  // Handle PNG Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${(config.platformName || "knex").toLowerCase()}_marketing_banner.png`;
    link.href = url;
    link.click();
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="marketing-banner">
      {/* Editor Controls (4 Columns) */}
      <div className="lg:col-span-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-6">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-display font-medium text-white">Banner Parameters</h3>
        </div>

        <div className="space-y-5">
          {/* Platform settings */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Platform Name</label>
            <div className="relative">
              <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={config.platformName}
                onChange={(e) => onChange(prev => ({ ...prev, platformName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-display font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Main Headline</label>
            <input
              type="text"
              value={config.headline}
              onChange={(e) => onChange(prev => ({ ...prev, headline: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Subtitle Line</label>
            <input
              type="text"
              value={config.subHeadline}
              onChange={(e) => onChange(prev => ({ ...prev, subHeadline: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Min Deposit</label>
              <input
                type="text"
                value={config.minDeposit}
                onChange={(e) => onChange(prev => ({ ...prev, minDeposit: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Min Stake</label>
              <input
                type="text"
                value={config.minStake}
                onChange={(e) => onChange(prev => ({ ...prev, minStake: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Custom Badge Text</label>
            <input
              type="text"
              value={config.customBadge}
              onChange={(e) => onChange(prev => ({ ...prev, customBadge: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono uppercase"
            />
          </div>

          {/* Color Preset Choice */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Cyber Neon Aura</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: AccentColor.EMERALD, label: "Emerald", class: "bg-emerald-500 border-emerald-400" },
                { type: AccentColor.RUBY, label: "Ruby", class: "bg-red-500 border-red-400" },
                { type: AccentColor.CYAN, label: "Cyan", class: "bg-cyan-500 border-cyan-400" },
                { type: AccentColor.AMETHYST, label: "Amethyst", class: "bg-purple-500 border-purple-400" }
              ].map((c) => (
                <button
                  key={c.type}
                  onClick={() => onChange(prev => ({ ...prev, accentColor: c.type }))}
                  className={`py-1.5 rounded-lg flex flex-col items-center justify-center gap-1.5 border text-[10px] font-medium transition ${
                    config.accentColor === c.type
                      ? "border-white bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${c.class}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Style Choice */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-3">Background Chart Path</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: ChartStyle.BULLISH, label: "Bullish Climb" },
                { type: ChartStyle.VOLATILE, label: "Volatile Sweeps" },
                { type: ChartStyle.EXPONENTIAL, label: "Rocket Spike" }
              ].map((c) => (
                <button
                  key={c.type}
                  onClick={() => onChange(prev => ({ ...prev, chartStyle: c.type }))}
                  className={`py-2 px-1 rounded-lg border text-xxs font-mono uppercase text-center transition ${
                    config.chartStyle === c.type
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Bullets Edits */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Bullet Highlights</label>
            <div className="space-y-2">
              {(config.bullets || []).map((bullet, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-xxs font-mono text-slate-500">#{index + 1}</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => onChange(prev => {
                      const updated = [...(prev.bullets || [])];
                      updated[index] = e.target.value;
                      return { ...prev, bullets: updated };
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(e) => onChange(prev => ({ ...prev, showGrid: e.target.checked }))}
                className="accent-emerald-500 rounded border-slate-800"
              />
              Show Cyber Grid
            </label>

            <label className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.showGlow}
                onChange={(e) => onChange(prev => ({ ...prev, showGlow: e.target.checked }))}
                className="accent-emerald-500 rounded border-slate-800"
              />
              Show Outer Glow
            </label>
          </div>
        </div>
      </div>

      {/* Canvas Graphics Rendering Output (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col items-center gap-4 w-full">
        <div className="w-full bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-3 px-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              1200 × 630 Premium JPG/PNG Output Frame
            </span>
            <button
              onClick={handleDownload}
              className="text-xs font-mono hover:text-white text-emerald-400 py-1 px-3 border border-emerald-500/30 hover:border-emerald-400 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/15 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />}
              Redraw / Synchronize
            </button>
          </div>

          {/* Actual Hidden/Visible Canvas conforming strictly to 1200x630 */}
          <div className="relative w-full overflow-hidden border border-slate-800/80 rounded-xl bg-slate-950 shadow-2xl">
            <canvas
              ref={canvasRef}
              className="w-full h-auto aspect-[1200/630] block object-contain"
            />
          </div>
        </div>

        {/* Action controls under Preview */}
        <div className="w-full flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold py-3.5 px-8 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/25 active:scale-98 cursor-pointer"
          >
            <Download className="w-4.5 h-4.5" />
            Download Marketing Graphic (High Resolution)
          </button>
        </div>

        {/* Tip section */}
        <div className="w-full bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">How to use:</strong> This dynamic, high-resolution premium graphic is pre-designed as your default promotional banner. Use it as an overlay, upload it as a background, or embed it as a high-converting thumbnail on Instagram, TikTok, or YouTube Shorts today!
          </p>
        </div>
      </div>
    </div>
  );
}
