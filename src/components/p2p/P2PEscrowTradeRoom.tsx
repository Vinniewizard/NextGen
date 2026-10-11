import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, Clock, Copy, Send, 
  ChevronRight, AlertTriangle, Lock, Unlock, X, ArrowLeft, Image as ImageIcon,
  QrCode, Volume2, VolumeX, Star, Download, Sparkles, Check, ExternalLink,
  Info, HelpCircle, FileText, BadgeCheck, MessageSquare, ThumbsUp
} from 'lucide-react';
import { TradeSession, P2POrder, ChatMessage } from './P2PTypes';

interface P2PEscrowTradeRoomProps {
  trade: TradeSession;
  order: P2POrder | null;
  currentUser: any;
  buyerEmail: string;
  sellerEmail: string;
  onMarkPaid: () => Promise<void>;
  onRelease: () => Promise<void>;
  onCancel: () => (Promise<void> | void);
  onDispute: (reason: string, details: string) => Promise<void>;
  onSendChat: (text: string) => Promise<void>;
  onBackToOrders: () => void;
  isSubmitting: boolean;
  isDark: boolean;
  onTriggerToast: (msg: string, success?: boolean) => void;
}

export default function P2PEscrowTradeRoom({
  trade,
  order,
  currentUser,
  buyerEmail,
  sellerEmail,
  onMarkPaid,
  onRelease,
  onCancel,
  onDispute,
  onSendChat,
  onBackToOrders,
  isSubmitting,
  isDark,
  onTriggerToast
}: P2PEscrowTradeRoomProps) {
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState('15:00');
  const [timerPercent, setTimerPercent] = useState(100);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Advanced Review & Rating state
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fast Release', 'Verified Trader']);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  // Modals
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Payment not received after 15 minutes');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputeAttachment, setDisputeAttachment] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disputeFileInputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef<number>(0);

  const isUserBuyer = currentUser && trade.buyer_id === currentUser.id;
  const isUserSeller = currentUser && trade.seller_id === currentUser.id;

  // Live Escrow Countdown for Unpaid Orders (Strict Knex Escrow Rules)
  useEffect(() => {
    // When order is marked as Paid, it NEVER expires or auto-cancels
    if (trade.status !== 'open') {
      setTimeLeft(trade.status === 'paid' ? 'Protected' : trade.status);
      setTimerPercent(0);
      return;
    }

    const updateTimer = () => {
      const created = new Date(trade.created_at).getTime();
      const expires = created + 15 * 60 * 1000;
      const remaining = expires - Date.now();
      if (remaining <= 0) {
        setTimeLeft('Expired');
        setTimerPercent(0);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        setTimerPercent(Math.max(0, Math.min(100, (remaining / (15 * 60 * 1000)) * 100)));
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [trade.created_at, trade.status]);

  // Sound chime notification on new chat message
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Auto-scroll chat & chime on update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const parsed: ChatMessage[] = trade.chat_messages ? (() => {
      try { return JSON.parse(trade.chat_messages); } catch { return []; }
    })() : [];
    if (parsed.length > prevMsgCountRef.current) {
      if (prevMsgCountRef.current > 0) playChime();
      prevMsgCountRef.current = parsed.length;
    }
  }, [trade.chat_messages]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    onTriggerToast(`Copied ${fieldName} to clipboard!`, true);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        onSendChat(`📷 [Proof of Payment Attached]\n[IMG]${reader.result}[/IMG]`);
        onTriggerToast('Proof of payment image attached to live chat!', true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDisputeAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setDisputeAttachment(reader.result as string);
        onTriggerToast('Appeal evidence attached successfully!', true);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderMessageContent = (text: string) => {
    if (text.includes('[IMG]') && text.includes('[/IMG]')) {
      const parts = text.split(/\[IMG\]|\[\/IMG\]/);
      const textBefore = parts[0];
      const imgUrl = parts[1];
      const textAfter = parts[2] || '';
      return (
        <div className="space-y-1.5">
          {textBefore && <div>{textBefore}</div>}
          {imgUrl && (
            <div className="relative group">
              <img 
                src={imgUrl} 
                alt="Payment proof attachment" 
                onClick={() => setZoomImage(imgUrl)}
                className="max-w-[220px] max-h-[180px] rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 object-cover shadow"
              />
              <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                <ExternalLink className="w-2.5 h-2.5" /> Zoom
              </span>
            </div>
          )}
          {textAfter && <div>{textAfter}</div>}
        </div>
      );
    }
    return <div>{text}</div>;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleSubmitRating = () => {
    setRatingSubmitted(true);
    setShowRatingModal(false);
    onTriggerToast(`Thank you! Your ${ratingStars}-star feedback for ${order?.merchant_name || 'merchant'} was recorded.`, true);
  };

  const parsedChatMessages: ChatMessage[] = trade.chat_messages
    ? (() => {
        try { return JSON.parse(trade.chat_messages); } catch { return []; }
      })()
    : [];

  const totalFiat = (trade.amount * trade.price).toFixed(2);
  const fiatCurrency = order?.fiat_currency || 'USD';
  const txHash = `0xknex_${(trade.id + 'vault9981').substring(0, 16)}`;

  return (
    <div className={`rounded-2xl border overflow-hidden font-sans ${
      isDark ? 'bg-[#181a20] border-[#2b313a]' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Top Header & Interactive Status Bar */}
      <div className="p-5 border-b border-[#2b313a] bg-[#1e2329]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToOrders}
              className="p-1.5 hover:bg-[#2b313a] rounded-lg text-slate-400 hover:text-white mr-1 cursor-pointer transition-colors"
              title="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">Knex Escrow ID:</span>
            <span className="text-sm font-mono font-black text-[#fcd535]">#{trade.id.substring(0, 12)}</span>
            <button 
              onClick={() => copyToClipboard(trade.id, 'Order ID')}
              className="text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Copy Escrow ID"
            >
              {copiedField === 'Order ID' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Created: {new Date(trade.created_at).toLocaleTimeString()}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span>Counterparty:</span>
              <strong className="text-white flex items-center gap-1">
                {isUserBuyer ? (order?.merchant_name || sellerEmail) : buyerEmail}
                <BadgeCheck className="w-3.5 h-3.5 text-[#fcd535]" />
              </strong>
            </span>
          </div>
        </div>

        {/* 3-Step Knex P2P Stepper */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">1. Escrow Locked</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <div className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg border transition-all ${
            trade.status === 'open' 
              ? 'text-[#fcd535] bg-[#fcd535]/10 border-[#fcd535]/30 animate-pulse' 
              : trade.status === 'paid' || trade.status === 'completed'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-slate-500 border-[#2b313a]'
          }`}>
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
            <span className="hidden sm:inline">2. Payment Sent</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <div className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg border transition-all ${
            trade.status === 'completed' 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10 shadow-lg' 
              : 'text-slate-500 border-[#2b313a]'
          }`}>
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
            <span className="hidden sm:inline">3. Crypto Released</span>
          </div>
        </div>

        {/* Dynamic Countdown or Status Badge */}
        <div className="flex items-center gap-2">
          {trade.status === 'open' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold shadow-inner">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Time Remaining: {timeLeft}</span>
            </div>
          )}
          {trade.status === 'paid' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Paid · Escrow Vault Protected</span>
            </div>
          )}
          {trade.status === 'disputed' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Appeal Active · Arbitration Room</span>
            </div>
          )}
          {trade.status === 'completed' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Trade Completed</span>
            </div>
          )}
          {trade.status === 'cancelled' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
              <span>Order Cancelled</span>
            </div>
          )}

          {/* Sound Toggle Button */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              onTriggerToast(soundEnabled ? 'Chat chimes muted' : 'Chat chimes active', true);
            }}
            className="p-1.5 rounded-lg bg-[#0b0e11] hover:bg-[#2b313a] text-slate-400 hover:text-white border border-[#2b313a] cursor-pointer"
            title={soundEnabled ? "Mute Chat Sounds" : "Enable Chat Sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Main Two-Column Trade Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#2b313a]">
        
        {/* Left Panel: Escrow Payment Details & Controls */}
        <div className="lg:col-span-7 p-6 space-y-6">
          
          {/* Advanced Cryptographic Escrow Vault Card */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-br from-[#0b0e11] via-[#14181f] to-[#0b0e11] border border-[#2b313a] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-400/10 text-[#fcd535] border border-yellow-400/30 flex items-center justify-center shadow-inner">
                  {trade.status === 'completed' ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Knex Vault Escrow Guarantee
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Vault Node Active · Contract Synced
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 bg-[#181a20] px-2.5 py-1 rounded-lg border border-[#2b313a]">
                Hash: {txHash}
              </span>
            </div>

            {/* Amount Due Card */}
            <div className="p-4 rounded-xl bg-[#0b0e11]/90 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                Fiat Amount To Transfer
              </span>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {parseFloat(totalFiat).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-bold text-[#fcd535] ml-2">{fiatCurrency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(totalFiat, 'Amount')}
                    className="px-2.5 py-1 text-xs text-[#fcd535] bg-yellow-400/10 border border-yellow-400/30 rounded-lg hover:bg-yellow-400/20 flex items-center gap-1 cursor-pointer font-mono transition-all"
                  >
                    {copiedField === 'Amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Amount</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="p-1 text-slate-300 hover:text-white bg-[#181a20] border border-[#2b313a] rounded-lg hover:bg-[#2b313a] cursor-pointer"
                    title="Show Payment QR"
                  >
                    <QrCode className="w-4 h-4 text-yellow-400" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2b313a] flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Crypto in Escrow Vault:</span>
                <span className="text-emerald-400 font-black text-sm">{trade.amount} {trade.coin}</span>
              </div>
            </div>
          </div>

          {/* Seller Verified Payment Credentials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Seller Payment Information</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                Verified Merchant Account
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#2b313a]/60">
                <span className="text-slate-400">Payment Rail</span>
                <span className="text-white font-bold bg-[#181a20] px-2.5 py-1 rounded border border-[#2b313a]">
                  {order?.paymentMethod || 'Bank Transfer'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#2b313a]/60">
                <span className="text-slate-400">Account / Instructions</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#fcd535] font-bold max-w-[280px] truncate text-right">
                    {order?.payment_details || 'Bank of America | 4820 9182 4410'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(order?.payment_details || '', 'Account Details')}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Copy Account Details"
                  >
                    {copiedField === 'Account Details' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Payment Reference</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    P2P-{trade.id.substring(0, 8)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(`P2P-${trade.id.substring(0, 8)}`, 'Payment Reference')}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Copy Reference"
                  >
                    {copiedField === 'Payment Reference' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Checklist for Smooth Settlement */}
          <div className="p-3.5 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-2 text-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
              Escrow Protection Protocol
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="flex items-center gap-2 text-[11px]">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[9px] font-bold">✓</div>
                <span>Zero Trading Fees</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[9px] font-bold">✓</div>
                <span>100% Vault Reserve Backed</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[9px] font-bold">✓</div>
                <span>24/7 Human Dispute Arbitration</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[9px] font-bold">✓</div>
                <span>Direct Chat Image Proof</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Buyer Controls */}
            {isUserBuyer && (
              <div className="flex flex-col sm:flex-row gap-3">
                {trade.status === 'open' && (
                  <button
                    onClick={() => setShowMarkPaidModal(true)}
                    className="flex-1 py-3.5 px-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Transferred, Notify Seller</span>
                  </button>
                )}
                {trade.status === 'open' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={isSubmitting}
                    className="py-3.5 px-4 bg-[#2b313a] hover:bg-[#363d47] text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
                {(trade.status === 'paid' || trade.status === 'open') && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="py-3.5 px-4 bg-[#2b313a] hover:bg-[#363d47] text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-rose-900/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Appeal / Need Help</span>
                  </button>
                )}
                {trade.status === 'completed' && !ratingSubmitted && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="w-full py-3 px-4 bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Star className="w-4 h-4 fill-current" />
                    <span>Leave Feedback for Merchant</span>
                  </button>
                )}
              </div>
            )}

            {/* Seller Controls */}
            {isUserSeller && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled={trade.status !== 'paid'}
                  onClick={() => setShowReleaseModal(true)}
                  className={`flex-1 py-3.5 px-4 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    trade.status === 'paid'
                      ? 'bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] shadow-yellow-500/20 animate-pulse'
                      : 'bg-[#2b313a] text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Payment Received & Release Crypto</span>
                </button>
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="py-3.5 px-4 bg-[#2b313a] hover:bg-[#363d47] text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-rose-900/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Appeal / Dispute</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Live Trade Chat Arena */}
        <div className="lg:col-span-5 flex flex-col h-[560px] bg-[#14181f]/40">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-[#2b313a] bg-[#1e2329]/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-white flex items-center gap-1">
                <span>Live Escrow Chat</span>
                <span className="text-[10px] text-slate-400 font-normal">· Encrypted Session</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              Escrow Guard Connected
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs font-sans scrollbar-thin">
            {parsedChatMessages.map(msg => {
              const isSystem = msg.sender === 'system';
              const isMe = currentUser && msg.sender === currentUser.id;
              const isMerchant = msg.sender === 'merchant';

              if (isSystem) {
                return (
                  <div key={msg.id} className="p-3 rounded-xl bg-[#0b0e11] border border-[#2b313a] text-center text-slate-300 text-[11px] leading-relaxed shadow-sm">
                    <span className="font-black text-[#fcd535] mr-1">⚡ Knex Escrow Guard:</span>
                    {msg.text}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl shadow-md ${
                    isMe 
                      ? 'bg-[#fcd535] text-[#0b0e11] font-medium rounded-tr-none' 
                      : isMerchant 
                        ? 'bg-[#2b313a] text-slate-100 rounded-tl-none border border-yellow-500/30'
                        : 'bg-[#0b0e11] text-slate-200 rounded-tl-none border border-[#2b313a]'
                  }`}>
                    <div className="text-[9px] font-mono opacity-75 mb-1 font-bold flex items-center gap-1">
                      {isMe ? 'You' : isMerchant ? 'Verified Merchant' : (msg.senderEmail || 'Counterparty')}
                      {!isMe && <BadgeCheck className="w-2.5 h-2.5 text-yellow-400" />}
                    </div>
                    {renderMessageContent(msg.text)}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Canned Quick Replies */}
          <div className="px-3 py-2 border-t border-[#2b313a] bg-[#0b0e11] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              "I've transferred the funds", 
              "Checking bank now, 1 min", 
              "Payment verified, releasing!", 
              "Hello, ready to trade"
            ].map((canned, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setChatInput(canned)}
                className="px-2.5 py-1 text-[10px] font-mono rounded-lg bg-[#181a20] hover:bg-[#2b313a] border border-[#2b313a] text-slate-300 hover:text-white whitespace-nowrap cursor-pointer transition-all"
              >
                {canned}
              </button>
            ))}
          </div>

          {/* Chat Form with Image Proof Attachment */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2b313a] bg-[#1e2329]/80 flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 bg-[#2b313a] hover:bg-[#363d47] text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700/60"
              title="Attach Payment Proof Screenshot"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message or attach payment proof..."
              className="flex-1 bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#fcd535] transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 bg-[#fcd535] hover:bg-yellow-300 disabled:opacity-40 text-[#0b0e11] rounded-xl transition-all cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </div>

      {/* QR Code Quick Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-[#2b313a] pb-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-yellow-400">
                <QrCode className="w-4 h-4" />
                <span>Payment QR Code</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white rounded-xl mx-auto w-48 h-48 flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(order?.payment_details || 'Knex Escrow Payment')}`} 
                alt="Payment QR Code" 
                className="w-full h-full"
              />
            </div>
            <div className="text-xs text-slate-300 font-mono">
              Scan with your banking or mobile app to transfer <strong className="text-yellow-400">{totalFiat} {fiatCurrency}</strong>
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-[#2b313a] hover:bg-[#363d47] text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close QR
            </button>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modals */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="text-base font-bold">Confirm Payment Transferred</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Have you completed the transfer of <strong className="text-[#fcd535] font-mono">{totalFiat} {fiatCurrency}</strong> using your own verified account? 
              Marking as paid without transferring funds violates Knex Escrow terms and may cause account suspension.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
              <button
                onClick={() => setShowMarkPaidModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={async () => {
                  setShowMarkPaidModal(false);
                  await onMarkPaid();
                }}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] rounded-xl shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Confirming...' : 'Yes, I Have Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#fcd535]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">Release Crypto From Knex Escrow</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>CRITICAL SECURITY CHECK:</strong> Have you opened your bank app or M-Pesa balance and verified that the exact payment of <strong className="text-white">{totalFiat} {fiatCurrency}</strong> has arrived? Never rely on SMS or chat screenshots. Knex Escrow release is instantaneous and permanent.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
              <button
                onClick={() => setShowReleaseModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowReleaseModal(false);
                  await onRelease();
                }}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] rounded-xl shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Releasing...' : 'Confirm & Release Crypto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold">File Knex Escrow Appeal</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Filing an appeal securely freezes the escrow vault funds. A Knex arbitration specialist will join the chat within 5 minutes to audit bank transaction receipts.
            </p>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Reason for Appeal</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Payment not received after 15 minutes">Payment not received after 15 minutes</option>
                  <option value="Incorrect payment amount received">Incorrect payment amount received</option>
                  <option value="Third party account used without consent">Third party account used without consent</option>
                  <option value="Seller unresponsive">Seller unresponsive</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Additional Evidence / Details</label>
                <textarea
                  rows={2}
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="Paste transaction reference code or details..."
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-sans text-xs"
                />
              </div>

              {/* Upload Proof for Appeal */}
              <div>
                <label className="text-slate-400 block mb-1">Upload Receipt (Optional)</label>
                <input 
                  type="file" 
                  ref={disputeFileInputRef} 
                  onChange={handleDisputeAttachmentUpload} 
                  accept="image/*,.pdf" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => disputeFileInputRef.current?.click()}
                  className="w-full py-2 bg-[#0b0e11] hover:bg-[#181a20] border border-dashed border-[#2b313a] text-slate-300 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{disputeAttachment ? 'Proof Attached ✓' : 'Upload Bank Statement / Receipt'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  setShowDisputeModal(false);
                  await onDispute(disputeReason, disputeDetails + (disputeAttachment ? ' [Evidence Attached]' : ''));
                }}
                className="px-5 py-2 text-xs font-bold bg-[#f6465d] hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Submit Appeal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Trade Rating & Feedback Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#fcd535]">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-base font-bold">Rate Your Knex P2P Experience</h3>
            </div>
            <p className="text-xs text-slate-300">
              How was your trade with <strong className="text-white">{order?.merchant_name || 'Verified Merchant'}</strong>?
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingStars(s)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star className={`w-7 h-7 ${s <= ratingStars ? 'text-[#fcd535] fill-current' : 'text-slate-600'}`} />
                </button>
              ))}
            </div>

            {/* Quick Feedback Tags */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {['⚡ Fast Release', '🤝 Polite & Fast', '🎯 Good Rate', '🔒 Highly Secure', '⭐ 5-Star Service'].map(tag => {
                const isSel = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(prev => isSel ? prev.filter(t => t !== tag) : [...prev, tag])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      isSel 
                        ? 'bg-[#fcd535] text-[#0b0e11] font-bold shadow-sm' 
                        : 'bg-[#0b0e11] text-slate-400 border border-[#2b313a] hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Feedback textarea */}
            <textarea
              rows={2}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Leave a short comment (optional)..."
              className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-sans text-xs"
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
              <button
                onClick={() => setShowRatingModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitRating}
                className="px-5 py-2 text-xs font-bold bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] rounded-xl shadow-md cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold">Cancel Knex Escrow Order</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel this trade? 
              If you have already transferred the fiat funds, <strong className="text-rose-400 font-bold">DO NOT CANCEL</strong> as you could lose your payment. Cancelling will return the locked crypto from escrow back to the seller.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Keep Order Active
              </button>
              <button
                onClick={async () => {
                  setShowCancelModal(false);
                  await onCancel();
                }}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Image Attachment Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomImage} 
              alt="Full Resolution Proof" 
              className="max-w-full max-h-[80vh] rounded-xl object-contain border border-slate-700 shadow-2xl"
            />
            <p className="text-xs font-mono text-slate-400 mt-3">Proof of Payment Attachment · Inspect Details</p>
          </div>
        </div>
      )}

    </div>
  );
}
