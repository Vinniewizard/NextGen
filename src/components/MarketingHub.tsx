import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Megaphone, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Sliders, 
  Layers, 
  CheckCircle, 
  ArrowUpRight, 
  DollarSign, 
  Users, 
  Send, 
  RefreshCw, 
  Eye, 
  Flame, 
  Clock, 
  ExternalLink, 
  FileText, 
  Shield, 
  Smartphone, 
  Twitter, 
  MessageSquare, 
  Camera, 
  Maximize2, 
  Zap, 
  Target, 
  BarChart2, 
  Plus, 
  Trash2,
  X
} from 'lucide-react';

interface MarketingHubProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
  triggerToast?: (text: string, success: boolean) => void;
  referralCode?: string;
}

export type AspectRatio = '1:1' | '9:16' | '16:9';
export type PosterTheme = 'emerald' | 'cyan' | 'gold' | 'ruby' | 'amethyst';
export type ChartType = 'candles' | 'line' | 'volatility';

interface PosterConfig {
  aspectRatio: AspectRatio;
  theme: PosterTheme;
  chartType: ChartType;
  badge: string;
  headline: string;
  subheadline: string;
  bullets: [string, string, string];
  statValue: string;
  statLabel: string;
  promoCode: string;
  ctaText: string;
  showWatermark: boolean;
}

interface SocialPost {
  id: string;
  channel: 'twitter' | 'telegram' | 'whatsapp' | 'facebook' | 'tiktok';
  title: string;
  content: string;
  tags: string[];
  scheduledTime?: string;
  status: 'published' | 'scheduled' | 'draft';
  created_at: string;
}

const DEFAULT_POSTER: PosterConfig = {
  aspectRatio: '1:1',
  theme: 'emerald',
  chartType: 'candles',
  badge: '24/7 SYNTHETICS & OPTIONS',
  headline: 'TRADE SYNTHETICS WITH ZERO SPREAD',
  subheadline: 'High-speed synthetic indices with lightning execution and 1-second ticks.',
  bullets: [
    'Up to 95% payout in 60-second contracts',
    'Instant deposits via M-Pesa & Crypto',
    'Free $10,000 demo account included'
  ],
  statValue: '+95%',
  statLabel: 'MAX RETURN',
  promoCode: 'KNEXVIP',
  ctaText: 'START TRADING NOW ->',
  showWatermark: true,
};

const POSTER_PRESETS: { name: string; desc: string; config: Partial<PosterConfig> }[] = [
  {
    name: '24/7 Synthetics',
    desc: 'Focus on around-the-clock weekend volatility trading',
    config: {
      theme: 'emerald',
      chartType: 'candles',
      badge: 'WEEKEND MARKETS ACTIVE',
      headline: 'TRADE VOLATILITY 24/7 WITHOUT LIMITS',
      subheadline: 'Synthetic index ticks continue non-stop even when forex & stocks are closed.',
      bullets: [
        'Pure simulated liquidity, 0% market freeze',
        'Instant settlement in 1 to 60 ticks',
        'Smooth mobile-first execution'
      ],
      statValue: '24/7',
      statLabel: 'ALWAYS OPEN',
      promoCode: 'WEEKEND95',
      ctaText: 'EXPLORE MARKETS ->'
    }
  },
  {
    name: 'Turn $10 to $85',
    desc: 'High-converting viral proof and compounding angle',
    config: {
      theme: 'gold',
      chartType: 'line',
      badge: 'HIGH CONVERSION STRATEGY',
      headline: 'TURN $10 INTO $85 IN 60 SECONDS',
      subheadline: 'Master binary price velocity with our clear interactive trend indicator.',
      bullets: [
        'Predict Higher or Lower in 1 click',
        'Transparent mathematical contracts',
        'Immediate payout directly to your wallet'
      ],
      statValue: '85%',
      statLabel: 'AVERAGE PAYOUT',
      promoCode: 'PROFIT10',
      ctaText: 'TRY $10,000 DEMO ->'
    }
  },
  {
    name: 'Welcome Bonus 200%',
    desc: 'Deposit incentive & margin multiplier campaign',
    config: {
      theme: 'cyan',
      chartType: 'volatility',
      badge: 'SPECIAL WELCOME PROMO',
      headline: 'GET 200% MATCH ON YOUR FIRST DEPOSIT',
      subheadline: 'Fund your trading account today and unlock a massive margin multiplier.',
      bullets: [
        'Deposit from just $5 via Local Pay or Crypto',
        'Zero commission on all binary options',
        'VIP signals and automated walkthrough'
      ],
      statValue: '200%',
      statLabel: 'FIRST DEPOSIT MATCH',
      promoCode: 'BONUS200',
      ctaText: 'CLAIM BONUS TODAY ->'
    }
  },
  {
    name: 'Safe P2P Escrow',
    desc: 'Trust and local currency payment focus',
    config: {
      theme: 'amethyst',
      chartType: 'candles',
      badge: 'ESCROW PROTECTED',
      headline: 'INSTANT CASH IN & OUT WITH LOCAL P2P',
      subheadline: 'Deposit and withdraw instantly with verified local merchants and zero fees.',
      bullets: [
        'Locked in escrow until transaction verified',
        'Supported across M-Pesa, Bank, and Crypto',
        '100% dispute protection guarantee'
      ],
      statValue: '0%',
      statLabel: 'P2P FEES',
      promoCode: 'P2PFAST',
      ctaText: 'JOIN P2P MARKET ->'
    }
  },
  {
    name: 'High Adrenaline Volatility',
    desc: 'Extreme speed for aggressive traders',
    config: {
      theme: 'ruby',
      chartType: 'volatility',
      badge: 'HIGH VOLATILITY ALERT',
      headline: 'RIDE THE SYNTHETIC BREAKOUT WAVES',
      subheadline: 'Lightning fast 1-second price actions with real-time technical indicators.',
      bullets: [
        'RSI & Moving Average indicators built-in',
        'Multi-column trade execution',
        'No broker slippage or requotes'
      ],
      statValue: '1-SEC',
      statLabel: 'TICK RESOLUTION',
      promoCode: 'FLASH99',
      ctaText: 'TRADE BREAKOUT ->'
    }
  }
];

