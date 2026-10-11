import { useState, useEffect, useRef } from "react";
import { StoryboardScene, AccentColor } from "../types";
import { Play, Pause, RotateCw, Volume2, VolumeX, Sparkles, Video, Download, Check, AlertCircle } from "lucide-react";

interface VideoStoryboardPlayerProps {
  platformName: string;
  accentColor: AccentColor;
  referralLink: string;
}

export default function VideoStoryboardPlayer({ platformName, accentColor, referralLink }: VideoStoryboardPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds, from 0 to 24
  const [useVoice, setUseVoice] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSuccess, setRecordingSuccess] = useState(false);
  const [recordingSupport, setRecordingSupport] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isCurrentlySpeakingRef = useRef<number | string | null>(null);

  const MAX_DURATION = 24; // 24 seconds viral script

  const scenes: StoryboardScene[] = [
    {
      id: 1,
      timeRange: "0:00 - 0:04",
      startSec: 0,
      endSec: 4,
      actionTitle: "The Hook",
      actionDesc: "Start on the main trading screen. Clean asset picker selection clicks and dynamic interface ticks.",
      overlayText: `This new platform makes trading indices way too easy... 📈👇`,
      voiceoverText: "Stop trading on cluttered, slow platforms. Let me show you how simple trading can be.",
    },
    {
      id: 2,
      timeRange: "0:04 - 0:10",
      startSec: 4,
      endSec: 10,
      actionTitle: "The Demonstration",
      actionDesc: "Place dynamic demo trade. Highlight neon red/green projectile lines climbing rapidly.",
      overlayText: "Live Charting + Multipliers ⚡",
      voiceoverText: "With real-time interactive charts, you can analyze and execute precise trades in one click.",
    },
    {
      id: 3,
      timeRange: "0:10 - 0:16",
      startSec: 10,
      endSec: 16,
      actionTitle: "The Walkthrough",
      actionDesc: "Trigger the platform onboarding tour. Beautiful targeted circles and tooltips outline interface elements.",
      overlayText: "Guided Tour for Beginners! 🧭",
      voiceoverText: "New to this? The automated walkthrough guides you through asset selection, indices, and trade controls instantly.",
    },
    {
      id: 4,
      timeRange: "0:16 - 0:24",
      startSec: 16,
      endSec: 24,
      actionTitle: "The Call to Action",
      actionDesc: "Navigate to secure M-Pesa & Crypto deposit module, showcasing low $1 threshold and VIP Gold membership tiers.",
      overlayText: "Start now via the link in bio! 📲",
      voiceoverText: "Whether you are a professional or just starting out, secure your spot today. The link is in our bio, let's win!",
    }
  ];

  // Get current active scene
  const activeScene = scenes.find(s => currentTime >= (s.startSec ?? 0) && currentTime < (s.endSec ?? 999)) || scenes[scenes.length - 1];

  // Get styling colors
  const getColorHex = (color: AccentColor): string => {
    switch (color) {
      case AccentColor.EMERALD: return "#10B981";
      case AccentColor.RUBY: return "#EF4444";
      case AccentColor.CYAN: return "#06B6D4";
      case AccentColor.AMETHYST: return "#A855F7";
      case AccentColor.INDIGO: return "#6366f1";
      default: return "#10B981";
    }
  };

  const getAccentClass = (color: AccentColor) => {
    switch (color) {
      case AccentColor.EMERALD: return "text-emerald-400 border-emerald-500/30 bg-emerald-500/5";
      case AccentColor.RUBY: return "text-red-400 border-red-500/30 bg-red-500/5";
      case AccentColor.CYAN: return "text-cyan-400 border-cyan-500/30 bg-cyan-500/5";
      case AccentColor.AMETHYST: return "text-purple-400 border-purple-500/30 bg-purple-500/5";
    }
  };

  // Speaks the voiceover of the scene using standard SpeechSynthesis API if enabled
  const speakVoiceover = (text: string) => {
    if (!useVoice || isRecording) return; // Speech synthesis doesn't record into the stream natively on all platforms, recording will have falling text captions instead
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Slightly faster for high-retention viral speed
      utterance.pitch = 1.0;
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Playback Loop
  useEffect(() => {
    let lastTime = performance.now();
    
    const updateTime = (now: number) => {
      if (isPlaying) {
        const elapsed = (now - lastTime) / 1000;
        setCurrentTime((prev) => {
          let next = prev + elapsed;
          if (next >= MAX_DURATION) {
            next = 0;
            if (isRecording) {
              stopRecordingSequence();
            }
          }
          return next;
        });
      }
      lastTime = now;
      requestRef.current = requestAnimationFrame(updateTime);
    };

    requestRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isRecording]);

  // Handle Scene Transitions for TTS Speaking
  useEffect(() => {
    if (isPlaying) {
      const currentSceneId = activeScene.id;
      if (isCurrentlySpeakingRef.current !== currentSceneId) {
        isCurrentlySpeakingRef.current = currentSceneId;
        speakVoiceover(activeScene.voiceoverText || "");
      }
    } else {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      isCurrentlySpeakingRef.current = null;
    }
  }, [activeScene, isPlaying, useVoice]);

  // Main Canvas Scene Rendering loop
  const accentHex = getColorHex(accentColor);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed aspect ratio video: 540 x 960 (standard HD vertical)
    const W = 540;
    const H = 960;
    canvas.width = W;
    canvas.height = H;

    // Helper to draw phone interface frame status bar
    const drawStatusBar = () => {
      ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("KnexNet 5G", 30, 42);
      ctx.fillText("09:15 UTC", W / 2 - 28, 42);

      // Battery icon
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.strokeRect(W - 65, 30, 35, 14);
      ctx.fillStyle = "#10B981";
      ctx.fillRect(W - 63, 32, 28, 10);
    };

    // Helper to draw TikTok feed interaction icons right sidebar
    const drawSocialIcons = () => {
      const items = [
        { char: "❤️", count: "142.9K", y: H / 2 - 40 },
        { char: "💬", count: "3,829", y: H / 2 + 30 },
        { char: "⭐", count: "95.1K", y: H / 2 + 100 },
        { char: "↪️", count: "48.2K", y: H / 2 + 170 },
      ];

      items.forEach((item) => {
        // Circle background
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(W - 40, item.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.char, W - 40, item.y + 6);

        ctx.fillStyle = "#f3f4f6";
        ctx.font = "semibold 11px system-ui, sans-serif";
        ctx.fillText(item.count, W - 40, item.y + 32);
      });
      ctx.textAlign = "left"; // reset
    };

    // Scene 1 render: "The Hook" (0:00 - 0:04)
    const renderScene1 = (t: number) => {
      // Background and Trading Desk Grid
      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, W, H);

      // Grid mesh
      ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Title/Logo center top
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.fillText(platformName.toUpperCase(), 35, 100);

      ctx.fillStyle = accentHex;
      ctx.font = "bold 11px 'JetBrains Mono', Courier, monospace";
      ctx.fillText("🎯 SYNTHETIC INDICES PORTAL", 35, 122);

      // Interactive Asset selector mockup inside scene
      ctx.fillStyle = "rgba(14, 21, 38, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect?.(35, 145, W - 110, 52, 10);
      ctx.fill();
      ctx.stroke();

      // Asset Symbol Details
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.fillText("Volatility 75 Index (Synthetic)", 55, 175);

      ctx.fillStyle = "#10B981";
      ctx.font = "bold 13px 'JetBrains Mono', Courier, monospace";
      // Tick pricing moving
      const basePrice = 284920.40 + Math.sin(t * 4) * 230;
      ctx.fillText(`$${basePrice.toFixed(2)}`, W - 230, 175);

      // Downwards disclosure chevron
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(W - 105, 170);
      ctx.lineTo(W - 100, 175);
      ctx.lineTo(W - 95, 170);
      ctx.stroke();

      // Large trading chart wave
      ctx.beginPath();
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const startChartY = 220;
      const chartH = 340;
      
      const chartPoints: { x: number; y: number }[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const x = 35 + (i / steps) * (W - 110);
        const y = startChartY + chartH / 2 + Math.sin(i * 1.5 + t * 4) * 80 + Math.cos(i * 0.8) * 30;
        chartPoints.push({ x, y });
      }

      ctx.moveTo(chartPoints[0].x, chartPoints[0].y);
      for (let i = 0; i < chartPoints.length - 1; i++) {
        const xc = (chartPoints[i].x + chartPoints[i + 1].x) / 2;
        const yc = (chartPoints[i].y + chartPoints[i + 1].y) / 2;
        ctx.quadraticCurveTo(chartPoints[i].x, chartPoints[i].y, xc, yc);
      }
      ctx.stroke();

      // Animated glowing point cursor moving along the line representing direct clicks
      const cursorIndex = Math.floor((t * 3.5) % chartPoints.length);
      const cursorPt = chartPoints[cursorIndex];
      if (cursorPt) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = accentHex;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cursorPt.x, cursorPt.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cursorPt.x, cursorPt.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // Voiceover Soundwave indicator pulsing on screen
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
      ctx.fillRect(35, 600, W - 110, 48);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
      ctx.strokeRect(35, 600, W - 110, 48);

      ctx.save();
      ctx.fillStyle = "#10B981";
      for (let i = 0; i < 28; i++) {
        const barH = 5 + Math.abs(Math.sin(i * 0.3 + t * 10)) * 26;
        ctx.fillRect(52 + i * 14, 624 - barH / 2, 4, barH);
      }
      ctx.restore();

      // Mock user hand clicking the index selector to choose currency
      // Animate hand entry from bottom right to top left
      const handProg = Math.max(0, Math.min(1, (t % 4) / 1.8)); // loops hand animation
      const handX = W - (1.1 - handProg) * 230 - 80;
      const handY = 320 - (1.1 - handProg) * 120 + 20;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.shadowBlur = 5;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(handX, handY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentHex;
      ctx.fillText("🖱️ WALKTHROUGH LINK", handX + 20, handY + 5);
      ctx.restore();
    };

    // Scene 2 render: "The Demonstration" (0:04 - 0:10)
    const renderScene2 = (t: number) => {
      // Back and chart desk
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, W, H);

      // Glow indicators
      const radial = ctx.createRadialGradient(W / 2, 350, 10, W / 2, 350, 250);
      radial.addColorStop(0, "rgba(16, 185, 129, 0.08)");
      radial.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.fillText(platformName.toUpperCase(), 35, 100);

      // Trajectory Lines
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillText("⚡ REAL-TIME MULTIPLIER MODE", 35, 122);

      // Moving chart points rising rapidly (Climbing green trend)
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      const startY = 480;
      const endY = 220;
      const runTime = t - 4; // elapsed time in this scene (0 to 6s)
      
      const ptsCount = 10;
      ctx.moveTo(35, startY);
      for (let i = 0; i <= ptsCount * (runTime / 6); i++) {
        const x = 35 + (i / ptsCount) * (W - 110);
        // Rising slope with small trigonometric oscillations
        const y = startY - (i / ptsCount) * (startY - endY) - Math.abs(Math.sin(i * 1.8)) * 25;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current projection bubble
      const curX = 35 + (runTime / 6) * (W - 110);
      const curY = startY - (runTime / 6) * (startY - endY) - Math.abs(Math.sin((ptsCount * (runTime / 6)) * 1.8)) * 25;

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#10B981";
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Callout Bubble
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.beginPath();
      ctx.roundRect?.(curX - 45, curY - 58, 90, 36, 6);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      const multFactor = 12.4 + (runTime * 85.5);
      ctx.fillText(`+${multFactor.toFixed(1)}%`, curX, curY - 36);
      ctx.restore();
      ctx.textAlign = "left"; // reset

      // Live trading ticket simulator card in viewport
      ctx.fillStyle = "rgba(14, 21, 38, 0.85)";
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect?.(35, 540, W - 110, 140, 14);
      ctx.fill();
      ctx.stroke();

      // Stake details
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.font = "semibold 12px 'Inter', sans-serif";
      ctx.fillText("ACTIVE POSITION", 55, 574);
      ctx.fillText("MULTIPLIER", W - 190, 574);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px 'Space Grotesk', sans-serif";
      ctx.fillText("$50.00 USD", 55, 604);
      ctx.fillText("x500 LEVERAGE", W - 190, 604);

      // Indicator bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(55, 622, W - 150, 32);
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 14px 'JetBrains Mono', Courier, monospace";
      ctx.fillText("📈 MULTIPLIER PROFIT RUNNING GREEN", 66, 642);
    };

    // Scene 3 render: "The Walkthrough" (0:10 - 0:16)
    const renderScene3 = (t: number) => {
      // Onboarding walk desk
      ctx.fillStyle = "#02050b";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.fillText(platformName.toUpperCase(), 35, 100);

      ctx.fillStyle = "#EAB308";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillText("🧭 ONBOARDING INTERACTIVE TUTOR", 35, 122);

      // Mock trading screen dimmed representing background behind tutorial overlays
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(35, 140, W - 110, 520);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeRect(35, 140, W - 110, 520);

      const sceneTime = t - 10; // 0 to 6 seconds

      // Beautiful animated onboarding pointer tooltip step
      let tooltipY = 240;
      let tooltipTitle = "Step 1: Choose Index";
      let tooltipDesc = "Toggle between high-performing synthetic indices and currency majors instantly.";
      let pointerX = W / 2;
      let pointerY = 175;

      if (sceneTime >= 3) {
        tooltipY = 460;
        tooltipTitle = "Step 2: Instant Multipliers";
        tooltipDesc = "Choose leverage factor up to x500 to maximize potential trading trajectories.";
        pointerX = W - 130;
        pointerY = 604;
      }

      // Draw highlighted pulsing circle ring
      ctx.save();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#F59E0B";
      ctx.beginPath();
      const ringR = 15 + Math.abs(Math.sin(t * 5)) * 8;
      ctx.arc(pointerX, pointerY, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw Onboarding Tooltip Card
      ctx.save();
      ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      
      const tcX = 50;
      const tcY = tooltipY;
      const tcW = W - 140;
      const tcH = 145;

      ctx.beginPath();
      ctx.roundRect?.(tcX, tcY, tcW, tcH, 12);
      ctx.fill();
      ctx.stroke();

      // Top bar indicator
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(tcX + 16, tcY + 16, 85, 20);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 10px 'JetBrains Mono', Courier, monospace";
      ctx.fillText("SYSTEM TOUR", tcX + 24, tcY + 29);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Space Grotesk', sans-serif";
      ctx.fillText(tooltipTitle, tcX + 16, tcY + 58);

      // Description text wrapping
      ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
      ctx.font = "12px 'Inter', sans-serif";
      
      const wrapText = (txt: string, x: number, y: number, maxW: number) => {
        const words = txt.split(" ");
        let line = "";
        let lineY = y;
        
        words.forEach((word) => {
          const testLine = line + word + " ";
          const testW = ctx.measureText(testLine).width;
          if (testW > maxW) {
            ctx.fillText(line, x, lineY);
            line = word + " ";
            lineY += 18;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, x, lineY);
      };

      wrapText(tooltipDesc, tcX + 16, tcY + 80, tcW - 32);

      // Animated pointer finger clicking the tooltip CTA
      ctx.restore();
    };

    // Scene 4 render: "The Call to Action" (0:16 - 0:24)
    const renderScene4 = (t: number) => {
      // Secure deposits module
      ctx.fillStyle = "#030408";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.fillText(platformName.toUpperCase(), 35, 100);

      // CTA subtitle
      ctx.fillStyle = "#06B6D4";
      ctx.font = "bold 11px 'JetBrains Mono', Courier, monospace";
      ctx.fillText("🔒 SECURE INSTANT FUNDING HUB", 35, 122);

      // Deposit Portal Card
      ctx.fillStyle = "rgba(14, 21, 38, 0.85)";
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect?.(35, 145, W - 110, 420, 16);
      ctx.fill();
      ctx.stroke();

      // Title header
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px 'Space Grotesk', sans-serif";
      ctx.fillText("Fund Wallet Instantly", 55, 190);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText("Minimum transaction starts at just $1 USD.", 55, 212);

      // Integration Row 1 - Safaricom M-Pesa mobile money
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      ctx.roundRect?.(55, 240, W - 150, 75, 10);
      ctx.fill();
      ctx.stroke();

      // Mpesa green logo circle indicator
      ctx.fillStyle = "#48B02C";
      ctx.beginPath();
      ctx.arc(95, 277, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px 'Space Grotesk', sans-serif";
      ctx.fillText("M", 91, 281);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillText("Mobile Money (M-Pesa)", 130, 274);
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.fillText("Instant automated deposit limits", 130, 292);

      // Integration Row 2 - Cryptos (USDT, Bitcoin)
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.strokeStyle = "rgba(234, 179, 8, 0.2)";
      ctx.beginPath();
      ctx.roundRect?.(55, 335, W - 150, 75, 10);
      ctx.fill();
      ctx.stroke();

      // Bitcoin yellow logo
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(95, 372, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px 'Space Grotesk', sans-serif";
      ctx.fillText("₿", 91, 376);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillText("Cryptocurrency (USDT, BTC)", 130, 369);
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.fillText("Zero processing network fee", 130, 387);

      // VIP Status badge rotating animation matching VIP setup
      ctx.save();
      const badgeY = 465;
      ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
      ctx.strokeStyle = "#A855F7";
      ctx.beginPath();
      ctx.roundRect?.(55, 435, W - 150, 95, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 15px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#A855F7";
      // Spinning star character indicator
      const starsStr = ["⭐ VIP DIAMOND ACCOUNT ⭐", "✨ VIP PLATINUM TIER ✨", "🌟 ELITE TRADER LEVEL 🌟"];
      const starIdx = Math.floor(t % starsStr.length);
      ctx.fillText(starsStr[starIdx], 85, 475);

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText("Unlock priority servers, faster cashouts and custom limits", 75, 500);
      ctx.restore();

      // CTA Button glowing
      ctx.save();
      ctx.fillStyle = accentHex;
      ctx.shadowBlur = 12;
      ctx.shadowColor = accentHex;
      ctx.beginPath();
      ctx.roundRect?.(55, 580, W - 150, 48, 12);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.font = "bold 16px 'Space Grotesk', sans-serif";
      ctx.fillText("REGISTER & START TODAY", W / 2 - 95, 610);
      ctx.restore();
    };

    // 8. Bottom Overlaid Cinematic Subtitles Card (Highly viral styling)
    const drawSubtitles = () => {
      // Subtitle Backdrop Frame
      ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
      ctx.beginPath();
      ctx.roundRect?.(30, H - 245, W - 60, 110, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Display Caption
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px 'Space Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      
      // Split overlay text into two rows
      const text = activeScene.overlayText || "";
      if (text.length > 38) {
        const midPoint = text.indexOf(" ", Math.floor(text.length / 2));
        const line1 = text.substring(0, midPoint);
        const line2 = text.substring(midPoint).trim();
        ctx.fillText(line1, W / 2, H - 200);
        ctx.fillStyle = accentHex; // color the punchy second line with accent
        ctx.fillText(line2, W / 2, H - 170);
      } else {
        ctx.fillText(text, W / 2, H - 185);
      }
      ctx.textAlign = "left"; // reset

      // TikTok channel tags
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.fillText(`@KnexOfficial • Trade Link In Bio 👇`, 45, H - 110);
    };

    // Orchestrate render depending on timing
    if (currentTime < 4) {
      renderScene1(currentTime);
    } else if (currentTime < 10) {
      renderScene2(currentTime);
    } else if (currentTime < 16) {
      renderScene3(currentTime);
    } else {
      renderScene4(currentTime);
    }

    // Render global UI items
    drawStatusBar();
    drawSocialIcons();
    drawSubtitles();

  }, [currentTime, platformName, accentColor]);

  // Audio Context synthesis simulation (Synthesized Beeps and Melodic ticks when playing)
  const triggerAudioEffect = (freq: number, type: OscillatorType, dur: number) => {
    if (!useVoice || isRecording) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      // Audio autoplay restrictions bypass
    }
  };

  // Playback Toggle
  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      triggerAudioEffect(350, "sine", 0.4);
    } else {
      setIsPlaying(false);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  // Reset
  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    triggerAudioEffect(200, "sine", 0.2);
  };

  // Recording Sequence to output real MP4/WebM video
  const startRecordingSequence = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      recordedChunksRef.current = [];
      const stream = canvas.captureStream(30); // 30 FPS vertical video stream

      // Create a recorder
      const options = { mimeType: "video/webm;codecs=vp9" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to average webm
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Build the blob structure and download
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${platformName.toLowerCase()}_viral_marketing_video.webm`;
        a.click();
        
        setIsRecording(false);
        setRecordingSuccess(true);
        setTimeout(() => setRecordingSuccess(false), 4000);
      };

      // Reset playback track and start automated run
      setCurrentTime(0);
      setIsPlaying(true);
      setIsRecording(true);
      mediaRecorderRef.current = recorder;
      recorder.start();

    } catch (err) {
      console.error(err);
      setRecordingSupport(false);
      setIsRecording(false);
    }
  };

  const stopRecordingSequence = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsPlaying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start" id="viral-video-studio">
      
      {/* 1. Mobile Phone Mockup Simulator Frame Preview (5 Columns) */}
      <div className="xl:col-span-5 flex flex-col items-center">
        <div className="relative w-[340px] aspect-[9/16] bg-slate-950 border-8 border-slate-900 rounded-[50px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden scale-95 sm:scale-100 transition-transform">
          
          {/* Speaker ear slit on phone */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20 flex justify-center items-center">
            <span className="w-6 h-1 bg-slate-800 rounded" />
          </div>

          {/* Interactive HTML5 Canvas Render Output */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block bg-slate-950 object-cover"
          />

          {/* Active Recording overlay glowing red box */}
          {isRecording && (
            <div className="absolute top-12 left-4 px-2 py-0.5 bg-red-600 animate-pulse text-[9px] font-mono rounded tracking-widest text-white font-bold flex items-center gap-1 z-20">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              RECORDING AUTO FRAME
            </div>
          )}

          {/* Custom video duration track bar overlay */}
          <div className="absolute bottom-2 left-6 right-6 h-1 bg-slate-800/80 rounded-full overflow-hidden z-20">
            <div
              className="h-full transition-all duration-100 ease-linear"
              style={{
                width: `${(currentTime / MAX_DURATION) * 100}%`,
                backgroundColor: accentHex
              }}
            />
          </div>
        </div>

        {/* Video Controls and Speed Trigger widgets */}
        <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-[340px]">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 py-2.5 px-4 rounded-2xl w-full justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition active:scale-90 shadow-lg shadow-emerald-500/10 cursor-pointer"
                title={isPlaying ? "Pause Screen" : "Play Screen"}
              >
                {isPlaying ? <Pause className="w-4.5 h-4.5 fill-slate-900" /> : <Play className="w-4.5 h-4.5 fill-slate-900 ml-0.5" />}
              </button>

              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Rewind Track"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speeds timeline readout */}
            <span className="text-xs font-mono text-slate-400">
              {currentTime.toFixed(1)}s <span className="text-slate-600">/</span> {MAX_DURATION}.0s
            </span>

            {/* Custom Voice toggle */}
            <button
              onClick={() => setUseVoice(!useVoice)}
              className={`p-2 rounded-lg transition border ${
                useVoice 
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                  : "border-slate-800 bg-slate-950 text-slate-500"
              }`}
              title={useVoice ? "Mute audio synthesis" : "Enable spoken sound speech"}
            >
              {useVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Export HD Video button utilizing raw canvas MediaRecorder source block */}
          {recordingSupport ? (
            <button
              onClick={isRecording ? stopRecordingSequence : startRecordingSequence}
              className={`w-full mt-1.5 py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                isRecording
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-red-500/10 animate-pulse"
                  : "bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 shadow-slate-950/50"
              }`}
            >
              <Video className="w-4.5 h-4.5" />
              {isRecording ? "Stop & Process Rendering" : "Export Simulated Video (WebM)"}
            </button>
          ) : (
            <div className="w-full bg-red-950/20 border border-red-900/30 p-2 text-xxs text-red-400 flex items-center gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Direct canvas download restricted in sandbox. Please use standard screen recorders to capture this simulator!</span>
            </div>
          )}

          {recordingSuccess && (
            <div className="w-full bg-emerald-950/20 border border-emerald-900/30 p-2 text-xxs text-emerald-400 flex items-center gap-2 rounded-lg">
              <Check className="w-4 h-4 shrink-0" />
              <span>Video processed! Download of {platformName.toLowerCase()}_viral_marketing_video.webm started!</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Audio Storyboard and Viral Speech teleprompter reader (7 Columns) */}
      <div className="xl:col-span-7 flex flex-col gap-5 w-full">
        
        {/* Dynamic Teleprompter Card */}
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <h3 className="text-md font-display font-medium text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Video Teleprompter & Storyboard Script
            </h3>
            <span className={`text-xs px-2.5 py-1.5 rounded-full font-mono font-medium border ${getAccentClass(accentColor)}`}>
              Scene {activeScene.id} / 4 Active
            </span>
          </div>

          {/* Scrolling active scene highlights */}
          <div className="space-y-4">
            {scenes.map((scene) => {
              const isCurrent = activeScene.id === scene.id;
              return (
                <div
                  key={scene.id}
                  onClick={() => {
                    setCurrentTime(scene.startSec ?? 0);
                    setIsPlaying(false);
                    speakVoiceover(scene.voiceoverText || "");
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isCurrent
                      ? "bg-slate-950 border-emerald-500/40 shadow-md ring-1 ring-emerald-500/10"
                      : "bg-slate-900/40 border-slate-800/60 opacity-60 hover:opacity-90 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isCurrent ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}>
                        Scene {scene.id}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{scene.actionTitle}</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{scene.timeRange}</span>
                  </div>

                  {/* Descriptions block */}
                  <div className="space-y-2 mt-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Screen Video Action</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{scene.actionDesc}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/50">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Text On Screen</span>
                        <p className={`text-xs font-semibold ${isCurrent ? "text-emerald-400" : "text-slate-400"}`}>
                          "{scene.overlayText}"
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block">Voiceover (Audio script)</span>
                        <p className={`text-xs italic leading-relaxed ${isCurrent ? "text-slate-200 font-medium" : "text-slate-400"}`}>
                          "{scene.voiceoverText}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action instruction hints block */}
        <div className="bg-emerald-950/10 border border-emerald-900/30 p-5 rounded-xl">
          <h4 className="text-xs font-mono text-emerald-400 font-bold mb-2 uppercase tracking-wider">💡 Creator Production Tip</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Record this virtual simulator on your phone or computer. Speak along with the voiceover, add transition effects on TikTok or Reels (like zoom-ins on the chart ticks), and insert your customized marketing link (<code className="text-emerald-400 font-mono px-1 bg-slate-950 rounded">{referralLink}</code>) directly in your social bio. Your customized high-converting captions are available in the next section!
          </p>
        </div>

      </div>
    </div>
  );
}
