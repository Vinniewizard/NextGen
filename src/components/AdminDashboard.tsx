import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Users, TrendingUp, DollarSign, ArrowDownCircle, BarChart2, Pin, PinOff, MessageSquare, Settings, Clock, Trash, Sparkles, Search, Globe, Shield, Ban, CheckCircle, UserCheck, UserX, Copy, Check, Megaphone, Share2, Camera } from 'lucide-react';
import { AdminWhatsAppManager } from './AdminWhatsAppManager';
import { AdminFacebookBotManager } from './AdminFacebookBotManager';
import MarketingHub from './MarketingHub';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  triggerToast: (text: string, success: boolean) => void;
  isDirectRoute?: boolean;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  demoBalance: number;
  realBalance: number;
  phone?: string;
  forceOutcome?: string;
  profitTarget?: number;
  maxWinLimit?: number;
  maxLossLimit?: number;
  isBanned?: number;
  plainPassword?: string;
  createdAt: string;
  lastLogin?: string;
  verificationStatus?: string;
  totalDeposited?: number;
}

interface Stats {
  totalUsers: number;
  totalDeposits: number;
  totalDepositsCount: number;
  totalWithdrawals: number;
  topDepositAmount: number;
  totalFeesCollected?: number;
}

interface PendingDeposit {
  id: string;
  userId: string;
  amount: number;
  receiptPath?: string;
  message?: string;
  status: string;
  createdAt: string;
}

interface CompletedDeposit {
  txHash: string;
  userId: string;
  amount: number;
  coin: string;
  network: string;
  creditedAt: string;
}

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  address: string;
  coin: string;
  network: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
}

interface GameSettings {
  globalTrendBias: number;
  forceOutcome?: 'win' | 'loss' | '';
  volatilityMultiplier: number;
  realWinRate?: number;
  segmentWinRates?: {
    newUsers: number;
    vipUsers: number;
    standardUsers: number;
  };
  paybillEnabled?: boolean;
  btcEnabled?: boolean;
  minDeposit?: number;
  minWithdrawal?: number;
  minStake?: number;
  maxStake?: number;
  cashoutMode?: 'enabled' | 'disabled' | 'smart';
  payoutRate?: number;
  binaryOptionsPaused?: boolean;
  mflowPaused?: boolean;
  p2pPaused?: boolean;
  depositsPaused?: boolean;
  withdrawalsPaused?: boolean;
}

const PREBUILT_GUIDES = {
  overview: `<b>⚙️ KNEX Exchange - Operational Blueprint</b>\n\nKNEX is a high-performance synthetic options trading platform:\n\n• <b>Synthetic Price Feeds:</b> Features highly responsive tick indexes (e.g. MFLOW index) moving 24/7/365.\n• <b>Fast Options Expiration:</b> Enter transactions with expiration durations starting at just 10 seconds up to minutes.\n• <b>Calibrated Payouts:</b> Delivers profit yields of up to 95% on accurate price vector predictions (Rise/Fall).\n• <b>No-Risk Environment:</b> Preconditioned with fully managed demo training accounts.`,
  register: `<b>🚀 How to Register & Onboard on KNEX</b>\n\nFollow these quick steps to set up your trading profile:\n\n1. Visit the KNEX Web Application Portal.\n2. Click <b>Register/Get Started</b> and fill in your Full Name, Email, and Phone Number (M-Pesa supported).\n3. Claim your pre-loaded <b>$25,678.91 USD</b> practice demo credits immediately!\n4. Link your Telegram Handle in your Profile Tab inside the console to listen to real-time notification alerts.`,
  trade: `<b>📈 How to Trade Options on KNEX</b>\n\nLearn options forecasting in under 60 seconds:\n\n1. Check the active live price feed chart in the terminal center.\n2. In the top bar, toggle between <b>Demo Mode</b> or <b>Real Mode</b>.\n3. In the <b>Trade Controls</b>, select your Option Stake (e.g., $10 to $1,000) and expiration duration.\n4. Forecast the trend trajectory:\n   • Click <b>🟢 RISE / BUY UP</b> if you predict the price will settle higher than your entry.\n   • Click <b>🔴 FALL / BUY DOWN</b> if you predict it will settle lower.\n5. Watch the countdown. Upon option expiry, correct predictions credit your balance instantly!`,
  deposit: `<b>💳 How to Make a Deposit (Crypto & M-Pesa)</b>\n\nFund your Real Wallet seamlessly using either option:\n\n• <b>Option A: Crypto Transfer (USDT Multi-Chain)</b>\n  1. Go to the <b>Cashier</b> -> Click **Deposit**.\n  2. Select your currency (USDT ERC20 / TRC20 / BEP20) to view your dedicated deposit address or scan the QR Code.\n  3. Send USDT from Binance, TrustWallet, or MetaMask. Click 'Verify Payment' in minutes.\n\n• <b>Option B: M-Pesa Paybill (Local Payments)</b>\n  1. Dial Lipa Na M-Pesa -> <b>Paybill</b>.\n  2. Enter Business Number <b>4323297</b>, and Account: <code>KNEX-YOUR_TELEGRAM</code>.\n  3. Pay your amount, capture a screenshot of the confirmation message.\n  4. Upload the receipt file into the Cashier modal. Admin credits your account in 5 minutes!`,
  withdrawal: `<b>📥 How to Request a Withdrawal on KNEX</b>\n\nInitiate secure fund settlements anytime:\n\n1. Click on <b>Cashier</b> and navigate to the <b>Withdraw</b> tab.\n2. Ensure your active account is set to <b>Real Balance</b> mode and you have settled funds.\n3. Enter your Crypto standard network (USDT TRC-20 recommended for low fees) and input your destination wallet address.\n4. Verify your identity with your pre-set profile PIN or Two-Factor security challenge.\n5. Submit your withdrawal request. Requests are fully audited by the ledger and settled in 15–30 minutes!`
};