export default function MarketingHub({
  isOpen,
  onClose,
  theme = 'dark',
  triggerToast = () => {},
  referralCode = 'KNEXVIP'
}: MarketingHubProps) {
  const [activeTab, setActiveTab] = useState<'posters' | 'posting' | 'strategies' | 'queue'>('posters');
  
  // Poster State
  const [posterConfig, setPosterConfig] = useState<PosterConfig>(DEFAULT_POSTER);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedPoster, setCopiedPoster] = useState(false);
  const [isRenderingAll, setIsRenderingAll] = useState(false);

  // Posting Composer State
  const [composerChannel, setComposerChannel] = useState<'twitter' | 'telegram' | 'whatsapp' | 'facebook' | 'tiktok'>('twitter');
  const [composerTitle, setComposerTitle] = useState('Weekend Trading is Live on Knex');
  const [composerContent, setComposerContent] = useState(
    `Why wait until Monday when markets move 24/7? ⚡\n\nTrade high-speed synthetic indices with up to 95% payouts in 60 seconds on Knex Exchange.\n\n✨ Instant M-Pesa & Crypto deposits\n🎁 200% First Deposit Match: Code {REF_CODE}\n🚀 Free $10,000 Demo Account\n\nTrade now: {PLATFORM_URL}\n\n#Trading #BinaryOptions #Crypto #Forex #PassiveIncome`
  );
  const [composerTags, setComposerTags] = useState('Trading, BinaryOptions, Crypto, Forex, Mpesa');
  const [composerCopied, setComposerCopied] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Content Queue State
  const [postsQueue, setPostsQueue] = useState<SocialPost[]>([
    {
      id: 'post-1',
      channel: 'twitter',
      title: 'Weekend 24/7 Synthetics Launch',
      content: 'Trade synthetic indices 24/7 with zero spread. Instant crypto deposits & up to 95% payouts! https://knex.onrender.com/ #Trading',
      tags: ['Trading', 'Synthetics', 'Crypto'],
      status: 'published',
      created_at: '2026-10-09 10:00'
    },
    {
      id: 'post-2',
      channel: 'telegram',
      title: 'VIP Signal Alert & Promo Voucher',
      content: '📢 VIP ALERT: MFLOW index RSI oversold at 22. High probability CALL contract trigger. Use code VIPBONUS for +30% margin balance!',
      tags: ['Signals', 'VIP', 'MFLOW'],
      status: 'published',
      created_at: '2026-10-09 12:30'
    },
    {
      id: 'post-3',
      channel: 'whatsapp',
      title: 'M-Pesa Deposit Announcement',
      content: 'Hey traders! M-Pesa deposits and withdrawals are fully instant now on Knex. Start with just $5 and get a 200% match bonus!',
      tags: ['Mpesa', 'Deposit', 'Bonus'],
      status: 'scheduled',
      scheduledTime: 'Tomorrow at 09:00 AM',
      created_at: '2026-10-09 14:00'
    },
    {
      id: 'post-4',
      channel: 'tiktok',
      title: 'Viral Hook: $10 to $85 in 60s Demo',
      content: 'Hook: "If your trading platform freezes on weekends, you are losing money..." -> Show Knex 60s binary win -> CTA in bio.',
      tags: ['TikTok', 'Viral', 'Options'],
      status: 'draft',
      created_at: '2026-10-09 15:15'
    }
  ]);

  // Strategy Calculator State
  const [calcBudget, setCalcBudget] = useState(250); // $250
  const [calcCpc, setCalcCpc] = useState(0.20); // $0.20 per click
  const [calcLandingConv, setCalcLandingConv] = useState(18); // 18% signup
  const [calcDepositConv, setCalcDepositConv] = useState(25); // 25% FTD
  const [calcAvgFtd, setCalcAvgFtd] = useState(35); // $35 avg deposit
  const [calcLtvMultiplier, setCalcLtvMultiplier] = useState(2.8); // 2.8x LTV

  // Color mapping
  const themeColors = useMemo(() => {
    switch (posterConfig.theme) {
      case 'emerald':
        return {
          primary: '#10b981',
          primaryLight: '#34d399',
          glow: 'rgba(16, 185, 129, 0.35)',
          bgGradient: ['#041a14', '#060f0d', '#020504'],
          chartUp: '#10b981',
          chartDown: '#ef4444',
          accent: '#10b981'
        };
      case 'cyan':
        return {
          primary: '#06b6d4',
          primaryLight: '#38bdf8',
          glow: 'rgba(6, 182, 212, 0.35)',
          bgGradient: ['#041c24', '#061017', '#020407'],
          chartUp: '#06b6d4',
          chartDown: '#f43f5e',
          accent: '#38bdf8'
        };
      case 'gold':
        return {
          primary: '#f59e0b',
          primaryLight: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.35)',
          bgGradient: ['#231704', '#140e03', '#060401'],
          chartUp: '#f59e0b',
          chartDown: '#ef4444',
          accent: '#fbbf24'
        };
      case 'ruby':
        return {
          primary: '#ef4444',
          primaryLight: '#f87171',
          glow: 'rgba(239, 68, 68, 0.35)',
          bgGradient: ['#220606', '#140303', '#050101'],
          chartUp: '#ef4444',
          chartDown: '#3b82f6',
          accent: '#f87171'
        };
      case 'amethyst':
        return {
          primary: '#a855f7',
          primaryLight: '#c084fc',
          glow: 'rgba(168, 85, 247, 0.35)',
          bgGradient: ['#1c082e', '#0f041a', '#050109'],
          chartUp: '#a855f7',
          chartDown: '#ef4444',
          accent: '#c084fc'
        };
    }
  }, [posterConfig.theme]);

  // Draw Canvas
  const drawPoster = (targetCanvas?: HTMLCanvasElement, targetRatio?: AspectRatio) => {
    const canvas = targetCanvas || canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = targetRatio || posterConfig.aspectRatio;
    let width = 1080;
    let height = 1080;

    if (ratio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (ratio === '16:9') {
      width = 1200;
      height = 675;
    }

    canvas.width = width;
    canvas.height = height;

    const colors = themeColors;

    // 1. Background radial gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.35, 80,
      width * 0.5, height * 0.5, width * 0.85
    );
    bgGrad.addColorStop(0, colors.bgGradient[0]);
    bgGrad.addColorStop(0.55, colors.bgGradient[1]);
    bgGrad.addColorStop(1, colors.bgGradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. High-Tech Cyber Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Ambient Glow Circles
    const ambientGlow = ctx.createRadialGradient(
      width * 0.8, height * 0.2, 10,
      width * 0.8, height * 0.2, width * 0.55
    );
    ambientGlow.addColorStop(0, colors.glow);
    ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, width, height);

    const ambientGlow2 = ctx.createRadialGradient(
      width * 0.2, height * 0.85, 10,
      width * 0.2, height * 0.85, width * 0.45
    );
    ambientGlow2.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
    ambientGlow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGlow2;
    ctx.fillRect(0, 0, width, height);

    // 4. Header Badge / Top Label
    const paddingX = width * 0.08;
    let currentY = height * 0.09;

    // Brand Logo line
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Inter", -apple-system, sans-serif';
    ctx.fillText('KNEX', paddingX, currentY);

    ctx.fillStyle = colors.primary;
    ctx.font = '700 15px "Inter", -apple-system, sans-serif';
    ctx.fillText('EXCHANGE', paddingX + 75, currentY - 2);

    // Category Badge
    const badgeText = posterConfig.badge.toUpperCase();
    ctx.font = '800 13px "Inter", -apple-system, sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 24;
    const badgeHeight = 28;
    const badgeX = width - paddingX - badgeWidth;
    const badgeY = currentY - 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
    ctx.fill();
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = colors.primary;
    ctx.fillText(badgeText, badgeX + 12, badgeY + 18);

    // 5. Main Punchy Headline
    currentY += height > 1200 ? 90 : 75;
    ctx.fillStyle = '#ffffff';
    const headlineFontSize = height > 1200 ? 56 : ratio === '16:9' ? 44 : 50;
    ctx.font = `900 ${headlineFontSize}px "Inter", -apple-system, sans-serif`;

    // Wrap headline text nicely
    const words = posterConfig.headline.toUpperCase().split(' ');
    let line = '';
    const maxTextWidth = width * 0.84;
    const lineHeight = headlineFontSize * 1.15;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(line.trim(), paddingX, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), paddingX, currentY);

    // 6. Subheadline
    currentY += 28;
    ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.font = '500 20px "Inter", -apple-system, sans-serif';
    
    // Wrap subheadline
    const subWords = posterConfig.subheadline.split(' ');
    let subLine = '';
    const subLineHeight = 28;
    for (let n = 0; n < subWords.length; n++) {
      const testLine = subLine + subWords[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(subLine.trim(), paddingX, currentY);
        subLine = subWords[n] + ' ';
        currentY += subLineHeight;
      } else {
        subLine = testLine;
      }
    }
    ctx.fillText(subLine.trim(), paddingX, currentY);

    // 7. Visual Dynamic Chart Box
    currentY += 35;
    const chartBoxWidth = width * 0.84;
    const chartBoxHeight = ratio === '9:16' ? 360 : ratio === '16:9' ? 180 : 250;
    const chartBoxX = paddingX;
    const chartBoxY = currentY;

    // Glass panel for chart
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.roundRect(chartBoxX, chartBoxY, chartBoxWidth, chartBoxHeight, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Chart header info inside card
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '700 13px "Inter", monospace';
    ctx.fillText('MFLOW / SYNTHETIC TICK 100', chartBoxX + 20, chartBoxY + 30);

    ctx.fillStyle = colors.primary;
    ctx.font = '900 18px "Inter", monospace';
    ctx.fillText('+89.42%', chartBoxX + chartBoxWidth - 110, chartBoxY + 30);

    // Render Chart Types
    const innerChartY = chartBoxY + 50;
    const innerChartH = chartBoxHeight - 65;
    const innerChartW = chartBoxWidth - 40;
    const innerChartX = chartBoxX + 20;

    if (posterConfig.chartType === 'candles') {
      // Draw Candlesticks
      const candleCount = 16;
      const step = innerChartW / candleCount;
      const basePrices = [40, 48, 44, 55, 52, 65, 60, 72, 68, 85, 78, 92, 88, 105, 98, 115];
      const maxPrice = 125;
      const minPrice = 30;

      for (let i = 0; i < candleCount; i++) {
        const x = innerChartX + i * step + step * 0.25;
        const open = basePrices[i];
        const close = open + (i % 3 === 0 ? -6 : 10) + (Math.sin(i) * 5);
        const high = Math.max(open, close) + 5 + (i % 2 === 0 ? 4 : 2);
        const low = Math.min(open, close) - 5 - (i % 3 === 0 ? 3 : 1);
        const isBull = close >= open;

        const normH = (p: number) => innerChartY + innerChartH - ((p - minPrice) / (maxPrice - minPrice)) * innerChartH;

        ctx.strokeStyle = isBull ? colors.chartUp : colors.chartDown;
        ctx.fillStyle = isBull ? colors.chartUp : colors.chartDown;
        ctx.lineWidth = 1.5;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x + step * 0.25, normH(low));
        ctx.lineTo(x + step * 0.25, normH(high));
        ctx.stroke();

        // Body
        const topY = normH(Math.max(open, close));
        const bottomY = normH(Math.min(open, close));
        const bodyH = Math.max(bottomY - topY, 4);
        ctx.fillRect(x, topY, step * 0.5, bodyH);
      }
    } else {
      // Area Line Chart / Volatility
      ctx.beginPath();
      const points = [
        0.1, 0.2, 0.18, 0.35, 0.3, 0.48, 0.42, 0.65, 0.58, 0.72, 0.68, 0.88, 0.82, 0.95
      ];
      const step = innerChartW / (points.length - 1);

      ctx.moveTo(innerChartX, innerChartY + innerChartH - points[0] * innerChartH);
      for (let i = 1; i < points.length; i++) {
        const px = innerChartX + i * step;
        const py = innerChartY + innerChartH - points[i] * innerChartH;
        ctx.lineTo(px, py);
      }

      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Area gradient
      ctx.lineTo(innerChartX + innerChartW, innerChartY + innerChartH);
      ctx.lineTo(innerChartX, innerChartY + innerChartH);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, innerChartY, 0, innerChartY + innerChartH);
      areaGrad.addColorStop(0, colors.glow);
      areaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = areaGrad;
      ctx.fill();
    }

    currentY = chartBoxY + chartBoxHeight + 35;

    // 8. Key Bullet Points
    const bulletFontSize = 18;
    ctx.font = `600 ${bulletFontSize}px "Inter", -apple-system, sans-serif`;
    posterConfig.bullets.forEach((bullet) => {
      // Checkmark icon
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(paddingX + 10, currentY - 5, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✓', paddingX + 6, currentY - 1);

      // Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = `600 ${bulletFontSize}px "Inter", -apple-system, sans-serif`;
      ctx.fillText(bullet, paddingX + 28, currentY);

      currentY += 34;
    });

    // 9. Stat Badge + Promo Sticker Row
    currentY += 15;
    const stickerWidth = (width * 0.84 - 20) / 2;
    const stickerH = 75;

    // Stat Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, stickerWidth, stickerH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.fillStyle = colors.primary;
    ctx.font = '900 28px "Inter", monospace';
    ctx.fillText(posterConfig.statValue, paddingX + 16, currentY + 36);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText(posterConfig.statLabel, paddingX + 16, currentY + 58);

    // Promo Code Sticker
    const promoX = paddingX + stickerWidth + 20;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.beginPath();
    ctx.roundRect(promoX, currentY, stickerWidth, stickerH, 12);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 11px "Inter", sans-serif';
    ctx.fillText('PROMO CODE', promoX + 16, currentY + 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Inter", monospace';
    ctx.fillText(posterConfig.promoCode, promoX + 16, currentY + 58);

    // 10. Call To Action Button
    currentY += stickerH + 30;
    const ctaW = width * 0.84;
    const ctaH = 65;

    const ctaGrad = ctx.createLinearGradient(paddingX, currentY, paddingX + ctaW, currentY);
    ctaGrad.addColorStop(0, colors.primary);
    ctaGrad.addColorStop(1, colors.primaryLight);
    ctx.fillStyle = ctaGrad;

    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, ctaW, ctaH, 14);
    ctx.fill();

    ctx.fillStyle = '#050a0f';
    ctx.font = '900 20px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(posterConfig.ctaText, paddingX + ctaW / 2, currentY + 40);
    ctx.textAlign = 'left';

    // 11. Bottom Watermark & Disclaimer
    if (posterConfig.showWatermark) {
      const bottomY = height - (height * 0.04);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '500 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KNEX.ONRENDER.COM · RISK WARNING: DERIVATIVES INVOLVE RISK', width / 2, bottomY);
      ctx.textAlign = 'left';
    }
  };

  // Re-draw whenever poster config or colors change
  useEffect(() => {
    drawPoster();
  }, [posterConfig, themeColors]);

  // Export functions
  const handleDownloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `knex-poster-${posterConfig.aspectRatio.replace(':', 'x')}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    triggerToast('High-resolution poster downloaded successfully!', true);
  };

  const handleCopyPosterImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopiedPoster(true);
          setTimeout(() => setCopiedPoster(false), 2500);
          triggerToast('Poster image copied to clipboard!', true);
        } catch {
          // Fallback
          handleDownloadPoster();
        }
      });
    } catch {
      handleDownloadPoster();
    }
  };

  const handleDownloadAllSizes = () => {
    setIsRenderingAll(true);
    triggerToast('Generating poster pack (Square, Story, and Banner)...', true);
    
    const ratios: AspectRatio[] = ['1:1', '9:16', '16:9'];
    ratios.forEach((ratio, index) => {
      setTimeout(() => {
        const offscreenCanvas = document.createElement('canvas');
        drawPoster(offscreenCanvas, ratio);
        const link = document.createElement('a');
        link.download = `knex-poster-${ratio.replace(':', 'x')}-${Date.now()}.png`;
        link.href = offscreenCanvas.toDataURL('image/png');
        link.click();
      }, index * 400);
    });

    setTimeout(() => {
      setIsRenderingAll(false);
      triggerToast('All 3 poster formats downloaded!', true);
    }, 1500);
  };

  const handleSendToComposer = () => {
    const generatedCopy = `🚀 ${posterConfig.headline} 🚀\n\n${posterConfig.subheadline}\n\nKey Highlights:\n✓ ${posterConfig.bullets[0]}\n✓ ${posterConfig.bullets[1]}\n✓ ${posterConfig.bullets[2]}\n\n🎁 Use Promo Code: ${posterConfig.promoCode} for ${posterConfig.statValue} ${posterConfig.statLabel}!\n\n👉 Trade Now: https://knex.onrender.com/?ref=${referralCode}\n\n#Trading #BinaryOptions #SyntheticIndices #Crypto`;
    setComposerTitle(posterConfig.headline);
    setComposerContent(generatedCopy);
    setActiveTab('posting');
    triggerToast('Poster campaign copy loaded into Posting Composer!', true);
  };

  // Composer Actions
  const getProcessedContent = () => {
    return composerContent
      .replace(/{PLATFORM_NAME}/g, 'Knex Exchange')
      .replace(/{PLATFORM_URL}/g, 'https://knex.onrender.com/')
      .replace(/{REF_CODE}/g, referralCode)
      .replace(/{BONUS_PERCENT}/g, '200%')
      .replace(/{MIN_DEPOSIT}/g, '$5');
  };

  const handlePostToTwitter = () => {
    const text = encodeURIComponent(getProcessedContent());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    recordQueuePost('twitter', composerTitle, getProcessedContent());
  };

  const handlePostToWhatsApp = () => {
    const text = encodeURIComponent(getProcessedContent());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    recordQueuePost('whatsapp', composerTitle, getProcessedContent());
  };

  const handlePostToTelegramWeb = () => {
    const text = encodeURIComponent(getProcessedContent());
    const url = encodeURIComponent('https://knex.onrender.com/');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    recordQueuePost('telegram', composerTitle, getProcessedContent());
  };

  const handleBroadcastTelegramBot = async () => {
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: getProcessedContent(),
          type: 'campaign'
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Broadcast dispatched through Telegram Bot & channel!', true);
        recordQueuePost('telegram', composerTitle, getProcessedContent());
      } else {
        triggerToast(data.message || 'Broadcast submitted to queue.', true);
      }
    } catch {
      triggerToast('Telegram broadcast dispatched to background queue.', true);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopyComposerText = () => {
    navigator.clipboard.writeText(getProcessedContent());
    setComposerCopied(true);
    setTimeout(() => setComposerCopied(false), 2000);
    triggerToast('Post caption copied to clipboard!', true);
  };

  const recordQueuePost = (channel: any, title: string, content: string) => {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      channel,
      title,
      content,
      tags: composerTags.split(',').map(t => t.trim()),
      status: 'published',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setPostsQueue(prev => [newPost, ...prev]);
  };

  const handleSchedulePost = () => {
    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      channel: composerChannel,
      title: composerTitle,
      content: getProcessedContent(),
      tags: composerTags.split(',').map(t => t.trim()),
      status: 'scheduled',
      scheduledTime: 'In 3 hours (Automated)',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setPostsQueue(prev => [newPost, ...prev]);
    triggerToast(`Post scheduled for ${composerChannel.toUpperCase()} broadcast queue!`, true);
  };

  // Calculator projections
  const calcClicks = Math.round(calcBudget / calcCpc);
  const calcSignups = Math.round(calcClicks * (calcLandingConv / 100));
  const calcFtds = Math.round(calcSignups * (calcDepositConv / 100));
  const calcGrossRevenue = Math.round(calcFtds * calcAvgFtd * calcLtvMultiplier);
  const calcNetProfit = Math.round(calcGrossRevenue - calcBudget);
  const calcRoi = calcBudget > 0 ? Math.round((calcNetProfit / calcBudget) * 100) : 0;
  const calcCac = calcFtds > 0 ? (calcBudget / calcFtds).toFixed(2) : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full h-full flex flex-col shadow-2xl transition-all overflow-hidden ${
        theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}>
        
        {/* Top Header Navigation */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  KNEX Marketing & Creative Engine
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Growth Hub Active
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Craft viral promotional posters, execute multi-channel posting, and deploy battle-tested marketing strategies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className={`flex items-center space-x-1 border-b px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar shrink-0 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-100'
        }`}>
          {[
            { id: 'posters', label: 'Poster & Banner Studio', icon: Camera, badge: 'Canvas Engine' },
            { id: 'posting', label: 'Multi-Channel Posting', icon: Share2, badge: '1-Click Share' },
            { id: 'strategies', label: 'Marketing Strategies & ROI', icon: Target, badge: 'Playbooks' },
            { id: 'queue', label: 'Posting Queue & Calendar', icon: Calendar, count: postsQueue.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* TAB 1: POSTER STUDIO */}
          {activeTab === 'posters' && (
            <div className="space-y-6">
              
              {/* Preset Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    High-Converting Preset Campaigns
                  </span>
                  <span className="text-[10px] text-slate-500">Click to apply instant styles</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {POSTER_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPosterConfig(prev => ({ ...prev, ...preset.config }))}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900' 
                          : 'bg-white border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <span className="text-xs font-black text-amber-400 block truncate">{preset.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Workspace: Controls + Live Canvas Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Controls Column (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Format & Dimensions Selector */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      1. Poster Format & Aspect Ratio
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: '1:1', label: 'Square (1:1)', sub: 'Instagram / Feed' },
                        { id: '9:16', label: 'Story (9:16)', sub: 'TikTok / Shorts' },
                        { id: '16:9', label: 'Banner (16:9)', sub: 'Twitter / Web' }
                      ].map(ratio => (
                        <button
                          key={ratio.id}
                          onClick={() => setPosterConfig(prev => ({ ...prev, aspectRatio: ratio.id as AspectRatio }))}
                          className={`p-2 rounded-lg text-center border transition cursor-pointer ${
                            posterConfig.aspectRatio === ratio.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                              : 'bg-slate-800/40 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-xs font-black block">{ratio.label}</span>
                          <span className="text-[9px] opacity-75 block">{ratio.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Theme & Palette */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      2. Color Theme & Chart Visualizer
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                      {[
                        { id: 'emerald', label: 'Emerald', hex: '#10b981' },
                        { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
                        { id: 'gold', label: 'Gold', hex: '#f59e0b' },
                        { id: 'ruby', label: 'Ruby', hex: '#ef4444' },
                        { id: 'amethyst', label: 'Amethyst', hex: '#a855f7' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setPosterConfig(prev => ({ ...prev, theme: t.id as PosterTheme }))}
                          className={`py-1.5 px-1 rounded-md text-[10px] font-black uppercase text-center border transition flex flex-col items-center gap-1 cursor-pointer ${
                            posterConfig.theme === t.id ? 'ring-2 ring-white border-transparent' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: `${t.hex}22`, color: t.hex }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.hex }} />
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {[
                        { id: 'candles', label: 'Candlesticks' },
                        { id: 'line', label: 'Glowing Line' },
                        { id: 'volatility', label: 'Volatility Spike' }
                      ].map(c => (
                        <button
                          key={c.id}
                          onClick={() => setPosterConfig(prev => ({ ...prev, chartType: c.id as ChartType }))}
                          className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            posterConfig.chartType === c.id
                              ? 'bg-slate-800 text-white border-amber-500'
                              : 'bg-transparent text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Copy & Content Fields */}
                  <div className={`p-4 rounded-xl border space-y-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                      3. Poster Content & Messaging
                    </label>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category Badge</span>
                      <input
                        type="text"
                        value={posterConfig.badge}
                        onChange={e => setPosterConfig(prev => ({ ...prev, badge: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Main Headline</span>
                      <input
                        type="text"
                        value={posterConfig.headline}
                        onChange={e => setPosterConfig(prev => ({ ...prev, headline: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subheadline Description</span>
                      <textarea
                        rows={2}
                        value={posterConfig.subheadline}
                        onChange={e => setPosterConfig(prev => ({ ...prev, subheadline: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stat Value</span>
                        <input
                          type="text"
                          value={posterConfig.statValue}
                          onChange={e => setPosterConfig(prev => ({ ...prev, statValue: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Stat Label</span>
                        <input
                          type="text"
                          value={posterConfig.statLabel}
                          onChange={e => setPosterConfig(prev => ({ ...prev, statLabel: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Promo Code</span>
                        <input
                          type="text"
                          value={posterConfig.promoCode}
                          onChange={e => setPosterConfig(prev => ({ ...prev, promoCode: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CTA Button Label</span>
                        <input
                          type="text"
                          value={posterConfig.ctaText}
                          onChange={e => setPosterConfig(prev => ({ ...prev, ctaText: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Preview Column (7 cols) */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  
                  {/* Action Toolbar */}
                  <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Live Preview</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {posterConfig.aspectRatio === '1:1' ? '1080 x 1080 px' : posterConfig.aspectRatio === '9:16' ? '1080 x 1920 px' : '1200 x 675 px'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyPosterImage}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        title="Copy image to clipboard"
                      >
                        {copiedPoster ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedPoster ? 'Copied Image!' : 'Copy Image'}</span>
                      </button>

                      <button
                        onClick={handleDownloadPoster}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md flex items-center gap-1.5 cursor-pointer font-extrabold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download PNG</span>
                      </button>

                      <button
                        onClick={handleDownloadAllSizes}
                        disabled={isRenderingAll}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                        title="Download Square, Story and Banner all at once"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Download 3-Pack</span>
                      </button>
                    </div>
                  </div>

                  {/* Canvas Container with Frame */}
                  <div className="w-full flex items-center justify-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-2xl overflow-hidden min-h-[460px] max-h-[620px]">
                    <canvas
                      ref={canvasRef}
                      className="max-h-[560px] max-w-full rounded-xl shadow-2xl object-contain border border-slate-800/60"
                      style={{
                        aspectRatio: posterConfig.aspectRatio === '1:1' ? '1 / 1' : posterConfig.aspectRatio === '9:16' ? '9 / 16' : '16 / 9'
                      }}
                    />
                  </div>

                  {/* Bottom Bridge Action */}
                  <div className="w-full mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-slate-200">
                        Ready to launch this campaign? Send copy and graphics directly to the posting engine.
                      </span>
                    </div>
                    <button
                      onClick={handleSendToComposer}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      Use in Posting Composer →
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MULTI-CHANNEL POSTING COMPOSER */}
          {activeTab === 'posting' && (
            <div className="space-y-6">
              
              {/* Channel Selector Bar */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Select Target Distribution Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'text-sky-400', desc: 'Viral tweets & threads' },
                    { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-cyan-400', desc: 'Channels & group bots' },
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400', desc: 'Direct group broadcasts' },
                    { id: 'facebook', label: 'Facebook / Meta', icon: Share2, color: 'text-blue-400', desc: 'Community pages' },
                    { id: 'tiktok', label: 'TikTok / Reels', icon: Smartphone, color: 'text-rose-400', desc: 'Viral short video scripts' }
                  ].map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setComposerChannel(ch.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        composerChannel === ch.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <ch.icon className={`h-5 w-5 ${composerChannel === ch.id ? 'text-slate-950' : ch.color}`} />
                        {composerChannel === ch.id && <CheckCircle className="h-4 w-4 text-slate-950" />}
                      </div>
                      <div>
                        <span className="text-xs font-black block">{ch.label}</span>
                        <span className={`text-[10px] block opacity-80 ${composerChannel === ch.id ? 'text-slate-900' : 'text-slate-500'}`}>
                          {ch.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Composer Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Editor (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Campaign Title */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Campaign Title
                    </label>
                    <input
                      type="text"
                      value={composerTitle}
                      onChange={e => setComposerTitle(e.target.value)}
                      placeholder="e.g. Weekend Volatility Trading Announcement"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold"
                    />
                  </div>

                  {/* Message Copy Body */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Post Content & Copy
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {composerContent.length} chars {composerChannel === 'twitter' && `(${280 - composerContent.length} left)`}
                      </span>
                    </div>

                    <textarea
                      rows={9}
                      value={composerContent}
                      onChange={e => setComposerContent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-white font-mono leading-relaxed"
                    />

                    {/* Shortcodes Row */}
                    <div className="mt-2.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Insert Dynamic Shortcodes
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { code: '{PLATFORM_NAME}', label: 'Platform' },
                          { code: '{PLATFORM_URL}', label: 'Main Link' },
                          { code: '{REF_CODE}', label: `Ref Code (${referralCode})` },
                          { code: '{BONUS_PERCENT}', label: '200% Bonus' },
                          { code: '{MIN_DEPOSIT}', label: '$5 Deposit' }
                        ].map(s => (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => setComposerContent(prev => prev + ' ' + s.code)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold cursor-pointer border border-slate-700"
                          >
                            +{s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Optimized Hashtags
                    </label>
                    <input
                      type="text"
                      value={composerTags}
                      onChange={e => setComposerTags(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    {composerChannel === 'twitter' && (
                      <button
                        onClick={handlePostToTwitter}
                        className="flex-1 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Twitter className="h-4 w-4" />
                        <span>Publish to Twitter / X Now</span>
                      </button>
                    )}

                    {composerChannel === 'whatsapp' && (
                      <button
                        onClick={handlePostToWhatsApp}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Send via WhatsApp Web / App</span>
                      </button>
                    )}

                    {composerChannel === 'telegram' && (
                      <>
                        <button
                          onClick={handleBroadcastTelegramBot}
                          disabled={isBroadcasting}
                          className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <Send className="h-4 w-4" />
                          <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast to Telegram Bot'}</span>
                        </button>
                        <button
                          onClick={handlePostToTelegramWeb}
                          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Direct Share Link</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={handleCopyComposerText}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      {composerCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span>{composerCopied ? 'Copied!' : 'Copy Formatted Text'}</span>
                    </button>

                    <button
                      onClick={handleSchedulePost}
                      className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Add to Queue</span>
                    </button>
                  </div>

                </div>

                {/* Right Live Device Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Channel Appearance Preview
                    </span>
                    <span className="text-[10px] text-slate-500">How followers see it</span>
                  </div>

                  {/* Device / Social Mock Card */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 text-xs">
                        KNEX
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-white">Knex Exchange</span>
                          <span className="text-[10px] text-amber-400">✓</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">@knextrading · Just now</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <p className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {getProcessedContent()}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-[10px] text-slate-400">Link destination:</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">https://knex.onrender.com/</span>
                    </div>
                  </div>

                  {/* Quick Tips */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Social Distribution Protocol
                    </span>
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4">
                      <li>Post 2-3 times daily during peak volatility sessions (London & New York market opens).</li>
                      <li>Always pair with a generated visual poster for 3.4x higher click-through rates.</li>
                      <li>Include your referral code or link in the first 2 lines for maximum conversions.</li>
                    </ul>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 3: MARKETING STRATEGIES & ROI PLAYBOOKS */}
          {activeTab === 'strategies' && (
            <div className="space-y-8">
              
              {/* Strategy Header */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900/40 border border-amber-500/20">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500" />
                  Growth Playbooks for Synthetic & Options Exchanges
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Proven, scalable acquisition funnels designed specifically to generate daily signups, first-time deposits (FTDs), and high-volume trader retention.
                </p>
              </div>

              {/* 4 Core Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pillar 1: Viral Short-Form Video */}
                <div className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-white">1. TikTok & Reels Viral Blueprint</h4>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400">Zero Ad Spend</span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Organic short videos convert highest when following the <strong>3-Second Hook Rule</strong> followed by instant live proof.
                  </p>

                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">Tested Viral Hook #1</span>
                      <p className="text-xs text-slate-200 font-semibold mt-1">
                        "If your trading broker freezes on weekends while synthetic indices are pumping... watch this."
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1 block">Visual: Show live tick chart climbing on Knex + 1-click execution.</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">Tested Viral Hook #2</span>
                      <p className="text-xs text-slate-200 font-semibold mt-1">
                        "Most people don't know you can test options trading with a free $10,000 demo before touching real money."
                      </p>
                      <span className="text-[9px] text-slate-500 mt-1 block">Visual: Show the interactive tour and demo balance switch in header.</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Execution Framework</span>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                      <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span className="block text-rose-400 font-bold">0-3s</span>
                        <span className="text-slate-400 text-[8px]">Pattern Interruption</span>
                      </div>
                      <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span className="block text-amber-400 font-bold">4-10s</span>
                        <span className="text-slate-400 text-[8px]">60s Trade Demo</span>
                      </div>
                      <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span className="block text-emerald-400 font-bold">11-18s</span>
                        <span className="text-slate-400 text-[8px]">Instant Cashout</span>
                      </div>
                      <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                        <span className="block text-cyan-400 font-bold">19-24s</span>
                        <span className="text-slate-400 text-[8px]">Bio Link CTA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 2: High-Paying Affiliate Model */}
                <div className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-white">2. Multi-Tier Affiliate Engine</h4>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">50% RevShare</span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Recruit community leaders, signal providers, and local money agents by offering 50% lifetime revenue sharing on trading volume.
                  </p>

                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Influencer Outreach DM Script</span>
                      <p className="text-xs text-slate-300 font-mono mt-1">
                        "Hey [Name], loved your analysis on crypto synthetics. We run Knex Exchange and offer 50% recurring volume rebates + custom bonus codes for your community. We can preload your account with VIP tier access. Let me know if you want the link!"
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Commission Structure</span>
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-slate-300">Level 1 Direct Referrals:</span>
                        <span className="font-bold text-amber-400 font-mono">40% Revenue Share</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-0.5">
                        <span className="text-slate-300">Level 2 Sub-Affiliates:</span>
                        <span className="font-bold text-amber-400 font-mono">10% Override</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pillar 3: Telegram Signal VIP Machine */}
                <div className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Send className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-white">3. Telegram & WhatsApp VIP Signal Hub</h4>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400">Daily Retention</span>
                  </div>

                  <p className="text-xs text-slate-400">
                    A vibrant signals channel keeps traders returning every single day to execute contracts and fund their wallets.
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider block">24-Hour Broadcast Routine</span>
                    <div className="text-xs text-slate-300 space-y-1 font-mono">
                      <div><strong className="text-white">08:00 AM:</strong> Market Bias & Day Volatility Outlook</div>
                      <div><strong className="text-white">11:30 AM:</strong> Signal #1 (Asset, Expiry, Direction, Target)</div>
                      <div><strong className="text-white">02:45 PM:</strong> Winning Contract Screenshot & PnL Proof</div>
                      <div><strong className="text-white">07:00 PM:</strong> Educational Tip + First Deposit Match Reminder</div>
                    </div>
                  </div>
                </div>

                {/* Pillar 4: Paid Crypto & Native Ads */}
                <div className={`p-5 rounded-2xl border space-y-3 ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <BarChart2 className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-black uppercase text-white">4. Paid Crypto Ad Networks</h4>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">High Scale</span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Target high-intent crypto and forex traders on networks that allow options and trading offers without restrictive bans.
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Top Recommended Platforms</span>
                    <div className="text-xs text-slate-300 space-y-1">
                      <div>• <strong>Coinzilla & CoinTraffic:</strong> Header banners (728x90) on CoinMarketCap alternatives.</div>
                      <div>• <strong>PropellerAds / RichAds:</strong> Push notification campaigns with "New Signal" hooks.</div>
                      <div>• <strong>Emerging Markets:</strong> Target regions with high mobile money adoption for lowest CAC ($3-$8 per FTD).</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Interactive Campaign Growth & ROI Calculator */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-amber-500" />
                      Interactive Campaign ROI & Acquisition Simulator
                    </h4>
                    <p className="text-xs text-slate-400">
                      Simulate marketing ad spend, conversion rates, and projected revenue return.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Live Calculation Model
                  </span>
                </div>

                {/* Slider Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Budget */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Marketing Budget:</span>
                      <span className="text-white font-mono">${calcBudget}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="5000"
                      step="50"
                      value={calcBudget}
                      onChange={e => setCalcBudget(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Total monthly ad or promo budget</span>
                  </div>

                  {/* CPC */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Cost Per Click (CPC):</span>
                      <span className="text-white font-mono">${calcCpc.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.50"
                      step="0.05"
                      value={calcCpc}
                      onChange={e => setCalcCpc(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Average price per visitor</span>
                  </div>

                  {/* Landing Conversion */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Signup Rate:</span>
                      <span className="text-white font-mono">{calcLandingConv}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="1"
                      value={calcLandingConv}
                      onChange={e => setCalcLandingConv(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Visitors registering an account</span>
                  </div>

                  {/* Deposit Conversion */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Deposit Rate (FTD):</span>
                      <span className="text-white font-mono">{calcDepositConv}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={calcDepositConv}
                      onChange={e => setCalcDepositConv(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Registered users who deposit</span>
                  </div>

                  {/* Avg FTD */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Average First Deposit:</span>
                      <span className="text-white font-mono">${calcAvgFtd}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={calcAvgFtd}
                      onChange={e => setCalcAvgFtd(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Average initial funding amount</span>
                  </div>

                  {/* LTV Multiplier */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400">Lifetime Value Multiplier:</span>
                      <span className="text-white font-mono">{calcLtvMultiplier}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={calcLtvMultiplier}
                      onChange={e => setCalcLtvMultiplier(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <span className="text-[10px] text-slate-500">Repeat deposits & trading churn</span>
                  </div>

                </div>

                {/* Projected Results Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Traffic</span>
                    <span className="text-lg font-black text-white font-mono mt-0.5 block">{calcClicks.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500">Clicks</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Signups</span>
                    <span className="text-lg font-black text-white font-mono mt-0.5 block">{calcSignups}</span>
                    <span className="text-[9px] text-slate-500">Traders</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">Deposits</span>
                    <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">{calcFtds}</span>
                    <span className="text-[9px] text-slate-500">FTD Accounts</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">CAC</span>
                    <span className="text-lg font-black text-white font-mono mt-0.5 block">${calcCac}</span>
                    <span className="text-[9px] text-slate-500">Per Depositor</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Gross LTV</span>
                    <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">${calcGrossRevenue.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500">Total Return</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 block">Projected ROI</span>
                    <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">+{calcRoi}%</span>
                    <span className="text-[9px] text-slate-500">Net: ${calcNetProfit.toLocaleString()}</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: POSTING QUEUE & CALENDAR */}
          {activeTab === 'queue' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    Automated Broadcast Queue & Publishing History
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review and dispatch scheduled promotional messages, bot broadcasts, and affiliate updates.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('posting')}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Compose New Post</span>
                </button>
              </div>

              {/* Queue List */}
              <div className="space-y-3">
                {postsQueue.map(post => (
                  <div
                    key={post.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          post.channel === 'twitter' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                          post.channel === 'telegram' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          post.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {post.channel.toUpperCase()}
                        </span>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' :
                          post.status === 'scheduled' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {post.status}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {post.scheduledTime || post.created_at}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 font-mono">
                        {post.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(post.content);
                          triggerToast('Post content copied to clipboard!', true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                        title="Copy content"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </button>

                      {post.status !== 'published' && (
                        <button
                          onClick={() => {
                            setPostsQueue(prev => prev.map(p => p.id === post.id ? { ...p, status: 'published' } : p));
                            triggerToast('Post marked as published!', true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 cursor-pointer font-extrabold"
                        >
                          <Check className="h-3 w-3" />
                          <span>Publish Now</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setPostsQueue(prev => prev.filter(p => p.id !== post.id));
                          triggerToast('Post removed from queue.', true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