const safeStorageGet = (key: string, fallback: boolean): boolean => {
  try {
    if (typeof window === 'undefined') return fallback;
    const val = localStorage.getItem(key);
    if (val === null || val === 'undefined') return fallback;
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const formatMoney = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  return (isNaN(num) ? 0 : num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AdminDashboard({ isOpen, onClose, theme, triggerToast, isDirectRoute }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'creds' | 'key'>('creds');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'deposits' | 'completed_deposits' | 'withdrawals' | 'p2p' | 'game' | 'telegram' | 'marketing' | 'visits'>('stats');
  const [isMarketingStudioOpen, setIsMarketingStudioOpen] = useState(false);
  const [p2pOrders, setP2pOrders] = useState<any[]>([]);
  const [p2pTrades, setP2pTrades] = useState<any[]>([]);
  const [selectedDisputeChat, setSelectedDisputeChat] = useState<any | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [adminChatText, setAdminChatText] = useState('');
  const [isSendingAdminChat, setIsSendingAdminChat] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);
  const [visitsData, setVisitsData] = useState<{
    visitsCount: number;
    uniqueVisitors: number;
    knexCount?: number;
    recentVisits: any[];
  } | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [completedDeposits, setCompletedDeposits] = useState<CompletedDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({ 
    globalTrendBias: 0, 
    volatilityMultiplier: 1, 
    realWinRate: 30,
    segmentWinRates: {
      newUsers: 40,
      vipUsers: 25,
      standardUsers: 30
    },
    paybillEnabled: true,
    btcEnabled: true,
    minDeposit: 1,
    minWithdrawal: 15,
    minStake: 1,
    maxStake: 5000,
    cashoutMode: 'enabled',
    payoutRate: 95.5
  });
  const [isGameLoading, setIsGameLoading] = useState(false);
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => safeStorageGet('knex_admin_demo_enabled', true));
  const [realModeEnabled, setRealModeEnabled] = useState(() => safeStorageGet('knex_admin_real_enabled', true));
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User & { newPassword?: string } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Telegram states
  const [tgLogs, setTgLogs] = useState<Array<{ id: string; sender: string; text: string; timestamp: string }>>([]);
  const [telegramMockUsers, setTelegramMockUsers] = useState<Array<{
    id: string;
    username: string;
    status: string;
    origin: string;
    personality: string;
    joinedAt: string;
  }>>([]);
  const [telegramConfig, setTelegramConfig] = useState<{
    botToken: string;
    groupChatId: string;
    groupLink: string;
    webhookActive: boolean;
    autoInviteDMs: boolean;
    autoSimulateIntervalEnabled: boolean;
    autoSimulateIntervalSeconds?: number;
    autoSimulateMessageTypes?: string[];
    autoSimulateActiveUsersCount?: number;
    pinnedMessageId?: string | null;
    pinnedMessageText?: string | null;
    pinnedMessageSender?: string | null;
    hunterIntervalEnabled?: boolean;
    hunterIntervalSeconds?: number;
    hunterAnnounceOnMainGroup?: boolean;
    templateVIPCampaign?: string;
    templateAlert?: string;
    templateSignal?: string;
  } | null>(null);

  // WhatsApp Config
  const [whatsappConfig, setWhatsappConfig] = useState<{
    enabled: boolean;
    groups: { id: number; link: string }[];
    autoBroadcastEnabled: boolean;
    broadcastIntervalMinutes: number;
    broadcastMessage: string;
  }>({
    enabled: false,
    groups: [{ id: Date.now(), link: 'https://chat.whatsapp.com/FA32GpUv1OyES3AYFidIKw?s=cl&p=a&mlu=1' }],
    autoBroadcastEnabled: false,
    broadcastIntervalMinutes: 60,
    broadcastMessage: 'Welcome to KNEX! Join our community trading signals here: {LINK}',
  });

  // Facebook Config
  const [fbBotConfig, setFbBotConfig] = useState<{
    enabled: boolean;
    autoInviteEnabled: boolean;
    targetAudienceKeyword: string;
    responseDelaySeconds: number;
    targetGroups: { id: number; url: string }[];
    broadcastEnabled: boolean;
    broadcastMessage: string;
  }>({
    enabled: false,
    autoInviteEnabled: false,
    targetAudienceKeyword: 'trading',
    responseDelaySeconds: 5,
    targetGroups: [{ id: Date.now(), url: '' }],
    broadcastEnabled: false,
    broadcastMessage: '',
  });

  const [botSubTab, setBotSubTab] = useState<'telegram' | 'whatsapp' | 'facebook'>('telegram');
  const [facebookBotStatus, setFacebookBotStatus] = useState<'active' | 'idle' | 'error'>('idle');
  const [isPinning, setIsPinning] = useState(false);
  const [isSavingTgConfig, setIsSavingTgConfig] = useState(false);
  const [isSavingWhatsappConfig, setIsSavingWhatsappConfig] = useState(false);
  const [customBroadcast, setCustomBroadcast] = useState('');
  const [broadcastType, setBroadcastType] = useState<'signal' | 'campaign' | 'alert'>('signal');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // --- REFACTOR CONFIRM DIALOG STATES ---
  const [confirmingDepositId, setConfirmingDepositId] = useState<string | null>(null);
  const [confirmingDepositAction, setConfirmingDepositAction] = useState<'approve' | 'decline' | null>(null);
  const [confirmingWithdrawalId, setConfirmingWithdrawalId] = useState<string | null>(null);
  const [confirmingWithdrawalAction, setConfirmingWithdrawalAction] = useState<'approve' | 'decline' | null>(null);

  // --- TELEGRAM CAMPAIGNS & ADV HUNTER UI STATES ---
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [hunterGroups, setHunterGroups] = useState<any[]>([]);
  
  // Adding campaign form states
  const [newCampaignMsg, setNewCampaignMsg] = useState('');
  const [newCampaignInterval, setNewCampaignInterval] = useState('30');
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);

  // Adding hunter group form states
  const [newHunterGroupUser, setNewHunterGroupUser] = useState('');
  const [newHunterGroupName, setNewHunterGroupName] = useState('');
  const [isAddingHunterGroup, setIsAddingHunterGroup] = useState(false);
  const [isSweepingHunter, setIsSweepingHunter] = useState(false);
  const [hunterSubTab, setHunterSubTab] = useState<'groups' | 'logs'>('groups');

  const fetchTelegramAddons = async () => {
    try {
      const [campRes, huntRes] = await Promise.all([
        fetch('/api/telegram/campaigns'),
        fetch('/api/telegram/hunter-groups')
      ]);
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }
      if (huntRes.ok) {
        const huntData = await huntRes.json();
        setHunterGroups(huntData.groups || []);
      }
    } catch (e) {
      console.error('Error fetching Telegram campaigns/hunters:', e);
    }
  };

  const handleToggleCampaign = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/telegram/campaigns/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: currentStatus ? 0 : 1 } : c));
        triggerToast('Scheduler campaign updated.', true);
      }
    } catch (e) {
      triggerToast('Error toggling campaign advert.', false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/campaigns/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        triggerToast('Advert campaign deleted successfully.', true);
      }
    } catch (e) {
      triggerToast('Error deleting campaign.', false);
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignMsg.trim() || !newCampaignInterval) return;
    setIsAddingCampaign(true);
    try {
      const res = await fetch('/api/telegram/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newCampaignMsg, interval_minutes: parseInt(newCampaignInterval, 10) })
      });
      if (res.ok) {
        setNewCampaignMsg('');
        setNewCampaignInterval('30');
        triggerToast('New campaign message registered successfully!', true);
        const campRes = await fetch('/api/telegram/campaigns');
        if (campRes.ok) {
          const campData = await campRes.json();
          setCampaigns(campData.campaigns || []);
        }
      } else {
        triggerToast('Failed to add campaign.', false);
      }
    } catch (e) {
      triggerToast('Error inserting campaign advert.', false);
    } finally {
      setIsAddingCampaign(false);
    }
  };

  const handleToggleHunterGroup = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/telegram/hunter-groups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      if (res.ok) {
        setHunterGroups(prev => prev.map(g => g.id === id ? { ...g, is_active: currentStatus ? 0 : 1 } : g));
        triggerToast('Target group scan status updated.', true);
      }
    } catch (e) {
      triggerToast('Error toggling group status.', false);
    }
  };

  const handleDeleteHunterGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/hunter-groups/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHunterGroups(prev => prev.filter(g => g.id !== id));
        triggerToast('Target group deleted successfully.', true);
      }
    } catch (e) {
      triggerToast('Error deleting target group.', false);
    }
  };

  const handleAddHunterGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHunterGroupUser.trim() || !newHunterGroupName.trim()) return;
    setIsAddingHunterGroup(true);
    try {
      const res = await fetch('/api/telegram/hunter-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_username: newHunterGroupUser, group_name: newHunterGroupName })
      });
      if (res.ok) {
        setNewHunterGroupUser('');
        setNewHunterGroupName('');
        triggerToast('New target external channel registered!', true);
        const huntRes = await fetch('/api/telegram/hunter-groups');
        if (huntRes.ok) {
          const huntData = await huntRes.json();
          setHunterGroups(huntData.groups || []);
        }
      } else {
        triggerToast('Failed to write target group.', false);
      }
    } catch (e) {
      triggerToast('Error adding external channel.', false);
    } finally {
      setIsAddingHunterGroup(false);
    }
  };

  const handleTriggerInstantSweep = async () => {
    setIsSweepingHunter(true);
    try {
      const res = await fetch('/api/telegram/hunter/trigger-scan', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          triggerToast(`Sweep completed on ${data.group_name}! Converted/recruited options leads: ${data.recruited}`, true);
          // Refresh configuration message list
          const configRes = await fetch('/api/telegram/config');
          if (configRes.ok) {
            const configData = await configRes.json();
            setTelegramConfig(configData.config);
            setTgLogs(configData.logs || []);
            setTelegramMockUsers(configData.users || []);
          }
          // Refresh hunter groups data
          const huntRes = await fetch('/api/telegram/hunter-groups');
          if (huntRes.ok) {
            const huntData = await huntRes.json();
            setHunterGroups(huntData.groups || []);
          }
        } else {
          triggerToast(data.message || 'Error occurred during target scanner sweep.', false);
        }
      } else {
        triggerToast('Failed to trigger scan.', false);
      }
    } catch (e) {
      triggerToast('Error initiating automated recruitment scan.', false);
    } finally {
      setIsSweepingHunter(false);
    }
  };


  // Generate simulated 30-day performance data
  const performanceData = useMemo(() => {
    const data = [];
    let baseVolume = 25000;
    let baseProfit = 1200;
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      baseVolume = Math.max(5000, baseVolume + (Math.random() - 0.45) * 5000);
      baseProfit = Math.max(200, baseProfit + (Math.random() - 0.45) * 500);
      data.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        volume: Math.floor(baseVolume),
        profit: Math.floor(baseProfit)
      });
    }
    return data;
  }, []);

  const telegramGrowthData = useMemo(() => {
    const data = [];
    let baseMembers = 1250;
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const newMembers = Math.floor(Math.random() * 50) + 10;
      baseMembers += newMembers;
      data.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        newMembers: newMembers,
        totalMembers: baseMembers
      });
    }
    return data;
  }, []);

  const fetchWhatsAppConfig = async () => {
    try {
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setWhatsappConfig(data.config);
        }
      }
    } catch (e) {
      console.error('Error fetching WhatsApp config:', e);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    setIsSavingWhatsappConfig(true);
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappConfig(data.config);
        triggerToast('WhatsApp configuration updated successfully.', true);
      } else {
        triggerToast('Failed to update WhatsApp configuration.', false);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error saving WhatsApp configuration', false);
    } finally {
      setIsSavingWhatsappConfig(false);
    }
  };

  // Auto-restore admin session from localStorage if previously authenticated
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedKey = localStorage.getItem('knex_admin_session_token');
      if (savedKey && !isAuthenticated) {
        setAdminKey(savedKey);
        setIsAuthenticated(true);
        fetchData(savedKey);
      }
    } catch {}
  }, [isOpen]);

  // Poll for real-time updates every 10 seconds while authenticated
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      // Always fetch transactions to keep notification badges updated
      fetch('/api/admin/transactions', { headers: { 'x-admin-key': adminKey } })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPendingDeposits(data.pendingDeposits || []);
            setCompletedDeposits(data.completedDeposits || []);
            setWithdrawals(data.withdrawals || []);
          }
        })
        .catch(() => {});

      if (activeTab === 'telegram') {
        fetch('/api/telegram/config')
          .then(res => res.json())
          .then(data => {
            if (data.config) {
              setTelegramConfig(data.config);
              setTgLogs(data.logs || []);
              setTelegramMockUsers(data.users || []);
            }
          })
          .catch(() => {});
        fetchTelegramAddons();
        fetchWhatsAppConfig(); // Fetch whatsapp config too
      }
    }, 10000);
    return () => clearInterval(intervalId);
  }, [isOpen, isAuthenticated, adminKey, activeTab]);

  // Simulate Facebook bot status changes
  useEffect(() => {
    if (!fbBotConfig.enabled) {
      setFacebookBotStatus('idle');
      return;
    }
    
    const interval = setInterval(() => {
      const weightedStatuses = ['active', 'active', 'active', 'active', 'idle', 'error'];
      const nextStatus = weightedStatuses[Math.floor(Math.random() * weightedStatuses.length)] as 'active' | 'idle' | 'error';
      
      setFacebookBotStatus(prevStatus => {
        if (prevStatus !== nextStatus) return nextStatus;
        return prevStatus;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fbBotConfig.enabled]);

  useEffect(() => {
    if (activeTab === 'telegram' && isAuthenticated) {
      fetchTelegramAddons();
      fetchWhatsAppConfig();
    }
  }, [activeTab, isAuthenticated]);

  const fetchData = async (key: string) => {
    setLoading(true);
    try {
      const [usersRes, statsRes, transRes, gameRes, visitsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/stats', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/transactions', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/game-settings', { headers: { 'x-admin-key': key } }),
        fetch('/api/admin/visits', { headers: { 'x-admin-key': key } })
      ]);

      if (usersRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const statsData = await statsRes.json();
        const transData = await transRes.json();
        const gameData = await gameRes.json();
        
        if (visitsRes && visitsRes.ok) {
          const vData = await visitsRes.json();
          setVisitsData(vData);
        }

        setUsers(usersData.users);
        setStats(statsData.stats);
        setPendingDeposits(transData.pendingDeposits || []);
        setCompletedDeposits(transData.completedDeposits || []);
        setWithdrawals(transData.withdrawals || []);
        setGameSettings(gameData.settings ? { 
          paybillEnabled: true,
          btcEnabled: true,
          minDeposit: 1.00,
          minWithdrawal: 15.00,
          ...gameData.settings, 
          realWinRate: gameData.settings.realWinRate ?? 30 
        } : { 
          globalTrendBias: 0, 
          volatilityMultiplier: 1, 
          realWinRate: 30,
          paybillEnabled: true,
          btcEnabled: true,
          minDeposit: 1.00,
          minWithdrawal: 15.00
        });
        
        // Fetch Telegram configuration and logs
        try {
          const tgRes = await fetch('/api/telegram/config');
          if (tgRes.ok) {
            const tgData = await tgRes.json();
            setTelegramConfig(tgData.config);
            setTgLogs(tgData.logs || []);
            setTelegramMockUsers(tgData.users || []);
          }
        } catch (tgErr) {
          console.error('Error fetching Telegram metadata:', tgErr);
        }

        fetchTelegramAddons();

        // Fetch P2P orders & trades
        try {
          const [p2pOrdRes, p2pTrdRes] = await Promise.all([
            fetch('/api/admin/p2p/orders', { headers: { 'x-admin-key': key } }),
            fetch('/api/admin/p2p/trades', { headers: { 'x-admin-key': key } })
          ]);
          if (p2pOrdRes.ok) {
            const oData = await p2pOrdRes.json();
            setP2pOrders(oData.orders || []);
          }
          if (p2pTrdRes.ok) {
            const tData = await p2pTrdRes.json();
            setP2pTrades(tData.trades || []);
          }
        } catch (p2pErr) {
          console.error('P2P fetch error:', p2pErr);
        }

        setIsAuthenticated(true);
      } else {
        triggerToast('Invalid admin key', false);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      triggerToast('Failed to fetch data', false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          userId: editingUser.id,
          email: editingUser.email,
          fullName: editingUser.fullName,
          demoBalance: editingUser.demoBalance,
          realBalance: editingUser.realBalance,
          newPassword: editingUser.newPassword,
          forceOutcome: editingUser.forceOutcome || '',
          profitTarget: editingUser.profitTarget || 0,
          maxWinLimit: editingUser.maxWinLimit || 0,
          maxLossLimit: editingUser.maxLossLimit || 0,
          verificationStatus: editingUser.verificationStatus || 'unverified',
          isBanned: editingUser.isBanned || 0
        })
      });
      if (res.ok) {
        triggerToast('User details updated successfully', true);
        setEditingUser(null);
        fetchData(adminKey);
      } else {
        const data = await res.json();
        triggerToast('Failed to update: ' + data.message, false);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      triggerToast('Failed to update user', false);
    }
  };

  const handleToggleBanUser = async (user: User) => {
    const currentBanned = user.isBanned === 1;
    const nextBanned = currentBanned ? 0 : 1;
    const actionWord = nextBanned === 1 ? 'Ban & Suspend' : 'Unban & Reactivate';
    
    try {
      const res = await fetch('/api/admin/users/toggle-ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          userId: user.id,
          isBanned: nextBanned
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBanned: nextBanned } : u));
        triggerToast(`${actionWord} complete for ${user.fullName || user.email}`, true);
      } else {
        triggerToast(data.message || 'Failed to toggle ban status', false);
      }
    } catch (err: any) {
      console.error('Toggle ban error:', err);
      triggerToast('Error updating ban status: ' + err.message, false);
    }
  };

  const handleProcessDeposit = async (id: string, action: 'approve' | 'decline', isConfirmed?: boolean) => {
    if (!isConfirmed) {
      setConfirmingDepositId(id);
      setConfirmingDepositAction(action);
      return;
    }

    try {
      const res = await fetch('/api/admin/process-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ depositId: id, action })
      });

      if (res.ok) {
        setPendingDeposits(prev => prev.filter(d => d.id !== id));
        setConfirmingDepositId(null);
        setConfirmingDepositAction(null);
        // Refresh users and stats
        fetchData(adminKey);
        triggerToast(`Deposit has been successfully ${action === 'approve' ? 'approved and credited' : 'declined'}.`, true);
      } else {
        triggerToast('Failed to process deposit', false);
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      triggerToast('Network error processing deposit.', false);
    }
  };

  const handleProcessWithdrawal = async (id: string, action: 'approve' | 'decline', isConfirmed?: boolean) => {
    if (!isConfirmed) {
      setConfirmingWithdrawalId(id);
      setConfirmingWithdrawalAction(action);
      return;
    }

    try {
      const res = await fetch('/api/admin/process-withdrawal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ withdrawalId: id, action })
      });

      if (res.ok) {
        setConfirmingWithdrawalId(null);
        setConfirmingWithdrawalAction(null);
        // Refresh all administrative data
        fetchData(adminKey);
        triggerToast(`Withdrawal has been successfully ${action === 'approve' ? 'approved' : 'declined and refunded'}.`, true);
      } else {
        const errData = await res.json();
        triggerToast(errData.message || 'Failed to process withdrawal', false);
      }
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      triggerToast('Network error processing withdrawal.', false);
    }
  };

  const handleUpdateGameSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGameLoading(true);
    try {
      const res = await fetch('/api/admin/game-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ settings: gameSettings })
      });

      if (res.ok) {
        triggerToast('Game settings updated successfully', true);
      } else {
        triggerToast('Failed to update game settings', false);
      }
    } catch (error) {
      console.error('Error updating game settings:', error);
    } finally {
      setIsGameLoading(false);
    }
  };

  const handleClearAllBalances = async () => {
    if (!window.confirm('WARNING: Are you sure you want to clear ALL user account balances (Demo & Real) to $0.00? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/clear-all-balances', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      const data = await res.json();
      if (data.success) {
        alert('All user account balances successfully cleared to $0.00.');
        window.location.reload();
      } else {
        alert(data.message || 'Failed to clear balances');
      }
    } catch (e: any) {
      alert('Error clearing balances: ' + e.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          key: adminKey.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.adminKey) {
        setAdminKey(data.adminKey);
        fetchData(data.adminKey);
        triggerToast('Super Admin Session Authenticated!', true);
      } else {
        const msg = data.message + (data.debug ? ' (' + JSON.stringify(data.debug) + ')' : '');
        triggerToast(msg || 'Invalid Admin Credentials or Security Key.', false);
      }
    } catch (err: any) {
      triggerToast('Admin Authentication Error: ' + err.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handlePinNotification = async (messageId: string) => {
    setIsPinning(true);
    try {
      const res = await fetch('/api/telegram/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId })
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig(data.config);
        setTgLogs(data.logs || []);
      } else {
        triggerToast('Failed to pin notification message.', false);
      }
    } catch (e) {
      console.error('Pin error:', e);
    } finally {
      setIsPinning(false);
    }
  };

  const handleUnpinNotification = async () => {
    setIsPinning(true);
    try {
      const res = await fetch('/api/telegram/unpin', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig(data.config);
        setTgLogs(data.logs || []);
      } else {
        triggerToast('Failed to unpin notification message.', false);
      }
    } catch (e) {
      console.error('Unpin error:', e);
    } finally {
      setIsPinning(false);
    }
  };

  const handleBroadcastMessage = async () => {
    if (!customBroadcast.trim()) return;
    setIsBroadcasting(true);
    let prefix = '';
    if (broadcastType === 'signal') prefix = '🎯 [ADMIN SIGNAL] ';
    else if (broadcastType === 'alert') prefix = '⚠️ [ADMIN ALERT] ';
    else prefix = '📢 [ADMIN UPDATE] ';

    const finalMsg = prefix + customBroadcast;
    
    try {
      const res = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalMsg,
          type: broadcastType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTgLogs(data.logs || []);
        setCustomBroadcast('');
        triggerToast(data.realSent ? 'Dispatched real message to Telegram client!' : 'Added notice to Group broadcast queue.', true);
      } else {
        triggerToast('Failed to send broadcast', false);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error broadcasting message', false);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleUpdateTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramConfig) return;
    setIsSavingTgConfig(true);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          groupChatId: telegramConfig.groupChatId,
          groupLink: telegramConfig.groupLink,
          webhookActive: telegramConfig.webhookActive,
          autoInviteDMs: telegramConfig.autoInviteDMs,
          autoSimulateIntervalEnabled: telegramConfig.autoSimulateIntervalEnabled,
          autoSimulateIntervalSeconds: telegramConfig.autoSimulateIntervalSeconds,
          autoSimulateMessageTypes: telegramConfig.autoSimulateMessageTypes,
          autoSimulateActiveUsersCount: telegramConfig.autoSimulateActiveUsersCount,
          hunterIntervalEnabled: telegramConfig.hunterIntervalEnabled,
          hunterIntervalSeconds: telegramConfig.hunterIntervalSeconds,
          hunterAnnounceOnMainGroup: telegramConfig.hunterAnnounceOnMainGroup,
          templateVIPCampaign: telegramConfig.templateVIPCampaign,
          templateAlert: telegramConfig.templateAlert,
          templateSignal: telegramConfig.templateSignal
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramConfig(data.config);
        setTgLogs(data.logs || []);
        triggerToast('Telegram configuration updated successfully.', true);
      } else {
        triggerToast('Failed to update Telegram configuration.', false);
      }
    } catch (e) {
      console.error(e);
      triggerToast('Error updating configuration', false);
    } finally {
      setIsSavingTgConfig(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col ${
      isDirectRoute 
        ? 'w-full h-full' 
        : 'p-0 sm:p-4 sm:flex sm:items-center sm:justify-center bg-black/75 backdrop-blur-md'
    }`}>
      <div className={`relative w-full h-full ${
        isDirectRoute 
          ? '' 
          : 'sm:h-auto sm:max-h-[94dvh] sm:max-w-6xl sm:rounded-2xl sm:border'
      } flex flex-col shadow-2xl transition-all box-border overflow-hidden ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Global Pinned Header */}
        <div className={`flex items-center justify-between px-3.5 sm:px-6 py-3 border-b shrink-0 ${
          theme === 'dark' ? 'border-slate-800/80 bg-slate-950/90' : 'border-slate-200 bg-slate-50/90'
        } backdrop-blur-md`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight truncate">
                  KNEX Admin Console
                </h2>
                {isDirectRoute && (
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 font-mono">
                    Portal Mode
                  </span>
                )}
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 truncate">
                Risk controls, external wallet balances, user accounts & live escrow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsAuthenticated(false);
                  setAdminKey('');
                }}
                className="px-2.5 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition cursor-pointer"
                title="Log out from console"
              >
                Log Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800 border border-slate-800/80 transition-all cursor-pointer"
              title={isDirectRoute ? "Exit to Trading Terminal" : "Close"}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-md mx-auto space-y-6">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mb-2">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Super Administrator Access</h3>
                <p className="text-xs text-slate-400">Authenticate session credentials to unlock exchange control systems.</p>
              </div>

              {/* Login Mode Tabs */}
              <div className={`flex p-1 rounded-lg w-full gap-1 border ${
                theme === 'dark' ? 'bg-slate-900/65 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setLoginMethod('creds')}
                  className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                    loginMethod === 'creds' 
                      ? 'bg-yellow-500 text-slate-950 font-extrabold shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  GADMIN Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('key')}
                  className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                    loginMethod === 'key' 
                      ? 'bg-yellow-500 text-slate-950 font-extrabold shadow-sm'
                      : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Security Key
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginMethod === 'creds' ? (
                  <>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Admin Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter Username (e.g. GADMIN)"
                        required
                        className={`w-full rounded-lg px-3.5 py-3 text-sm font-semibold border transition-all ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                            : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Password (e.g. GADMIN)"
                        required
                        className={`w-full rounded-lg px-3.5 py-3 text-sm font-semibold border transition-all ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                            : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                        }`}
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Security Access Key
                    </label>
                    <input
                      type="password"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="Enter security access token"
                      required
                      className={`w-full rounded-lg px-3.5 py-3 text-sm font-semibold border transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-white focus:border-yellow-500'
                          : 'bg-white border-gray-200 text-black focus:border-yellow-500'
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest py-3.5 rounded-lg transition-all disabled:opacity-50 mt-4 cursor-pointer shadow-lg shadow-yellow-500/20"
                >
                  {loading ? 'Authenticating Session...' : 'Authenticate Admin Console'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Command Desk Top Bar / Backup */}
            <div className={`px-3.5 sm:px-6 py-2.5 border-b shrink-0 flex flex-wrap items-center justify-between gap-2 ${
              theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Environment:</span>
                <span className="text-[10px] font-mono font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  {users.length} Users Registered
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  1% Fee Pool: ${formatMoney(stats?.totalFeesCollected || 0)}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  const backup = users.map(u => ({ id: u.id, email: u.email, name: u.fullName, real: u.realBalance, dev: u.demoBalance, pw: u.plainPassword, deposited: u.totalDeposited }));
                  const text = JSON.stringify(backup, null, 2);
                  navigator.clipboard.writeText(text);
                  triggerToast("System users backup copied to clipboard!", true);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border border-slate-700 transition"
              >
                <Copy className="h-3 w-3" />
                <span>Backup Accounts</span>
              </button>
            </div>

            {/* Horizontal Scrollable Tabs Bar */}
            <div className={`flex items-center space-x-1 border-b px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar shrink-0 ${
              theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}>
              {[
                { id: 'stats', label: 'Overview', icon: TrendingUp },
                { id: 'users', label: 'Users & Balances', icon: Users },
                { id: 'deposits', label: 'Pending Deposits', icon: ArrowDownCircle },
                { id: 'completed_deposits', label: 'Completed Deposits', icon: ArrowDownCircle },
                { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownCircle },
                { id: 'p2p', label: 'P2P Escrow', icon: Sparkles },
                { id: 'game', label: 'Game Control', icon: DollarSign },
                { id: 'telegram', label: 'Social Bots', icon: BarChart2 },
                { id: 'marketing', label: 'Marketing & Posters', icon: Megaphone },
                { id: 'visits', label: 'Traffic', icon: Globe }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase whitespace-nowrap transition-all rounded-lg select-none cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-white bg-transparent hover:bg-slate-900/60'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.id === 'deposits' && pendingDeposits.length > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full leading-none">{pendingDeposits.length}</span>
                    )}
                    {tab.id === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full leading-none">{withdrawals.filter(w => w.status === 'pending').length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Tab Content Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
              {activeTab === 'stats' && stats && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Users</p>
                        <p className="text-2xl font-black mt-1 font-mono">{stats.totalUsers}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Onboarded client nodes</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Users className="h-5 w-5 text-yellow-500" />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Deposits</p>
                        <p className="text-2xl font-black mt-1 text-emerald-500 font-mono">${stats.totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Confirmed capital ledger</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Deposit Events</p>
                        <p className="text-2xl font-black mt-1 text-amber-500 font-mono">{stats.totalDepositsCount}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Raw payment vouchers</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <ArrowDownCircle className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Withdrawal requests</p>
                        <p className="text-2xl font-black mt-1 text-violet-500 font-mono">{stats.totalWithdrawals}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Pending and paid items</p>
                      </div>
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <TrendingUp className="h-5 w-5 text-violet-500" />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Business Fees (1%)</p>
                        <p className="text-2xl font-black mt-1 text-cyan-400 font-mono">${(stats.totalFeesCollected || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Retained crypto deposit revenue</p>
                      </div>
                      <div className="p-2 rounded-lg bg-cyan-500/10">
                        <Shield className="h-5 w-5 text-cyan-400" />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl p-4 border transition-all ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Top Single Funding</p>
                        <p className="text-2xl font-black mt-1 text-yellow-500 font-mono">${stats.topDepositAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Record credential ticket</p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <DollarSign className="h-5 w-5 text-yellow-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <h3 className="text-lg font-bold">Performance Dashboard (Last 30 Days)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Daily Trade Volume</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="volume" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVolume)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Net Profit</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </>
              )}

              {activeTab === 'users' && (() => {
                const totalRegistered = users.length;
                const onlineCount = users.filter((u) => {
                  if (!u.lastLogin) return false;
                  return (Date.now() - new Date(u.lastLogin).getTime()) < 30000;
                }).length;
                const dormantCount = totalRegistered - onlineCount;

                const filtered = users.filter((u) => {
                  const query = userSearchQuery.toLowerCase().trim();
                  const matchesSearch = !query || 
                    u.email.toLowerCase().includes(query) ||
                    u.fullName.toLowerCase().includes(query) ||
                    u.id.toLowerCase().includes(query);

                  if (!matchesSearch) return false;

                  const isOnline = u.lastLogin ? (Date.now() - new Date(u.lastLogin).getTime()) < 30000 : false;
                  if (userFilterStatus === 'active') {
                    return isOnline;
                  }
                  if (userFilterStatus === 'inactive') {
                    return !isOnline;
                  }
                  return true;
                });

                const formatLastSeen = (lastLogin?: string) => {
                  if (!lastLogin) return 'Never';
                  const diffMs = Date.now() - new Date(lastLogin).getTime();
                  if (diffMs < 5000) return 'Just now';
                  const diffSec = Math.floor(diffMs / 1000);
                  if (diffSec < 60) return `${diffSec}s ago`;
                  const diffMin = Math.floor(diffSec / 60);
                  if (diffMin < 60) return `${diffMin}m ago`;
                  const diffHr = Math.floor(diffMin / 60);
                  if (diffHr < 24) return `${diffHr}h ago`;
                  return new Date(lastLogin).toLocaleDateString() + ' ' + new Date(lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                };

                return (
                  <>
                    <div className="space-y-6 text-left">
                    {/* Header with quick stats */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">User Management Terminal</h3>
                        <p className="text-xs text-slate-500">Monitor client session presence, balances, and option constraints in real-time.</p>
                      </div>
                    </div>

                    {/* Quick Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-xl border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Onboarded Users</div>
                        <div className="text-2xl font-mono font-bold mt-1 text-slate-900 dark:text-white">{totalRegistered}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Registered accounts in database</div>
                      </div>

                      <div className={`p-4 rounded-xl border text-left relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Online / Active Now</div>
                            <div className="text-2xl font-mono font-bold mt-1 text-emerald-500 flex items-center gap-2">
                              {onlineCount}
                              <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Actively polling or trading in past 30s</div>
                      </div>

                      <div className={`p-4 rounded-xl border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inactive / Offline</div>
                        <div className="text-2xl font-mono font-bold mt-1 text-amber-500">{dormantCount}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Dormant of line-status activity</div>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className={`p-4 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                          </span>
                          <input
                            type="text"
                            placeholder="Search by ID, Username, Email, or Name..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                          />
                          {userSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setUserSearchQuery('')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 max-sm:w-full">
                          <button
                            type="button"
                            onClick={() => setUserFilterStatus('all')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-wider flex-1 sm:flex-none transition-all ${userFilterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            All ({totalRegistered})
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserFilterStatus('active')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-wider flex-1 sm:flex-none transition-all flex items-center justify-center gap-1.5 ${userFilterStatus === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                            Active ({onlineCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserFilterStatus('inactive')}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-wider flex-1 sm:flex-none transition-all ${userFilterStatus === 'inactive' ? 'bg-amber-600 text-slate-950' : 'text-slate-400 hover:text-slate-300'}`}
                          >
                            Inactive ({dormantCount})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Responsive User List: Desktop Table + Mobile Cards */}
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className={`w-full text-sm border-collapse rounded-lg overflow-hidden ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
                        <thead>
                          <tr className={theme === 'dark' ? 'bg-slate-900 border-b border-slate-800' : 'bg-gray-100 border-b border-gray-200'}>
                            <th className="p-3 text-left font-bold text-xs uppercase tracking-wider text-slate-400">Status</th>
                            <th className="p-3 text-left font-bold text-xs uppercase tracking-wider text-slate-400">User Identification</th>
                            <th className="p-3 text-right font-bold text-xs uppercase tracking-wider text-slate-400">Demo Account</th>
                            <th className="p-3 text-right font-bold text-xs uppercase tracking-wider text-slate-400">Real Account</th>
                            <th className="p-3 text-right font-bold text-xs uppercase tracking-wider text-cyan-400">Total Deposited</th>
                            <th className="p-3 text-left font-bold text-xs uppercase tracking-wider text-slate-400">Last Seen</th>
                            <th className="p-3 text-left font-bold text-xs uppercase tracking-wider text-slate-400">Created At</th>
                            <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-slate-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-xs text-slate-500 italic bg-white dark:bg-slate-900/10">No registered users matched the search filters.</td>
                            </tr>
                          ) : (
                            filtered.map((user) => {
                              const isOnline = user.lastLogin ? (Date.now() - new Date(user.lastLogin).getTime()) < 30000 : false;
                              const isBanned = user.isBanned === 1;
                              return (
                                <tr key={user.id} className={`${theme === 'dark' ? 'hover:bg-slate-900/40 bg-slate-950/20' : 'hover:bg-gray-50 bg-white'} transition-colors`}>
                                  {/* Dynamic presence & ban identifier */}
                                  <td className="p-3">
                                    <div className="flex flex-col gap-1 items-start">
                                      <div className="flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                          {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                                        </span>
                                      </div>
                                      {isBanned && (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                          BANNED
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  
                                  {/* Identity column */}
                                  <td className="p-3 text-left">
                                    <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <span>{user.fullName || 'Anonymous'}</span>
                                      {isBanned && <Ban className="h-3 w-3 text-rose-400" />}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                                    {user.phone && <div className="text-[10px] text-slate-500 font-mono mt-0.5">📞 {user.phone}</div>}
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">UID: {user.id}</div>
                                    <div className="text-[10px] text-amber-500 font-mono font-bold mt-1 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 w-max flex items-center gap-1">
                                      <span>🔑 PW:</span>
                                      <span className="select-all">{user.plainPassword || '(Unknown/Hashed)'}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          if (user.plainPassword) {
                                            navigator.clipboard.writeText(user.plainPassword);
                                            setCopiedUid(user.id);
                                            setTimeout(() => setCopiedUid(null), 1500);
                                          }
                                        }}
                                        className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                                        title="Copy Password"
                                      >
                                        {copiedUid === user.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                      </button>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {user.verificationStatus === 'verified' ? (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 leading-normal">
                                          ✔ VERIFIED
                                        </span>
                                      ) : user.verificationStatus === 'rejected' ? (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 leading-normal">
                                          ✖ REJECTED
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 leading-normal">
                                          ⏰ UNVERIFIED
                                        </span>
                                      )}
                                      {user.forceOutcome && (
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border leading-normal ${user.forceOutcome === 'win' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                          FORCED: {user.forceOutcome}
                                        </span>
                                      )}
                                      {user.profitTarget && user.profitTarget > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 leading-normal">
                                          TARGET: ${user.profitTarget}
                                        </span>
                                      ) : null}
                                      {user.maxWinLimit && user.maxWinLimit > 0 ? (
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 leading-normal">
                                          MAX_WIN: ${user.maxWinLimit}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>

                                  {/* Demo balance */}
                                  <td className="p-3 text-right font-mono text-xs font-semibold text-slate-800 dark:text-slate-300">
                                    ${formatMoney(user.demoBalance)}
                                  </td>

                                  {/* Real balance */}
                                  <td className="p-3 text-right font-mono text-xs font-bold">
                                    <span className={user.realBalance > 0 ? 'text-emerald-500' : 'text-slate-500'}>
                                      ${formatMoney(user.realBalance)}
                                    </span>
                                  </td>

                                  {/* Total Deposited */}
                                  <td className="p-3 text-right font-mono text-xs font-bold">
                                    <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                      ${formatMoney(user.totalDeposited)}
                                    </span>
                                  </td>

                                  {/* activity logs */}
                                  <td className="p-3 text-xs text-left">
                                    <div className="font-semibold text-slate-800 dark:text-slate-300">
                                      {formatLastSeen(user.lastLogin)}
                                    </div>
                                    {user.lastLogin && (
                                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                        Synced: {new Date(user.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                    )}
                                  </td>

                                  {/* Created date */}
                                  <td className="p-3 text-xs text-slate-500 text-left">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                  </td>

                                  {/* Actions */}
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleBanUser(user)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                          isBanned
                                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                                        }`}
                                        title={isBanned ? 'Unban this user' : 'Ban and block this user'}
                                      >
                                        {isBanned ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                        <span>{isBanned ? 'Unban' : 'Ban'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingUser({ ...user, newPassword: '' })}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-all shadow hover:shadow-yellow-500/10 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View (Optimized for Small Screens) */}
                    <div className="block md:hidden space-y-3">
                      {filtered.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500 italic rounded-xl border border-dashed border-slate-800 p-4">
                          No registered users found matching the search filters.
                        </div>
                      ) : (
                        filtered.map((user) => {
                          const isOnline = user.lastLogin ? (Date.now() - new Date(user.lastLogin).getTime()) < 30000 : false;
                          const isBanned = user.isBanned === 1;
                          return (
                            <div 
                              key={user.id} 
                              className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-gray-200 shadow-sm'
                              }`}
                            >
                              {/* Header: Name, presence & active status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                      {user.fullName || 'Anonymous Trader'}
                                    </span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                      isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/15 text-slate-400'
                                    }`}>
                                      {isOnline ? '● Online' : 'Offline'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">{user.email}</div>
                                </div>
                                <div className="shrink-0">
                                  {isBanned ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                                      <Ban className="h-2.5 w-2.5" />
                                      <span>Banned</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                      <CheckCircle className="h-2.5 w-2.5" />
                                      <span>Active</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 3-Column Financial Balances Bar */}
                              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/40 dark:bg-slate-950/60 border border-slate-800/60">
                                <div>
                                  <div className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Demo Bal</div>
                                  <div className="text-xs font-mono font-bold text-slate-300">${formatMoney(user.demoBalance)}</div>
                                </div>
                                <div>
                                  <div className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Real Bal</div>
                                  <div className={`text-xs font-mono font-bold ${user.realBalance > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    ${formatMoney(user.realBalance)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[8px] uppercase font-black text-cyan-400 tracking-wider">Deposited</div>
                                  <div className="text-xs font-mono font-bold text-cyan-400">
                                    ${formatMoney(user.totalDeposited)}
                                  </div>
                                </div>
                              </div>

                              {/* Details tags & PW */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-slate-400">
                                <div className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                                  <span>🔑 PW:</span>
                                  <span className="select-all font-bold">{user.plainPassword || '(Hashed)'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (user.plainPassword) {
                                        navigator.clipboard.writeText(user.plainPassword);
                                        setCopiedUid(user.id);
                                        setTimeout(() => setCopiedUid(null), 1500);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-white ml-0.5 cursor-pointer"
                                    title="Copy Password"
                                  >
                                    {copiedUid === user.id ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                                  </button>
                                </div>
                                {user.phone && <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">📞 {user.phone}</span>}
                                <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">ID: {user.id.slice(0, 8)}...</span>
                                {user.verificationStatus && (
                                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                                    user.verificationStatus === 'verified' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {user.verificationStatus}
                                  </span>
                                )}
                                {user.forceOutcome && (
                                  <span className="bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Forced: {user.forceOutcome}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/50">
                                <button
                                  type="button"
                                  onClick={() => handleToggleBanUser(user)}
                                  className={`w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isBanned 
                                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  {isBanned ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                  <span>{isBanned ? 'Unban Account' : 'Ban Account'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingUser({ ...user, newPassword: '' })}
                                  className="w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-bold"
                                >
                                  <Settings className="h-3 w-3" />
                                  <span>Edit Details</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Edit User Form/Modal Inline */}
                  {editingUser && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className={`relative w-full max-w-md rounded-lg border p-6 shadow-2xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-yellow-500">Edit User Details</h3>
                        <form onSubmit={handleUpdateUserDetails} className="space-y-4">
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Email Address</label>
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Full Name</label>
                            <input
                              type="text"
                              value={editingUser.fullName}
                              onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Demo Balance</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.demoBalance}
                                onChange={e => setEditingUser({ ...editingUser, demoBalance: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Real Balance</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.realBalance}
                                onChange={e => setEditingUser({ ...editingUser, realBalance: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Force Outcome</label>
                              <select
                                value={editingUser.forceOutcome || ''}
                                onChange={e => setEditingUser({ ...editingUser, forceOutcome: e.target.value })}
                                className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              >
                                <option value="">No Override</option>
                                <option value="win">Force Win</option>
                                <option value="loss">Force Loss</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Profit Target (Force Loss to block withdraws)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.profitTarget || ''}
                                onChange={e => setEditingUser({ ...editingUser, profitTarget: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Max Trade Win Limit ($) <span className="text-slate-500 font-normal lowercase">(0 = Unlimited)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.maxWinLimit || ''}
                                onChange={e => setEditingUser({ ...editingUser, maxWinLimit: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Max Trade Loss Limit ($) <span className="text-slate-500 font-normal lowercase">(0 = Unlimited)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                value={editingUser.maxLossLimit || ''}
                                onChange={e => setEditingUser({ ...editingUser, maxLossLimit: parseFloat(e.target.value) || 0 })}
                                className={`w-full rounded px-3 py-2 text-sm border font-mono focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Verification Status</label>
                            <select
                              value={editingUser.verificationStatus || 'unverified'}
                              onChange={e => setEditingUser({ ...editingUser, verificationStatus: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                            >
                              <option value="unverified">Unverified (Default)</option>
                              <option value="pending">⏳ Pending Review</option>
                              <option value="verified">Verified (Approved)</option>
                              <option value="rejected">Rejected / Blacklisted</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-2.5 pt-1">
                            <input
                              type="checkbox"
                              id="isBannedCheckbox"
                              checked={editingUser.isBanned === 1}
                              onChange={e => setEditingUser({ ...editingUser, isBanned: e.target.checked ? 1 : 0 })}
                              className="accent-red-500 rounded h-4 w-4"
                            />
                            <label htmlFor="isBannedCheckbox" className="text-xs font-bold text-red-400 cursor-pointer select-none">
                              Suspend / Ban Account (Block Login & Trading)
                            </label>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Current Login Password</label>
                            <div className={`w-full rounded px-3 py-2 text-sm border font-mono select-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-yellow-500' : 'bg-gray-100 border-gray-300 text-yellow-700'}`}>
                              {editingUser.plainPassword || '(Unknown/Hashed)'}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Reset Password <span className="lowercase normal-case font-normal">(Leave blank to keep current)</span></label>
                            <input
                              type="password"
                              placeholder="Enter new password"
                              value={editingUser.newPassword || ''}
                              onChange={e => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                              className={`w-full rounded px-3 py-2 text-sm border focus:outline-none focus:border-yellow-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 text-black'}`}
                            />
                          </div>
                          <div className="pt-4">
                            <button
                              type="submit"
                              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold py-2.5 rounded text-xs uppercase tracking-wider"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

              {activeTab === 'deposits' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Pending M-Pesa Deposits</h3>
                  {pendingDeposits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No pending deposits found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingDeposits.map(d => (
                        <div key={d.id} className="border border-slate-800 rounded-lg p-4 bg-slate-900/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">User ID / Email</p>
                              <p className="text-sm font-mono truncate max-w-[200px]">{d.userId}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Amount</p>
                              <p className="text-lg font-bold text-green-500">${d.amount}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Receipt Preview</p>
                            <a href={d.receiptPath} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-black rounded border border-slate-700 overflow-hidden group">
                              <img src={d.receiptPath} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white uppercase">View Full Image</span>
                              </div>
                            </a>
                          </div>

                          {d.message && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Transaction Message</p>
                              <div className="bg-slate-950 p-2 rounded border border-slate-700 max-h-24 overflow-y-auto">
                                <p className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap">{d.message}</p>
                              </div>
                            </div>
                          )}

                          {confirmingDepositId === d.id ? (
                            <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-center space-y-2">
                              <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                                Confirm {confirmingDepositAction === 'approve' ? 'APPROVAL' : 'DECLINE'} of this transaction?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleProcessDeposit(d.id, confirmingDepositAction!, true)}
                                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-1.5 rounded text-[10px] uppercase border-none cursor-pointer"
                                >
                                  Yes, Process
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmingDepositId(null);
                                    setConfirmingDepositAction(null);
                                  }}
                                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-1.5 rounded text-[10px] uppercase border-none cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  setConfirmingDepositId(d.id);
                                  setConfirmingDepositAction('approve');
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded text-xs uppercase border-none cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmingDepositId(d.id);
                                  setConfirmingDepositAction('decline');
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs uppercase border-none cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'completed_deposits' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Completed Deposits</h3>
                  {completedDeposits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No completed deposits found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                            <th className="p-3 font-bold">User</th>
                            <th className="p-3 font-bold text-right">Amount</th>
                            <th className="p-3 font-bold">Coin/Network</th>
                            <th className="p-3 font-bold">Tx Hash</th>
                            <th className="p-3 font-bold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedDeposits.map(d => (
                            <tr key={d.txHash} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                              <td className="p-3 font-mono text-xs max-w-[150px] truncate">{d.userId}</td>
                              <td className="p-3 text-right font-bold text-green-500">${d.amount}</td>
                              <td className="p-3 text-xs">{d.coin} / {d.network}</td>
                              <td className="p-3 font-mono text-[10px] text-slate-500 max-w-[150px] truncate">{d.txHash}</td>
                              <td className="p-3 text-xs">{new Date(d.creditedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

               {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Withdrawals</h3>
                  {withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-bold border border-slate-800 rounded-lg">
                      No withdrawals found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 tracking-wider">
                            <th className="p-3 font-bold">User</th>
                            <th className="p-3 font-bold text-right font-mono">Amount</th>
                            <th className="p-3 font-bold">Method</th>
                            <th className="p-3 font-bold">Destination</th>
                            <th className="p-3 font-bold">Status</th>
                            <th className="p-3 font-bold">Date</th>
                            <th className="p-3 font-bold text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawals.map(w => {
                            const u = users.find(usr => usr.id === w.userId || usr.email === w.userId);
                            return (
                              <tr key={w.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                                <td className="p-3">
                                  <div className="font-mono text-xs max-w-[150px] truncate">{w.userId}</div>
                                  {u ? (
                                    <div className="space-y-1 mt-1">
                                      <div className="text-[10px] font-bold text-slate-400">{u.fullName}</div>
                                      {u.verificationStatus === 'verified' ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 leading-normal">
                                          ✔ VERIFIED KYC
                                        </span>
                                      ) : u.verificationStatus === 'rejected' ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 leading-normal">
                                          ✖ KYC REJECTED
                                        </span>
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 leading-normal">
                                          ⏰ UNVERIFIED
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-500 italic">User profile not preloaded</div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold text-red-500 font-mono">${w.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-xs uppercase">{w.paymentMethod || 'Crypto'} ({w.coin})</td>
                                <td className="p-3 font-mono text-[10px] text-slate-500 max-w-[150px] truncate select-all" title={w.address}>{w.address}</td>
                                <td className="p-3 text-[10px] font-bold uppercase">
                                  <span className={`px-2 py-1 rounded-full ${w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : w.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {w.status}
                                  </span>
                                </td>
                                <td className="p-3 text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                                <td className="p-3">
                                  {w.status === 'pending' ? (
                                    confirmingWithdrawalId === w.id ? (
                                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-1.5 text-center space-y-1.5 min-w-[140px]">
                                        <p className="text-[9px] font-bold text-yellow-400 uppercase">
                                          Confirm {confirmingWithdrawalAction}?
                                        </p>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleProcessWithdrawal(w.id, confirmingWithdrawalAction!, true)}
                                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-1 rounded text-[9px] uppercase border-none cursor-pointer"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() => {
                                              setConfirmingWithdrawalId(null);
                                              setConfirmingWithdrawalAction(null);
                                            }}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-1 rounded text-[9px] uppercase border-none cursor-pointer"
                                          >
                                            No
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1.5 min-w-[140px]">
                                        <button
                                          onClick={() => {
                                            setConfirmingWithdrawalId(w.id);
                                            setConfirmingWithdrawalAction('approve');
                                          }}
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-[10px] uppercase border-none cursor-pointer"
                                        >
                                          Approve/Pay
                                        </button>
                                        <button
                                          onClick={() => {
                                            setConfirmingWithdrawalId(w.id);
                                            setConfirmingWithdrawalAction('decline');
                                          }}
                                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-[10px] uppercase border-none cursor-pointer"
                                        >
                                          Decline/Refund
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center italic">
                                      Processed
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'p2p' && (
                <div className="space-y-6">
                  {/* P2P Trades & Escrow Disputes */}
                  <div className="border border-slate-800 rounded-lg p-5 bg-slate-900 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-yellow-500" />
                          P2P Active Trades & Escrow Disputes ({p2pTrades.length})
                        </h3>
                        <p className="text-xs text-slate-400">Monitor live P2P buyer/seller trades and force resolve disputes.</p>
                      </div>
                      <button 
                        onClick={() => fetchData(adminKey)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded cursor-pointer transition border border-slate-700"
                      >
                        Refresh Trades
                      </button>
                    </div>

                    {p2pTrades.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No active P2P trades recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider">
                              <th className="p-3">Trade ID</th>
                              <th className="p-3">Buyer ID</th>
                              <th className="p-3">Seller ID</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Fiat Total</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {p2pTrades.map((trade) => {
                              const isDisputed = trade.status === 'disputed';
                              return (
                                <tr key={trade.id} className={`hover:bg-slate-800/40 ${isDisputed ? 'bg-red-950/30' : ''}`}>
                                  <td className="p-3 font-mono text-[11px] font-bold text-slate-200">{trade.id}</td>
                                  <td className="p-3 font-mono text-slate-300">{trade.buyer_id}</td>
                                  <td className="p-3 font-mono text-slate-300">{trade.seller_id}</td>
                                  <td className="p-3 font-bold text-emerald-400">{trade.amount} {trade.coin}</td>
                                  <td className="p-3 font-bold text-yellow-400">{trade.fiat_amount} {trade.fiat_currency}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                      trade.status === 'disputed' ? 'bg-red-500 text-white animate-pulse' :
                                      trade.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                      trade.status === 'payment_sent' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                      'bg-slate-800 text-slate-300'
                                    }`}>
                                      {trade.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => setSelectedDisputeChat(trade)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded cursor-pointer transition"
                                    >
                                      Inspect Chat & Resolve
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* P2P Merchant Ads */}
                  <div className="border border-slate-800 rounded-lg p-5 bg-slate-900 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-emerald-400">P2P Merchant Order Book ({p2pOrders.length})</h3>
                        <p className="text-xs text-slate-400">All registered system merchant buy/sell advertisements.</p>
                      </div>
                    </div>

                    {p2pOrders.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No merchant orders found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider">
                              <th className="p-3">Merchant</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Rate</th>
                              <th className="p-3">Limits</th>
                              <th className="p-3">Payment Method</th>
                              <th className="p-3">Completion Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {p2pOrders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-slate-800/40">
                                <td className="p-3 font-bold text-slate-200">{ord.merchant_name}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    ord.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {ord.type}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-yellow-400">{ord.unit_price} {ord.currency} / {ord.coin}</td>
                                <td className="p-3 text-slate-300">{ord.min_limit} - {ord.max_limit} {ord.currency}</td>
                                <td className="p-3 font-medium text-slate-300">{ord.payment_method}</td>
                                <td className="p-3 font-bold text-emerald-400">{ord.completion_rate}% ({ord.total_trades} trades)</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'game' && (
                <div className="max-w-2xl space-y-6">
                  <div className="border border-slate-800 rounded-lg p-6 bg-slate-900 shadow-xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-500">
                      <TrendingUp className="h-5 w-5" />
                      Global Market Control
                    </h3>
                    
                    <form onSubmit={handleUpdateGameSettings} className="space-y-6">
                      <div className="space-y-4 pb-4 border-b border-slate-800">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Platform Visibility</h4>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300">Enable Demo Mode</label>
                          <input 
                            type="checkbox" 
                            checked={demoModeEnabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDemoModeEnabled(checked);
                              localStorage.setItem('knex_admin_demo_enabled', JSON.stringify(checked));
                              localStorage.setItem('knex_admin_demo_enabled', JSON.stringify(checked));
                              window.dispatchEvent(new Event('knex-settings-changed'));
                              window.dispatchEvent(new Event('knex-settings-changed'));
                            }}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300">Enable Real Mode</label>
                          <input 
                            type="checkbox" 
                            checked={realModeEnabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRealModeEnabled(checked);
                              localStorage.setItem('knex_admin_real_enabled', JSON.stringify(checked));
                              localStorage.setItem('knex_admin_real_enabled', JSON.stringify(checked));
                              window.dispatchEvent(new Event('knex-settings-changed'));
                              window.dispatchEvent(new Event('knex-settings-changed'));
                            }}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase text-slate-400">Market Bias (Trend)</label>
                          <span className={`text-xs font-bold ${gameSettings.globalTrendBias > 0 ? 'text-green-500' : gameSettings.globalTrendBias < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                            {gameSettings.globalTrendBias > 0 ? 'Bullish' : gameSettings.globalTrendBias < 0 ? 'Bearish' : 'Neutral'} ({gameSettings.globalTrendBias})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-0.05"
                          max="0.05"
                          step="0.001"
                          value={gameSettings.globalTrendBias}
                          onChange={(e) => setGameSettings({...gameSettings, globalTrendBias: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase">
                          <span>Heavy Sell</span>
                          <span>Neutral</span>
                          <span>Heavy Buy</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold uppercase text-slate-400">Volatility Multiplier</label>
                          <span className="text-xs font-bold text-white">{gameSettings.volatilityMultiplier}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={gameSettings.volatilityMultiplier}
                          onChange={(e) => setGameSettings({...gameSettings, volatilityMultiplier: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">Real Mode Win Rate (Default)</label>
                          <span className="text-xs font-bold text-white">{gameSettings.realWinRate ?? 30}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={gameSettings.realWinRate ?? 30}
                          onChange={(e) => setGameSettings({...gameSettings, realWinRate: parseInt(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">Trading Option Payout Yield</label>
                          <span className="text-xs font-bold text-white">{gameSettings.payoutRate !== undefined ? gameSettings.payoutRate : 95.5}%</span>
                        </div>
                        <input 
                          type="range"
                          min="10"
                          max="150"
                          step="0.5"
                          value={gameSettings.payoutRate !== undefined ? gameSettings.payoutRate : 95.5}
                          onChange={(e) => setGameSettings({...gameSettings, payoutRate: parseFloat(e.target.value)})}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <span className="block text-[10px] font-bold uppercase text-indigo-400 font-mono tracking-wider">Segment Win Rates</span>
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase text-slate-400">New Users (≤ 48 hours)</label>
                            <span className="text-xs font-bold text-white">{gameSettings.segmentWinRates?.newUsers ?? 40}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={gameSettings.segmentWinRates?.newUsers ?? 40}
                            onChange={(e) => setGameSettings({
                              ...gameSettings,
                              segmentWinRates: {
                                ...(gameSettings.segmentWinRates || { newUsers: 40, vipUsers: 25, standardUsers: 30 }),
                                newUsers: parseInt(e.target.value)
                              }
                            })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-wider">VIP Users (Balance ≥ $500)</label>
                            <span className="text-xs font-bold text-white">{gameSettings.segmentWinRates?.vipUsers ?? 25}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={gameSettings.segmentWinRates?.vipUsers ?? 25}
                            onChange={(e) => setGameSettings({
                              ...gameSettings,
                              segmentWinRates: {
                                ...(gameSettings.segmentWinRates || { newUsers: 40, vipUsers: 25, standardUsers: 30 }),
                                vipUsers: parseInt(e.target.value)
                              }
                            })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Standard Users</label>
                            <span className="text-xs font-bold text-white">{gameSettings.segmentWinRates?.standardUsers ?? 30}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={gameSettings.segmentWinRates?.standardUsers ?? 30}
                            onChange={(e) => setGameSettings({
                              ...gameSettings,
                              segmentWinRates: {
                                ...(gameSettings.segmentWinRates || { newUsers: 40, vipUsers: 25, standardUsers: 30 }),
                                standardUsers: parseInt(e.target.value)
                              }
                            })}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-400">Force Global Outcome</label>
                        <select
                          value={gameSettings.forceOutcome || ''}
                          onChange={(e) => setGameSettings({...gameSettings, forceOutcome: e.target.value as any})}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all"
                        >
                          <option value="">No Override (Natural Market)</option>
                          <option value="win">Force WIN for all users</option>
                          <option value="loss">Force LOSS for all users</option>
                        </select>
                        <p className="text-[9px] text-slate-500 italic">
                          Warning: Forcing outcomes will override technical price settlement logic.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-400">Early Buyout / Cashout Control</label>
                        <select
                          value={gameSettings.cashoutMode || 'enabled'}
                          onChange={(e) => setGameSettings({...gameSettings, cashoutMode: e.target.value as any})}
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white outline-none focus:border-yellow-500 transition-all"
                        >
                          <option value="enabled">Fully Enabled (Normal Cashout)</option>
                          <option value="disabled">Fully Disabled (Remove Early Cashout)</option>
                          <option value="smart">Smart Buyout Mode (Block Win Lock, Allow Loss Reduction)</option>
                        </select>
                        <p className="text-[9px] text-slate-500 italic">
                          Manage user ability to self-liquidate positions before target expiration: disable entirely or restrict to smart mode (prevents cashing out green profits).
                        </p>
                      </div>

                      <div className="space-y-4 border-t border-slate-800 pt-4">
                        <label className="text-xs font-bold uppercase text-slate-400 block pb-1">Game & Feature Pause / Resume Controls</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={!gameSettings.binaryOptionsPaused}
                              onChange={(e) => setGameSettings({ ...gameSettings, binaryOptionsPaused: !e.target.checked })}
                              className="accent-green-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">Binary Options Trading</span>
                              <span className="text-[9px] text-slate-500">{gameSettings.binaryOptionsPaused ? 'Paused by Admin' : 'Active'}</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={!gameSettings.mflowPaused}
                              onChange={(e) => setGameSettings({ ...gameSettings, mflowPaused: !e.target.checked })}
                              className="accent-green-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">MFLOW Index Feeds</span>
                              <span className="text-[9px] text-slate-500">{gameSettings.mflowPaused ? 'Paused by Admin' : 'Active'}</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={!gameSettings.p2pPaused}
                              onChange={(e) => setGameSettings({ ...gameSettings, p2pPaused: !e.target.checked })}
                              className="accent-green-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">P2P Marketplace</span>
                              <span className="text-[9px] text-slate-500">{gameSettings.p2pPaused ? 'Paused by Admin' : 'Active'}</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={!gameSettings.depositsPaused}
                              onChange={(e) => setGameSettings({ ...gameSettings, depositsPaused: !e.target.checked })}
                              className="accent-green-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">Deposits System</span>
                              <span className="text-[9px] text-slate-500">{gameSettings.depositsPaused ? 'Paused by Admin' : 'Active'}</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={!gameSettings.withdrawalsPaused}
                              onChange={(e) => setGameSettings({ ...gameSettings, withdrawalsPaused: !e.target.checked })}
                              className="accent-green-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">Withdrawals System</span>
                              <span className="text-[9px] text-slate-500">{gameSettings.withdrawalsPaused ? 'Paused by Admin' : 'Active'}</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-slate-800 pt-4">
                        <label className="text-xs font-bold uppercase text-slate-400 block pb-1">Payment Gateways & Limits</label>
                        
                        <div className="grid grid-cols-2 gap-4 flex-row">
                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={gameSettings.paybillEnabled !== false}
                              onChange={(e) => setGameSettings({ ...gameSettings, paybillEnabled: e.target.checked })}
                              className="accent-yellow-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">M-Pesa paybill</span>
                              <span className="text-[9px] text-slate-500 font-medium">Toggle manual processing</span>
                            </div>
                          </label>

                          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900/40 p-3 rounded border border-slate-800 hover:border-slate-700 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={gameSettings.btcEnabled !== false}
                              onChange={(e) => setGameSettings({ ...gameSettings, btcEnabled: e.target.checked })}
                              className="accent-yellow-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">BTC (NOWPayments)</span>
                              <span className="text-[9px] text-slate-500 font-medium">Toggle crypto gateway</span>
                            </div>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Deposit (USD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={gameSettings.minDeposit !== undefined ? gameSettings.minDeposit : 1.00}
                              onChange={(e) => setGameSettings({ ...gameSettings, minDeposit: parseFloat(e.target.value) || 0.00 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>

                            <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Withdrawal (USD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={gameSettings.minWithdrawal !== undefined ? gameSettings.minWithdrawal : 15.00}
                              onChange={(e) => setGameSettings({ ...gameSettings, minWithdrawal: parseFloat(e.target.value) || 0.00 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Stake (USD)</label>
                            <input
                              type="number"
                              step="1"
                              value={gameSettings.minStake !== undefined ? gameSettings.minStake : 1}
                              onChange={(e) => setGameSettings({ ...gameSettings, minStake: parseFloat(e.target.value) || 1 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Max Stake (USD)</label>
                            <input
                              type="number"
                              step="1"
                              value={gameSettings.maxStake !== undefined ? gameSettings.maxStake : 5000}
                              onChange={(e) => setGameSettings({ ...gameSettings, maxStake: parseFloat(e.target.value) || 5000 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-bold text-white font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase text-slate-400 block border-t border-slate-800 pt-4 mt-2">Community Oversight</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch('/api/admin/chat/toggle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                                  body: JSON.stringify({ enabled: true })
                                });
                                triggerToast('Chat Enabled!', true);
                              } catch(e) {}
                            }}
                            className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-500 border border-green-600/50 font-bold py-2 rounded-lg text-xs uppercase"
                          >
                            Enable Global Chat
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch('/api/admin/chat/toggle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                                  body: JSON.stringify({ enabled: false })
                                });
                                triggerToast('Chat Disabled!', true);
                              } catch(e) {}
                            }}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/50 font-bold py-2 rounded-lg text-xs uppercase"
                          >
                            Disable Global Chat
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isGameLoading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-600 hover:from-yellow-500 hover:to-yellow-500 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isGameLoading ? 'Updating System...' : 'Deploy Global Market Settings'}
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllBalances}
                        className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 font-bold py-3 rounded-lg text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]"
                      >
                        Clear All Account Balances ($0.00)
                      </button>
                    </form>
                  </div>

                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                      <strong>Admin Protocol:</strong> Changes deployed here affect all active symbols real-time. Market Bias adds drift to the price generation algorithm. Forcing outcomes will manipulate final contract settlements regardless of the visible price at expiration.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'telegram' && (
                <div className="space-y-6">
                  {/* Bots Hub Navigation */}
                  <div className={`flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 ${theme === 'dark' ? 'border border-slate-800' : 'border border-slate-200'}`}>
                    {[
                      { id: 'telegram', label: 'Telegram Bot' },
                      { id: 'whatsapp', label: 'WhatsApp Bot' },
                      { id: 'facebook', label: 'Facebook Bot' }
                    ].map(bot => (
                        <button
                            key={bot.id}
                            onClick={() => setBotSubTab(bot.id as any)}
                            className={`flex-1 py-2 rounded-md text-[10px] uppercase font-black transition-all ${
                                botSubTab === bot.id 
                                ? 'bg-amber-500 text-slate-950 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            {bot.label}
                        </button>
                    ))}
                  </div>

                  {/* Bots Hub Content */}
                  {botSubTab === 'telegram' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-bold">Telegram Automation & Group Controls</h3>
                                <p className="text-xs text-slate-500">Manage automated simulated chatbot signal dispatches, scheduled campaigns and target hunter groups sweeps.</p>
                            </div>
                            {/* MASTER TOGGLE BUTTON FOR CHATBOT DISPATCH & SCHEDULERS */}
                            <button
                                type="button"
                                onClick={async () => {
                                    const nextState = !telegramConfig?.autoSimulateIntervalEnabled;
                                    setTelegramConfig(prev => prev ? { ...prev, autoSimulateIntervalEnabled: nextState } : prev);
                                    try {
                                        const res = await fetch('/api/telegram/config', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ autoSimulateIntervalEnabled: nextState })
                                        });
                                        if (res.ok) {
                                            triggerToast(nextState ? '🟢 Bot broadcasts resumed successfully!' : '🔴 Bot broadcasts STOPPED on the group.', true);
                                        } else {
                                            triggerToast('Failed to update bot transmission state', false);
                                        }
                                    } catch (e) {
                                        triggerToast('Error saving telegram config state', false);
                                    }
                                }}
                                className={`px-4 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 border-none transition-all cursor-pointer shadow-sm select-none ${
                                    telegramConfig?.autoSimulateIntervalEnabled
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                            >
                                {telegramConfig?.autoSimulateIntervalEnabled ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                        🔴 Stop Bot Messages & Notifications
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-white" />
                                        🟢 Start Bot Messages & Notifications
                                    </>
                                )}
                            </button>
                        </div>
                        {/* HIGH-LEVEL STATS AND RECRUITING INDICATORS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Total Group Members</span>
                                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">1,384 Users</p>
                                <span className="text-[8px] text-gray-500 font-medium">Synced last minutes ago</span>
                            </div>
                            <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Cross-Group Recruited</span>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-sans">Automatic (24/7)</p>
                                <span className="text-[8px] text-gray-500 font-medium font-sans">Simulating external sweeps</span>
                            </div>
                            <div className={`p-3.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-gray-200'}`}>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Registration Link Pushed</span>
                                <p className="text-xs font-mono font-bold text-amber-500 truncate mt-1">knex.onrender.com</p>
                                <span className="text-[8px] text-gray-500 font-medium">Inviting members to signup link</span>
                            </div>
                        </div>
                        {/* PINNED NOTIFICATION BANNER */}
                        {telegramConfig?.pinnedMessageId ? (
                            <div className="p-3.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-left flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-400 tracking-wider">
                                        <Pin className="w-3 h-3 animate-pulse" />
                                        Announcements Board: Pinned Group Signal
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                                        <strong>{telegramConfig.pinnedMessageSender}:</strong>{' '}
                                        <span dangerouslySetInnerHTML={{ __html: telegramConfig.pinnedMessageText || '' }} />
                                    </p>
                                </div>
                                <button
                                    onClick={handleUnpinNotification}
                                    disabled={isPinning}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 px-2 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap border-none"
                                >
                                    <PinOff className="w-3 h-3" />
                                    Unpin Message
                                </button>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-lg bg-slate-100/50 dark:bg-zinc-900/40 border border-slate-250 dark:border-zinc-800 text-left text-xs text-slate-500">
                                📌 No announcement currently pinned. Click any "Pin Notification" button below to highlight a key signal to all members instantly!
                            </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* LEFT PANEL: CONFIG FORM */}
                            <div className={`p-4 rounded-xl border text-left ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <Settings className="w-4 h-4 text-indigo-500" />
                                    Bot Configuration
                                </h4>
                                {telegramConfig ? (
                                    <form onSubmit={handleUpdateTelegramConfig} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Telegram Bot Token</label>
                                                <input
                                                    type="password"
                                                    value={telegramConfig.botToken || ''}
                                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                                                    placeholder="e.g. 123456789:ABC..."
                                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Group Chat ID</label>
                                                <input
                                                    type="text"
                                                    value={telegramConfig.groupChatId || ''}
                                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, groupChatId: e.target.value })}
                                                    placeholder="e.g. -1001234567890"
                                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-zinc-900/50 rounded border border-slate-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <span className="block font-bold text-[10px] text-pink-600 dark:text-pink-400">Auto-Invite Group Members via DM</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={telegramConfig.autoInviteDMs}
                                                onChange={(e) => setTelegramConfig({ ...telegramConfig, autoInviteDMs: e.target.checked })}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-zinc-900/50 rounded border border-slate-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <span className="block font-bold text-[10px] text-indigo-600 dark:text-indigo-400">Enable Auto-Simulate Messages</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={telegramConfig.autoSimulateIntervalEnabled}
                                                onChange={(e) => setTelegramConfig({ ...telegramConfig, autoSimulateIntervalEnabled: e.target.checked })}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                        {telegramConfig.autoSimulateIntervalEnabled && (
                                            <div className="space-y-3 pl-3 border-l-2 border-indigo-500/20">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Interval (Seconds)</label>
                                                    <input
                                                        type="number"
                                                        min="10"
                                                        value={telegramConfig.autoSimulateIntervalSeconds}
                                                        onChange={(e) => setTelegramConfig({ ...telegramConfig, autoSimulateIntervalSeconds: parseInt(e.target.value) || 30 })}
                                                        className="w-full sm:w-32 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Message Types (comma separated)</label>
                                                    <input
                                                        type="text"
                                                        value={telegramConfig.autoSimulateMessageTypes ? telegramConfig.autoSimulateMessageTypes.join(', ') : ''}
                                                        onChange={(e) => setTelegramConfig({ ...telegramConfig, autoSimulateMessageTypes: e.target.value.split(',').map(s => s.trim()) })}
                                                        className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-zinc-900/50 rounded border border-slate-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <span className="block font-bold text-[10px] text-emerald-600 dark:text-emerald-400">Enable Member Harvest Sweeper (Hunter Bot)</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={!!telegramConfig.hunterIntervalEnabled}
                                                onChange={(e) => setTelegramConfig({ ...telegramConfig, hunterIntervalEnabled: e.target.checked })}
                                                className="cursor-pointer"
                                            />
                                        </div>
                                    </form>
                                ) : null}

                                        <hr className={`my-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`} />

                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                        Admin Broadcaster
                      </h4>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setBroadcastType('signal')}
                            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded border ${broadcastType === 'signal' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300 text-slate-500'} cursor-pointer`}
                          >
                            Signal
                          </button>
                          <button
                            onClick={() => setBroadcastType('campaign')}
                            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded border ${broadcastType === 'campaign' ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-transparent border-slate-300 text-slate-500'} cursor-pointer`}
                          >
                            Campaign
                          </button>
                          <button
                            onClick={() => setBroadcastType('alert')}
                            className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded border ${broadcastType === 'alert' ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-slate-300 text-slate-500'} cursor-pointer`}
                          >
                            Alert
                          </button>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1 text-left">Quick-select Guide Manual</label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && val in PREBUILT_GUIDES) {
                                setCustomBroadcast(PREBUILT_GUIDES[val as keyof typeof PREBUILT_GUIDES]);
                                setBroadcastType('campaign');
                              } else {
                                setCustomBroadcast('');
                              }
                            }}
                            className={`w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer`}
                          >
                            <option value="">-- Select a Procedure Guide to Auto-Fill --</option>
                            <option value="overview">⚙️ Platform Operational Blueprint</option>
                            <option value="register">🚀 Procedure: How to Register & Onboard</option>
                            <option value="trade">📈 Procedure: How to Trade Options</option>
                            <option value="deposit">💳 Procedure: How to Deposit (USDT & M-Pesa)</option>
                            <option value="withdrawal">📥 Procedure: How to Withdraw Profits</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Type your official announcement here..."
                          value={customBroadcast}
                          onChange={(e) => setCustomBroadcast(e.target.value)}
                          rows={3}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                        />
                        <button
                          onClick={handleBroadcastMessage}
                          disabled={!customBroadcast.trim() || isBroadcasting}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-none"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isBroadcasting ? 'Broadcasting...' : 'Dispatch Update to Groups'}
                        </button>
                      </div>
                    </div>

                    {/* RIGHT PANEL: GROUP CHAT FEED WITH PIN BUTTON */}
                    <div className={`p-4 rounded-xl border text-left flex flex-col h-[520px] ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        Live Simulated Group Chat Feed
                      </h4>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                        {tgLogs.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs italic">
                            Waiting for simulated group events...
                          </div>
                        ) : (
                          tgLogs.slice(-25).reverse().map((log) => {
                            const isPinned = telegramConfig?.pinnedMessageId === log.id;
                            const isBot = log.sender === 'Wizard Bot' || log.sender === 'System Manager' || log.sender === 'System Admin';

                            return (
                              <div 
                                key={log.id} 
                                className={`p-2.5 rounded border transition-all ${
                                  isPinned 
                                    ? 'bg-yellow-500/10 border-yellow-500/30 font-medium shadow-sm' 
                                    : isBot
                                      ? 'bg-indigo-500/5 border-indigo-500/10'
                                      : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-150 dark:border-zinc-800/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-mono text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
                                    {log.sender}
                                  </span>
                                  <div className="flex items-center gap-1.5 select-none">
                                    <span className="text-[8px] text-gray-400 font-mono">
                                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isPinned ? (
                                      <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 text-[8px] font-extrabold px-1 py-0.2 rounded flex items-center">
                                        PINNED
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handlePinNotification(log.id)}
                                        disabled={isPinning}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded transition-all cursor-pointer opacity-70 hover:opacity-100 border-none"
                                      >
                                        Pin Notification
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[10px] leading-relaxed text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: log.text }} />
                              </div>
                            );
                          })
                        )}
                      </div>

                            </div>
                        </div>
                    </div>
                  )}

                  {botSubTab === 'whatsapp' && (
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">WhatsApp Automation</h4>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable WhatsApp Automation</span>
                                <input type="checkbox" checked={whatsappConfig.enabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, enabled: e.target.checked})} className="accent-green-500" />
                            </label>

                            <AdminWhatsAppManager config={whatsappConfig} setConfig={setWhatsappConfig} theme={theme} />

                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto-Broadcast Enabled</span>
                                <input type="checkbox" checked={whatsappConfig.autoBroadcastEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, autoBroadcastEnabled: e.target.checked})} className="accent-green-500" />
                            </label>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Broadcast Message Template</label>
                                <textarea value={whatsappConfig.broadcastMessage} onChange={(e) => setWhatsappConfig({...whatsappConfig, broadcastMessage: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs" rows={3}></textarea>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleSaveWhatsAppConfig}
                                    disabled={isSavingWhatsappConfig}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingWhatsappConfig ? 'Saving...' : 'Save WhatsApp Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                  )}
                  {botSubTab === 'facebook' && (
                    <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between gap-1.5">
                          <span>Facebook Automation</span>
                          <span className={`text-[10px] uppercase font-bold flex items-center gap-1 ${
                            facebookBotStatus === 'active' ? 'text-green-500' :
                            facebookBotStatus === 'error' ? 'text-red-500' :
                            'text-gray-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${facebookBotStatus === 'active' ? 'bg-green-500' : facebookBotStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                            {facebookBotStatus}
                          </span>
                        </h4>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable Facebook Automation</span>
                                <input type="checkbox" checked={fbBotConfig.enabled} onChange={(e) => setFbBotConfig({...fbBotConfig, enabled: e.target.checked})} className="accent-blue-500" />
                            </label>
                            
                            <AdminFacebookBotManager config={fbBotConfig} setConfig={setFbBotConfig} theme={theme} />

                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto Invite Users</span>
                                <input type="checkbox" checked={fbBotConfig.autoInviteEnabled} onChange={(e) => setFbBotConfig({...fbBotConfig, autoInviteEnabled: e.target.checked})} className="accent-blue-500" />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 cursor-pointer">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable Broadcast</span>
                                <input type="checkbox" checked={fbBotConfig.broadcastEnabled} onChange={(e) => setFbBotConfig({...fbBotConfig, broadcastEnabled: e.target.checked})} className="accent-blue-500" />
                            </label>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Broadcast Message</label>
                                <textarea value={fbBotConfig.broadcastMessage} onChange={(e) => setFbBotConfig({...fbBotConfig, broadcastMessage: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs" rows={2}></textarea>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Target Audience Keyword</label>
                                <input type="text" value={fbBotConfig.targetAudienceKeyword} onChange={(e) => setFbBotConfig({...fbBotConfig, targetAudienceKeyword: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-3 py-2 text-xs" />
                            </div>
                        </div>
                    </div>
                  )}

                  {/* Move Broadcaster and Feed here, inside activeTab... */}



                    {/* BOTTOM PANEL: MEMBER GROWTH CHART */}
                    <div className={`p-4 rounded-xl border text-left flex flex-col h-[380px] lg:col-span-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Telegram Group Member Growth</h4>
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={telegramGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: '8px', fontSize: '10px' }} />
                            <Bar dataKey="newMembers" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* ADVERTISER & HUNTER BOT SYSTEM CONTROLS CARD GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:col-span-2">
                      {/* CARD 1: CAMP ADVERTS */}
                      <div className={`p-4 rounded-xl border text-left ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center justify-between mb-4 border-b pb-2 border-slate-200/10 dark:border-slate-800/80">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-slate-400">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Campaign Ads & Auto-Advertiser
                          </h4>
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/25 px-1.5 py-0.5 rounded font-mono uppercase font-black">
                            Anti-Ban Delays Active
                          </span>
                        </div>

                        <form onSubmit={handleAddCampaign} className="space-y-3 mb-5">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Advert Message / Promo Text</label>
                            <textarea
                              rows={2}
                              value={newCampaignMsg}
                              onChange={(e) => setNewCampaignMsg(e.target.value)}
                              placeholder="e.g. 🎁 Dynamic VIP Code LW30! Deposit today and secure a +30% margin balance bonus immediately..."
                              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 rounded p-2 text-xs text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Broadcast Interval (Minutes)</label>
                              <input
                                type="number"
                                min="1"
                                value={newCampaignInterval}
                                onChange={(e) => setNewCampaignInterval(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 rounded px-2 py-1.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isAddingCampaign || !newCampaignMsg.trim()}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2 rounded text-xs uppercase tracking-wider border-none cursor-pointer disabled:opacity-50"
                            >
                              Add Promo Advert
                            </button>
                          </div>
                        </form>

                        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Scheduled Campaigns ({campaigns.length})</p>
                          {campaigns.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2 text-center">No active scheduled campaigns. Add one above!</p>
                          ) : (
                            campaigns.map((camp) => (
                              <div key={camp.id} className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20 space-y-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-slate-800 dark:text-slate-200 font-sans leading-snug font-medium flex-1">
                                    {camp.message}
                                  </p>
                                  <button
                                    onClick={() => handleDeleteCampaign(camp.id)}
                                    className="text-red-500 hover:text-red-650 bg-transparent border-none p-0 cursor-pointer"
                                    title="Delete Campaign"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/10 font-mono text-[9px] text-slate-400">
                                  <span>Interval: <strong className="text-indigo-400">{camp.interval_minutes}m</strong></span>
                                  <span>Last sent: {camp.last_sent ? new Date(camp.last_sent).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'Never'}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCampaign(camp.id, camp.is_active === 1)}
                                    className={`px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[8px] cursor-pointer border-none ${
                                      camp.is_active === 1 
                                        ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25' 
                                        : 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/25'
                                    }`}
                                  >
                                    {camp.is_active === 1 ? '● ACTIVE' : '○ PAUSED'}
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* CARD 2: EXTERNAL HUNTER BOT */}
                      <div className={`p-4 rounded-xl border text-left ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b pb-2 border-slate-200/10 dark:border-slate-800/80 gap-2">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                              Target Group Hunter System
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex bg-slate-100 dark:bg-zinc-900 p-0.5 rounded border border-slate-200 dark:border-zinc-800">
                              <button
                                type="button"
                                onClick={() => setHunterSubTab('groups')}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border-none ${hunterSubTab === 'groups' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-transparent'} cursor-pointer`}
                              >
                                Target Groups ({hunterGroups.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setHunterSubTab('logs')}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border-none ${hunterSubTab === 'logs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 bg-transparent'} cursor-pointer`}
                              >
                                Recruit Logs ({telegramMockUsers.length})
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={handleTriggerInstantSweep}
                              disabled={isSweepingHunter}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer border-none disabled:opacity-50"
                            >
                              <Sparkles className="w-3 h-3" />
                              {isSweepingHunter ? 'Hunting...' : 'Instant Sweep'}
                            </button>
                          </div>
                        </div>

                        {hunterSubTab === 'groups' ? (
                          <>
                            <form onSubmit={handleAddHunterGroup} className="space-y-3 mb-5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Group @Username</label>
                                  <input
                                    type="text"
                                    value={newHunterGroupUser}
                                    onChange={(e) => setNewHunterGroupUser(e.target.value)}
                                    placeholder="e.g. @derivOptionSignals"
                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-808 rounded px-2 py-1.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Title Name</label>
                                  <input
                                    type="text"
                                    value={newHunterGroupName}
                                    onChange={(e) => setNewHunterGroupName(e.target.value)}
                                    placeholder="e.g. Deriv Premium League"
                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-808 rounded px-2 py-1.5 text-xs text-slate-950 dark:text-white focus:outline-none"
                                  />
                                </div>
                              </div>
                              <button
                                type="submit"
                                disabled={isAddingHunterGroup || !newHunterGroupUser.trim() || !newHunterGroupName.trim()}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 rounded text-xs uppercase tracking-wider border-none cursor-pointer disabled:opacity-50"
                              >
                                Add Target External Channel
                              </button>
                            </form>

                            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Target External Communities ({hunterGroups.length})</p>
                              {hunterGroups.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2 text-center">No monitoring target groups registered. Enter one above!</p>
                              ) : (
                                hunterGroups.map((group) => (
                                  <div key={group.id} className="p-2.5 rounded border border-slate-205 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">{group.group_name}</p>
                                        <p className="text-[10px] text-indigo-400 font-mono">{group.group_username}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteHunterGroup(group.id)}
                                        className="text-red-500 hover:text-red-650 bg-transparent border-none p-0 cursor-pointer"
                                        title="Delete Target Group"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/10 font-mono text-[9px] text-slate-400">
                                      <span>Leads Scanned: <strong className="text-slate-700 dark:text-slate-200">{group.contacts_scanned}</strong></span>
                                      <span>Invited/Recruited: <strong className="text-emerald-400 font-bold">{group.recruits_found}</strong></span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleHunterGroup(group.id, group.is_active === 1)}
                                        className={`px-1.5 py-0.5 rounded uppercase font-black tracking-wider text-[8px] cursor-pointer border-none ${
                                          group.is_active === 1 
                                            ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25' 
                                            : 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/25'
                                        }`}
                                      >
                                        {group.is_active === 1 ? '● SCANNING' : '○ ASLEEP'}
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between bg-emerald-500/5 p-2 rounded border border-emerald-500/10 font-mono text-[9px] text-slate-400">
                              <span>Total Harvested: <strong className="text-emerald-400 font-black">{telegramMockUsers.length}</strong></span>
                              <span>Ready to Invite: <strong className="text-amber-400 font-black">{telegramMockUsers.filter(u => u.status === 'invited').length}</strong></span>
                              <span>Fully Converted: <strong className="text-indigo-400 font-black">{telegramMockUsers.filter(u => u.status === 'joined').length}</strong></span>
                            </div>

                            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                              {telegramMockUsers.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-8 text-center bg-slate-50/50 dark:bg-zinc-950/10 rounded border border-dashed dark:border-slate-850">
                                  No members harvested yet. Click "Instant Sweep" above or wait for automatic background group monitoring sweeps.
                                </p>
                              ) : (
                                [...telegramMockUsers].reverse().map((user) => (
                                  <div key={user.id} className="p-2 border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20 rounded flex items-center justify-between gap-3 text-xs">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'joined' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}`} />
                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">{user.username}</span>
                                        <span className={`text-[8px] px-1 rounded uppercase font-black tracking-wider ${
                                          user.status === 'joined' 
                                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        }`}>
                                          {user.status}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400 mt-1">
                                        <span>From: <strong className="text-indigo-400">{user.origin || 'Telegram Group'}</strong></span>
                                        <span>•</span>
                                        <span>Persona: <strong className="text-emerald-400">{user.personality}</strong></span>
                                      </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap font-mono text-[9px] text-slate-400">
                                      {user.joinedAt ? new Date(user.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just Now'}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {activeTab === 'marketing' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                    <div>
                      <h3 className="text-lg font-black flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-amber-500" />
                        Marketing Strategies, Social Posting & Poster Studio
                      </h3>
                      <p className="text-xs text-slate-400">
                        Craft high-converting promotional banners, dispatch Telegram & Twitter broadcasts, and monitor growth metrics.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMarketingStudioOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 shrink-0"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Open Fullscreen Poster Studio</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                        <Camera className="h-4 w-4" />
                        <span>Instant Poster Generation</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Create custom 1:1 Square, 9:16 Story, and 16:9 Banner posters with live Candlesticks & Area charts.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMarketingStudioOpen(true)}
                        className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Design Poster →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
                        <Share2 className="h-4 w-4" />
                        <span>Multi-Channel Broadcaster</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        1-Click direct broadcasting to Telegram channels, Twitter/X intents, WhatsApp groups, and TikTok hooks.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMarketingStudioOpen(true)}
                        className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Compose Post →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                        <TrendingUp className="h-4 w-4" />
                        <span>ROI & CAC Simulator</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Model marketing budgets, click-through rates, and projected first-time deposit (FTD) conversion revenues.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMarketingStudioOpen(true)}
                        className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Simulate ROI →
                      </button>
                    </div>
                  </div>

                  {/* Quick Campaign Dispatcher */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase text-slate-400">Quick Campaign Dispatcher</span>
                      <span className="text-[10px] text-slate-500 font-mono">Syncs with /api/telegram/broadcast</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <textarea
                        rows={3}
                        defaultValue="🎁 KNEX VIP LAUNCH: Start trading synthetic indices 24/7 with zero spread! Get a 200% first deposit bonus with code KNEXVIP: https://knex.onrender.com/"
                        id="quick-campaign-text"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const el = document.getElementById('quick-campaign-text') as HTMLTextAreaElement;
                            if (!el?.value) return;
                            try {
                              const res = await fetch('/api/telegram/broadcast', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: el.value, type: 'campaign' })
                              });
                              const data = await res.json();
                              triggerToast(data.message || 'Broadcast submitted to queue!', true);
                            } catch {
                              triggerToast('Broadcast sent to background queue!', true);
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          Broadcast to Telegram Now
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('quick-campaign-text') as HTMLTextAreaElement;
                            if (el?.value) {
                              navigator.clipboard.writeText(el.value);
                              triggerToast('Campaign text copied to clipboard!', true);
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Copy Text
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visits' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-bold">Platform Traffic & Visit Metrics</h3>
                      <p className="text-xs text-slate-500">Real-time visitor counts, referrer logs, and knex.onrender.com analytics hits.</p>
                    </div>
                  </div>

                  {/* Metrics widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Total Platform Visits</p>
                      <p className="text-3xl font-black mt-1 font-mono text-yellow-500">{visitsData?.visitsCount ?? 0}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Aggregate page hits loaded</p>
                    </div>

                    <div className="rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Unique Direct Visitors</p>
                      <p className="text-3xl font-black mt-1 font-mono text-purple-500">{visitsData?.uniqueVisitors ?? 0}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Unique remote IP entities</p>
                    </div>

                    <div className="rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
                      <p className="text-[10px] text-yellow-500/80 font-extrabold uppercase tracking-wider">render.com Domains Hits</p>
                      <p className="text-3xl font-black mt-1 font-mono text-yellow-400">{(visitsData?.knexCount ?? visitsData?.knexCount ?? 0)}</p>
                      <p className="text-[9px] text-yellow-500/55 mt-1">Visits on or referred by knex / render</p>
                    </div>
                  </div>

                  {/* Visit logs list */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-zinc-950/20 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-sm">Recent Traffic Audit Log</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-400">
                        <thead className="bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                          <tr>
                            <th className="p-3">Time</th>
                            <th className="p-3">IP Address</th>
                            <th className="p-3">User Identification</th>
                            <th className="p-3">Request Domain</th>
                            <th className="p-3">Referrer Location</th>
                            <th className="p-3">Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                          {!visitsData?.recentVisits || visitsData.recentVisits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                                No visitor traffic logged yet. Browse around the platform to trigger logs.
                              </td>
                            </tr>
                          ) : (
                            visitsData.recentVisits.map((v: any) => {
                              const isKnexSource = (v.host && (v.host.includes('knex') || v.host.includes('knex.onrender.com'))) || (v.referrer && (v.referrer.includes('knex') || v.referrer.includes('knex.onrender.com')));
                              return (
                                <tr key={v.id} className={`hover:bg-slate-200/20 dark:hover:bg-zinc-900/40 transition-colors ${isKnexSource ? 'bg-yellow-500/5' : ''}`}>
                                  <td className="p-3 text-slate-900 dark:text-slate-200 whitespace-nowrap">
                                    {new Date(v.created_at).toLocaleString()}
                                  </td>
                                  <td className="p-3 text-slate-500 dark:text-slate-400">
                                    {v.ip}
                                  </td>
                                  <td className="p-3">
                                    {v.user_id ? (
                                      <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                        UID: {v.user_id}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic">Anonymous</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-indigo-400 truncate max-w-[150px]" title={v.host}>
                                    {v.host || '---'}
                                  </td>
                                  <td className="p-3 truncate max-w-[200px]" title={v.referrer}>
                                    {v.referrer ? (
                                      <span className={(v.referrer.includes('knex') || v.referrer.includes('knex.onrender.com')) ? 'text-yellow-400 font-bold' : 'text-slate-400'}>
                                        {v.referrer}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic">Direct</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-emerald-400">
                                    {v.path || '/'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

        {/* Inspect P2P Dispute Chat Modal */}
        {selectedDisputeChat && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div>
                  <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    P2P Escrow Dispute Room (Trade #{selectedDisputeChat.id})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Buyer: <span className="font-mono text-slate-200">{selectedDisputeChat.buyer_id}</span> | Seller: <span className="font-mono text-slate-200">{selectedDisputeChat.seller_id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDisputeChat(null)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-slate-950/50">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Escrow Locked:</span>
                    <span className="font-bold text-emerald-400">{selectedDisputeChat.amount} {selectedDisputeChat.coin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Amount:</span>
                    <span className="font-bold text-yellow-400">{selectedDisputeChat.fiat_amount} {selectedDisputeChat.fiat_currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Method:</span>
                    <span className="font-medium text-slate-200">{selectedDisputeChat.payment_method}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Live Audit Chat & Instant Messaging</div>
                  <span className="text-[10px] text-emerald-400 font-bold">● Instant WS Sync Active</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs shadow-inner">
                  {(() => {
                    let msgs: any[] = [];
                    try { msgs = JSON.parse(selectedDisputeChat.chat_messages || '[]'); } catch (e) {}
                    if (msgs.length === 0) return <p className="text-slate-500 italic text-center py-4">No chat messages exchanged yet.</p>;
                    return msgs.map((m: any, idx: number) => {
                      const isAdmin = m.sender === 'admin' || m.sender === 'system';
                      return (
                        <div key={idx} className={`p-2.5 rounded-lg border ${
                          isAdmin ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-200' : 'bg-slate-900 border-slate-800 text-slate-200'
                        }`}>
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                            <span className={isAdmin ? 'text-indigo-400 font-extrabold' : 'text-yellow-400'}>{m.senderEmail || m.sender}</span>
                            <span>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}</span>
                          </div>
                          <p className="text-xs leading-relaxed">{m.text}</p>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Admin Direct Message Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={adminChatText}
                    onChange={(e) => setAdminChatText(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && adminChatText.trim() && !isSendingAdminChat) {
                        setIsSendingAdminChat(true);
                        try {
                          const res = await fetch(`/api/admin/p2p/trades/${selectedDisputeChat.id}/chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                            body: JSON.stringify({ text: adminChatText.trim() })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setSelectedDisputeChat({ ...selectedDisputeChat, chat_messages: JSON.stringify(data.messages) });
                            setAdminChatText('');
                            triggerToast('Message sent instantly to buyer & seller!', true);
                            fetchData(adminKey);
                          } else {
                            triggerToast(data.message || 'Failed to send message', false);
                          }
                        } catch (err: any) {
                          triggerToast('Error sending message: ' + err.message, false);
                        } finally {
                          setIsSendingAdminChat(false);
                        }
                      }
                    }}
                    placeholder="Type message as Admin/Moderator to buyer & seller..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    disabled={isSendingAdminChat || !adminChatText.trim()}
                    onClick={async () => {
                      if (!adminChatText.trim()) return;
                      setIsSendingAdminChat(true);
                      try {
                        const res = await fetch(`/api/admin/p2p/trades/${selectedDisputeChat.id}/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                          body: JSON.stringify({ text: adminChatText.trim() })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setSelectedDisputeChat({ ...selectedDisputeChat, chat_messages: JSON.stringify(data.messages) });
                          setAdminChatText('');
                          triggerToast('Message sent instantly to buyer & seller!', true);
                          fetchData(adminKey);
                        } else {
                          triggerToast(data.message || 'Failed to send message', false);
                        }
                      } catch (err: any) {
                        triggerToast('Error sending message: ' + err.message, false);
                      } finally {
                        setIsSendingAdminChat(false);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded cursor-pointer transition"
                  >
                    Send
                  </button>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resolution Note / Audit Reason</label>
                  <input
                    type="text"
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    placeholder="e.g., Bank statement verified, payment confirmed received by merchant."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-2">
                <button
                  disabled={isResolvingDispute}
                  onClick={async () => {
                    setIsResolvingDispute(true);
                    try {
                      const res = await fetch(`/api/admin/p2p/trades/${selectedDisputeChat.id}/resolve`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-key': adminKey
                        },
                        body: JSON.stringify({ action: 'release_to_buyer', note: disputeNote })
                      });
                      const data = await res.json();
                      if (data.success) {
                        triggerToast(data.message, true);
                        setSelectedDisputeChat(null);
                        setDisputeNote('');
                        fetchData(adminKey);
                      } else {
                        triggerToast(data.message || 'Failed to resolve dispute', false);
                      }
                    } catch (e: any) {
                      triggerToast('Error resolving dispute: ' + e.message, false);
                    } finally {
                      setIsResolvingDispute(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  🟢 Release Escrow to Buyer
                </button>

                <button
                  disabled={isResolvingDispute}
                  onClick={async () => {
                    setIsResolvingDispute(true);
                    try {
                      const res = await fetch(`/api/admin/p2p/trades/${selectedDisputeChat.id}/resolve`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-key': adminKey
                        },
                        body: JSON.stringify({ action: 'refund_to_seller', note: disputeNote })
                      });
                      const data = await res.json();
                      if (data.success) {
                        triggerToast(data.message, true);
                        setSelectedDisputeChat(null);
                        setDisputeNote('');
                        fetchData(adminKey);
                      } else {
                        triggerToast(data.message || 'Failed to resolve dispute', false);
                      }
                    } catch (e: any) {
                      triggerToast('Error resolving dispute: ' + e.message, false);
                    } finally {
                      setIsResolvingDispute(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  🔴 Refund Escrow to Seller
                </button>
              </div>
            </div>
          </div>
        )}

              <div className="p-4 border-t border-slate-800/60 flex items-center justify-between shrink-0 bg-slate-950/80">
                <span className="text-[10px] text-slate-500 font-mono">Knex Super Admin Terminal v2.5</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthenticated(false);
                    setAdminKey('');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg border border-slate-700 transition-all cursor-pointer"
                >
                  Terminate Session
                </button>
              </div>
          </div>
        )}
        <MarketingHub
          isOpen={isMarketingStudioOpen}
          onClose={() => setIsMarketingStudioOpen(false)}
          theme={theme}
          triggerToast={triggerToast}
        />
      </div>
    </div>
  );
}
