import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import Chart from './components/Chart';
import TradeControls from './components/TradeControls';
import QuickTradePanel from './components/QuickTradePanel';
import PositionsList from './components/PositionsList';
const WizardBot = lazy(() => import('./components/WizardBot'));
import CashierModal from './components/CashierModal';
import GuideModal from './components/GuideModal';
import SettingsModal from './components/SettingsModal';
import InviteModal from './components/InviteModal';
import AdminDashboard from './components/AdminDashboard';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import FinanceDashboard from './components/FinanceDashboard';
import P2PMarketplace from './components/P2PMarketplace';
import AuthModal from './components/AuthModal';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import PriceAlertsManager from './components/PriceAlertsManager';
import Walkthrough from './components/Walkthrough';
import WelcomeModal from './components/WelcomeModal';
import TradeValidationChecklistModal from './components/TradeValidationChecklistModal';
import MarketingHub from './components/MarketingHub';
import { ASSETSList } from './data';
import { Asset, Tick, Contract, TradeHistoryItem, Account, IndicatorConfig, ContractType, PriceAlert, PendingLimitOrder } from './types';
import { 
  Megaphone,
  Bot, 
  HelpCircle, 
  Compass,
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  VolumeX,
  LayoutDashboard,
  Globe,
  Wallet,
  Briefcase,
  FileText,
  BadgeAlert,
  Star,
  Users,
  PieChart,
  Shield,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  CheckCircle,
  Info,
  DollarSign,
  Activity,
  Sun,
  Moon,
  Download,
  MessageCircle
} from 'lucide-react';

// Initialize asset history with realistic price walk
function initializeAssetHistory(assets: Asset[]): Record<string, Tick[]> {
  const initialHistory: Record<string, Tick[]> = {};
  const baseTime = Date.now();

  assets.forEach((asset) => {
    const tickHistory: Tick[] = [];

    // Prepopulate 6000 historic ticks per index asset to support deep historic candles across TFs
    let currentPrice = Math.max(2026.90, asset.price);
    for (let i = 6000; i >= 0; i--) {
      const walkFactor = (Math.random() - 0.5 + asset.trendBias) * 1.5;
      currentPrice = Math.max(2026.90, currentPrice * (1 + walkFactor * (asset.volatility / 100)));
      tickHistory.push({
        time: baseTime - i * 1200,
        price: currentPrice
      });
    }
    initialHistory[asset.id] = tickHistory;
  });

  return initialHistory;
}

export default function App() {
  // Theme state: support dark, light, auto modes (Default dark to match the screenshot!)
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'auto'>('dark');

  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // safe default
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const theme = themeMode === 'auto' ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  }, [theme]);

  const TICK_INTERVAL_MS = 1000;
  const APP_VERSION = '1.0.1';
  const [isInitializing, setIsInitializing] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('knex_welcome_shown')) {
      setIsWelcomeModalOpen(true);
      localStorage.setItem('knex_welcome_shown', 'true');
    }
  }, []);

  // Account states: Loaded from storage
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const version = localStorage.getItem('knex_version');
      if (version !== APP_VERSION) {
        // Clear all storage on version change
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('knex_')) localStorage.removeItem(key);
        });
        localStorage.setItem('knex_version', APP_VERSION);
        return null;
      }
      const saved = localStorage.getItem('knex_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem('knex_current_user');
    }
    return null;
  });

  // Validate session against database on startup
  useEffect(() => {
    const token = localStorage.getItem('knex_token');
    if (token) {
      fetch('/api/auth/verify-session', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('knex_current_user', JSON.stringify(data.user));
        } else if (data && data.valid === false) {
          setCurrentUser(null);
          localStorage.removeItem('knex_current_user');
          localStorage.removeItem('knex_token');
        }
      })
      .catch(err => console.warn('Session verification notice:', err?.message || err));
    }
  }, []);

  // Track platform visits & referrer routing
  useEffect(() => {
    const logVisit = async () => {
      try {
        await fetch('/api/visits/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referrer: document.referrer || '',
            host: window.location.hostname || 'localhost',
            path: window.location.pathname || '/',
            userAgent: navigator.userAgent || 'unknown',
            userId: currentUser?.id || null
          })
        });
      } catch (err) {
        // Analytics visit log silent fallback
      }
    };
    logVisit();
  }, [currentUser?.id]);

  const [account, setAccount] = useState<Account>(() => {
    const saved = localStorage.getItem('knex_account');
    let initialState: Account = {
      mode: 'demo',
      balance: 10000.00,
      currency: 'USD',
      id: 'demo-temp-acc'
    };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          initialState = { ...initialState, ...parsed };
        }
      } catch (e) {
        console.error('Failed to parse account from storage', e);
      }
    }

    if (typeof initialState.balance !== 'number' || isNaN(initialState.balance)) {
      initialState.balance = 10000.00;
    }

    // Enforce admin constraints on initial load
    const demoEnabled = JSON.parse(localStorage.getItem('knex_admin_demo_enabled') ?? 'true');
    const realEnabled = JSON.parse(localStorage.getItem('knex_admin_real_enabled') ?? 'true');

    if (initialState.mode === 'demo' && !demoEnabled && realEnabled) {
        return { ...initialState, mode: 'real' };
    } else if (initialState.mode === 'real' && !realEnabled && demoEnabled) {
        return { ...initialState, mode: 'demo' };
    }

    return initialState;
  });

  const [demoAccountBalance, setDemoAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem('knex_demo_balance');
    return saved !== null ? Number(saved) : 10000.00;
  });

  const [realAccountBalance, setRealAccountBalance] = useState<number>(() => {
    const saved = localStorage.getItem('knex_real_balance');
    return saved !== null ? Number(saved) : 1000.00;
  });

  const updateBalance = (newBalance: number) => {
    const clamped = Math.max(0, newBalance);
    setAccount((prev) => {
      if (prev.mode === 'demo') {
        setDemoAccountBalance(clamped);
        localStorage.setItem('knex_demo_balance', String(clamped));
      } else {
        setRealAccountBalance(clamped);
        localStorage.setItem('knex_real_balance', String(clamped));
      }
      return { ...prev, balance: clamped };
    });
  };

  // Keep track of asset selector state
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);

  // Session Timeout / Inactivity States
  const lastActivityTimeRef = useRef<number>(Date.now());
  const [isSessionTimeoutOpen, setIsSessionTimeoutOpen] = useState(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(60);

  // Stop Loss states
  const [buyStopLoss, setBuyStopLoss] = useState<string>('');
  const [sellStopLoss, setSellStopLoss] = useState<string>('');



  // Layout states
  const [activeTabView, setActiveTabView] = useState<'trade' | 'history' | 'stats' | 'finance' | 'p2p'>('trade');
  const [positionsTab, setPositionsTab] = useState<'positions' | 'statements' | 'stats'>('positions');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [starredMarkets, setStarredMarkets] = useState<string[]>(['R_100', 'R_75', 'R_10', 'EURUSD']);
  const [marketSearchText, setMarketSearchText] = useState('');
  const [selectedMarketTab, setSelectedMarketTab] = useState<'usdt' | 'btc' | 'indices' | 'favorites'>('indices');
  const [newsDetail, setNewsDetail] = useState<any>(null);

  const [runWalkthrough, setRunWalkthrough] = useState(false);
  const walkthroughVersion = 'v1.1'; // Update this to reset walkthrough for returning users

  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        setSwRegistration(registration);
        
        if (registration.waiting) {
          setShowUpdatePrompt(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowUpdatePrompt(true);
              }
            });
          }
        });

        const updateInterval = setInterval(() => {
          registration.update().catch(() => {});
          if (registration.waiting) {
            setShowUpdatePrompt(true);
          }
        }, 30000);

        return () => clearInterval(updateInterval);
      }).catch((err) => {
        console.debug('SW Registration error:', err);
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      });
    }
  }, []);

  useEffect(() => {
    // Only run walkthrough for actual users (not demo) if they haven't seen it
    if (currentUser) {
      const hasSeen = localStorage.getItem(`knex_walkthrough_seen_${walkthroughVersion}_${currentUser.id}`);
      if (!hasSeen) {
        setRunWalkthrough(true);
      }
    }
  }, [currentUser, walkthroughVersion]);

  const handleWalkthroughEnd = () => {
    setRunWalkthrough(false);
    if (currentUser) {
      localStorage.setItem(`knex_walkthrough_seen_${walkthroughVersion}_${currentUser.id}`, 'true');
    }
  };

  // Load initial context for partitioning to prevent cross-user and cross-mode leakage
  const initialUser = (() => {
    const saved = localStorage.getItem('knex_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  })();

  const initialAccountMode = (() => {
    const saved = localStorage.getItem('knex_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.mode === 'demo' || parsed.mode === 'real')) {
          return parsed.mode;
        }
      } catch (e) {}
    }
    return initialUser ? 'real' : 'demo';
  })();

  const initialPartitionId = (() => {
    const userIdStr = initialUser ? initialUser.id : 'guest';
    return `${userIdStr}_${initialAccountMode}`;
  })();

  // Asset configurations
  const [activeAsset, setActiveAsset] = useState<Asset>(() => {
    // Start TFLUX by default
    const tflux = ASSETSList.find(a => a.symbol === 'TFLUX');
    return tflux || ASSETSList[0];
  });
  const [assetsRegistry, setAssetsRegistry] = useState<Asset[]>(ASSETSList);
  const [assetsTicksMap, setAssetsTicksMap] = useState<Record<string, Tick[]>>(() => {
    const saved = localStorage.getItem(`knex_ticks_history_v2_${initialPartitionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          if (keys.length > 0 && Array.isArray(parsed[keys[0]])) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse saved ticks history from localStorage:', e);
      }
    }
    return initializeAssetHistory(ASSETSList);
  });

  // Indicator Settings
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>({
    sma: { enabled: true, period: 10 },
    ema: { enabled: false, period: 20 },
    rsi: { enabled: true, period: 10 }
  });

  const [chartType, setChartType] = useState<'line' | 'candles'>('candles');

  // Contracts & History Log portfolios - Isolate using partition-specific keys (user + mode)
  const [activeContracts, setActiveContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem(`knex_active_contracts_${initialPartitionId}`) || localStorage.getItem('knex_active_contracts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse active contracts from localStorage', e);
      }
    }
    return [];
  });
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>(() => {
    const saved = localStorage.getItem(`knex_history_${initialPartitionId}`) || localStorage.getItem('knex_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
      }
    }
    return [];
  });

  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem(`knex_price_alerts_${initialPartitionId}`) || localStorage.getItem('knex_price_alerts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse price alerts from localStorage', e);
      }
    }
    return [];
  });

  const [pendingLimitOrders, setPendingLimitOrders] = useState<PendingLimitOrder[]>(() => {
    const saved = localStorage.getItem(`knex_pending_limit_orders_${initialPartitionId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse pending limit orders from localStorage', e);
      }
    }
    return [];
  });

  const pendingLimitOrdersRef = useRef(pendingLimitOrders);
  useEffect(() => {
    pendingLimitOrdersRef.current = pendingLimitOrders;
    localStorage.setItem(`knex_pending_limit_orders_${initialPartitionId}`, JSON.stringify(pendingLimitOrders));
  }, [pendingLimitOrders, initialPartitionId]);

  const prevPartitionIdRef = useRef<string>(initialPartitionId);

  const activeContractsRef = useRef(activeContracts);
  useEffect(() => {
    activeContractsRef.current = activeContracts;
  }, [activeContracts]);

  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const tradeHistoryRef = useRef(tradeHistory);
  useEffect(() => {
    tradeHistoryRef.current = tradeHistory;
  }, [tradeHistory]);

  const priceAlertsRef = useRef(priceAlerts);
  useEffect(() => {
    priceAlertsRef.current = priceAlerts;
  }, [priceAlerts]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const assetsTicksMapRef = useRef(assetsTicksMap);
  useEffect(() => {
    assetsTicksMapRef.current = assetsTicksMap;
  }, [assetsTicksMap]);

  // Periodically persist the entire candles/ticks history of the active partition to localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      const currentUserIdStr = currentUserRef.current ? currentUserRef.current.id : 'guest';
      const currentMode = accountRef.current ? accountRef.current.mode : 'demo';
      const currentPartitionId = `${currentUserIdStr}_${currentMode}`;
      
      const ticksToSave = Object.fromEntries(
        Object.entries(assetsTicksMapRef.current).map(([assetId, ticks]) => [
          assetId,
          ticks.slice(-500) // Keep only the last 500 ticks per asset
        ])
      );
      localStorage.setItem(`knex_ticks_history_v2_${currentPartitionId}`, JSON.stringify(ticksToSave));
    }, 5000); // Saves once every 5 seconds to prevent performance degradation

    return () => clearInterval(interval);
  }, []);

  const lastServerDataRef = useRef<string>('');
  const hasSyncedFromServerRef = useRef<boolean>(false);
  const isSyncingFromServerRef = useRef<boolean>(false);
  const localMutationTimeRef = useRef<number>(0);
  const serverTimeDriftRef = useRef<number>(0);

  const getServerTime = () => Date.now() + serverTimeDriftRef.current;

  const isPullingRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const sendWsMessage = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (err) {
        console.warn('[WS Client] Error sending message:', err);
      }
    }
  };

  // Real-time WebSocket connection for instant multi-device trade and cashout sync
  useEffect(() => {
    if (!currentUser?.id) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let isUnmounted = false;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'auth',
            userId: currentUser.id,
            mode: accountRef.current.mode
          }));

          clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TRADE_CREATED') {
              const { contract, balance, mode } = data;
              if (contract && contract.id) {
                if (settledContractIdsRef.current.has(contract.id)) return;
                
                setActiveContracts((prev) => {
                  if (prev.some(c => c.id === contract.id)) return prev;
                  triggerToast(`Trade Active on Another Device: ${contract.direction.toUpperCase()} on ${contract.assetSymbol}`, true);
                  return [...prev, contract];
                });

                if (typeof balance === 'number') {
                  setAccount(prev => ({ ...prev, balance }));
                  if (mode === 'real') {
                    setRealAccountBalance(balance);
                  }
                }
              }
            } else if (data.type === 'TRADE_CASHED_OUT') {
              const { contractId, settlementItem, balance, mode, payout } = data;
              if (contractId) {
                settledContractIdsRef.current.add(contractId);
                setActiveContracts(prev => prev.filter(c => c.id !== contractId));
                if (settlementItem) {
                  setTradeHistory(prev => {
                    if (prev.some(h => h.id === settlementItem.id)) return prev;
                    return [settlementItem, ...prev];
                  });
                }
                if (typeof balance === 'number') {
                  setAccount(prev => ({ ...prev, balance }));
                  if (mode === 'real') {
                    setRealAccountBalance(balance);
                  }
                }
                triggerToast(`Trade cashed out on another device (+$${(payout || 0).toFixed(2)})`, true);
              }
            } else if (data.type === 'TRADE_SETTLED') {
              const { contractId, settlementItem, balance, mode } = data;
              if (contractId) {
                settledContractIdsRef.current.add(contractId);
                setActiveContracts(prev => prev.filter(c => c.id !== contractId));
                if (settlementItem) {
                  setTradeHistory(prev => {
                    if (prev.some(h => h.id === settlementItem.id)) return prev;
                    return [settlementItem, ...prev];
                  });
                }
                if (typeof balance === 'number') {
                  setAccount(prev => ({ ...prev, balance }));
                  if (mode === 'real') {
                    setRealAccountBalance(balance);
                  }
                }
              }
            } else if (data.type === 'BALANCE_UPDATED') {
              const { balance, mode } = data;
              if (typeof balance === 'number') {
                if (accountRef.current.mode === mode) {
                  setAccount(prev => ({ ...prev, balance }));
                }
                if (mode === 'real') {
                  setRealAccountBalance(balance);
                } else if (mode === 'demo' && accountRef.current.mode === 'demo') {
                  setDemoAccountBalance(balance);
                }
              }
            } else if (data.type === 'USER_STATE_SYNC') {
              if (data.activeContracts && Array.isArray(data.activeContracts)) {
                setActiveContracts(prev => {
                  const map = new Map(prev.map(c => [c.id, c]));
                  data.activeContracts.forEach((sc: any) => {
                    if (!map.has(sc.id) && !settledContractIdsRef.current.has(sc.id)) {
                      map.set(sc.id, sc);
                    }
                  });
                  return Array.from(map.values());
                });
              }
              if (data.tradeHistory && Array.isArray(data.tradeHistory)) {
                setTradeHistory(prev => {
                  const existing = new Set(prev.map(h => h.id));
                  const newItems = data.tradeHistory.filter((h: any) => !existing.has(h.id));
                  return newItems.length > 0 ? [...newItems, ...prev] : prev;
                });
              }
            }
          } catch (err) {
            console.warn('[WS Client parse error]', err);
          }
        };

        ws.onclose = () => {
          clearInterval(pingInterval);
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.warn('[WS Connection Error]', e);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentUser?.id]);

  const pullUserState = async () => {
    const userVal = currentUserRef.current;
    if (!userVal) {
      hasSyncedFromServerRef.current = true;
      return;
    }
    if (isPullingRef.current) return;
    isPullingRef.current = true;
    try {
      const modeVal = accountRef.current.mode;
      const res = await fetch(`/api/user-state?mode=${modeVal}`, {
        headers: { 'Authorization': `Bearer ${userVal.id}` }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            if (data.serverTime) {
              serverTimeDriftRef.current = data.serverTime - Date.now();
            }
            const serverContracts = data.activeContracts || [];
            const serverHistory = data.tradeHistory || [];
            const serverAlerts = data.priceAlerts || [];
          
          const stripVolatile = (contracts: Contract[]) => {
            return contracts.map(c => {
              const { currentPrice, currentProfit, ticksPassed, ticksHistory, ...rest } = c;
              return rest;
            });
          };

          const serverFootprint = JSON.stringify({
            activeContracts: stripVolatile(serverContracts),
            tradeHistory: serverHistory,
            priceAlerts: serverAlerts
          });

          const localFootprint = JSON.stringify({
            activeContracts: stripVolatile(activeContractsRef.current),
            tradeHistory: tradeHistoryRef.current,
            priceAlerts: priceAlertsRef.current
          });

          if (serverFootprint !== localFootprint || !hasSyncedFromServerRef.current) {
            lastServerDataRef.current = serverFootprint;
            isSyncingFromServerRef.current = true;
            
            if (!hasSyncedFromServerRef.current) {
              // Initial load: Merge server trade history with local history so all records remain retrievable
              setTradeHistory(prev => {
                const existing = new Set(prev.map(h => h.id));
                const newServerItems = serverHistory.filter((h: any) => !existing.has(h.id));
                return newServerItems.length > 0 ? [...prev, ...newServerItems] : prev;
              });
              if (serverContracts.length > 0) {
                setActiveContracts(serverContracts);
              }
            } else {
              // Merge contracts to preserve ticking and local active trades that aren't on server yet
              setActiveContracts(prev => {
                const serverHistoryIds = new Set(serverHistory.map((h: any) => h.id));
                const localHistoryIds = new Set(tradeHistoryRef.current.map((h: any) => h.id));
                const finalContracts: Contract[] = [];
                const mapServer = new Map<string, any>(serverContracts.map((c: any) => [c.id, c]));
                
                // Keep local contracts unless they are marked as settled in server history or settledContractIdsRef
                for (const c of prev) {
                  if (!serverHistoryIds.has(c.id) && !localHistoryIds.has(c.id) && !settledContractIdsRef.current.has(c.id)) {
                    if (mapServer.has(c.id)) {
                      // exists on both, preserve ticking state
                      const sc = mapServer.get(c.id);
                      finalContracts.push({ ...sc, ticksPassed: c.ticksPassed, ticksHistory: c.ticksHistory, currentProfit: c.currentProfit, currentPrice: c.currentPrice });
                    } else {
                      // purely local, keep it
                      finalContracts.push(c);
                    }
                  }
                }
                
                // Pull new active contracts from server only if not local, not settled, and not in history
                serverContracts.forEach((sc: any) => {
                  if (
                    !prev.some(c => c.id === sc.id) &&
                    !settledContractIdsRef.current.has(sc.id) &&
                    !serverHistoryIds.has(sc.id) &&
                    !localHistoryIds.has(sc.id)
                  ) {
                    finalContracts.push(sc);
                  }
                });
                
                if (finalContracts.length === prev.length && finalContracts.every((c, i) => c.id === prev[i].id)) {
                  return prev;
                }
                return finalContracts;
              });
              
              // Only merge trade history appending new ones 
              setTradeHistory(prev => {
                const existing = new Set(prev.map(h => h.id));
                const newItems = serverHistory.filter((h: any) => !existing.has(h.id));
                return newItems.length > 0 ? [...prev, ...newItems] : prev;
              });
            }
            setPriceAlerts(serverAlerts);
          } else {
            hasSyncedFromServerRef.current = true;
          }
        }
      }
    } else if (res.status === 401 || res.status === 404) {
      // Clear all storage on auth failure or missing user to ensure fresh state without reload loops
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('knex_') && key !== 'knex_version') localStorage.removeItem(key);
      });
      setCurrentUser(null);
    }
    } catch (e: any) {
      // Gracefully handle network disconnects / offline state without raising unhandled errors
      if (e?.name !== 'TypeError' && !e?.message?.includes('fetch') && !e?.message?.includes('network')) {
        console.warn('Notice pulling user state:', e?.message || e);
      }
    } finally {
      isPullingRef.current = false;
    }
  };

  // Immediate session validation on mount
  useEffect(() => {
    if (currentUser) {
      setIsInitializing(true);
      pullUserState().finally(() => setIsInitializing(false));
    }
  }, []);

  const pushUserState = async (contracts: Contract[], history: TradeHistoryItem[], alerts: PriceAlert[]) => {
    const userVal = currentUserRef.current;
    if (!userVal) return;
    try {
      const modeVal = accountRef.current.mode;
      
      const stripVolatile = (c: Contract) => {
        const { currentPrice, currentProfit, ticksPassed, ticksHistory, ...rest } = c;
        return rest;
      };

      const res = await fetch('/api/user-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userVal.id}`
        },
        body: JSON.stringify({
          mode: modeVal,
          activeContracts: contracts.map(stripVolatile),
          tradeHistory: history,
          priceAlerts: alerts
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn('Notice: pushUserState to server returned status:', res.status, 'Body:', errorText);
      }
    } catch (e: any) {
      if (e?.name !== 'TypeError' && !e?.message?.includes('fetch') && !e?.message?.includes('network')) {
        console.warn('Notice pushing user state:', e?.message || e);
      }
    }
  };

  const backfillGapsAndSettle = (now: number, targetPartitionId: string, initialContracts?: Contract[], initialHistory?: TradeHistoryItem[]) => {
    // 1. Get current ticks map
    let ticksMap = { ...assetsTicksMapRef.current };
    
    // If empty ticks map, try loading it from localStorage or initialize
    if (Object.keys(ticksMap).length === 0) {
      const savedTicks = localStorage.getItem(`knex_ticks_history_${targetPartitionId}`);
      if (savedTicks) {
        try {
          ticksMap = JSON.parse(savedTicks);
        } catch (e) {}
      }
    }
    
    if (Object.keys(ticksMap).length === 0) {
      ticksMap = initializeAssetHistory(ASSETSList);
    }

    // Find last tick time
    const keys = Object.keys(ticksMap);
    if (keys.length === 0) return;
    
    const firstAssetTicks = ticksMap[keys[0]];
    if (!firstAssetTicks || firstAssetTicks.length === 0) return;
    
    const lastTickTime = firstAssetTicks[firstAssetTicks.length - 1].time;
    const gapMs = now - lastTickTime;
    
    // Gap must be at least 5 seconds to trigger backfill
    if (gapMs < 5000) {
      // Normal load: make sure ticks map is updated if empty
      if (Object.keys(assetsTicksMapRef.current).length === 0) {
        setAssetsTicksMap(ticksMap);
      }
      return;
    }
    
    console.log(`[KNEX Backfill] Gap detected: ${Math.floor(gapMs / 1000)} seconds. Backfilling history and settling offline trades...`);
    
    // 2. Load contracts and history
    let contracts = initialContracts || [...activeContractsRef.current];
    let history = initialHistory || [...tradeHistoryRef.current];
    
    const currentMode = accountRef.current.mode;
    
    // Find active contracts that are expired before `now`
    const activeExpired = contracts.filter(c => c.status === 'active' && c.expiryTime <= now);
    
    // Simulating sequence of ticks
    let maxExpiry = lastTickTime;
    if (activeExpired.length > 0) {
      maxExpiry = Math.max(...activeExpired.map(c => c.expiryTime));
    }
    
    // Setup pricing state
    const priceState: Record<string, number> = {};
    ASSETSList.forEach(asset => {
      const assetTicks = ticksMap[asset.id] || [];
      priceState[asset.id] = assetTicks.length > 0 ? assetTicks[assetTicks.length - 1].price : asset.price;
    });

    const getDeterministicRandom = (seedStr: string): number => {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash |= 0;
      }
      const x = Math.sin(hash) * 10000;
      return x - Math.floor(x);
    };

    const walkAsset = (assetId: string, currentPrice: number, stepSec: number, seedStep?: number) => {
      const asset = ASSETSList.find(a => a.id === assetId);
      if (!asset) return currentPrice;
      const trendBias = asset.trendBias;
      const volatility = asset.volatility;
      const volatilityMult = gameSettingsRef.current?.volatilityMultiplier || 1;
      const totalBias = trendBias + (gameSettingsRef.current?.globalTrendBias || 0);
      const randVal = seedStep ? getDeterministicRandom(`${assetId}-${seedStep}`) : Math.random();
      const walkFactor = (randVal - 0.5 + totalBias) * 1.5;
      const stepScale = Math.sqrt(stepSec);
      return currentPrice * (1 + walkFactor * ((volatility * volatilityMult / 100) * stepScale));
    };

    // Helper to evaluate a contract at a specific timestamp and price
    const evaluateContractAtStep = (contract: Contract, stepTime: number, rawStepPrice: number) => {
      const stepPrice = (typeof rawStepPrice === 'number' && !isNaN(rawStepPrice)) ? rawStepPrice : (contract.entryPrice || 100);
      let isExpired = stepTime >= contract.expiryTime;
      let ticksPassed = Math.floor((stepTime - contract.entryTime) / 1000);
      if (ticksPassed < 0) ticksPassed = 0;

      const actualBarrier = contract.barrier || contract.entryPrice;

      let currentProfit = 0;
      let status: 'active' | 'won' | 'lost' | 'draw' = 'active';

      if (contract.type === 'rise-fall') {
        const isCall = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher';
        if (isExpired) {
          if (stepPrice > contract.entryPrice) {
            status = isCall ? 'won' : 'lost';
            currentProfit = isCall ? (contract.payout - contract.stake) : -contract.stake;
          } else if (stepPrice < contract.entryPrice) {
            status = isCall ? 'lost' : 'won';
            currentProfit = isCall ? -contract.stake : (contract.payout - contract.stake);
          } else {
            status = 'draw';
            currentProfit = 0;
          }
        } else {
          const isWinning = isCall ? (stepPrice > contract.entryPrice) : (stepPrice < contract.entryPrice);
          currentProfit = isWinning ? (contract.payout - contract.stake) : -contract.stake;
        }
      } else if (contract.type === 'higher-lower') {
        const isHigher = contract.direction === 'higher' || contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy';
        if (isExpired) {
          if (stepPrice > actualBarrier) {
            status = isHigher ? 'won' : 'lost';
            currentProfit = isHigher ? (contract.payout - contract.stake) : -contract.stake;
          } else if (stepPrice < actualBarrier) {
            status = isHigher ? 'lost' : 'won';
            currentProfit = isHigher ? -contract.stake : (contract.payout - contract.stake);
          } else {
            status = 'draw';
            currentProfit = 0;
          }
        } else {
          const isWinning = isHigher ? (stepPrice > actualBarrier) : (stepPrice < actualBarrier);
          currentProfit = isWinning ? (contract.payout - contract.stake) : -contract.stake;
        }
      } else if (contract.type === 'touch-no-touch') {
        const isTouch = contract.direction === 'touch';
        const touched = (contract.barrierOffset && contract.barrierOffset > 0)
          ? (actualBarrier >= contract.entryPrice ? stepPrice >= actualBarrier : stepPrice <= actualBarrier)
          : false;

        if (isTouch) {
          if (touched) {
            currentProfit = contract.stake * 0.955;
            status = 'won';
          } else if (isExpired) {
            currentProfit = -contract.stake;
            status = 'lost';
          } else {
            currentProfit = -contract.stake;
            status = 'active';
          }
        } else {
          if (touched) {
            currentProfit = -contract.stake;
            status = 'lost';
          } else if (isExpired) {
            currentProfit = contract.stake * 0.955;
            status = 'won';
          } else {
            currentProfit = contract.stake * 0.955;
            status = 'active';
          }
        }
      } else if (contract.type === 'digit-over-under') {
        const decimals = (contract.assetSymbol && contract.assetSymbol.includes('MFLOW')) ? 4 : 2;
        const lastDigit = parseInt((stepPrice ?? 0).toFixed(decimals).split('').pop() || '0');
        const isOver = contract.direction === 'over';
        const success = isOver 
          ? lastDigit > (contract.targetDigit || 0)
          : lastDigit < (contract.targetDigit || 0);
        
        currentProfit = success ? contract.stake * 0.90 : -contract.stake;
        if (isExpired) {
          status = success ? 'won' : 'lost';
        }
      }

      const isWinningCurrently = currentProfit > 0;
      let calculatedSellPrice = contract.stake;
      if (isWinningCurrently) {
        calculatedSellPrice = contract.stake + (contract.payout - contract.stake) * 0.7;
      } else {
        calculatedSellPrice = Math.max(contract.stake * 0.1, contract.stake * 0.5);
      }

      let isStopLossTriggered = false;
      let isTakeProfitTriggered = false;
      let earlyExitRefund = calculatedSellPrice;

      if (contract.stopLoss && contract.stopLoss > 0) {
        const slPercent = contract.stopLoss;
        let priceAgainstPct = 0;
        if (contract.direction === 'rise' || contract.direction === 'higher' || contract.direction === 'touch') {
          priceAgainstPct = contract.entryPrice > stepPrice 
            ? ((contract.entryPrice - stepPrice) / contract.entryPrice) * 100 
            : 0;
        } else {
          priceAgainstPct = stepPrice > contract.entryPrice 
            ? ((stepPrice - contract.entryPrice) / contract.entryPrice) * 100 
            : 0;
        }

        if (priceAgainstPct >= slPercent) {
          isStopLossTriggered = true;
          earlyExitRefund = calculatedSellPrice;
        }
      }

      if (!isStopLossTriggered && contract.stopLossPrice) {
        if (contract.direction === 'rise' || contract.direction === 'higher') {
          if (stepPrice <= contract.stopLossPrice) isStopLossTriggered = true;
        } else {
          if (stepPrice >= contract.stopLossPrice) isStopLossTriggered = true;
        }
        if (isStopLossTriggered) earlyExitRefund = calculatedSellPrice;
      }

      if (!isStopLossTriggered && !isTakeProfitTriggered && contract.takeProfitPrice) {
        if (contract.direction === 'rise' || contract.direction === 'higher') {
          if (stepPrice >= contract.takeProfitPrice) isTakeProfitTriggered = true;
        } else {
          if (stepPrice <= contract.takeProfitPrice) isTakeProfitTriggered = true;
        }
        if (isTakeProfitTriggered) earlyExitRefund = calculatedSellPrice;
      }

      return {
        isExpired,
        isStopLossTriggered,
        isTakeProfitTriggered,
        status,
        currentProfit,
        calculatedSellPrice,
        earlyExitRefund,
        ticksPassed
      };
    };

    let balanceDeltaTotal = 0;
    const accumulatedTicks: Record<string, Tick[]> = {};
    ASSETSList.forEach(asset => {
      accumulatedTicks[asset.id] = [...(ticksMap[asset.id] || [])];
    });

    const triggerSettlement = (contract: Contract, finalStatus: string, finalPayout: number, netProfit: number, exitPrice: number, blockExitRefund: number) => {
      const histItem: TradeHistoryItem = {
        id: contract.id,
        assetName: contract.assetName,
        assetSymbol: contract.assetSymbol,
        type: contract.type,
        direction: contract.direction,
        stake: contract.stake,
        payout: finalPayout,
        profit: netProfit,
        status: finalStatus as any,
        entryPrice: contract.entryPrice,
        exitPrice: exitPrice,
        purchaseTime: contract.entryTime
      };

      markContractSettled(contract.id);
      history.push(histItem);
      balanceDeltaTotal += finalPayout;
      
      const isDemo = currentMode === 'demo';
      if (currentUserRef.current) {
        fetch('/api/users/update-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserRef.current.id,
            amount: finalPayout,
            isDemo,
            tradeId: contract.id,
            consumeForceOutcome: false
          })
        })
        .catch(err => console.warn('[Backfill] Notice updating user balance:', err?.message || err));
      }

      triggerToast(`Offline Trade Settled: ${contract.assetSymbol} ended in ${finalStatus.toUpperCase()}. Net payout: $${finalPayout.toFixed(2)} (${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} Profit)`, netProfit >= 0);
    };

    // Sub-Step 1: Walk second-by-second from `lastTickTime` to `maxExpiry`
    if (maxExpiry > lastTickTime) {
      const stepInterval = 1000;
      for (let t = lastTickTime + stepInterval; t <= maxExpiry; t += stepInterval) {
        ASSETSList.forEach(asset => {
          priceState[asset.id] = walkAsset(asset.id, priceState[asset.id], 1, t);
          if (t >= now - 6000 * 1000) {
            accumulatedTicks[asset.id].push({ time: t, price: priceState[asset.id] });
          }
        });

        contracts = contracts.map(contract => {
          if (contract.status !== 'active') return contract;
          const currentPrice = priceState[contract.assetId] || contract.entryPrice || 100;

          const evalResult = evaluateContractAtStep(contract, t, currentPrice);

          if (evalResult.isExpired || evalResult.status !== 'active' || evalResult.isStopLossTriggered || evalResult.isTakeProfitTriggered) {
            let finalStatus = (evalResult.isStopLossTriggered || evalResult.isTakeProfitTriggered) ? 'sold' : (evalResult.status !== 'active' ? evalResult.status : (evalResult.currentProfit > 0 ? 'won' : evalResult.currentProfit < 0 ? 'lost' : 'draw'));
            
            let force = currentUserRef.current?.forceOutcome || gameSettingsRef.current?.forceOutcome;
            if (force === 'win' && !evalResult.isStopLossTriggered && !evalResult.isTakeProfitTriggered) finalStatus = 'won';
            if (force === 'loss' && !evalResult.isStopLossTriggered && !evalResult.isTakeProfitTriggered) finalStatus = 'lost';

            const isWon = finalStatus === 'won';
            const isDraw = finalStatus === 'draw';
            const isSold = finalStatus === 'sold';
            
            let netProfit = 0;
            if (isSold) {
              netProfit = evalResult.earlyExitRefund - contract.stake;
            } else if (isDraw) {
              netProfit = 0;
            } else {
              netProfit = isWon ? (contract.payout - contract.stake) : -contract.stake;
            }

            if (netProfit > 0 && currentUserRef.current?.maxWinLimit && currentUserRef.current.maxWinLimit > 0 && netProfit > currentUserRef.current.maxWinLimit) {
              netProfit = currentUserRef.current.maxWinLimit;
            }
            if (netProfit < 0 && currentUserRef.current?.maxLossLimit && currentUserRef.current.maxLossLimit > 0 && Math.abs(netProfit) > currentUserRef.current.maxLossLimit) {
              netProfit = -currentUserRef.current.maxLossLimit;
            }

            const finalPayout = contract.stake + netProfit;
            triggerSettlement(contract, finalStatus, finalPayout, netProfit, currentPrice, evalResult.earlyExitRefund);

            return {
              ...contract,
              status: finalStatus as any,
              exitPrice: currentPrice,
              exitTime: t,
              ticksPassed: evalResult.ticksPassed,
              currentPrice: currentPrice,
              currentProfit: evalResult.currentProfit,
              ticksHistory: [...(contract.ticksHistory || []), { time: t, price: currentPrice }]
            };
          }

          return {
            ...contract,
            ticksPassed: evalResult.ticksPassed,
            currentPrice: currentPrice,
            currentProfit: evalResult.currentProfit,
            ticksHistory: [...(contract.ticksHistory || []), { time: t, price: currentPrice }]
          };
        });
      }
    }

    // Sub-Step 2: Jump the macro gap from `maxExpiry` to `now - 6000 * 1000` (if any gap exists)
    const macroStart = Math.max(lastTickTime, maxExpiry);
    const macroEnd = now - 6000 * 1000;
    const macroGapSeconds = Math.floor((macroEnd - macroStart) / 1000);
    
    if (macroGapSeconds > 10) {
      const macroSteps = 50;
      const stepSeconds = macroGapSeconds / macroSteps;
      for (let s = 1; s <= macroSteps; s++) {
        ASSETSList.forEach(asset => {
          priceState[asset.id] = walkAsset(asset.id, priceState[asset.id], stepSeconds);
        });
      }
    }

    // Sub-Step 3: Simulate high-density 1-second ticks from macroEnd (or first position) to `now`
    const highDensityStart = Math.max(macroStart, macroEnd);
    const stepInterval = 1000;
    for (let t = Math.floor(highDensityStart / 1000) * 1000 + stepInterval; t <= now; t += stepInterval) {
      ASSETSList.forEach(asset => {
        priceState[asset.id] = walkAsset(asset.id, priceState[asset.id], 1);
        accumulatedTicks[asset.id].push({ time: t, price: priceState[asset.id] });
      });

      contracts = contracts.map(contract => {
        if (contract.status !== 'active') return contract;
        const currentPrice = priceState[contract.assetId] || contract.entryPrice || 100;

        const evalResult = evaluateContractAtStep(contract, t, currentPrice);

        if (evalResult.isExpired || evalResult.status !== 'active' || evalResult.isStopLossTriggered || evalResult.isTakeProfitTriggered) {
          let finalStatus = (evalResult.isStopLossTriggered || evalResult.isTakeProfitTriggered) ? 'sold' : (evalResult.status !== 'active' ? evalResult.status : (evalResult.currentProfit > 0 ? 'won' : evalResult.currentProfit < 0 ? 'lost' : 'draw'));
          
          let force = currentUserRef.current?.forceOutcome || gameSettingsRef.current?.forceOutcome;
          if (force === 'win' && !evalResult.isStopLossTriggered && !evalResult.isTakeProfitTriggered) finalStatus = 'won';
          if (force === 'loss' && !evalResult.isStopLossTriggered && !evalResult.isTakeProfitTriggered) finalStatus = 'lost';

          const isWon = finalStatus === 'won';
          const isDraw = finalStatus === 'draw';
          const isSold = finalStatus === 'sold';
          
          let netProfit = 0;
          if (isSold) {
            netProfit = evalResult.earlyExitRefund - contract.stake;
          } else if (isDraw) {
            netProfit = 0;
          } else {
            netProfit = isWon ? (contract.payout - contract.stake) : -contract.stake;
          }

          if (netProfit > 0 && currentUserRef.current?.maxWinLimit && currentUserRef.current.maxWinLimit > 0 && netProfit > currentUserRef.current.maxWinLimit) {
            netProfit = currentUserRef.current.maxWinLimit;
          }
          if (netProfit < 0 && currentUserRef.current?.maxLossLimit && currentUserRef.current.maxLossLimit > 0 && Math.abs(netProfit) > currentUserRef.current.maxLossLimit) {
             netProfit = -currentUserRef.current.maxLossLimit;
          }

          const finalPayout = contract.stake + netProfit;
          triggerSettlement(contract, finalStatus, finalPayout, netProfit, currentPrice, evalResult.earlyExitRefund);

          return {
            ...contract,
            status: finalStatus as any,
            exitPrice: currentPrice,
            exitTime: t,
            ticksPassed: evalResult.ticksPassed,
            currentPrice: currentPrice,
            currentProfit: evalResult.currentProfit,
            ticksHistory: [...(contract.ticksHistory || []), { time: t, price: currentPrice }]
          };
        }

        return {
          ...contract,
          ticksPassed: evalResult.ticksPassed,
          currentPrice: currentPrice,
          currentProfit: evalResult.currentProfit,
          ticksHistory: [...(contract.ticksHistory || []), { time: t, price: currentPrice }]
        };
      });
    }

    if (balanceDeltaTotal !== 0) {
      setAccount(prev => ({ ...prev, balance: prev.balance + balanceDeltaTotal }));
      if (currentMode === 'real') {
        setRealAccountBalance(prev => Math.max(0, prev + balanceDeltaTotal));
      }
    }

    const finalTicksMap: Record<string, Tick[]> = {};
    ASSETSList.forEach(asset => {
      finalTicksMap[asset.id] = (accumulatedTicks[asset.id] || []).slice(-6000);
    });

    localStorage.setItem(`knex_ticks_history_${targetPartitionId}`, JSON.stringify(finalTicksMap));
    localStorage.setItem(`knex_active_contracts_${targetPartitionId}`, JSON.stringify(contracts));
    localStorage.setItem(`knex_history_${targetPartitionId}`, JSON.stringify(history));

    setAssetsTicksMap(finalTicksMap);
    setActiveContracts(contracts);
    setTradeHistory(history);

    setAssetsRegistry((prevReg) =>
      prevReg.map((item) => {
        const nextPrice = priceState[item.id];
        if (nextPrice === undefined) return item;
        const lastPrice = item.price;
        return {
          ...item,
          price: nextPrice,
          change: lastPrice ? ((nextPrice - lastPrice) / lastPrice) * 100 : item.change
        };
      })
    );
  };

  // Sync account details, active contracts portfolio, trade history, price alerts, and balance atomically when currentUser or mode changes
  useEffect(() => {
    let syncInterval: any;

    const syncUserBalance = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.user) {
            const demoBal = Number(data.user.demo_balance) || 0;
            const realBal = Number(data.user.real_balance) || 0;
            
            setRealAccountBalance(prev => prev === realBal ? prev : realBal);
            
            setAccount(prev => {
              const nextBalance = prev.mode === 'demo' ? demoBal : realBal;
              if (prev.balance === nextBalance) return prev;
              return { ...prev, balance: nextBalance };
            });

            setCurrentUser((prevUser: any) => {
              if (prevUser) {
                if (prevUser.demo_balance === demoBal && prevUser.real_balance === realBal) {
                  return prevUser;
                }
                const updated = { ...prevUser, demo_balance: demoBal, real_balance: realBal };
                localStorage.setItem('knex_current_user', JSON.stringify(updated));
                return updated;
              }
              return prevUser;
            });
            }
          }
        } else if (res.status === 401 || res.status === 404) {
          setCurrentUser(null);
          localStorage.removeItem('knex_current_user');
        }
      } catch (err: any) {
        // Gracefully handle network hiccups / offline / dev server restarts without unhandled errors
        if (err?.name !== 'TypeError' && !err?.message?.includes('fetch') && !err?.message?.includes('network')) {
          console.warn('Notice syncing user balance:', err?.message || err);
        }
      }
    };

    // Calculate current target partition key
    const targetUserIdStr = currentUser ? currentUser.id : 'guest';
    const targetMode = currentUser ? account.mode : 'demo'; // Force guest to demo mode
    const targetPartitionId = `${targetUserIdStr}_${targetMode}`;

    // Reset sync status when switching partition or on mount
    hasSyncedFromServerRef.current = false;
    isSyncingFromServerRef.current = false;

    // Load stored data for this specific partition
    const savedContracts = localStorage.getItem(`knex_active_contracts_${targetPartitionId}`);
    const savedHistory = localStorage.getItem(`knex_history_${targetPartitionId}`);
    const savedAlerts = localStorage.getItem(`knex_price_alerts_${targetPartitionId}`);
    const savedTicks = localStorage.getItem(`knex_ticks_history_v2_${targetPartitionId}`) || localStorage.getItem(`knex_ticks_history_${targetPartitionId}`);

    let nextContracts: Contract[] = [];
    let nextHistory: TradeHistoryItem[] = [];
    let nextAlerts: PriceAlert[] = [];

    if (savedContracts) {
      try { 
        const parsed = JSON.parse(savedContracts);
        if (Array.isArray(parsed)) nextContracts = parsed;
      } catch (e) {}
    }
    if (savedHistory) {
      try { 
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) nextHistory = parsed;
      } catch (e) {}
    }
    if (savedAlerts) {
      try { 
        const parsed = JSON.parse(savedAlerts);
        if (Array.isArray(parsed)) nextAlerts = parsed;
      } catch (e) {}
    }

    if (JSON.stringify(priceAlertsRef.current) !== JSON.stringify(nextAlerts)) {
      setPriceAlerts(nextAlerts);
    }

    const now = getServerTime();
    let gapTriggeredBackfill = false;

    if (savedTicks) {
      try {
        const parsed = JSON.parse(savedTicks);
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed);
          if (keys.length > 0 && Array.isArray(parsed[keys[0]])) {
            const firstAssetTicks = parsed[keys[0]];
            if (firstAssetTicks && firstAssetTicks.length > 0) {
              const lastTickTime = firstAssetTicks[firstAssetTicks.length - 1].time;
              if (now - lastTickTime >= 5000) {
                backfillGapsAndSettle(now, targetPartitionId, nextContracts, nextHistory);
                gapTriggeredBackfill = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse saved ticks history partition-level:', e);
      }
    } else {
      // First time loading partition or user has no saved ticks, trigger initial generation
      const initialMap = initializeAssetHistory(ASSETSList);
      localStorage.setItem(`knex_ticks_history_v2_${targetPartitionId}`, JSON.stringify(initialMap));
      setAssetsTicksMap(initialMap);
      gapTriggeredBackfill = true;
    }

    if (!gapTriggeredBackfill) {
      if (savedTicks) {
        try {
          const parsed = JSON.parse(savedTicks);
          setAssetsTicksMap(parsed);
        } catch (e) {}
      }
      if (JSON.stringify(activeContractsRef.current) !== JSON.stringify(nextContracts)) {
        setActiveContracts(nextContracts);
      }
      if (JSON.stringify(tradeHistoryRef.current) !== JSON.stringify(nextHistory)) {
        setTradeHistory(nextHistory);
      }
    }

    // Sync account details
    if (currentUser) {
      const userRealBal = Number(currentUser.real_balance) || Number(currentUser.balance) || 0;
      const userDemoBal = Number(currentUser.demo_balance) || 10000.00;
      const nextId = `m-ac-${currentUser.id}`;
      const targetBalance = targetMode === 'real' ? userRealBal : userDemoBal;
      
      const currAcc = accountRef.current;
      if (currAcc.mode !== targetMode || currAcc.balance !== targetBalance || currAcc.id !== nextId) {
        setAccount({
          ...currAcc,
          mode: targetMode,
          balance: targetBalance,
          id: nextId
        });
      }

      const startRealUserBalance = Number(currentUser.real_balance) || 0;
      if (realAccountBalance !== startRealUserBalance) {
        setRealAccountBalance(startRealUserBalance);
      }

      // Fetch latest values and enable periodic balance sync
      syncUserBalance();
      pullUserState();
      syncInterval = setInterval(() => {
        syncUserBalance();
        pullUserState();
      }, 4000);
    } else {
      // Guest fallback: preserve stored demo balance if exists
      const currAcc = accountRef.current;
      const storedDemo = localStorage.getItem('knex_demo_balance');
      const fallbackBal = storedDemo !== null && !isNaN(Number(storedDemo)) ? Number(storedDemo) : (currAcc.balance || 10000.00);
      if (currAcc.mode !== 'demo' || currAcc.id !== 'demo-temp-acc') {
        setAccount({
          ...currAcc,
          mode: 'demo',
          balance: fallbackBal,
          id: 'demo-temp-acc'
        });
      }
      if (realAccountBalance !== 0.00) {
        setRealAccountBalance(0.00);
      }
    }

    // Update synchronization checkpoint ref
    prevPartitionIdRef.current = targetPartitionId;

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [currentUser?.id, account.mode]);

  // Limit/Market Trade inputs
  const [spotPriceLimit, setSpotPriceLimit] = useState<number>(activeAsset.price);
  const [spotType, setSpotType] = useState<'limit' | 'market'>('limit');
  const [spotAmount, setSpotAmount] = useState<string>('0.05');
  const [spotAmountUsd, setSpotAmountUsd] = useState<string>('');
  const [activeInput, setActiveInput] = useState<'qty' | 'usd'>('qty');
  const [spotDuration, setSpotDuration] = useState<number>(5);
  const [spotDurationUnit, setSpotDurationUnit] = useState<'ticks' | 'seconds' | 'minutes' | 'hours' | 'days'>('seconds');

  const [quickOrderPrompt, setQuickOrderPrompt] = useState<{ price: number } | null>(null);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [selectedBinaryDirection, setSelectedBinaryDirection] = useState<'call' | 'put'>('call');
  const [selectedContractType, setSelectedContractType] = useState<ContractType>('rise-fall');
  const [targetDigit, setTargetDigit] = useState<number>(5);
  const [barrierOffset, setBarrierOffset] = useState<number>(1.5);
  const [oneClickTrading, setOneClickTrading] = useState<boolean>(true);
  const [lastTradeConfig, setLastTradeConfig] = useState<{
    assetId: string;
    type: ContractType;
    direction: any;
    stake: number;
    duration: number;
    durationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
    targetDigit?: number;
    barrierOffset?: number;
  } | null>(null);

  // Advanced & Easy Trading States
  const [tradingModeTab, setTradingModeTab] = useState<'quick' | 'pro'>('quick');
  const [autoMartingale, setAutoMartingale] = useState<boolean>(false);
  const [baseMartingaleStake, setBaseMartingaleStake] = useState<number>(10);
  const [autoCashoutPercent, setAutoCashoutPercent] = useState<number>(0); // 0 = disabled, 50, 75, 90
  const [autoDismissSettlement, setAutoDismissSettlement] = useState<boolean>(false);
  const [hotkeysEnabled, setHotkeysEnabled] = useState<boolean>(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState<boolean>(false);
  const [showValidationChecklist, setShowValidationChecklist] = useState<boolean>(false);
  const [proPlayGridModal, setProPlayGridModal] = useState<ContractType | null>(null);

  // Dynamic Session Streak & Performance Tracking
  const sessionStats = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return { streakCount: 0, streakType: 'none' as const, winRate: 0, totalProfit: 0, totalTrades: 0, wins: 0, losses: 0 };
    }
    const totalTrades = tradeHistory.length;
    const wins = tradeHistory.filter(t => t.status === 'won').length;
    const losses = tradeHistory.filter(t => t.status === 'lost').length;
    const totalProfit = tradeHistory.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    let streakCount = 0;
    let streakType: 'won' | 'lost' | 'none' = 'none';
    for (let i = tradeHistory.length - 1; i >= 0; i--) {
      const item = tradeHistory[i];
      if (item.status === 'draw') continue;
      if (streakType === 'none') {
        streakType = item.status === 'won' ? 'won' : 'lost';
        streakCount = 1;
      } else if ((streakType === 'won' && item.status === 'won') || (streakType === 'lost' && item.status !== 'won')) {
        streakCount++;
      } else {
        break;
      }
    }
    return { streakCount, streakType, winRate, totalProfit, totalTrades, wins, losses };
  }, [tradeHistory]);

  const activeStakes = useMemo(() => activeContracts.reduce((sum, c) => sum + c.stake, 0), [activeContracts]);
  const freeBalance = Math.max(0, (account?.balance || 0) - activeStakes);

  const loadSettledContractIds = (): Set<string> => {
    try {
      const saved = localStorage.getItem('knex_settled_contract_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  const settledContractIdsRef = useRef<Set<string>>(loadSettledContractIds());

  const markContractSettled = (id: string) => {
    settledContractIdsRef.current.add(id);
    try {
      localStorage.setItem('knex_settled_contract_ids', JSON.stringify(Array.from(settledContractIdsRef.current)));
    } catch (e) {}
  };

  const isSubmittingTradeRef = useRef<boolean>(false);
  const [liveClockTime, setLiveClockTime] = useState<number>(() => Date.now());

  useEffect(() => {
    if (activeContracts.length === 0) return;
    const timer = setInterval(() => {
      setLiveClockTime(Date.now() + serverTimeDriftRef.current);
    }, 100);
    return () => clearInterval(timer);
  }, [activeContracts.length]);

  const [latestSettlement, setLatestSettlement] = useState<{
    id: string;
    assetName: string;
    assetSymbol: string;
    direction: string;
    entryPrice: number;
    exitPrice: number;
    stake: number;
    payout: number;
    profit: number;
    status: 'won' | 'lost' | 'draw' | 'sold';
    resultText: string;
    decimals: number;
    timestamp: number;
  } | null>(null);

  // Sync limit input on active asset swaps
  useEffect(() => {
    setSpotPriceLimit(activeAsset.price);
  }, [activeAsset]);

  const [gameSettings, setGameSettings] = useState<{
    globalTrendBias: number;
    volatilityMultiplier: number;
    forceOutcome?: 'win' | 'loss';
    realWinRate?: number;
    paybillEnabled?: boolean;
    btcEnabled?: boolean;
    minDeposit?: number;
    minWithdrawal?: number;
    cashoutMode?: 'enabled' | 'disabled' | 'smart';
    payoutRate?: number;
    minStake?: number;
    maxStake?: number;
    binaryOptionsPaused?: boolean;
    mflowPaused?: boolean;
    p2pPaused?: boolean;
    depositsPaused?: boolean;
    withdrawalsPaused?: boolean;
  }>({
    globalTrendBias: 0,
    volatilityMultiplier: 1,
    realWinRate: 30,
    paybillEnabled: true,
    btcEnabled: true,
    minDeposit: 1,
    minWithdrawal: 15,
    cashoutMode: 'enabled',
    payoutRate: 95.5,
    minStake: 1,
    maxStake: 5000
  });

  const gameSettingsRef = useRef(gameSettings);

  useEffect(() => {
    gameSettingsRef.current = gameSettings;
  }, [gameSettings]);

  // Persist state changes in account-specific partitions and push to server
  useEffect(() => {
    localStorage.setItem('knex_account', JSON.stringify(account));
    
    // Only write data if they belong together and match the current active partition ID
    // This blocks the race condition during login/logout/switch transitions
    const currentUserIdStr = currentUser ? currentUser.id : 'guest';
    const currentMode = currentUser ? account.mode : 'demo';
    const currentPartitionId = `${currentUserIdStr}_${currentMode}`;

    if (currentPartitionId === prevPartitionIdRef.current) {
      localStorage.setItem(`knex_history_${currentPartitionId}`, JSON.stringify(tradeHistory));
      localStorage.setItem(`knex_active_contracts_${currentPartitionId}`, JSON.stringify(activeContracts));
      localStorage.setItem(`knex_price_alerts_${currentPartitionId}`, JSON.stringify(priceAlerts));
      localStorage.setItem(`knex_pending_limit_orders_${currentPartitionId}`, JSON.stringify(pendingLimitOrders));

      const stripVolatileLocal = (contracts: Contract[]) => {
        return contracts.map(c => {
          const { currentPrice, currentProfit, ticksPassed, ticksHistory, ...rest } = c;
          return rest;
        });
      };

      const combinedString = JSON.stringify({
        activeContracts: stripVolatileLocal(activeContracts),
        tradeHistory,
        priceAlerts
      });

      if (isSyncingFromServerRef.current) {
        if (combinedString === lastServerDataRef.current) {
          isSyncingFromServerRef.current = false;
          hasSyncedFromServerRef.current = true;
        }
      } else if (currentUser && hasSyncedFromServerRef.current) {
        if (combinedString !== lastServerDataRef.current) {
          localMutationTimeRef.current = Date.now();
          lastServerDataRef.current = combinedString;
          pushUserState(activeContracts, tradeHistory, priceAlerts);
        }
      }
    }
    
    localStorage.setItem('knex_demo_balance', String(demoAccountBalance));
    localStorage.setItem('knex_real_balance', String(realAccountBalance));
    if (currentUser) {
      localStorage.setItem('knex_current_user', JSON.stringify(currentUser));
      localStorage.removeItem('knex_logged_out');
    } else {
      localStorage.removeItem('knex_current_user');
      localStorage.setItem('knex_logged_out', 'true');
    }
  }, [account, tradeHistory, activeContracts, demoAccountBalance, realAccountBalance, currentUser, priceAlerts, pendingLimitOrders]);

  // Modals & Panels Switches
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isDirectAdminUrl = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    return path.includes('secure-admin') || searchParams.get('admin') === 'true';
  };
  const [isAdminOpen, setIsAdminOpen] = useState(isDirectAdminUrl);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('secure-admin')) {
      window.history.pushState({}, document.title, '/');
    }
  };

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [authModalInitialView, setAuthModalInitialView] = useState<'login' | 'register' | 'forgot_password' | 'reset_password'>('login');
  
  const handleTriggerAuth = (view: 'login' | 'register' | 'forgot_password' | 'reset_password') => {
    setAuthModalInitialView(view);
    setIsAuthOpen(true);
  };

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cashierDefaultTab, setCashierDefaultTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Notifications states
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; type: string; read: boolean }>>([
    { id: 'n-1', text: '🎁 Double Bonus deposit campaign is now active for VIP members.', time: '10m ago', type: 'system', read: false },
    { id: 'n-2', text: '🔔 Price Alert: BTC/USDT crossed above $95,000.', time: '1h ago', type: 'alert', read: false },
    { id: 'n-3', text: '📈 ETH/USDT daily change exceeded breakout threshold of 8.5%.', time: '4h ago', type: 'market', read: false },
    { id: 'n-4', text: '🔒 Security Note: Login detected from device Chrome/OSX.', time: '1d ago', type: 'security', read: true },
    { id: 'n-5', text: '💰 Rebate Disbursed: Affiliate referral balance updated (+32.50 USDT).', time: '1d ago', type: 'financial', read: true },
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Synchronise route path to open Secure Admin login page instantly
  useEffect(() => {
    const handlePathCheck = () => {
      const path = window.location.pathname.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      if (path.includes('secure-admin') || searchParams.get('admin') === 'true') {
        setIsAdminOpen(true);
        if (searchParams.get('admin') === 'true') {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
      
      const resetToken = searchParams.get('token');
      if (resetToken) {
        localStorage.setItem('pending_reset_token', resetToken);
        setAuthModalInitialView('reset_password');
        setIsAuthOpen(true);
        
        // Clean URL to avoid infinite popups
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };
    handlePathCheck();
    window.addEventListener('popstate', handlePathCheck);
    return () => window.removeEventListener('popstate', handlePathCheck);
  }, []);

  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Fetch Game Settings periodically
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const currentU = currentUserRef.current;
        const userIdParam = currentU ? `?userId=${currentU.id}` : '';
        const res = await fetch(`/api/settings/game${userIdParam}`);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        if (data && data.success) {
          setGameSettings(prev => {
            const hasChanged = JSON.stringify(prev) !== JSON.stringify(data.settings);
            return hasChanged ? data.settings : prev;
          });
          if (data.userOverride) {
            setCurrentUser((prevUser: any) => {
              if (!prevUser) return null;
              if (
                prevUser.forceOutcome === data.userOverride.forceOutcome &&
                prevUser.profitTarget === data.userOverride.profitTarget &&
                prevUser.maxWinLimit === data.userOverride.maxWinLimit &&
                prevUser.maxLossLimit === data.userOverride.maxLossLimit
              ) {
                return prevUser;
              }
              const updated = {
                ...prevUser,
                forceOutcome: data.userOverride.forceOutcome,
                profitTarget: data.userOverride.profitTarget,
                maxWinLimit: data.userOverride.maxWinLimit,
                maxLossLimit: data.userOverride.maxLossLimit
              };
              localStorage.setItem('knex_current_user', JSON.stringify(updated));
              return updated;
            });
            
            setAccount(prevAcc => {
              const rawBalance = prevAcc.mode === 'real' ? data.userOverride.realBalance : data.userOverride.demoBalance;
              if (rawBalance !== undefined && rawBalance !== null && !isNaN(Number(rawBalance))) {
                const freshBalance = Number(rawBalance);
                if (prevAcc.balance !== freshBalance) {
                  return { ...prevAcc, balance: freshBalance };
                }
              }
              return prevAcc;
            });
          }
        }
      } catch (err) {
        // console.error('Failed to fetch game settings:', err);
      }
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 5000); // sync every 5s

    // Secret keyboard listener for Admin Dashboard (Alt + A)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        setIsAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Floating notifications / toaster logs
  const [visualNotice, setVisualNotice] = useState<{ id: string; text: string; success: boolean } | null>(null);

  const triggerToast = (text: string, success: boolean = true) => {
    const id = Math.random().toString();
    setVisualNotice({ id, text, success: !!success });
    setTimeout(() => {
      setVisualNotice((prev) => (prev?.id === id ? null : prev));
    }, 4500);

    // Dynamic notification feed push
    setNotifications((prev) => [
      {
        id: `n-${Math.random().toString(36).substring(2, 9)}`,
        text,
        time: 'Just now',
        type: success ? 'success' : 'notice',
        read: false
      },
      ...prev
    ]);

    // Audio indicators if toggled
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (success) {
          // Harmonious Win code
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } else {
          // Melancholy Loss code
          osc.frequency.setValueAtTime(311.13, audioCtx.currentTime); // E-flat4
          osc.frequency.setValueAtTime(220.00, audioCtx.currentTime + 0.15); // A3
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }
      } catch (e) {
        console.warn('Simulated audio synthesize failed.', e);
      }
    }
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.4);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.12); // E6
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.55);
    } catch (e) {
      console.warn('Web Audio API chime failed.', e);
    }
  };

  // Inactivity / Session Expiry Handlers
  const handleKeepAlive = () => {
    lastActivityTimeRef.current = Date.now();
    setIsSessionTimeoutOpen(false);
    triggerToast("Your session has been extended successfully. Inactivity timer reset.", true);
  };

  const handleExpireSession = () => {
    // 1. Clear active simulation state (active contracts)
    setActiveContracts([]);

    // 2. Reset the guest/demo account balance
    setAccount(prev => {
      if (prev.mode === 'demo') {
        return {
          ...prev,
          balance: 10000.00
        };
      }
      return prev;
    });

    // 3. Clear localStorage for the current partition
    const currentPartitionId = currentUser ? currentUser.id : 'guest';
    localStorage.removeItem(`knex_active_contracts_${currentPartitionId}_demo`);

    // 4. Trigger warning toast info
    triggerToast("Active guest trading simulation has expired. Portfolio was cleared to free up resources.", false);

    // 5. Reset tracking status to prevent alert spamming loops
    lastActivityTimeRef.current = Date.now();
    setIsSessionTimeoutOpen(false);
  };

  useEffect(() => {
    // Activity listener to capture standard user movements
    const handleUserInteraction = () => {
      lastActivityTimeRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(eventName => {
      window.addEventListener(eventName, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleUserInteraction);
      });
    };
  }, []);

  /*
  // Sync tradeHistory to server automatically when it changes
  useEffect(() => {
    if (currentUser) {
      pushUserState(activeContracts, tradeHistory, priceAlerts);
    }
  }, [tradeHistory]);
  */

  const isSessionTimeoutOpenRef = useRef(isSessionTimeoutOpen);
  useEffect(() => {
    isSessionTimeoutOpenRef.current = isSessionTimeoutOpen;
  }, [isSessionTimeoutOpen]);

  useEffect(() => {
    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes session duration (600 seconds)
    const WARNING_THRESHOLD_MS = 9 * 60 * 1000; // Starts 60 seconds prior to expiration (540 seconds)

    const interval = setInterval(() => {
      // Session timeout is only for guests (unauthenticated) or active demo mode sessions
      const currentU = currentUserRef.current;
      const currentAcc = accountRef.current;
      const isDemoSessionActive = !currentU || currentAcc.mode === 'demo';
      
      if (!isDemoSessionActive) {
        if (isSessionTimeoutOpenRef.current) {
          setIsSessionTimeoutOpen(false);
        }
        return;
      }

      const elapsed = Date.now() - lastActivityTimeRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        handleExpireSession();
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setSessionSecondsRemaining(remaining);
        if (!isSessionTimeoutOpenRef.current) {
          setIsSessionTimeoutOpen(true);
        }
      } else {
        if (isSessionTimeoutOpenRef.current) {
          setIsSessionTimeoutOpen(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Monitor price alerts in real time whenever asset prices walk
  useEffect(() => {
    const alerts = priceAlertsRef.current;
    if (!alerts || alerts.length === 0) return;

    alerts.forEach((alert) => {
      if (alert.isTriggered) return;

      const ticks = assetsTicksMap[alert.assetId] || [];
      if (ticks.length === 0) return;

      const latestPrice = ticks[ticks.length - 1].price;
      const hitAbove = alert.condition === 'above' && latestPrice >= alert.targetPrice;
      const hitBelow = alert.condition === 'below' && latestPrice <= alert.targetPrice;

      if (hitAbove || hitBelow) {
        setPriceAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, isTriggered: true } : a))
        );

        const assetItem = ASSETSList.find((a) => a.id === alert.assetId) || activeAsset;
        const decimals = assetItem?.decimals ?? 2;

        triggerToast(
          `🔔 ALERT: ${alert.assetSymbol} reached target of ${(alert.targetPrice ?? 0).toFixed(decimals)}! Current Spot: ${(latestPrice ?? 0).toFixed(decimals)}.`,
          true
        );

        playAlertSound();

        // Check if email notification was requested
        if (alert.notifyEmail && currentUserRef.current?.email) {
          fetch('/api/alerts/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUserRef.current.email, alert, latestPrice })
          }).catch(err => console.warn('Notice alert notification dispatch:', err?.message || err));
        }
      }
    });
  }, [assetsTicksMap]);

  const handleAddPriceAlert = (targetPrice: number, condition: 'above' | 'below', notifyEmail: boolean = false) => {
    const newAlert: PriceAlert = {
      id: `pa-${Math.random().toString(36).substring(2, 10)}`,
      assetId: activeAsset.id,
      assetSymbol: activeAsset.symbol,
      targetPrice,
      condition,
      isTriggered: false,
      notifyEmail,
      createdAt: Date.now()
    };
    setPriceAlerts((prev) => [newAlert, ...prev]);
    triggerToast(`Custom price alert registered for ${activeAsset.symbol} at ${targetPrice.toFixed(activeAsset.decimals)}.`, true);
  };

  const handleDeletePriceAlert = (id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    triggerToast("Price alert cancelled.", true);
  };

  // Switch Theme selector
  const handleToggleTheme = () => {
    let nextMode: 'dark' | 'light' | 'auto';
    if (themeMode === 'dark') {
      nextMode = 'light';
    } else {
      nextMode = 'dark';
    }
    setThemeMode(nextMode);
    triggerToast(`Theme preference updated to ${nextMode.toUpperCase()}.`, true);
  };

  // Switchees Demowrithe wallets
  // Admin control: Demo/Real visibility
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => JSON.parse(localStorage.getItem('knex_admin_demo_enabled') ?? 'true'));
  const [realModeEnabled, setRealModeEnabled] = useState(() => JSON.parse(localStorage.getItem('knex_admin_real_enabled') ?? 'true'));

  useEffect(() => {
    const handleStorageChange = () => {
      setDemoModeEnabled(JSON.parse(localStorage.getItem('knex_admin_demo_enabled') ?? 'true'));
      setRealModeEnabled(JSON.parse(localStorage.getItem('knex_admin_real_enabled') ?? 'true'));
    };

    window.addEventListener('knex-settings-changed', handleStorageChange);
    return () => window.removeEventListener('knex-settings-changed', handleStorageChange);
  }, []);

  // Auto-switch account mode if disabled by admin
  useEffect(() => {
    const mode = accountRef.current.mode;
    if (mode === 'demo' && !demoModeEnabled && realModeEnabled) {
      handleSwitchAccount('real');
    } else if (mode === 'real' && !realModeEnabled && demoModeEnabled) {
      handleSwitchAccount('demo');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoModeEnabled, realModeEnabled]);

  const handleSwitchAccount = (mode: 'demo' | 'real') => {
    if (mode === account.mode) return;
    setAccount((prev) => {
      if (mode === 'real') {
        if (prev.mode === 'demo') {
          setDemoAccountBalance(prev.balance);
          localStorage.setItem('knex_demo_balance', String(prev.balance));
        }
        return { ...prev, mode: 'real', balance: realAccountBalance };
      } else {
        if (prev.mode === 'real') {
          setRealAccountBalance(prev.balance);
          localStorage.setItem('knex_real_balance', String(prev.balance));
        }
        return { ...prev, mode: 'demo', balance: demoAccountBalance };
      }
    });
    hasSyncedFromServerRef.current = false;
    setTimeout(() => {
      pullUserState();
    }, 50);
    triggerToast(`Switched workspace to ${mode.toUpperCase()} wallet mode.`, true);
  };

  // Reset demo tokens
  const handleResetDemoBalance = () => {
    if (account.mode !== 'demo') return;
    setDemoAccountBalance(10000.00);
    localStorage.setItem('knex_demo_balance', '10000');
    setAccount((prev) => ({ ...prev, balance: 10000.00 }));
    triggerToast("Your demo trade bag has been replenished with virtual $10,000.00!", true);
  };

  // Credit balance after server-side cashier verification
  const handleDepositCashier = (amount: number) => {
    // Sync with server balance first
    if (currentUser) {
      const isDemo = account.mode === 'demo';
      fetch('/api/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: amount,
          isDemo
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setAccount((prev) => ({ ...prev, balance: data.balance }));
          if (!isDemo) {
            setRealAccountBalance(data.balance);
          }
          setCurrentUser((prevUser: any) => {
            if (!prevUser) return null;
            const updated = { ...prevUser, balance: data.balance };
            localStorage.setItem('knex_current_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(err => console.warn('Notice syncing balance on deposit:', err?.message || err));
    }
    
    triggerToast(`Deposited $${amount.toLocaleString()} into portfolio index.`, true);
  };

  // Debit balance after server-side cashier dispatch
  const handleWithdrawCashier = (amount: number) => {
    setAccount((prev) => {
      const nextBal = Math.max(0, prev.balance - amount);
      if (prev.mode === 'real') {
        setRealAccountBalance(nextBal);
      }
      return { ...prev, balance: nextBal };
    });
    triggerToast(`Withdrew $${amount.toLocaleString()} from portfolio cash.`, true);
  };

  // Indicator Switch Toggles
  const handleToggleIndicator = (type: 'sma' | 'ema' | 'rsi') => {
    setIndicatorConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled }
    }));
  };

  useEffect(() => {
    let lastPriceGenTime = 0;
    const loopInterval = setInterval(() => {
      const now = getServerTime();
      const shouldGenPrice = now - lastPriceGenTime >= 1000;
      const nextPricesMap: Record<string, number> = {};

      if (shouldGenPrice) {
        lastPriceGenTime = now;
        // Keep candle generated continuously by running backfill if massive gap detected
        const ticksMap = assetsTicksMapRef.current;
        const keys = Object.keys(ticksMap);
        if (keys.length > 0) {
          const firstAssetTicks = ticksMap[keys[0]];
          if (firstAssetTicks && firstAssetTicks.length > 0) {
            const lastTickTime = firstAssetTicks[firstAssetTicks.length - 1].time;
            const gapMs = now - lastTickTime;
            if (gapMs >= 5000) {
              const targetUserIdStr = currentUserRef.current ? currentUserRef.current.id : 'guest';
              const targetMode = currentUserRef.current ? accountRef.current.mode : 'demo';
              const targetPartitionId = `${targetUserIdStr}_${targetMode}`;
              backfillGapsAndSettle(now, targetPartitionId);
              return;
            }
          }
        }

        setAssetsTicksMap((prevTicksMap) => {
          const nextTicksMap = { ...prevTicksMap };

          ASSETSList.forEach((asset) => {
            const currentHistory = prevTicksMap[asset.id] || [];
            if (currentHistory.length === 0) return;

            const lastTick = currentHistory[currentHistory.length - 1];

            // Brownian walk step with asset drift bias + Global admin bias
            const totalBias = asset.trendBias + (gameSettingsRef.current.globalTrendBias || 0);
            const walkFactor = (Math.random() - 0.5 + totalBias) * 1.5;
            const priceChange = walkFactor * (asset.volatility * (gameSettingsRef.current.volatilityMultiplier || 1) / 100);
            // Prevent price from dropping to zero or extremely near zero
            const nextPrice = Math.max(0.000001, lastTick.price * (1 + Math.max(-0.99, priceChange)));

            nextPricesMap[asset.id] = nextPrice;

            const newTick: Tick = { time: now, price: nextPrice };
            nextTicksMap[asset.id] = [...currentHistory.slice(-6000), newTick];
          });

          return nextTicksMap;
        });

        // Sync floating base price on the registry
        setAssetsRegistry((prevReg) =>
          prevReg.map((item) => {
            const nextPrice = nextPricesMap[item.id] || assetsTicksMapRef.current[item.id]?.[assetsTicksMapRef.current[item.id].length - 1]?.price || item.price;
            if (nextPrice === undefined) return item;
            const lastPrice = item.price;
            return {
              ...item,
              price: nextPrice,
              change: lastPrice ? ((nextPrice - lastPrice) / lastPrice) * 100 : item.change
            };
          })
        );
      } else {
        ASSETSList.forEach((asset) => {
          const hist = assetsTicksMapRef.current[asset.id];
          if (hist && hist.length > 0) {
            nextPricesMap[asset.id] = hist[hist.length - 1].price;
          } else {
            nextPricesMap[asset.id] = asset.price;
          }
        });
      }

      // Check and trigger pending limit orders
      const currentPending = pendingLimitOrdersRef.current;
      if (currentPending.length > 0) {
        const triggeredOrders: typeof currentPending = [];
        const remainingOrders: typeof currentPending = [];

        currentPending.forEach((order) => {
          const nextPrice = nextPricesMap[order.assetId];
          if (nextPrice === undefined) {
            remainingOrders.push(order);
            return;
          }

          const isTriggered = 
            (order.direction === 'buy' && nextPrice <= order.limitPrice) ||
            (order.direction === 'sell' && nextPrice >= order.limitPrice);

          if (isTriggered) {
            triggeredOrders.push(order);
          } else {
            remainingOrders.push(order);
          }
        });

        if (triggeredOrders.length > 0) {
          setPendingLimitOrders(remainingOrders);

          setActiveContracts((prevActive) => {
            const nextActive = [...prevActive];

            triggeredOrders.forEach((order) => {
              const orderAsset = ASSETSList.find((a) => a.id === order.assetId) || activeAsset;
              const nextPrice = nextPricesMap[order.assetId] || orderAsset.price;
              const ratePercentage = gameSettingsRef.current.payoutRate !== undefined ? gameSettingsRef.current.payoutRate : 95.5;
              const payoutRate = ratePercentage / 100;
              const targetPayout = order.stake * (1 + payoutRate);

              const newContract: Contract = {
                id: `mt-${Math.random().toString(36).substring(2, 12)}`,
                assetId: order.assetId,
                assetName: order.assetName,
                assetSymbol: order.assetSymbol,
                type: 'rise-fall',
                direction: order.direction === 'buy' ? 'rise' : 'fall',
                stake: order.stake,
                payout: targetPayout,
                basis: 'stake',
                barrier: undefined,
                barrierOffset: undefined,
                entryPrice: nextPrice,
                entryTime: getServerTime(),
                duration: order.duration,
                durationUnit: order.durationUnit,
                expiryTime: getServerTime() + (
                  order.durationUnit === 'minutes' ? order.duration * 60 * 1000 : 
                  order.durationUnit === 'seconds' ? order.duration * 1000 : 
                  order.duration * TICK_INTERVAL_MS
                ),
                ticksHistory: [{ time: getServerTime(), price: nextPrice }],
                ticksPassed: 0,
                currentPrice: nextPrice,
                currentProfit: 0,
                sellPrice: order.stake * 0.85,
                status: 'active',
                stopLoss: order.stopLoss
              };

              nextActive.push(newContract);
              triggerToast(`Limit Order Triggered: Secured ${order.direction.toUpperCase()} on ${order.assetSymbol} at $${(nextPrice ?? 0).toFixed(4)} (Target: $${(order.limitPrice ?? 0).toFixed(4)}).`, true);
            });

            return nextActive;
          });
        }
      }

      // Update active contract metrics on the ticking target safely in ONE sweep
      setActiveContracts((prevContracts) => {
        if (prevContracts.length === 0) return prevContracts;

        let balanceDelta = 0;
        let shouldConsumeForceOutcome = false;
        const newHistoryItems: TradeHistoryItem[] = [];

        const updated = prevContracts.map((contract) => {
          if (settledContractIdsRef.current.has(contract.id)) return null as any;
          const nextPrice = nextPricesMap[contract.assetId];
          if (nextPrice === undefined || contract.status !== 'active') return contract;

          let ticksPassed = contract.ticksPassed;
          if (shouldGenPrice) {
            ticksPassed += 1;
          }
          if (contract.durationUnit !== 'ticks') {
            ticksPassed = Math.max(0, Math.floor((now - contract.entryTime) / 1000));
          }
          
          let totalDurationInSeconds = contract.duration;
          if (contract.durationUnit === 'days') {
            totalDurationInSeconds = contract.duration * 24 * 60 * 60;
          } else if (contract.durationUnit === 'hours') {
            totalDurationInSeconds = contract.duration * 60 * 60;
          } else if (contract.durationUnit === 'minutes') {
            totalDurationInSeconds = contract.duration * 60;
          } else if (contract.durationUnit === 'ticks') {
            totalDurationInSeconds = contract.duration; // 1 tick = 1 price tick
          }

          let isExpired = false;
          if (contract.durationUnit === 'ticks') {
            isExpired = ticksPassed >= totalDurationInSeconds;
          } else {
            isExpired = now >= contract.expiryTime;
          }

          // Proximity checks for profit
          let currentProfit = 0;
          let status: 'active' | 'won' | 'lost' | 'draw' = 'active';

          // Determine Barrier levels
          const actualBarrier = contract.barrier || contract.entryPrice;

          if (contract.type === 'rise-fall') {
            const isCall = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher';
            if (isExpired) {
              if (nextPrice > contract.entryPrice) {
                status = isCall ? 'won' : 'lost';
                currentProfit = isCall ? (contract.payout - contract.stake) : -contract.stake;
              } else if (nextPrice < contract.entryPrice) {
                status = isCall ? 'lost' : 'won';
                currentProfit = isCall ? -contract.stake : (contract.payout - contract.stake);
              } else {
                status = 'draw';
                currentProfit = 0;
              }
            } else {
              const isWinning = isCall ? (nextPrice > contract.entryPrice) : (nextPrice < contract.entryPrice);
              currentProfit = isWinning ? (contract.payout - contract.stake) : -contract.stake;
              status = 'active';
            }
          } else if (contract.type === 'higher-lower') {
            const isHigher = contract.direction === 'higher' || contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy';
            if (isExpired) {
              if (nextPrice > actualBarrier) {
                status = isHigher ? 'won' : 'lost';
                currentProfit = isHigher ? (contract.payout - contract.stake) : -contract.stake;
              } else if (nextPrice < actualBarrier) {
                status = isHigher ? 'lost' : 'won';
                currentProfit = isHigher ? -contract.stake : (contract.payout - contract.stake);
              } else {
                status = 'draw';
                currentProfit = 0;
              }
            } else {
              const isWinning = isHigher ? (nextPrice > actualBarrier) : (nextPrice < actualBarrier);
              currentProfit = isWinning ? (contract.payout - contract.stake) : -contract.stake;
              status = 'active';
            }
          } else if (contract.type === 'touch-no-touch') {
            const isTouch = contract.direction === 'touch';
            const touched = (contract.barrierOffset && contract.barrierOffset > 0)
              ? (actualBarrier >= contract.entryPrice ? nextPrice >= actualBarrier : nextPrice <= actualBarrier)
              : false;

            if (isTouch) {
              if (touched) {
                currentProfit = contract.payout - contract.stake;
                status = 'won';
              } else if (isExpired) {
                currentProfit = -contract.stake;
                status = 'lost';
              } else {
                currentProfit = -contract.stake;
                status = 'active';
              }
            } else { // no-touch
              if (touched) {
                currentProfit = -contract.stake;
                status = 'lost';
              } else if (isExpired) {
                currentProfit = contract.payout - contract.stake;
                status = 'won';
              } else {
                currentProfit = contract.payout - contract.stake;
                status = 'active';
              }
            }
          } else if (contract.type === 'digit-over-under') {
            const decimals = (contract.assetSymbol && contract.assetSymbol.includes('MFLOW')) ? 4 : 2;
            const lastDigit = parseInt((nextPrice ?? 0).toFixed(decimals).split('').pop() || '0');
            const isOver = contract.direction === 'over';
            const success = isOver 
              ? lastDigit > (contract.targetDigit || 0)
              : lastDigit < (contract.targetDigit || 0);
            
            currentProfit = success ? (contract.payout - contract.stake) : -contract.stake;
            if (isExpired) {
              status = success ? 'won' : 'lost';
            } else {
              status = 'active';
            }
          }

          // Compute early sell configurations for Stop Loss check
          let ratioRemaining = 0;
          if (contract.durationUnit === 'ticks') {
            ratioRemaining = Math.max(0, (totalDurationInSeconds - ticksPassed) / Math.max(1, totalDurationInSeconds));
          } else {
            const totalDurationMs = Math.max(1000, contract.expiryTime - contract.entryTime);
            ratioRemaining = Math.max(0, (contract.expiryTime - now) / totalDurationMs);
          }
          
          const isWinningCurrently = currentProfit > 0;
          let calculatedSellPrice = contract.stake;
          if (isWinningCurrently) {
            calculatedSellPrice = contract.stake + (contract.payout - contract.stake) * Math.max(0.2, (1 - ratioRemaining * 0.4));
          } else {
            calculatedSellPrice = Math.max(contract.stake * 0.1, contract.stake * Math.max(0.15, ratioRemaining * 0.75));
          }

          // Evaluate percentage-based Stop Loss (only when explicitly configured)
          let isStopLossTriggered = false;
          let isTakeProfitTriggered = false;
          let earlyExitRefund = calculatedSellPrice;

          if (contract.stopLoss && contract.stopLoss > 0) {
            const slPercent = contract.stopLoss;
            let priceAgainstPct = 0;
            const isCallDir = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher' || contract.direction === 'touch';
            if (isCallDir) {
              priceAgainstPct = contract.entryPrice > nextPrice 
                ? ((contract.entryPrice - nextPrice) / contract.entryPrice) * 100 
                : 0;
            } else {
              priceAgainstPct = nextPrice > contract.entryPrice 
                ? ((nextPrice - contract.entryPrice) / contract.entryPrice) * 100 
                : 0;
            }

            if (priceAgainstPct >= slPercent) {
              isStopLossTriggered = true;
              earlyExitRefund = calculatedSellPrice;
            }
          }

          // Evaluate Absolute Price Stop Loss & Take Profit (Drag-to-set functionality)
          if (!isStopLossTriggered && contract.stopLossPrice) {
            const isCallDir = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher';
            if (isCallDir) {
               if (nextPrice <= contract.stopLossPrice) isStopLossTriggered = true;
            } else {
               if (nextPrice >= contract.stopLossPrice) isStopLossTriggered = true;
            }
            if (isStopLossTriggered) earlyExitRefund = calculatedSellPrice;
          }
          if (!isStopLossTriggered && !isTakeProfitTriggered && contract.takeProfitPrice) {
             const isCallDir = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher';
             if (isCallDir) {
                if (nextPrice >= contract.takeProfitPrice) isTakeProfitTriggered = true;
             } else {
                if (nextPrice <= contract.takeProfitPrice) isTakeProfitTriggered = true;
             }
             if (isTakeProfitTriggered) earlyExitRefund = calculatedSellPrice;
          }

          // Auto Take-Profit / Auto Cashout rule
          if (!isStopLossTriggered && !isTakeProfitTriggered && autoCashoutPercent > 0 && isWinningCurrently && calculatedSellPrice > contract.stake) {
            const currentProfitPct = ((calculatedSellPrice - contract.stake) / contract.stake) * 100;
            if (currentProfitPct >= autoCashoutPercent) {
              isTakeProfitTriggered = true;
              earlyExitRefund = calculatedSellPrice;
            }
          }

          const isPrematureExit = (contract.type === 'touch-no-touch' && status !== 'active') || isStopLossTriggered || isTakeProfitTriggered;

          if (isExpired || isPrematureExit) {
            if (settledContractIdsRef.current.has(contract.id)) {
              return null as any;
            }
            settledContractIdsRef.current.add(contract.id);

            let finalStatus: 'won' | 'lost' | 'draw' | 'sold' = 'lost';
            
            if (isStopLossTriggered || isTakeProfitTriggered) {
              finalStatus = 'sold';
            } else if (contract.type === 'rise-fall') {
              const isCall = contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy' || contract.direction === 'higher';
              if (nextPrice > contract.entryPrice) {
                finalStatus = isCall ? 'won' : 'lost';
              } else if (nextPrice < contract.entryPrice) {
                finalStatus = isCall ? 'lost' : 'won';
              } else {
                finalStatus = 'draw';
              }
            } else if (contract.type === 'higher-lower') {
              const actualBarrier = contract.barrier || contract.entryPrice;
              const isHigher = contract.direction === 'higher' || contract.direction === 'rise' || contract.direction === 'call' || contract.direction === 'buy';
              if (nextPrice > actualBarrier) {
                finalStatus = isHigher ? 'won' : 'lost';
              } else if (nextPrice < actualBarrier) {
                finalStatus = isHigher ? 'lost' : 'won';
              } else {
                finalStatus = 'draw';
              }
            } else if (contract.type === 'digit-over-under') {
              const decimals = (contract.assetSymbol && contract.assetSymbol.includes('MFLOW')) ? 4 : 2;
              const lastDigit = parseInt((nextPrice ?? 0).toFixed(decimals).split('').pop() || '0');
              const isOver = contract.direction === 'over';
              const success = isOver 
                ? lastDigit > (contract.targetDigit || 0)
                : lastDigit < (contract.targetDigit || 0);
              finalStatus = success ? 'won' : 'lost';
            } else if (contract.type === 'touch-no-touch') {
              finalStatus = status === 'won' ? 'won' : 'lost';
            } else {
              finalStatus = status !== 'active' ? status : (currentProfit > 0 ? 'won' : currentProfit < 0 ? 'lost' : 'draw');
            }
            
            // Admin Override
            let force = currentUser?.forceOutcome || gameSettingsRef.current.forceOutcome;
            if (currentUser?.forceOutcome) {
              shouldConsumeForceOutcome = true;
            }
            
            // Profit Target override: if user's real balance exceeds target, force loss
            if (accountRef.current.mode === 'real' && currentUser?.profitTarget > 0 && realAccountBalance >= currentUser?.profitTarget) {
               force = 'loss';
            }

            if (force === 'win' && !isStopLossTriggered && !isTakeProfitTriggered) finalStatus = 'won';
            if (force === 'loss' && !isStopLossTriggered && !isTakeProfitTriggered) finalStatus = 'lost';

            // Settlement math after trade closes/finishes (User feedback)
            const isWon = finalStatus === 'won';
            const isDraw = finalStatus === 'draw';
            const isSold = finalStatus === 'sold';
            
            let netProfit = 0;
            if (isSold) {
              netProfit = earlyExitRefund - contract.stake;
            } else if (isDraw) {
              netProfit = 0; // Stake returned for draw
            } else {
              netProfit = isWon ? (contract.payout - contract.stake) : -contract.stake;
            }
            
            console.log(`[DEBUG] Finalizing Trade ${contract.id}: Status=${finalStatus}, Stake=${contract.stake}, Payout=${contract.payout}, NetProfit=${netProfit}.`);

            // Apply Admin win limits
            if (netProfit > 0 && currentUser?.maxWinLimit && currentUser.maxWinLimit > 0 && netProfit > currentUser.maxWinLimit) {
              netProfit = currentUser.maxWinLimit;
              setTimeout(() => {
                triggerToast(`Win capped at maximum allowed Single Trade Limit of $${currentUser.maxWinLimit?.toFixed(2)}`, false);
              }, 400);
            }

            // Apply Admin loss limits
            if (netProfit < 0 && currentUser?.maxLossLimit && currentUser.maxLossLimit > 0 && Math.abs(netProfit) > currentUser.maxLossLimit) {
              netProfit = -currentUser.maxLossLimit;
              setTimeout(() => {
                triggerToast(`Loss subsidized: Capped at maximum allowed Single Trade Limit of $${currentUser.maxLossLimit?.toFixed(2)}`, true);
              }, 400);
            }

            // In case of early exit, recalculate final payout purely based on stake + netProfit (which is bounded)
            const finalPayout = contract.stake + netProfit;
            let finalEarlyExitRefund = isSold ? finalPayout : earlyExitRefund;
            if (isSold) earlyExitRefund = finalEarlyExitRefund;

            balanceDelta += finalPayout;

            newHistoryItems.push({
              id: contract.id,
              assetName: contract.assetName,
              assetSymbol: contract.assetSymbol,
              type: contract.type,
              direction: contract.direction,
              stake: contract.stake,
              payout: finalPayout,
              profit: netProfit,
              status: finalStatus as any,
              entryPrice: contract.entryPrice,
              exitPrice: nextPrice,
              purchaseTime: contract.entryTime
            });

            const dirText = (contract.direction === 'rise' || contract.direction === 'call') ? 'CALL / UP ▲' : (contract.direction === 'fall' || contract.direction === 'put') ? 'PUT / DOWN ▼' : contract.direction.toUpperCase();
            setLatestSettlement({
              id: contract.id,
              assetName: contract.assetName,
              assetSymbol: contract.assetSymbol,
              direction: dirText,
              entryPrice: contract.entryPrice,
              exitPrice: nextPrice,
              stake: contract.stake,
              payout: finalPayout,
              profit: netProfit,
              status: finalStatus,
              resultText: isDraw ? 'DRAW / TIE' : isWon ? 'WIN' : isSold ? 'SOLD' : 'LOSS',
              decimals: activeAsset.decimals,
              timestamp: getServerTime()
            });

            const currentDec = activeAsset?.decimals ?? 2;
            if (isStopLossTriggered) {
              triggerToast(
                `Stop Loss Triggered! Automated early exit at $${(nextPrice ?? 0).toFixed(currentDec)}. Stake preserved at $${(earlyExitRefund ?? 0).toFixed(2)}.`,
                false
              );
            } else if (isTakeProfitTriggered) {
              triggerToast(
                `Take Profit Hit at $${(nextPrice ?? 0).toFixed(currentDec)}! Secured payout of $${(earlyExitRefund ?? 0).toFixed(2)}.`,
                true
              );
            } else {
              const hasWon = finalStatus === 'won';
              const isDraw = finalStatus === 'draw';
              triggerToast(
                isDraw
                  ? `Trade Ended in Draw! Stake of $${(contract.stake ?? 0).toFixed(2)} refunded.`
                  : hasWon
                  ? `Trade Success! +$${(netProfit ?? 0).toFixed(2)} added to your balance.`
                  : `Trade Expired! -$${Math.abs(netProfit ?? 0).toFixed(2)} deducted from your balance.`,
                hasWon || isDraw
              );
            }

            // Auto Martingale Stake Strategy: double on loss, reset to base on win
            if (autoMartingale) {
              if (finalStatus === 'won') {
                const base = baseMartingaleStake || 10;
                setSpotAmountUsd(base.toFixed(2));
                triggerToast(`Martingale Reset: Win secured! Next stake reset to base $${base.toFixed(2)}.`, true);
              } else if (finalStatus === 'lost') {
                const maxAllowed = (gameSettingsRef.current as any)?.maxStake || 5000;
                const nextStake = Math.min(maxAllowed, contract.stake * 2);
                setSpotAmountUsd(nextStake.toFixed(2));
                triggerToast(`Martingale Active: Loss registered. Next stake set to $${nextStake.toFixed(2)} (2x recovery).`, false);
              }
            }

            if (autoDismissSettlement) {
              setTimeout(() => {
                setLatestSettlement((prev) => (prev?.id === contract.id ? null : prev));
              }, 3500);
            }

            return null as any;
          }

          return {
            ...contract,
            currentPrice: nextPrice,
            currentProfit,
            ticksPassed,
            sellPrice: calculatedSellPrice,
            ticksHistory: [...(Array.isArray(contract.ticksHistory) ? contract.ticksHistory : []), { time: now, price: nextPrice }]
          };
        }).filter(Boolean);

        if (balanceDelta !== 0) {
          const currentMode = accountRef.current.mode;
          setAccount((prevAcc) => ({ ...prevAcc, balance: prevAcc.balance + balanceDelta }));
          if (currentMode === 'real') {
            setRealAccountBalance((prev) => Math.max(0, prev + balanceDelta));
          }

          if (currentUser) {
            const isDemo = currentMode === 'demo';
            fetch('/api/users/update-balance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.id,
                amount: balanceDelta,
                isDemo,
                consumeForceOutcome: shouldConsumeForceOutcome
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data && data.success) {
                setAccount((prev) => ({ ...prev, balance: data.balance }));
                if (!isDemo) {
                  setRealAccountBalance(data.balance);
                }
                setCurrentUser((prevUser: any) => {
                  if (!prevUser) return null;
                  const updated = { 
                    ...prevUser, 
                    balance: data.balance,
                    forceOutcome: data.forceOutcome !== undefined ? data.forceOutcome : prevUser.forceOutcome
                  };
                  localStorage.setItem('knex_current_user', JSON.stringify(updated));
                  return updated;
                });
              }
            })
            .catch(err => console.warn('Notice syncing settlement balance:', err?.message || err));
          }
        }

        if (newHistoryItems.length > 0) {
          setTradeHistory((prevHistory) => {
            // Ensure we don't have duplicates and robustly merge
            const newHistoryMap = new Map(prevHistory.map(h => [h.id, h]));
            newHistoryItems.forEach(item => {
                if (!newHistoryMap.has(item.id)) {
                    newHistoryMap.set(item.id, item);
                }
            });
            const mergedHistory = Array.from(newHistoryMap.values());
            pushUserState(updated, mergedHistory, priceAlertsRef.current);
            return mergedHistory;
          });

          if (currentUser) {
            newHistoryItems.forEach(item => {
              sendWsMessage({
                type: 'trade_settled',
                userId: currentUser.id,
                mode: accountRef.current.mode,
                contractId: item.id,
                settlementItem: item,
                balance: accountRef.current.balance + balanceDelta
              });
            });
          }
        }

        return updated;
      });
    }, 200);

    return () => clearInterval(loopInterval);
  }, []);

  const handleUserUpdate = (user: any) => {
    // Only clear user-specific storage on user switch
    ['knex_account', 'knex_current_user', 'knex_trade_history'].forEach(key => localStorage.removeItem(key));
    console.log('DEBUG: handleUserUpdate called with:', user);
    
    if (user) {
      localStorage.setItem('knex_current_user', JSON.stringify(user));
      if (user.email === 'abbyruth818@gmail.com' || user.role === 'admin') {
        setIsAdminOpen(true);
      }
    }
    setCurrentUser(user);

    // Enforce admin constraints on auth change
    const demoEnabled = JSON.parse(localStorage.getItem('knex_admin_demo_enabled') ?? 'true');
    const realEnabled = JSON.parse(localStorage.getItem('knex_admin_real_enabled') ?? 'true');

    setAccount(prev => {
      let nextMode = prev.mode;
      if (nextMode === 'demo' && !demoEnabled && realEnabled) {
        nextMode = 'real';
      } else if (nextMode === 'real' && !realEnabled && demoEnabled) {
        nextMode = 'demo';
      }

      if (nextMode !== prev.mode) {
        // Balance switch logic
        if (nextMode === 'real') {
          // This side-effect must be handled carefully outside, or just use another state update setter if possible
          // For now, let's keep it simple.
          return { ...prev, mode: 'real', balance: realAccountBalance };
        } else {
          setRealAccountBalance(prev.balance);
          return { ...prev, mode: 'demo', balance: prev.balance === 0 ? 10000.00 : prev.balance };
        }
      }
      return prev;
    });
  };
    
  const handleLogout = () => {
    handleUserUpdate(null);
    window.location.reload();
  };

  const handlePurchaseContract = (config: {
    type: ContractType;
    direction: any;
    stake: number;
    duration: number;
    durationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
    barrierOffset?: number;
    targetDigit?: number;
    stopLoss?: number;
    targetAsset?: Asset;
  }) => {
    // 1. Prevent duplicate submission / race conditions
    if (isSubmittingTradeRef.current) return;
    isSubmittingTradeRef.current = true;
    setTimeout(() => {
      isSubmittingTradeRef.current = false;
    }, 450);

    const tradeAsset = config.targetAsset || activeAsset;

    // A. Check: asset is active and has valid configuration
    if (!tradeAsset || !tradeAsset.id) {
      triggerToast('Validation Error: No valid asset selected.', false);
      return;
    }

    // B. Check: valid price feed
    const currentTickHistory = assetsTicksMap[tradeAsset.id] || [];
    const latestPrice = currentTickHistory[currentTickHistory.length - 1]?.price || tradeAsset.price;
    if (!latestPrice || latestPrice <= 0 || isNaN(latestPrice)) {
      triggerToast(`Price Feed Error: Invalid price feed for ${tradeAsset.symbol}. Try again in a moment.`, false);
      return;
    }

    // C. Check: direction selected
    if (!config.direction) {
      triggerToast('Validation Error: Direction (CALL/UP or PUT/DOWN) is required.', false);
      return;
    }

    // D. Check: duration and expiry availability
    if (!config.duration || config.duration <= 0) {
      triggerToast('Validation Error: Invalid trade duration.', false);
      return;
    }

    // E. Check: stake limits
    const minS = (gameSettings as any).minStake || 1;
    const maxS = (gameSettings as any).maxStake || 5000;
    
    if (config.stake < minS) {
      triggerToast(`Stake too low. Minimum allowed is $${minS.toFixed(2)}.`, false);
      return;
    }
    
    if (config.stake > maxS) {
      triggerToast(`Stake too high. Maximum allowed is $${maxS.toFixed(2)}.`, false);
      return;
    }

    // F. Admin check: max concurrent trades
    if (currentUser?.maxConcurrentTrades && currentUser.maxConcurrentTrades > 0 && activeContracts.length >= currentUser.maxConcurrentTrades) {
      triggerToast(`Maximum open trades reached (Limit: ${currentUser.maxConcurrentTrades}).`, false);
      return;
    }

    // G. Check: available balance (stake cannot exceed available balance)
    const availBal = typeof account?.balance === 'number' ? account.balance : 10000;
    if (availBal < config.stake) {
      triggerToast(`Transaction Rejected: Insufficient balance. Available: $${availBal.toFixed(2)}, Required: $${(config.stake ?? 0).toFixed(2)}`, false);
      return;
    }

    const ratePercentage = gameSettings.payoutRate !== undefined ? gameSettings.payoutRate : 95.5;
    const payoutRate = ratePercentage / 100;
    const targetPayout = config.stake * (1 + payoutRate);

    // Compute Barrier level if offset is provided
    let barrier: number | undefined;
    if (config.barrierOffset) {
      const isUpDir = config.direction === 'rise' || config.direction === 'higher' || config.direction === 'touch';
      barrier = isUpDir ? latestPrice + config.barrierOffset : latestPrice - config.barrierOffset;
    }

    const getDurationMs = (duration: number, unit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days') => {
      if (unit === 'days') return duration * 24 * 60 * 60 * 1000;
      if (unit === 'hours') return duration * 60 * 60 * 1000;
      if (unit === 'minutes') return duration * 60 * 1000;
      if (unit === 'seconds') return duration * 1000;
      return duration * TICK_INTERVAL_MS;
    };

    const newContract: Contract = {
      id: `mt-${Math.random().toString(36).substring(2, 12)}`,
      assetId: tradeAsset.id,
      assetName: tradeAsset.name,
      assetSymbol: tradeAsset.symbol,
      type: config.type,
      direction: config.direction,
      stake: config.stake,
      payout: targetPayout,
      basis: 'stake',
      barrier,
      barrierOffset: config.barrierOffset,
      entryPrice: latestPrice,
      entryTime: getServerTime(),
      duration: config.duration,
      durationUnit: config.durationUnit,
      expiryTime: getServerTime() + getDurationMs(config.duration, config.durationUnit),
      status: 'active',
      currentPrice: latestPrice,
      currentProfit: 0,
      sellPrice: config.stake * 0.85,
      targetDigit: config.targetDigit,
      ticksPassed: 0,
      ticksHistory: [{ time: getServerTime(), price: latestPrice }],
      stopLoss: config.stopLoss
    };

    // Deduct stake instantly from local account
    setAccount((prev) => ({ ...prev, balance: prev.balance - config.stake }));
    if (account.mode === 'real') {
      setRealAccountBalance((prev) => Math.max(0, prev - config.stake));
    }

    // Call server API for balance sync immediately
    if (currentUser) {
      const isDemo = account.mode === 'demo';
      fetch('/api/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: -config.stake,
          isDemo
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setAccount((prev) => ({ ...prev, balance: data.balance }));
          if (!isDemo) {
            setRealAccountBalance(data.balance);
          }
          setCurrentUser((prevUser: any) => {
            if (!prevUser) return null;
            const updated = { ...prevUser, balance: data.balance };
            localStorage.setItem('knex_current_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(err => console.warn('Notice syncing balance on purchase:', err?.message || err));
    }

    setActiveContracts((prev) => {
      const nextContracts = [...prev, newContract];
      pushUserState(nextContracts, tradeHistory, priceAlerts);
      
      // Emit real-time trade event to other devices immediately
      if (currentUser) {
        sendWsMessage({
          type: 'trade_created',
          userId: currentUser.id,
          mode: account.mode,
          contract: newContract,
          balance: account.balance - config.stake
        });
      }
      
      return nextContracts;
    });

    const dirUpper = (config.direction === 'call' || config.direction === 'rise') ? 'CALL / UP' : (config.direction === 'put' || config.direction === 'fall') ? 'PUT / DOWN' : config.direction.toUpperCase();
    triggerToast(`Trade Locked: ${dirUpper} secured on ${tradeAsset.symbol} at $${latestPrice.toFixed(tradeAsset.decimals)}. Trade Running...`, true);
    playAlertSound();
  };

  const handleSellContractEarly = (contractId: string) => {
    settledContractIdsRef.current.add(contractId);
    const contract = activeContracts.find((c) => c.id === contractId);
    if (!contract || contract.status !== 'active') return;

    const refund = contract.sellPrice || contract.stake * 0.5;
    const nextBalance = account.balance + refund;

    setAccount((prevAcc) => ({ ...prevAcc, balance: nextBalance }));
    if (account.mode === 'real') {
      setRealAccountBalance((prev) => Math.max(0, prev + refund));
    }

    if (currentUser) {
      const isDemo = account.mode === 'demo';
      fetch('/api/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: refund,
          isDemo
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setAccount((prev) => ({ ...prev, balance: data.balance }));
          if (!isDemo) {
            setRealAccountBalance(data.balance);
          }
          setCurrentUser((prevUser: any) => {
            if (!prevUser) return null;
            const updated = { ...prevUser, balance: data.balance };
            localStorage.setItem('knex_current_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(err => console.warn('Notice syncing early sell balance:', err?.message || err));
    }

    const nextContracts = activeContracts.filter((c) => c.id !== contractId);
    const newHistoryItem: TradeHistoryItem = {
      id: contract.id,
      assetName: contract.assetName,
      assetSymbol: contract.assetSymbol,
      type: contract.type,
      direction: contract.direction,
      stake: contract.stake,
      payout: refund,
      profit: refund - contract.stake,
      status: 'sold',
      entryPrice: contract.entryPrice,
      exitPrice: contract.currentPrice,
      purchaseTime: contract.entryTime
    };

    setTradeHistory((prevHistory) => {
      const alreadyHas = prevHistory.some((h) => h.id === contract.id);
      const nextHistory = alreadyHas ? prevHistory : [newHistoryItem, ...prevHistory];
      pushUserState(nextContracts, nextHistory, priceAlerts);
      return nextHistory;
    });

    // Broadcast instant cashout event to all other connected devices
    if (currentUser) {
      sendWsMessage({
        type: 'trade_cashed_out',
        userId: currentUser.id,
        mode: account.mode,
        contractId,
        settlementItem: newHistoryItem,
        balance: nextBalance,
        payout: refund,
        netProfit: refund - contract.stake
      });
    }

    setActiveContracts(nextContracts);
    triggerToast(`Contract liquidated early for $${(refund ?? 0).toFixed(2)} refund.`, true);
  };

  const refreshUserBalance = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const realBal = Number(data.user.real_balance) || 0;
          const demoBal = Number(data.user.demo_balance) || 0;
          setRealAccountBalance(realBal);
          setAccount(prev => ({ ...prev, balance: prev.mode === 'demo' ? demoBal : realBal }));
          setCurrentUser((prev: any) => prev ? { ...prev, real_balance: realBal, demo_balance: demoBal } : null);
        }
      }
    } catch (e) {}
  };

  const handleSwitchView = (view: 'trade' | 'history' | 'stats' | 'finance' | 'p2p') => {
    setActiveTabView(view);
    window.history.pushState({ tab: view }, '', window.location.href);
    if (view === 'p2p') {
      if (account.mode !== 'real') {
        handleSwitchAccount('real');
        triggerToast("Switched to Real Account for Knex P2P Escrow Trading.", true);
      }
    }
    if (view === 'history') setPositionsTab('statements');
    else if (view === 'stats') setPositionsTab('stats');
    else setPositionsTab('positions');
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTabView(event.state.tab);
      } else {
        setActiveTabView('trade');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handlePositionsTabChange = (tab: 'positions' | 'statements' | 'stats') => {
    setPositionsTab(tab);
    if (tab === 'positions') setActiveTabView('trade');
    else if (tab === 'statements') setActiveTabView('history');
    else setActiveTabView('stats');
  };

  const handleOpenCashierWithTab = (tab: 'deposit' | 'withdraw') => {
    if (!currentUser) {
      triggerToast("Authentication required. Please login or register to access the cashier.", false);
      handleTriggerAuth('login');
      return;
    }
    setCashierDefaultTab(tab);
    setIsCashierOpen(true);
    if (tab === 'deposit' && account.mode !== 'real') {
      handleSwitchAccount('real');
    }
  };

  const toggleStarMarket = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (starredMarkets.includes(assetId)) {
      setStarredMarkets(prev => prev.filter(id => id !== assetId));
    } else {
      setStarredMarkets(prev => [...prev, assetId]);
    }
  };

  const executeSpotTrade = (
    direction?: 'buy' | 'sell' | 'call' | 'put' | 'rise' | 'fall' | 'over' | 'under' | 'touch' | 'no-touch',
    customStake?: number,
    customType?: ContractType,
    customDuration?: number,
    customDurationUnit?: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days',
    customDigit?: number,
    customOffset?: number
  ) => {
    if (gameSettingsRef.current?.binaryOptionsPaused) {
      triggerToast('Binary Options trading is currently paused by the administrator.', false);
      return;
    }
    const typeToUse = customType || selectedContractType;
    let dirToUse: any = direction;
    if (!dirToUse) {
      if (typeToUse === 'digit-over-under') {
        dirToUse = 'over';
      } else if (typeToUse === 'touch-no-touch') {
        dirToUse = 'touch';
      } else {
        dirToUse = selectedBinaryDirection;
      }
    }
    // Normalize aliases
    if (dirToUse === 'buy') dirToUse = 'call';
    if (dirToUse === 'sell') dirToUse = 'put';
    if (dirToUse === 'rise') dirToUse = 'call';
    if (dirToUse === 'fall') dirToUse = 'put';

    if (dirToUse === 'call' || dirToUse === 'put') {
      setSelectedBinaryDirection(dirToUse);
    }

    // 1. Direct USD stake input
    let stakeVal = customStake !== undefined ? customStake : parseFloat(spotAmountUsd);
    if (isNaN(stakeVal) || stakeVal <= 0) {
      const amountVal = parseFloat(spotAmount);
      if (!isNaN(amountVal) && amountVal > 0) {
        stakeVal = amountVal;
      } else {
        stakeVal = 10;
      }
    }

    const minS = (gameSettings as any).minStake || 1;
    const maxS = (gameSettings as any).maxStake || 5000;
    
    if (stakeVal < minS) {
      triggerToast(`Stake adjusted to minimum allowed $${minS.toFixed(2)}.`, false);
      stakeVal = minS;
    }
    
    if (stakeVal > maxS) {
      triggerToast(`Stake adjusted to maximum allowed $${maxS.toFixed(2)}.`, false);
      stakeVal = maxS;
    }
    
    // Check available balance
    const currentBal = typeof account?.balance === 'number' ? account.balance : 10000;
    const activeStakesValue = activeContracts.reduce((sum, c) => sum + c.stake, 0);
    const freeBalVal = Math.max(0, currentBal - activeStakesValue);

    if (freeBalVal < stakeVal) {
      if (freeBalVal >= minS) {
        triggerToast(`Insufficient free funds for $${stakeVal.toFixed(2)}. Using available $${freeBalVal.toFixed(2)}.`, false);
        stakeVal = Math.floor(freeBalVal * 100) / 100;
      } else {
        triggerToast(`Transaction Rejected: Insufficient free balance ($${freeBalVal.toFixed(2)} available). Wait for running trades or top up.`, false);
        return;
      }
    }

    const stopLossText = (dirToUse === 'call') ? buyStopLoss : sellStopLoss;
    const stopLossNum = parseFloat(stopLossText);
    const stopLoss = (!isNaN(stopLossNum) && stopLossNum > 0) ? stopLossNum : undefined;

    const dur = customDuration || spotDuration;
    const durUnit = customDurationUnit || spotDurationUnit;
    const digitVal = customDigit !== undefined ? customDigit : (typeToUse === 'digit-over-under' ? targetDigit : undefined);
    const offsetVal = customOffset !== undefined ? customOffset : (typeToUse === 'touch-no-touch' ? barrierOffset : undefined);

    // Save into lastTradeConfig for easy 1-click repetition
    setLastTradeConfig({
      assetId: activeAsset.id,
      type: typeToUse,
      direction: dirToUse,
      stake: stakeVal,
      duration: dur,
      durationUnit: durUnit,
      targetDigit: digitVal,
      barrierOffset: offsetVal
    });

    if (!autoMartingale) {
      setBaseMartingaleStake(stakeVal);
    }

    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08); // A5
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        // audio suppressed if browser blocks
      }
    }

    handlePurchaseContract({
      type: typeToUse,
      direction: dirToUse,
      stake: stakeVal,
      duration: dur,
      durationUnit: durUnit,
      targetDigit: digitVal,
      barrierOffset: offsetVal,
      stopLoss
    });
  };

  const handleRepeatLastTrade = (multiplier = 1, reverseDirection = false) => {
    if (!lastTradeConfig) {
      triggerToast('No previous trade to repeat. Place a trade first!', false);
      return;
    }
    const targetAsset = assetsRegistry.find(a => a.id === lastTradeConfig.assetId) || activeAsset;
    if (targetAsset.id !== activeAsset.id) {
      setActiveAsset(targetAsset);
    }
    let dir = lastTradeConfig.direction;
    if (reverseDirection) {
      if (dir === 'call' || dir === 'rise') dir = 'put';
      else if (dir === 'put' || dir === 'fall') dir = 'call';
      else if (dir === 'over') dir = 'under';
      else if (dir === 'under') dir = 'over';
      else if (dir === 'touch') dir = 'no-touch';
      else if (dir === 'no-touch') dir = 'touch';
    }
    const newStake = Math.max(1, lastTradeConfig.stake * multiplier);
    executeSpotTrade(
      dir,
      newStake,
      lastTradeConfig.type,
      lastTradeConfig.duration,
      lastTradeConfig.durationUnit,
      lastTradeConfig.targetDigit,
      lastTradeConfig.barrierOffset
    );
  };

  // Global Desktop Trading Hotkeys Listener
  useEffect(() => {
    const handleTradingKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        if (latestSettlement) {
          setLatestSettlement(null);
          return;
        }
        if (showHotkeysModal) {
          setShowHotkeysModal(false);
          return;
        }
      }

      if (!hotkeysEnabled || activeTabView !== 'trade') return;

      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        e.preventDefault();
        executeSpotTrade('call', undefined, undefined, spotDuration, spotDurationUnit);
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        executeSpotTrade('put', undefined, undefined, spotDuration, spotDurationUnit);
      } else if (e.code === 'Space' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (latestSettlement) {
          setLatestSettlement(null);
          handleRepeatLastTrade(1);
        } else if (lastTradeConfig) {
          handleRepeatLastTrade(1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (latestSettlement) {
          setLatestSettlement(null);
          handleRepeatLastTrade(1, true);
        } else if (lastTradeConfig) {
          handleRepeatLastTrade(1, true);
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setTradingModeTab(prev => prev === 'quick' ? 'pro' : 'quick');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const cur = parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10;
        const doubled = Math.min((gameSettings as any)?.maxStake || 5000, cur * 2);
        handleUsdChange(doubled.toString());
        triggerToast(`Stake doubled to $${doubled.toFixed(2)} (Martingale 2x)`, true);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        const cur = parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10;
        const halved = Math.max(1, Math.floor((cur / 2) * 100) / 100);
        handleUsdChange(halved.toString());
        triggerToast(`Stake halved to $${halved.toFixed(2)} (1/2 Stake)`, true);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const maxVal = Math.min((gameSettings as any)?.maxStake || 5000, Math.floor(freeBalance));
        handleUsdChange(Math.max(1, maxVal).toString());
        triggerToast(`Stake set to Max: $${Math.max(1, maxVal).toFixed(2)}`, true);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (activeContracts.length > 0) {
          handleSellContractEarly(activeContracts[0].id);
        }
      } else if (e.key === '1') {
        handleUsdChange('5');
      } else if (e.key === '2') {
        handleUsdChange('10');
      } else if (e.key === '3') {
        handleUsdChange('25');
      } else if (e.key === '4') {
        handleUsdChange('50');
      } else if (e.key === '5') {
        handleUsdChange('100');
      }
    };

    window.addEventListener('keydown', handleTradingKeyDown);
    return () => window.removeEventListener('keydown', handleTradingKeyDown);
  }, [
    hotkeysEnabled,
    activeTabView,
    latestSettlement,
    showHotkeysModal,
    lastTradeConfig,
    activeContracts,
    freeBalance,
    spotAmountUsd,
    spotAmount,
    gameSettings
  ]);

  const handleCancelPendingLimitOrder = (orderId: string) => {
    const order = pendingLimitOrders.find(o => o.id === orderId);
    if (!order) return;

    // Refund stake back to the user's account balance
    setAccount((prev) => ({ ...prev, balance: prev.balance + order.stake }));
    if (account.mode === 'real') {
      setRealAccountBalance((prev) => Math.max(0, prev + order.stake));
    }

    // Call server API for balance sync immediately if user is logged in
    if (currentUser) {
      const isDemo = account.mode === 'demo';
      fetch('/api/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: order.stake,
          isDemo
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setAccount((prev) => ({ ...prev, balance: data.balance }));
          if (!isDemo) {
            setRealAccountBalance(data.balance);
          }
          setCurrentUser((prevUser: any) => {
            if (!prevUser) return null;
            const updated = { ...prevUser, balance: data.balance };
            localStorage.setItem('knex_current_user', JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(err => console.warn('Notice syncing balance on cancel limit:', err?.message || err));
    }

    setPendingLimitOrders((prev) => prev.filter(o => o.id !== orderId));
    triggerToast(`Limit Order Cancelled: Stake of $${(order.stake ?? 0).toFixed(2)} refunded.`, true);
  };

  const handleQtyChange = (qtyVal: string) => {
    setActiveInput('qty');
    setSpotAmount(qtyVal);
  };

  const handlePresetPercentage = (percentage: number) => {
    setActiveInput('usd');
    // Allocation based on Available balance instead of raw balance
    const activeStakesValue = activeContracts.reduce((sum, c) => sum + c.stake, 0);
    const freeBalVal = account.balance - activeStakesValue;
    const allocUsd = freeBalVal * (percentage / 100);
    setSpotAmountUsd(allocUsd.toFixed(2));
    const allocQty = allocUsd / activeAsset.price;
    setSpotAmount(allocQty.toFixed(activeAsset.decimals > 2 ? 6 : 4));
  };

  const handleUsdChange = (usdVal: string) => {
    setActiveInput('usd');
    setSpotAmountUsd(usdVal);
    const usdNum = parseFloat(usdVal) || 0;
    if (usdNum > 0 && activeAsset.price > 0) {
      const cryptoQty = usdNum / activeAsset.price;
      setSpotAmount(cryptoQty.toFixed(activeAsset.decimals > 2 ? 6 : 4));
    } else {
      setSpotAmount('');
    }
  };

  const amountNum = parseFloat(spotAmount);
  const estimatedCostUsd = !isNaN(amountNum) && amountNum > 0 ? amountNum * activeAsset.price : 0;
  
  const formattedUsdValue = activeInput === 'usd' ? spotAmountUsd : (estimatedCostUsd > 0 ? estimatedCostUsd.toFixed(2) : '');

  const activeTicks = assetsTicksMap[activeAsset.id] || [];

  // Logic to calculate simulated order books
  const currentPrice = activeAsset.price;
  const dec = activeAsset.decimals;
  const step = currentPrice * 0.00015;

  const askRows = Array.from({ length: 7 }, (_, index) => {
    const i = 7 - index;
    const price = currentPrice + step * i;
    const quantity = (Math.sin((Date.now() / 15000) + i) * 0.45 + 0.6) * (dec > 2 ? 100 : 1.45);
    return { price, quantity, total: price * quantity };
  });

  const bidRows = Array.from({ length: 7 }, (_, index) => {
    const i = index + 1;
    const price = currentPrice - step * i;
    const quantity = (Math.cos((Date.now() / 16000) + i) * 0.45 + 0.6) * (dec > 2 ? 100 : 1.45);
    return { price, quantity, total: price * quantity };
  });

  // Filter registry based on category and search
  const filteredRegistry = assetsRegistry.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(marketSearchText.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(marketSearchText.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedMarketTab === 'favorites') {
      return starredMarkets.includes(asset.id);
    } else if (selectedMarketTab === 'usdt') {
      return asset.id.includes('EURUSD') || asset.id.includes('GBPUSD');
    } else if (selectedMarketTab === 'btc') {
      return asset.id.includes('BTC') || asset.id.includes('ETH');
    } else if (selectedMarketTab === 'indices') {
      return asset.id.includes('R_') || asset.id.includes('WIZ');
    }
    return true;
  });

  const formatBalance = (bal: number) => {
    return bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`w-screen h-screen font-sans ${isDark ? 'elegant-radial-bg bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-row transition-colors duration-200 overflow-hidden relative`}>
      {isDark && <div className="absolute inset-0 radial-dots-grid pointer-events-none opacity-20" />}
      
      <Walkthrough run={runWalkthrough} onFinish={handleWalkthroughEnd} isDark={isDark} />

      {/* FLOAT NOTISTACK TOASTER */}
      {visualNotice && (
        <div className={`fixed bottom-6 left-6 z-50 flex items-center space-x-2.5 rounded-xl border px-4 py-3.5 shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 bg-slate-900 text-white ${
          visualNotice.success ? 'border-emerald-500' : 'border-rose-500'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${visualNotice.success ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'}`} />
          <span className="font-mono text-xs font-semibold leading-tight">{visualNotice.text}</span>
        </div>
      )}
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 transition-all duration-300" 
        />
      )}

      {/* ========================================================= */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Matches Screenshot) */}
      {/* ========================================================= */}
      <aside className={`fixed lg:relative inset-y-0 left-0 ${desktopSidebarCollapsed ? 'lg:w-20 w-64' : 'w-64'} ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} border-r z-40 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-all duration-300 flex flex-col shrink-0 overflow-y-auto`}>
        {/* Brand Container */}
        <div className={`p-5 flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-4' : 'justify-between'} border-b border-slate-900/60 shrink-0`}>
          <div className="flex items-center space-x-2.5 select-none cursor-pointer" onClick={() => handleSwitchView('trade')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center font-black animate-pulse shrink-0">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            {!desktopSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-wider text-white">KNEX</span>
                <span className="text-[10px] font-bold text-amber-500 tracking-widest -mt-1 uppercase">EXCHANGE</span>
              </div>
            )}
          </div>
          <button className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Quick Peek */}
        {currentUser ? (
          <div 
            onClick={() => setIsSettingsOpen(true)}
            className={`tour-account p-4 mx-3 my-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-slate-900/80 flex items-center transition-colors cursor-pointer ${desktopSidebarCollapsed ? 'lg:justify-center p-2' : 'space-x-3'}`} 
            title={desktopSidebarCollapsed ? `${currentUser?.fullName} (VIP-2) - Settings` : "Click to view settings"}
          >
            <div className="relative shrink-0">
              <img src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"} className="w-9 h-9 rounded-full border border-amber-500/20" alt="Avatar"/>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-slate-950" />
            </div>
            {!desktopSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1 justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">{currentUser?.fullName}</span>
                  <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded font-black shrink-0 uppercase">VIP-2</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold font-mono tracking-tighter truncate max-w-[140px] block">
                  {currentUser?.email}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => handleTriggerAuth('login')}
            className={`p-4 mx-3 my-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center transition-colors cursor-pointer justify-center ${desktopSidebarCollapsed ? 'p-2' : 'space-x-2'}`}
            title="Click to sign in"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
              ?
            </div>
            {!desktopSidebarCollapsed && (
              <div className="text-left flex-1 min-w-0">
                <span className="text-xs font-black text-amber-500 block uppercase tracking-wider">Access Account</span>
                <span className="text-[9px] text-slate-400 block font-semibold truncate font-semibold block truncate">Sign in or register now</span>
              </div>
            )}
          </div>
        )}

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          <button 
            onClick={() => { handleSwitchView('trade'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTabView === 'trade' && positionsTab === 'positions' && !isCashierOpen
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Interactive Trade" : undefined}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Interactive Trade</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('stats'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeTabView === 'stats' && positionsTab === 'stats'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Overview Dashboard" : undefined}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Overview Dashboard</span>}
          </button>

          <button 
            onClick={() => { setSelectedMarketTab('indices'); handleSwitchView('trade'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedMarketTab === 'indices' && activeTabView === 'trade' && positionsTab === 'positions'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Indices Markets" : undefined}
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Indices Markets</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('stats'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              positionsTab === 'stats' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Asset Allocations" : undefined}
          >
            <PieChart className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Asset Allocations</span>}
          </button>

          <button 
            onClick={() => { handleSwitchView('finance'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabView === 'finance'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Finance" : undefined}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Finance</span>}
          </button>

          <button 
            onClick={() => { handleSwitchView('p2p'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTabView === 'p2p'
                ? 'bg-indigo-600 text-white font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Knex P2P" : undefined}
          >
            <Shield className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Knex P2P</span>}
          </button>

          <button 
            onClick={() => { handleOpenCashierWithTab('deposit'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCashierOpen && cashierDefaultTab === 'deposit'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Deposit Cashier" : undefined}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500 shrink-0" />
            {!desktopSidebarCollapsed && <span>Deposit Cashier</span>}
          </button>

          <button 
            onClick={() => { handleOpenCashierWithTab('withdraw'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCashierOpen && cashierDefaultTab === 'withdraw'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Withdraw Portfolio" : undefined}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500 shrink-0" />
            {!desktopSidebarCollapsed && <span>Withdraw Portfolio</span>}
          </button>

          <button 
            onClick={() => { handlePositionsTabChange('statements'); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              positionsTab === 'statements' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Transaction Statements" : undefined}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Transaction Statements</span>}
          </button>

          {/* Programs Section */}
          {!desktopSidebarCollapsed ? (
            <div className="pt-4 pb-2 px-3.5 text-[9px] uppercase font-black tracking-widest text-slate-500 select-none">
              Programs & Bots
            </div>
          ) : (
            <div className="h-[1px] bg-slate-900/40 my-3" />
          )}

          <button 
            onClick={() => { 
              setIsInviteOpen(true);
              setSidebarOpen(false); 
            }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isInviteOpen
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Invite Friends" : undefined}
          >
            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-3'}`}>
              <Users className="w-4 h-4 text-amber-500 shrink-0" />
              {!desktopSidebarCollapsed && <span>Invite Friends</span>}
            </div>
            {!desktopSidebarCollapsed && (
              <span className="text-[8px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full animate-bounce shrink-0">HOT</span>
            )}
          </button>

          <button 
            onClick={() => { 
              setIsMarketingOpen(true);
              setSidebarOpen(false); 
            }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isMarketingOpen
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Marketing & Posters" : undefined}
          >
            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-3'}`}>
              <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
              {!desktopSidebarCollapsed && <span>Marketing & Posters</span>}
            </div>
            {!desktopSidebarCollapsed && (
              <span className="text-[8px] bg-amber-500/20 text-amber-400 font-black px-1.5 py-0.5 rounded uppercase">STUDIO</span>
            )}
          </button>

          <button 
            onClick={() => { setIsCopilotOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCopilotOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "KNEX Copilot" : undefined}
          >
            <div className={`flex items-center ${desktopSidebarCollapsed ? '' : 'space-x-3'}`}>
              <Bot className="w-4 h-4 text-purple-400 shrink-0 animate-pulse" />
              {!desktopSidebarCollapsed && <span>KNEX Copilot</span>}
            </div>
            {!desktopSidebarCollapsed && (
              <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
            )}
          </button>

          {/* Adjust Settings Section */}
          {!desktopSidebarCollapsed ? (
            <div className="pt-4 pb-2 px-3.5 text-[9px] uppercase font-black tracking-widest text-slate-500 select-none">
              Adjust Settings
            </div>
          ) : (
            <div className="h-[1px] bg-slate-900/40 my-3" />
          )}

          <button 
            onClick={() => { setIsSettingsOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Profile settings" : undefined}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Profile settings</span>}
          </button>

          <button 
            onClick={() => { setIsGuideOpen(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isGuideOpen 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'text-slate-450 hover:bg-slate-900/50 hover:text-white'
            }`}
            title={desktopSidebarCollapsed ? "Interactive Guide" : undefined}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Interactive Guide</span>}
          </button>
          
          <button 
            onClick={() => { setRunWalkthrough(true); setSidebarOpen(false); }}
            className={`flex items-center ${desktopSidebarCollapsed ? 'lg:justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} w-full rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-450 hover:bg-slate-900/50 hover:text-emerald-400`}
            title={desktopSidebarCollapsed ? "Platform Tour" : undefined}
          >
            <Compass className="w-4 h-4 shrink-0" />
            {!desktopSidebarCollapsed && <span>Platform Tour</span>}
          </button>
        </nav>

        {/* Sidebar Invitation Banner */}
        {!desktopSidebarCollapsed && (
          <div className="p-4 mx-3 my-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-900 shadow-xl space-y-3 shrink-0 select-none relative group overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
            <div className="flex items-center space-x-2">
              <CoinsIcon className="w-7 h-7 text-amber-400 animate-spin" />
              <span className="text-xs font-extrabold text-slate-100">Invite & Earn 50%</span>
            </div>
            <p className="text-[10px] text-slate-400">Share your custom affiliate link and pocket maximum commission rebates instantly.</p>
            <button 
              onClick={() => triggerToast("Copilot Affiliate link copied to clipboard!", true)}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-white font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition-colors"
            >
              Get Referral link
            </button>
          </div>
        )}

        {/* Latency Indicator bottom bar */}
        <div className={`p-4 border-t border-slate-900/60 flex items-center ${desktopSidebarCollapsed ? 'justify-center p-3' : 'justify-between'} text-[10px] font-mono text-slate-500 shrink-0 select-none`}>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            {!desktopSidebarCollapsed && <span className="font-semibold text-emerald-500 uppercase tracking-tighter text-[9px]">Stable Connection</span>}
          </div>
          {!desktopSidebarCollapsed && <span>28 ms</span>}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN APPLICATION CONTENT PORT (Header + Right & Center columns) */}
      {/* ========================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto animate-fade-in relative scrollbar-thin">
        
        {/* ============================================== */}
        {/* 2.1 TOP HEADER & CONTROLS (Unified) */}
        {/* ============================================== */}
        <header className={`min-h-[4rem] h-auto ${isDark ? 'bg-slate-950/80 border-slate-900/60' : 'bg-white border-slate-200'} border-b flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-6 py-2.5 md:py-0 shrink-0 z-30 sticky top-0 backdrop-blur-md w-full gap-2 md:gap-0`}>
          {/* 1. Brand Logo + Menu Toggles + Asset Swapper (Responsive flow) */}
          <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-3">
            <div className="flex items-center space-x-2">
              {/* Sidebar trigger */}
              <button className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 cursor-pointer" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Collapse Toggle Button */}
              <button 
                onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)} 
                className="hidden lg:flex p-1.5 text-slate-450 hover:text-white rounded-lg hover:bg-slate-900/60 border border-slate-800 transition-all cursor-pointer"
                title={desktopSidebarCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
              >
                {desktopSidebarCollapsed ? <ChevronRight className="w-4 h-4 text-amber-500 animate-pulse" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              
              {/* Brand label only visible on mobile info header to maintain orientation */}
              <div className="md:hidden flex items-center space-x-1.5 select-none" onClick={() => handleSwitchView('trade')}>
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                </div>
                <span className="text-xs font-black tracking-wider text-slate-200">KNEX</span>
              </div>
            </div>

            {/* Contextual Header Indicator: Asset Selector for Trade, or Module Badge for Other Views */}
            {activeTabView === 'trade' ? (
              <div className="relative">
                <button 
                  id="header-asset-select-button"
                  onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                  className="tour-asset-selector flex items-center space-x-1.5 sm:space-x-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/100 transition-all px-2 md:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-mono shrink-0 cursor-pointer text-slate-200 focus:outline-none"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-200 text-[10px] md:text-xs truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px]">{activeAsset.name}</span>
                    <span className="text-[8px] md:text-[9.5px] text-slate-500 uppercase font-black tracking-tight">({activeAsset.symbol}/USD)</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-all duration-200 shrink-0 ${assetDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
                </button>

                {/* Asset Dropdown Overlay */}
                {assetDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAssetDropdownOpen(false)} />
                    <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl z-50 p-2 max-h-96 overflow-y-auto animate-fade-in divide-y divide-slate-900 scrollbar-thin">
                      <div className="text-[8px] font-black tracking-widest text-slate-500 uppercase pb-1.5 pt-0.5 px-2">CHOOSE TRADING INSTRUMENT</div>
                      <div className="py-1 space-y-0.5">
                        {assetsRegistry.map((asset) => {
                          const selected = asset.id === activeAsset.id;
                          const isPopular = ['CRY_BTCUSD', 'FRX_EURUSD', 'R_100', 'R_50'].includes(asset.id);
                          return (
                            <div
                              key={asset.id}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                                selected 
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                  : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent'
                              }`}
                            >
                              <div 
                                className="flex flex-col min-w-0 flex-1 cursor-pointer"
                                onClick={() => {
                                  setActiveAsset(asset);
                                  setAssetDropdownOpen(false);
                                }}
                              >
                                <span className="text-[11px] font-black truncate">{asset.name}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase">{asset.symbol}/USDT</span>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 h-full">
                                {isPopular && (
                                  <button
                                    onClick={(e) => {
                                      handlePurchaseContract({
                                        targetAsset: asset,
                                        type: 'rise-fall',
                                        direction: 'rise',
                                        stake: 10,
                                        duration: 5,
                                        durationUnit: 'ticks'
                                      });
                                      setAssetDropdownOpen(false);
                                    }}
                                    className="px-1.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase rounded border border-emerald-500/20 transition-colors z-10 cursor-pointer"
                                    title="Quick Buy Call ($10)"
                                  >
                                    Quick Buy
                                  </button>
                                )}
                                <div className="text-right font-mono text-[10px] cursor-pointer"
                                  onClick={() => {
                                    setActiveAsset(asset);
                                    setAssetDropdownOpen(false);
                                  }}
                                >
                                  <div className="font-extrabold text-slate-200">${asset?.price?.toFixed(asset?.decimals ?? 2) ?? '0.00'}</div>
                                  <div className={`text-[9px] font-black ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {asset.change !== undefined ? (asset.change >= 0 ? '+' : '') + asset.change.toFixed(2) + '%' : '0.00%'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 border border-slate-800 bg-slate-900/50 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                  {activeTabView === 'p2p' ? 'Knex P2P' :
                   activeTabView === 'finance' ? 'Finance & Cashier' :
                   activeTabView === 'history' ? 'Statements Ledger' : 'Overview Analytics'}
                </span>
                <button
                  onClick={() => handleSwitchView('trade')}
                  className="text-[10px] text-slate-400 hover:text-amber-400 underline ml-1 cursor-pointer"
                >
                  Return to Trade
                </button>
              </div>
            )}
          </div>

          {/* 2. Controls & Actions Row */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-1.5 sm:gap-3 lg:gap-4 md:border-none border-t pt-2 md:pt-0 border-slate-800/10">
            {/* Real vs Demo selector */}
            <div className={`flex items-center p-0.5 rounded-lg ${isDark ? 'bg-slate-950 border border-slate-900' : 'bg-slate-100 border border-slate-200'} shrink-0`}>
              {demoModeEnabled && (
                <button 
                  onClick={() => handleSwitchAccount('demo')}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                    account.mode === 'demo'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-350 font-semibold'
                  }`}
                >
                  <span className="xs:hidden">Demo</span>
                  <span className="hidden xs:inline">Demo Wallet</span>
                </button>
              )}
              {realModeEnabled && (
                <button 
                  onClick={() => handleSwitchAccount('real')}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${
                    account.mode === 'real'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-350 font-semibold'
                  }`}
                >
                  <span className="xs:hidden">Real</span>
                  <span className="hidden xs:inline">Real Wallet</span>
                </button>
              )}
            </div>

            {/* Quick Balance Readout Panel inside Header */}
            <div className="flex flex-col text-right min-w-[55px] sm:min-w-0">
              <span className="text-[7px] sm:text-[8px] text-slate-400 font-extrabold uppercase font-mono tracking-tight sm:tracking-wider leading-none">
                {account.mode.toUpperCase()} WALLET
              </span>
              <span className="font-mono text-[10px] sm:text-xs md:text-sm font-extrabold text-[#f59e0b] leading-tight block mt-0.5">
                ${formatBalance(account.balance)} <span className="text-[8px] text-slate-450 font-normal">USDT</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-3.5 shrink-0">
              {/* Sound Synthesizer toggle */}
              <button 
                onClick={() => { setSoundEnabled(!soundEnabled); triggerToast(soundEnabled ? 'Chime synth muted.' : 'Harmonic chime synth active.', true); }}
                className={`p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer ${soundEnabled ? 'text-amber-500 bg-amber-500/5' : ''}`}
                title="Toggle Web Audio indicators"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
              </button>

              {/* Get APK Modal Button */}
              <button 
                onClick={() => setShowApkModal(true)}
                className="hidden xs:flex bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider transition-all items-center space-x-1 cursor-pointer shrink-0"
                title="Download Encrypted Mobile App"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Get App</span>
              </button>

              {/* Deposit Cashier Button */}
              <button 
                onClick={() => handleOpenCashierWithTab('deposit')}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider transition-all flex items-center space-x-1 shadow-md shadow-emerald-500/10 cursor-pointer shrink-0"
                title="Quick Deposit Cashier"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dep<span className="hidden min-[375px]:inline">osit</span> <span className="hidden sm:inline">CASHIER</span></span>
              </button>

              {/* Language global placeholder */}
              <button className="hidden xs:flex p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-bold tracking-tight uppercase items-center space-x-1 hover:bg-slate-900 cursor-pointer">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden leading-none md:inline text-[10px]">EN</span>
              </button>

              {/* Notifications feed dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsUserMenuOpen(false);
                  }}
                  className={`relative p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer ${isNotificationsOpen ? 'text-amber-500 bg-amber-500/5' : ''}`}
                  title="View notification feed"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-2.5 min-w-[10px] px-0.5 rounded-full bg-rose-600 text-[7px] font-sans font-black flex items-center justify-center text-white scale-95 leading-none">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* Dynamic notifications overlay */}
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <div className={`absolute right-0 mt-2.5 w-72 sm:w-80 md:w-96 rounded-xl shadow-2xl border ${
                      isDark ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-900'
                    } z-50 overflow-hidden divide-y ${isDark ? 'divide-slate-900' : 'divide-gray-100'} animate-fade-in`}>
                      <div className="p-3 flex items-center justify-between bg-slate-900/10">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-[10px] sm:text-xs uppercase tracking-wide">Live Feed</span>
                          <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                            isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {notifications.filter(n => !n.read).length} Unread
                          </span>
                        </div>
                        <div className="flex items-center space-x-2.5">
                          {notifications.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                triggerToast("All notifications marked as read.", true);
                              }}
                              className="text-[9px] sm:text-[10px] text-amber-500 hover:text-amber-400 font-bold hover:underline cursor-pointer"
                            >
                              Read All
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotifications([]);
                                triggerToast("Notification feed cleared.", true);
                              }}
                              className="text-[9px] sm:text-[10px] text-rose-500 hover:text-rose-455 font-bold hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[250px] sm:max-h-[350px] overflow-y-auto divide-y divide-slate-900/40 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="p-6 sm:p-8 text-center text-slate-450 flex flex-col items-center justify-center space-y-2">
                            <Bell className="w-5 h-5 sm:w-7 sm:h-7 text-slate-600 animate-bounce" />
                            <p className="text-[11px] sm:text-xs font-semibold">Your notification tray is silent.</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-500">Live trading history updates appear here.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                              }}
                              className={`p-2.5 sm:p-3.5 transition-all text-left flex items-start gap-2.5 cursor-pointer ${
                                notif.read 
                                  ? 'opacity-65 hover:opacity-100 bg-slate-900/5' 
                                  : isDark ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]' : 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                              }`}
                            >
                              <span className={`h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full mt-1.5 shrink-0 ${
                                notif.read ? 'bg-slate-500' : 'bg-amber-500 ring-2 ring-amber-500/20'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] sm:text-xs ${notif.read ? 'text-slate-450 font-semibold' : 'text-slate-200 font-black'}`}>
                                  {notif.text}
                                </p>
                                <span className="text-[7px] sm:text-[8px] font-mono text-slate-500 block mt-1">{notif.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Separator */}
              <div className={`hidden sm:block h-6 w-[1px] ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`} />

              {/* Complete User Module */}
              <div className="relative">
                {currentUser ? (
                  <>
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className={`flex items-center space-x-1 p-1 rounded-lg hover:bg-slate-900 transition-all cursor-pointer ${
                        isUserMenuOpen ? 'bg-slate-900' : ''
                      }`}
                    >
                      <img 
                        src={currentUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"} 
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-amber-500/30 shadow-md"
                        alt="Avatar"
                      />
                      <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUserMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                        <div className={`absolute right-0 mt-2.5 w-48 sm:w-56 rounded-xl shadow-2xl border ${
                          isDark ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-900'
                        } z-50 overflow-hidden divide-y ${isDark ? 'divide-slate-900' : 'divide-gray-100'} animate-fade-in`}>
                          <div className="p-3 text-left">
                            <p className="text-[11px] sm:text-xs font-black text-slate-200 truncate">{currentUser?.fullName}</p>
                            <p className="text-[9px] sm:text-[10px] font-mono text-slate-450 truncate mt-0.5">{currentUser?.email}</p>
                            <div className="flex items-center space-x-1 mt-2">
                              <span className="text-[7px] sm:text-[8px] bg-amber-500/20 text-amber-455 px-1.5 py-0.5 rounded font-black uppercase">
                                VIP 2 Account
                              </span>
                              <span className="text-[7px] sm:text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">
                                Real Mode
                              </span>
                            </div>
                          </div>

                          <div className="p-1.5 space-y-0.5 text-left">
                            <button 
                              onClick={() => {
                                setIsSettingsOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className={`flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                                isDark ? 'text-slate-300 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-gray-100'
                              }`}
                            >
                              <Settings className="w-3 w-3 sm:w-3.5 sm:h-3.5" />
                              <span>Profile settings</span>
                            </button>
                            
                            <button 
                              onClick={() => {
                                setIsGuideOpen(true);
                                setIsUserMenuOpen(false);
                              }}
                              className={`flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                                isDark ? 'text-slate-300 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-gray-100'
                              }`}
                            >
                              <HelpCircle className="w-3 w-3 sm:w-3.5 sm:h-3.5" />
                              <span>Interactive Guide</span>
                            </button>
                            
                            <button 
                              onClick={() => {
                                setRunWalkthrough(true);
                                setIsUserMenuOpen(false);
                              }}
                              className={`flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                                isDark ? 'text-slate-300 hover:bg-slate-900 hover:text-emerald-400' : 'text-slate-700 hover:bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              <Compass className="w-3 w-3 sm:w-3.5 sm:h-3.5" />
                              <span>Platform Tour</span>
                            </button>
                          </div>

                          <div className="p-1.5 text-left">
                            <button 
                              onClick={() => {
                                setCurrentUser(null);
                                setIsUserMenuOpen(false);
                                triggerToast("Successfully logged out from storage session.", true);
                              }}
                              className="flex items-center space-x-2.5 w-full p-2 rounded-lg text-[11px] sm:text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            >
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
                              <span>Log out of Session</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={() => handleTriggerAuth('login')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/15 cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Theme toggle */}
              <button 
                onClick={handleToggleTheme}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
                title="Toggle Palette Color"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2.2 TOP HORIZONTAL CRYPTO TICKER SLIDER STRIP (Only visible in Trade terminal) */}
        {/* ======================================================== */}
        {activeTabView === 'trade' && (
          <div className={`h-11 ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-150'} border-b overflow-x-auto overflow-y-hidden select-none whitespace-nowrap scrollbar-none flex items-center px-4 gap-6 shrink-0`}>
            {assetsRegistry.slice(0, 9).map((coin) => {
              const selected = coin.id === activeAsset.id;
              const plus = coin.change >= 0;
              return (
                <div 
                  key={coin.id} 
                  onClick={() => setActiveAsset(coin)}
                  className={`inline-flex items-center space-x-2.5 text-xs font-mono py-1 px-2.5 rounded-lg cursor-pointer transition-colors ${
                    selected 
                      ? isDark ? 'bg-slate-900 text-slate-200 border border-slate-800' : 'bg-slate-200 text-blue-900'
                      : isDark ? 'text-slate-400 hover:bg-slate-900/35 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${starredMarkets.includes(coin.id) ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span className="font-extrabold">{coin.symbol}/USDT</span>
                  <span className="font-bold text-slate-300">{coin?.price?.toFixed(coin?.decimals ?? 2) ?? '0.00'}</span>
                  <span className={`font-black tracking-tight text-[10px] ${plus ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {plus ? '+' : ''}{coin?.change?.toFixed(2) ?? '0.00'}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2.3 MAIN WORKSPACE PANEL (Isolated Modular Views) */}
        {/* ========================================================= */}
        <div className="flex-1 p-3 md:p-5 flex flex-col gap-5 overflow-y-auto w-full">

          {/* VIEW 1: P2P MARKETPLACE (Pure isolated view - No trading clutter) */}
          {activeTabView === 'p2p' && (
            <div className="w-full animate-fade-in">
              <P2PMarketplace 
                currentUser={currentUser} 
                isDark={theme === 'dark'} 
                onBalanceUpdate={refreshUserBalance}
                onOpenAuth={() => handleTriggerAuth('login')}
              />
            </div>
          )}

          {/* VIEW 2: FINANCE & CASHIER (Pure isolated view) */}
          {activeTabView === 'finance' && (
            <div className="w-full animate-fade-in">
              <FinanceDashboard 
                currentUser={currentUser} 
                isDark={theme === 'dark'} 
                gameSettings={gameSettings}
                onBalanceUpdate={refreshUserBalance}
                onOpenCashierModal={(tab) => {
                  handleOpenCashierWithTab(tab || 'deposit');
                }}
                onSwitchView={(view) => handleSwitchView(view as any)}
              />
            </div>
          )}

          {/* VIEW 3: TRANSACTION STATEMENTS (Pure isolated view) */}
          {activeTabView === 'history' && (
            <div className="w-full space-y-4 animate-fade-in">
              <div className={`p-4 md:p-6 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div>
                    <h2 className="text-base font-black text-white">Transaction Statements & Account Ledger</h2>
                    <p className="text-xs text-slate-400">View real-time balance statements, settlements, and trade confirmations.</p>
                  </div>
                  <button
                    onClick={() => handleSwitchView('trade')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Open Trading Desk
                  </button>
                </div>
                <PositionsList 
                  theme={theme}
                  activeContracts={activeContracts}
                  closedContracts={tradeHistory}
                  onSellContract={handleSellContractEarly}
                  activeTab="statements"
                  onChangeTab={handlePositionsTabChange}
                  cashoutMode={(gameSettings as any)?.cashoutMode || 'enabled'}
                  pendingLimitOrders={pendingLimitOrders}
                  onCancelPendingOrder={handleCancelPendingLimitOrder}
                />
              </div>
            </div>
          )}

          {/* VIEW 4: OVERVIEW DASHBOARD & STATS (Pure isolated view) */}
          {activeTabView === 'stats' && (
            <div className="w-full space-y-4 animate-fade-in">
              <div className={`p-4 md:p-6 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div>
                    <h2 className="text-base font-black text-white">Overview Dashboard & Portfolio Performance</h2>
                    <p className="text-xs text-slate-400">Summary analytics, win rates, and profit allocations.</p>
                  </div>
                  <button
                    onClick={() => handleSwitchView('trade')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Open Trading Desk
                  </button>
                </div>
                <PositionsList 
                  theme={theme}
                  activeContracts={activeContracts}
                  closedContracts={tradeHistory}
                  onSellContract={handleSellContractEarly}
                  activeTab="stats"
                  onChangeTab={handlePositionsTabChange}
                  cashoutMode={(gameSettings as any)?.cashoutMode || 'enabled'}
                  pendingLimitOrders={pendingLimitOrders}
                  onCancelPendingOrder={handleCancelPendingLimitOrder}
                />
              </div>
            </div>
          )}

          {/* VIEW 5: INTERACTIVE TRADING TERMINAL */}
          {activeTabView === 'trade' && (
            <div className="flex flex-col xl:flex-row gap-5 w-full">
          
          {/* ===================================================== */}
          {/* CENTER-LEFT COLUMN (Chart, Draw toolbar, Spot panel, Positions) */}
          {/* ===================================================== */}
          <div className="flex-1 flex flex-col space-y-5 min-w-0">
            
            {/* Bitcoin Asset Large Info Block */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0`}>
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 shadow-inner text-lg shrink-0">
                  {activeAsset.symbol.includes('BTC') || activeAsset.id.includes('BTC') || activeAsset.symbol === 'C-NEPT' ? '₿' : 
                   activeAsset.symbol === 'TFLUX' ? '🌊' :
                   activeAsset.symbol === 'TITAN' ? '🛡️' :
                   activeAsset.symbol === 'MFLOW' ? '⚡' :
                   activeAsset.symbol === 'WIZARD' ? '👁️' :
                   activeAsset.symbol === 'S-ANCHOR' ? '⚓' :
                   activeAsset.symbol === 'M-LINK' ? '🇪🇺' : '📊'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm md:text-base font-extrabold text-slate-100 uppercase">{activeAsset.name}</h2>
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider">/ PORTFOLIO INDEX</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block">DERIVATIVES BINARY OPTIONS TRADING ACTIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-xs font-mono w-full md:w-auto">
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Index spot</span>
                  <span className={`text-sm font-black ${activeAsset?.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ${activeAsset?.price?.toFixed(activeAsset?.decimals ?? 2) ?? '0.00'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">24h delta</span>
                  <span className={`text-xs font-bold leading-none ${activeAsset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {activeAsset.change !== undefined ? (activeAsset.change >= 0 ? '+' : '') + activeAsset.change.toFixed(2) + '%' : '0.00%'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Volatility</span>
                  <span className="text-xs font-bold text-slate-300">{activeAsset?.volatility?.toFixed(1) ?? '0.0'}%</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-450 uppercase font-black tracking-wider">Drift bias</span>
                  <span className="text-xs font-bold text-amber-400 font-mono">{(activeAsset?.trendBias >= 0 ? '+' : '') + (activeAsset?.trendBias?.toFixed(2) ?? '0.00')}</span>
                </div>
              </div>
            </div>

            {/* Quick Trading Asset Selector Toggles Bar (TIDAL FLUX, TITAN, and others) */}
            <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900/60' : 'bg-slate-50 border-slate-200'} flex items-center justify-between overflow-x-auto whitespace-nowrap gap-2 shrink-0 scrollbar-none`}>
              <div className="flex items-center space-x-2 w-full">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider mr-2 hidden md:inline-block">Popular Trade Parts:</span>
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full scrollbar-none py-0.5">
                  {[
                    { id: 'R_25', label: '🌊 Tidal Flux', symbol: 'TFLUX' },
                    { id: 'R_50', label: '🛡️ Titan Swell', symbol: 'TITAN' },
                    { id: 'R_10', label: '⚡ KNEX Flow', symbol: 'MFLOW' },
                    { id: 'R_100', label: '👁️ Wizard Eye', symbol: 'WIZARD' },
                    { id: 'CRY_BTCUSD', label: '₿ Crypto Neptune', symbol: 'C-NEPT' },
                    { id: 'FRX_EURUSD', label: '🇪🇺 Meridian Link', symbol: 'M-LINK' }
                  ].map((preset) => {
                    const realAsset = assetsRegistry.find(a => a.id === preset.id || a.symbol === preset.symbol);
                    if (!realAsset) return null;
                    const isSelected = activeAsset.id === realAsset.id;
                    return (
                      <button
                        key={realAsset.id}
                        onClick={() => setActiveAsset(realAsset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border cursor-pointer inline-flex items-center space-x-2 shrink-0 ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-600 shadow-md shadow-amber-500/10 scale-102' 
                            : isDark 
                              ? 'bg-slate-900/40 text-slate-350 border-slate-900/70 hover:bg-slate-900 hover:text-white'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-extrabold">{preset.label}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-900/80' : 'text-slate-500'}`}>
                          ({realAsset.symbol})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>


            {/* Unified Trading Terminal Workspace Grid (User Requested layout) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT SIDE: Interactive Trading Grid (Chart) */}
              <div className={`tour-chart md:col-span-12 lg:col-span-8 xl:col-span-8 2xl:col-span-9 rounded-xl border ${isDark ? 'bg-slate-950/20 border-slate-900' : 'bg-white border-slate-200'} p-3 flex flex-col gap-2 min-h-[460px] relative overflow-hidden h-full`}>
                
                {/* Horizontal drawing toolbar on Top of chart */}
                <div className="w-full flex items-center justify-start px-2 py-1 space-x-2 border-b border-slate-900 shrink-0 select-none">
                  <button 
                    onClick={() => triggerToast("TV crosshair cursor highlighted.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 hover:text-white text-slate-500 hover:scale-105 active:scale-95 transition-transform" 
                    title="Crosshair pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Trendline drawing anchor mode ready. Drag click anchors on chart canvas.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-amber-400 hover:scale-105 transition-all" 
                    title="Draw Trendline"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Brushes and pencil drawing tools active.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-purple-400 transition-all" 
                    title="Brush drawing board"
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                  <button 
                    onClick={() => triggerToast("Fibers Fibonacci Retracement bands overlay activated.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-amber-400 transition-all" 
                    title="Fibonacci Retracements"
                  >
                    <Award className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => triggerToast("Measuring grid tools highlighted. Click chart coordinates.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-blue-400 transition-all" 
                    title="Distance Measure Scale"
                  >
                    <Activity className="w-3.5 h-3.5 font-bold" />
                  </button>
                  <div className="flex-1"></div>
                  <button 
                    onClick={() => triggerToast("Reset drawings and clear canvas annotations.", true)}
                    className="p-1 rounded-md hover:bg-slate-900 text-slate-400 hover:text-rose-500 transition-colors" 
                    title="Garbage Reset All Drawings"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Central Chart Rendering Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  <Chart 
                    theme={theme}
                    asset={activeAsset}
                    ticks={activeTicks}
                    activeContracts={activeContracts}
                    indicatorConfig={indicatorConfig}
                    chartType={chartType}
                    onToggleChartType={(newType) => setChartType(newType)}
                    onToggleIndicator={handleToggleIndicator}
                    onUpdateContract={(id, updates) => {
                      setActiveContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
                      const action = updates.stopLossPrice ? 'Stop Loss' : 'Take Profit';
                      triggerToast(`${action} marker updated interactively.`, true);
                    }}
                    onPriceClick={(price) => {
                      setQuickOrderPrompt({ price });
                    }}
                  />
                </div>
              </div>

              {/* RIGHT SIDE: Compact Multi-column Order Execution controls */}
              <div className={`tour-trade-controls md:col-span-12 lg:col-span-4 xl:col-span-4 2xl:col-span-3 p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col justify-between space-y-4`}>
                
                {/* 1. Terminal Top Bar: Title, Mode Tabs, and Quick Tools */}
                <div className="space-y-2.5 shrink-0">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-white">Execution Terminal</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Live Engine
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowHotkeysModal(true)}
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                        title="View keyboard hotkeys"
                      >
                        ⌨ Hotkeys
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !soundEnabled;
                          setSoundEnabled(next);
                          triggerToast(next ? "🔊 Sound Effects Enabled" : "🔇 Sound Muted", true);
                        }}
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer border ${
                          soundEnabled
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                        title="Toggle Sound Effects"
                      >
                        {soundEnabled ? '🔊' : '🔇'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !oneClickTrading;
                          setOneClickTrading(next);
                          triggerToast(next ? "⚡ 1-Click Fast Trading Enabled!" : "1-Click Mode Disabled", true);
                        }}
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-all cursor-pointer border ${
                          oneClickTrading 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-xs' 
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                        title="Toggle 1-Click Instant Execution"
                      >
                        {oneClickTrading ? '⚡ 1-Click: ON' : '1-Click: OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Mode Selector: Easy Trade vs Pro Suite */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-900 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTradingModeTab('quick')}
                      className={`py-1.5 px-2 rounded-md font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tradingModeTab === 'quick'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>⚡ Easy Trade</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTradingModeTab('pro')}
                      className={`py-1.5 px-2 rounded-md font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tradingModeTab === 'pro'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>🛠 Pro Suite</span>
                    </button>
                  </div>

                  {/* Session Performance & Momentum Ribbon */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-900/80 text-[10px] font-mono">
                    {sessionStats.totalTrades > 0 ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          {sessionStats.streakType === 'won' ? (
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              🔥 {sessionStats.streakCount} Win Streak
                            </span>
                          ) : sessionStats.streakType === 'lost' ? (
                            <span className="text-blue-400 font-extrabold flex items-center gap-1">
                              🛡 {sessionStats.streakCount} Loss (Recovery Ready)
                            </span>
                          ) : (
                            <span className="text-slate-400">Trading Session</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{sessionStats.winRate}% WR ({sessionStats.wins}W/{sessionStats.losses}L)</span>
                          <span className={`font-black ${sessionStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {sessionStats.totalProfit >= 0 ? '+' : ''}${sessionStats.totalProfit.toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full text-slate-400 text-[9px]">
                        <span>Instant Binary Options · No Slippage</span>
                        <span className="text-amber-400 font-bold">Up to 95.5% Payout</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVE RUNNING TRADE TRACKER (WHEN TRADE IS RUNNING) */}
                {activeContracts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2.5 shadow-lg shadow-amber-500/5 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        <span className="text-[10px] font-mono font-extrabold uppercase text-amber-400 tracking-wider">
                          TRADE RUNNING ({activeContracts.length})
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-amber-300/90 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        WAIT FOR EXPIRY
                      </span>
                    </div>

                    {activeContracts.map((c) => {
                      const nowMs = liveClockTime;
                      const remainingMs = Math.max(0, (c.expiryTime || nowMs) - nowMs);
                      const totalMs = Math.max(100, (c.expiryTime || nowMs) - (c.entryTime || nowMs));
                      const progressPct = Math.min(100, Math.max(0, ((totalMs - remainingMs) / totalMs) * 100));
                      const remainingDisplay = (remainingMs / 1000) <= 10 
                        ? `${(remainingMs / 1000).toFixed(1)}s` 
                        : `${Math.ceil(remainingMs / 1000)}s`;
                      const isCall = c.direction === 'rise' || c.direction === 'call' || c.direction === 'buy' || c.direction === 'higher';
                      const contractDec = (activeAsset?.id === c.assetId ? activeAsset?.decimals : undefined) ?? 2;
                      const entryVal = typeof c.entryPrice === 'number' ? c.entryPrice : (activeAsset?.price ?? 0);
                      const currentVal = typeof c.currentPrice === 'number' ? c.currentPrice : (assetsTicksMap[c.assetId]?.[assetsTicksMap[c.assetId].length - 1]?.price ?? entryVal);
                      const priceDiff = currentVal - entryVal;
                      const isWinning = isCall ? currentVal > entryVal : currentVal < entryVal;
                      const isEqual = currentVal === entryVal;
                      const payoutVal = typeof c.payout === 'number' ? c.payout : ((c.stake || 10) * 1.955);
                      const netProfitEst = payoutVal - c.stake;
                      const refundAmt = c.sellPrice || (c.stake * 0.85);

                      return (
                        <div key={c.id} className="space-y-2 bg-slate-950/80 p-3 rounded-lg border border-slate-900 font-mono text-xs">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-xs">{c.assetName}</span>
                              <span className="text-[9px] text-slate-500 font-mono">({c.assetSymbol})</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              isCall ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {isCall ? 'CALL / UP ▲' : 'PUT / DOWN ▼'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                            <div>
                              <span className="text-slate-500 block">Locked Entry:</span>
                              <span className="font-bold text-slate-200">${(entryVal ?? 0).toFixed(contractDec)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block">Live Spot:</span>
                              <span className={`font-black ${isWinning ? 'text-emerald-400' : isEqual ? 'text-amber-400' : 'text-rose-400'}`}>
                                ${(currentVal ?? 0).toFixed(contractDec)}
                                <span className="text-[9px] ml-1 opacity-80">
                                  ({priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(contractDec)})
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Live outcome condition indicator */}
                          <div className={`p-2 rounded text-center text-[10px] font-bold transition-colors ${
                            isWinning 
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' 
                              : isEqual 
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' 
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="uppercase text-[9px] font-extrabold tracking-wide">
                                {isWinning ? '● IN THE MONEY' : isEqual ? '● AT THE MONEY (DRAW)' : '● OUT OF THE MONEY'}
                              </span>
                              <span className="font-mono text-[11px] font-black">
                                {isWinning ? `+$${netProfitEst.toFixed(2)}` : isEqual ? `$0.00` : `-$${c.stake.toFixed(2)}`}
                              </span>
                            </div>
                            <div className="text-[8px] opacity-75 mt-0.5 text-left font-normal flex justify-between">
                              <span>{isCall ? 'Target: Expiry > Entry' : 'Target: Expiry < Entry'}</span>
                              <span className="font-bold">Potential Payout: ${payoutVal.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Expiry Countdown Progress */}
                          <div>
                            <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                              <span>Time to Expiry:</span>
                              <span className="text-amber-400 font-bold font-mono">{remainingDisplay} remaining</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Early Settle & Hedge Actions */}
                          <div className="pt-1.5 flex justify-between items-center text-[9px] border-t border-slate-900/60">
                            <span className="text-slate-400 font-mono">Stake: ${c.stake.toFixed(2)}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const oppDir = (c.direction === 'rise' || c.direction === 'call') ? 'put' : (c.direction === 'fall' || c.direction === 'put') ? 'call' : c.direction === 'over' ? 'under' : c.direction === 'under' ? 'over' : c.direction === 'touch' ? 'no-touch' : 'touch';
                                  executeSpotTrade(oppDir as any, c.stake, c.type, c.duration, c.durationUnit, c.targetDigit, c.barrierOffset);
                                  triggerToast(`Hedge order opened: Reverse position secured.`, true);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 font-bold transition-all cursor-pointer text-[8px] active:scale-95"
                                title="Open equal opposite position to hedge downside"
                              >
                                Hedge / Reverse
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSellContractEarly(c.id)}
                                className={`px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer text-[9px] border active:scale-95 ${
                                  refundAmt >= c.stake 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                                }`}
                                title="Close contract early and secure payout"
                              >
                                Cash Out (${refundAmt.toFixed(2)})
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tradingModeTab === 'quick' ? (
                  <div className="space-y-3 p-3 rounded-lg bg-slate-950/30 border border-slate-900 flex-1 overflow-y-auto">
                    {/* 1. Quick Asset Selector Row */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Quick Asset</span>
                        <span className="text-amber-400 font-black">
                          Spot: ${(activeAsset?.price ?? 0).toFixed(activeAsset?.decimals ?? 2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {ASSETSList.slice(0, 5).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setActiveAsset(a)}
                            className={`rounded-lg py-1.5 px-1 text-center font-mono border transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                              activeAsset.id === a.id
                                ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40 shadow-sm'
                                : 'border-slate-850 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                          >
                            <span className="text-[10px] font-black">{a.symbol}</span>
                            <span className="text-[8px] opacity-75">${(a.price ?? 0).toFixed(a.decimals > 2 ? 4 : 2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Fast Expiry Chips & Custom Stepper */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-900">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Expiry Duration</span>
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {spotDuration} {spotDurationUnit}
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {[
                          { label: '1s', dur: 1, unit: 'seconds' },
                          { label: '5s', dur: 5, unit: 'seconds' },
                          { label: '15s', dur: 15, unit: 'seconds' },
                          { label: '30s', dur: 30, unit: 'seconds' },
                          { label: '1m', dur: 1, unit: 'minutes' },
                          { label: '5m', dur: 5, unit: 'minutes' },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setSpotDuration(item.dur);
                              setSpotDurationUnit(item.unit as any);
                            }}
                            className={`py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center active:scale-95 ${
                              spotDuration === item.dur && spotDurationUnit === item.unit
                                ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                                : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Micro duration adjuster */}
                      <div className="grid grid-cols-12 gap-1 pt-0.5">
                        <div className="col-span-6 flex items-center bg-slate-950 border border-slate-900 rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setSpotDuration((prev) => Math.max(1, prev - 1))}
                            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="1" 
                            max="300"
                            value={spotDuration}
                            onChange={(e) => setSpotDuration(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-transparent text-center font-mono text-[11px] font-bold text-white py-0.5 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setSpotDuration((prev) => Math.min(300, prev + 1))}
                            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="col-span-6 flex rounded bg-slate-950 border border-slate-900 p-0.5 text-[8px] font-mono">
                          {(['seconds', 'minutes', 'hours', 'ticks'] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => setSpotDurationUnit(unit)}
                              className={`flex-1 text-center py-0.5 rounded uppercase font-bold transition-all ${
                                spotDurationUnit === unit ? 'bg-amber-500/25 text-amber-400 font-extrabold' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {unit === 'seconds' ? 'Sec' : unit === 'minutes' ? 'Min' : unit === 'hours' ? 'Hr' : 'Tick'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. Stake Selector & Quick Adjusters */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-slate-950/50 border border-slate-900">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Stake Amount</span>
                        <span className="text-slate-400">
                          Avail: <strong className="text-emerald-400">${freeBalance.toFixed(2)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || 10;
                            const stepVal = cur > 50 ? 25 : cur > 20 ? 10 : 5;
                            const next = Math.max(1, cur - stepVal);
                            handleUsdChange(next.toString());
                          }}
                          className="h-9 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono font-black hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                          title="Decrease Stake"
                        >
                          -
                        </button>

                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500 text-sm">$</span>
                          <input
                            type="number"
                            step="1"
                            min={(gameSettings as any)?.minStake || 1}
                            max={(gameSettings as any)?.maxStake || 5000}
                            value={activeInput === 'usd' ? spotAmountUsd : (spotAmountUsd || '10.00')}
                            onFocus={() => setActiveInput('usd')}
                            onChange={(e) => handleUsdChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-base font-black py-1.5 px-6 text-white focus:outline-none focus:border-amber-500/80 shadow-inner"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || 10;
                            const stepVal = cur >= 50 ? 25 : cur >= 20 ? 10 : 5;
                            const next = Math.min((gameSettings as any)?.maxStake || 5000, cur + stepVal);
                            handleUsdChange(next.toString());
                          }}
                          className="h-9 px-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 font-mono font-black hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                          title="Increase Stake"
                        >
                          +
                        </button>

                        {/* Stake Halve and Double shortcut buttons */}
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || 10;
                            const halved = Math.max(1, Math.round(cur / 2));
                            handleUsdChange(halved.toString());
                          }}
                          className="h-9 px-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 font-mono text-[10px] font-bold hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                          title="Halve Stake (H)"
                        >
                          ½
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || 10;
                            const doubled = Math.min((gameSettings as any)?.maxStake || 5000, Math.round(cur * 2));
                            handleUsdChange(doubled.toString());
                          }}
                          className="h-9 px-2 rounded-lg border border-slate-800 bg-slate-900 text-amber-400 font-mono text-[10px] font-black hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                          title="Double Stake (D)"
                        >
                          2x
                        </button>
                      </div>

                      {/* Preset stake chips */}
                      <div className="grid grid-cols-6 gap-1 pt-0.5">
                        {[5, 10, 25, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleUsdChange(val.toString())}
                            className={`rounded py-1 text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                              (parseFloat(spotAmountUsd) || 10) === val
                                ? 'border-amber-500 bg-amber-500/20 text-amber-400 font-black'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                          >
                            ${val}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const maxVal = Math.min((gameSettings as any)?.maxStake || 5000, Math.floor(freeBalance));
                            handleUsdChange(Math.max(1, maxVal).toString());
                          }}
                          className="rounded py-1 text-[9px] font-mono font-black border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer uppercase"
                          title="All-In / Max Balance (M)"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    {/* 4. Smart Trading Protections: Auto-Martingale & Auto-Cashout */}
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-950/60 border border-slate-900 text-[10px] font-mono">
                      {/* Martingale Recovery Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !autoMartingale;
                          setAutoMartingale(next);
                          if (next) {
                            setBaseMartingaleStake(parseFloat(spotAmountUsd) || 10);
                            triggerToast(`Auto-Martingale Active: 2x on loss, reset to base on win.`, true);
                          } else {
                            triggerToast(`Auto-Martingale Disabled`, true);
                          }
                        }}
                        className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          autoMartingale
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                        title="Automatically doubles stake after a loss to recover capital"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold flex items-center gap-1">
                            <span>🛡 Martingale</span>
                          </span>
                          <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${autoMartingale ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                            {autoMartingale ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <span className="text-[8px] opacity-75 mt-0.5 leading-none">2x on loss, resets on win</span>
                      </button>

                      {/* Auto Take-Profit Cashout Selector */}
                      <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 flex flex-col justify-between">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-[9px] text-slate-300">🎯 Auto Cashout</span>
                          <span className="text-[8px] text-amber-400 font-bold">
                            {autoCashoutPercent === 0 ? 'Disabled' : `+${autoCashoutPercent}%`}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-0.5 mt-1">
                          {[0, 25, 50, 75].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setAutoCashoutPercent(pct);
                                triggerToast(pct === 0 ? 'Auto Cashout disabled' : `Auto Cashout set to secure at +${pct}% profit`, true);
                              }}
                              className={`py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                                autoCashoutPercent === pct
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-900 text-slate-400 hover:text-white'
                              }`}
                            >
                              {pct === 0 ? 'Off' : `+${pct}%`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 5. HERO DUAL-ACTION CALL & PUT BUTTONS */}
                    <div className="space-y-1.5 pt-0.5">
                      {(() => {
                        const curStake = parseFloat(spotAmountUsd) || 10;
                        const ratePct = gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5;
                        const profitAmt = curStake * (ratePct / 100);
                        const payoutAmt = curStake + profitAmt;

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {/* CALL / HIGHER BUTTON */}
                              <button
                                type="button"
                                onClick={() => executeSpotTrade('call', undefined, undefined, spotDuration, spotDurationUnit)}
                                className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] active:scale-[0.98] text-white p-3 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex flex-col justify-between text-left border border-emerald-500/40"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-1">
                                    CALL / HIGHER <span className="text-sm">▲</span>
                                  </span>
                                  <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                    +{ratePct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="mt-2 pt-1 border-t border-white/20 flex justify-between items-baseline text-[10px] font-mono">
                                  <span className="opacity-80">Win Profit:</span>
                                  <span className="font-black text-sm text-emerald-200">
                                    +${profitAmt.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[8px] opacity-75 mt-0.5">
                                  <span>Target: Expiry &gt; Entry</span>
                                  <span className="font-mono font-bold bg-black/25 px-1 rounded">Hotkey: W or ↑</span>
                                </div>
                              </button>

                              {/* PUT / LOWER BUTTON */}
                              <button
                                type="button"
                                onClick={() => executeSpotTrade('put', undefined, undefined, spotDuration, spotDurationUnit)}
                                className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] active:scale-[0.98] text-white p-3 shadow-lg shadow-rose-950/60 transition-all cursor-pointer flex flex-col justify-between text-left border border-rose-500/40"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span className="font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-1">
                                    PUT / LOWER <span className="text-sm">▼</span>
                                  </span>
                                  <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                    +{ratePct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="mt-2 pt-1 border-t border-white/20 flex justify-between items-baseline text-[10px] font-mono">
                                  <span className="opacity-80">Win Profit:</span>
                                  <span className="font-black text-sm text-rose-200">
                                    +${profitAmt.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[8px] opacity-75 mt-0.5">
                                  <span>Target: Expiry &lt; Entry</span>
                                  <span className="font-mono font-bold bg-black/25 px-1 rounded">Hotkey: S or ↓</span>
                                </div>
                              </button>
                            </div>

                            {/* Total payout banner */}
                            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-900 text-[10px] font-mono text-slate-400">
                              <span>Total Payout on Win: <strong className="text-emerald-400 font-bold">${payoutAmt.toFixed(2)}</strong></span>
                              <span className="text-[9px] text-amber-400/90 font-bold">Tie: 100% Refunded</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* 6. Quick Follow-Up & Re-Entry Bar */}
                    {lastTradeConfig && (
                      <div className="pt-2 border-t border-slate-900/60 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRepeatLastTrade(1)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                          title="Repeat previous trade (Spacebar or R)"
                        >
                          <span>↺ Repeat (${lastTradeConfig.stake.toFixed(2)})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRepeatLastTrade(2)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-black transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                          title="Double stake (D)"
                        >
                          <span>⚡ 2x (${(lastTradeConfig.stake * 2).toFixed(2)})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRepeatLastTrade(1, true)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[9px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                          title="Flip direction (F)"
                        >
                          <span>⇄ Flip</span>
                        </button>
                      </div>
                    )}

                    {/* Interactive Validation Checklist & Test Suite Button */}
                    <div className="pt-2 border-t border-slate-900/60">
                      <button
                        type="button"
                        onClick={() => setShowValidationChecklist(true)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center justify-between active:scale-98"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>📋 Trade Validation Checklist (A–G)</span>
                        </span>
                        <span className="text-[8px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                          45/45 Rules Active →
                        </span>
                      </button>
                    </div>

                    {/* Hotkey Helper Ribbon */}
                    <div className="pt-1 flex items-center justify-between text-[8px] font-mono text-slate-500">
                      <span>[W] Call · [S] Put · [Space/R] Repeat · [D] 2x · [C] Cashout</span>
                      <button
                        type="button"
                        onClick={() => setShowHotkeysModal(true)}
                        className="text-amber-400 hover:underline cursor-pointer"
                      >
                        All Hotkeys →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-slate-950/25 border border-slate-900 flex-1 overflow-y-auto">
                    {/* CONTRACT TYPE MODE SWITCHER */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Contract Type Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-950 border border-slate-900 text-[10px] font-mono">
                        {[
                          { type: 'rise-fall' as ContractType, label: '⚡ Rise / Fall', desc: 'Call / Put' },
                          { type: 'digit-over-under' as ContractType, label: '🔢 Digits 0-9', desc: 'Over / Under' },
                          { type: 'touch-no-touch' as ContractType, label: '🎯 Barrier', desc: 'Touch / No-Touch' },
                        ].map((tab) => (
                          <button
                            key={tab.type}
                            type="button"
                            onClick={() => {
                              setSelectedContractType(tab.type);
                              setProPlayGridModal(tab.type);
                            }}
                            className={`py-1.5 px-1 rounded-md text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              selectedContractType === tab.type
                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                          >
                            <span className="font-bold text-[9px]">{tab.label}</span>
                            <span className="text-[8px] opacity-75">{tab.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* STEP 1: SELECT ASSET */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          Step 1: Select Asset
                        </label>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          Spot: ${(activeAsset?.price ?? 0).toFixed(activeAsset?.decimals ?? 2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {ASSETSList.slice(0, 5).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setActiveAsset(a)}
                            className={`rounded py-1.5 px-1 text-[9px] font-mono font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                              activeAsset.id === a.id
                                ? 'border-amber-500 bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                                : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                          >
                            <span className="leading-tight">{a.symbol}</span>
                            <span className="text-[8px] opacity-75 font-normal leading-none mt-0.5">${(a.price ?? 0).toFixed(a.decimals > 2 ? 4 : 2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* STEP 2: SELECT EXPIRY */}
                    <div className="space-y-1.5 p-2.5 rounded-lg border border-slate-900 bg-slate-950/40">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          Step 2: Select Expiry
                        </label>
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {spotDuration} {spotDurationUnit}
                        </span>
                      </div>

                      {/* Expiry Quick Chips tailored by contract type */}
                      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1">
                        {(selectedContractType === 'digit-over-under'
                          ? [
                              { label: '1 Tick', dur: 1, unit: 'ticks' },
                              { label: '2 Ticks', dur: 2, unit: 'ticks' },
                              { label: '5 Ticks', dur: 5, unit: 'ticks' },
                              { label: '10 Ticks', dur: 10, unit: 'ticks' }
                            ]
                          : selectedContractType === 'touch-no-touch'
                          ? [
                              { label: '15s', dur: 15, unit: 'seconds' },
                              { label: '30s', dur: 30, unit: 'seconds' },
                              { label: '1m', dur: 1, unit: 'minutes' },
                              { label: '2m', dur: 2, unit: 'minutes' },
                              { label: '5m', dur: 5, unit: 'minutes' }
                            ]
                          : [
                              { label: '1 Tick', dur: 1, unit: 'ticks' },
                              { label: '5 Ticks', dur: 5, unit: 'ticks' },
                              { label: '15s', dur: 15, unit: 'seconds' },
                              { label: '30s', dur: 30, unit: 'seconds' },
                              { label: '1m', dur: 1, unit: 'minutes' },
                              { label: '5m', dur: 5, unit: 'minutes' }
                            ]
                        ).map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setSpotDuration(item.dur);
                              setSpotDurationUnit(item.unit as any);
                            }}
                            className={`rounded py-1 text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                              spotDuration === item.dur && spotDurationUnit === item.unit
                                ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                                : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Duration Stepper */}
                      <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                        <div className="col-span-5 flex items-center bg-slate-950 border border-slate-900 rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setSpotDuration((prev) => Math.max(1, prev - 1))}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="1" 
                            max="300"
                            value={spotDuration}
                            onChange={(e) => setSpotDuration(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-transparent text-center font-mono text-xs font-bold text-white py-1 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setSpotDuration((prev) => Math.min(300, prev + 1))}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <div className="col-span-7 flex rounded bg-slate-950 border border-slate-900 p-0.5 text-[8px] font-mono">
                          {(['ticks', 'seconds', 'minutes', 'hours'] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => setSpotDurationUnit(unit)}
                              className={`flex-1 text-center py-1 rounded uppercase font-bold transition-all ${
                                spotDurationUnit === unit ? 'bg-amber-500/25 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {unit === 'ticks' ? 'Tick' : unit === 'seconds' ? 'Sec' : unit === 'minutes' ? 'Min' : 'Hr'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* STEP 3: ENTER STAKE */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          Step 3: Enter Stake
                        </label>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Min: ${Number((gameSettings as any)?.minStake || 1).toFixed(2)} | Max: ${Number((gameSettings as any)?.maxStake || 5000).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10;
                            const stepVal = cur > 50 ? 25 : cur > 20 ? 10 : 5;
                            const next = Math.max(1, cur - stepVal);
                            handleUsdChange(next.toString());
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
                            min={(gameSettings as any)?.minStake || 1}
                            max={(gameSettings as any)?.maxStake || 5000}
                            placeholder="10.00"
                            value={activeInput === 'usd' ? spotAmountUsd : (spotAmountUsd || (amountNum > 0 && activeAsset?.price ? (amountNum * activeAsset.price).toFixed(2) : '10.00'))} 
                            onFocus={() => setActiveInput('usd')}
                            onChange={(e) => handleUsdChange(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded-lg text-center font-mono text-base md:text-lg font-black py-2 px-7 text-white focus:outline-none focus:border-amber-500/70 focus:bg-slate-900 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" 
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10;
                            const stepVal = cur >= 50 ? 25 : cur >= 20 ? 10 : 5;
                            const next = Math.min((gameSettings as any)?.maxStake || 5000, cur + stepVal);
                            handleUsdChange(next.toString());
                          }}
                          className="h-10 px-3 rounded-lg border border-slate-900 bg-slate-950 text-slate-300 font-mono font-bold hover:bg-slate-900 hover:text-white transition-all cursor-pointer active:scale-95 text-sm"
                          title="Increase stake"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Stake Chips + Balance Proportions */}
                      <div className="grid grid-cols-6 gap-1 mt-1">
                        {[1, 5, 10, 25, 50, 100].map((val) => (
                          <button 
                            key={val} 
                            type="button"
                            onClick={() => handleUsdChange(val.toString())}
                            className={`rounded py-1 text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                              (parseFloat(spotAmountUsd) || 10) === val
                                ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                                : 'border-slate-900 bg-slate-950 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 hover:bg-slate-900'
                            }`}
                          >
                            ${val}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {[10, 25, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handlePresetPercentage(pct)}
                            className="rounded py-1 text-[9px] font-mono font-bold border border-slate-900 bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
                          >
                            {pct}% Bal
                          </button>
                        ))}
                        <button 
                          type="button"
                          onClick={() => {
                            const maxVal = Math.min((gameSettings as any)?.maxStake || 5000, Math.floor(freeBalance));
                            handleUsdChange(Math.max(1, maxVal).toString());
                          }}
                          className="rounded py-1 text-[9px] font-mono font-black border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer uppercase"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    {/* STEP 4: CHECK BALANCE & RULES */}
                    <div className="rounded-lg bg-slate-950/70 border border-slate-900 p-2.5 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                        <span className="uppercase font-bold">Step 4: Check Balance &amp; Rules</span>
                        <span className={freeBalance >= (parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {freeBalance >= (parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) ? '✓ Funds Available' : '✗ Insufficient Funds'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Available Balance:</span>
                        <span className="text-white font-bold">${freeBalance.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Total Payout on Win:</span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          ${((parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) * (1 + (
                            selectedContractType === 'digit-over-under' ? 0.90 :
                            selectedContractType === 'touch-no-touch' ? 1.40 :
                            ((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5) / 100)
                          ))).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Net Return:</span>
                        <span className="text-emerald-400 font-bold">
                          +${((parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) * (
                            selectedContractType === 'digit-over-under' ? 0.90 :
                            selectedContractType === 'touch-no-touch' ? 1.40 :
                            ((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5) / 100)
                          )).toFixed(2)} (+{selectedContractType === 'digit-over-under' ? '90.0' : selectedContractType === 'touch-no-touch' ? '140.0' : ((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5)).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-500 pt-0.5 border-t border-slate-900/50 flex justify-between">
                        <span>Draw Rule: Expiry == Entry</span>
                        <span className="text-amber-400/90 font-bold">100% Stake Refunded</span>
                      </div>
                    </div>

                    {/* STEP 5: DYNAMIC EXECUTION BUTTONS */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                        <span>Step 5: Lock Stake &amp; Run</span>
                        <span className="text-amber-400 text-[9px]">
                          {oneClickTrading ? '⚡ 1-Click Active' : 'Confirmation Mode'}
                        </span>
                      </div>

                      {/* RISE / FALL (CALL/PUT) BUTTONS */}
                      {selectedContractType === 'rise-fall' && (
                        <div className="grid grid-cols-2 gap-2">
                          {/* BUY CALL / UP BUTTON */}
                          <button
                            type="button"
                            onClick={() => executeSpotTrade('call')}
                            className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] active:scale-[0.98] text-white p-3 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-emerald-500/40"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-1">
                                CALL / UP <span className="text-sm">▲</span>
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                +{((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5)).toFixed(0)}%
                              </span>
                            </div>
                            <div className="mt-2 pt-1 border-t border-white/15 flex justify-between items-baseline text-[9px] font-mono">
                              <span className="opacity-80">Payout:</span>
                              <span className="font-black text-xs text-white">
                                ${((parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) * (1 + ((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5) / 100))).toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[8px] opacity-75 mt-0.5 block">Win if Expiry &gt; Entry</span>
                          </button>

                          {/* BUY PUT / DOWN BUTTON */}
                          <button
                            type="button"
                            onClick={() => executeSpotTrade('put')}
                            className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] active:scale-[0.98] text-white p-3 shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-rose-500/40"
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-1">
                                PUT / DOWN <span className="text-sm">▼</span>
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                +{((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5)).toFixed(0)}%
                              </span>
                            </div>
                            <div className="mt-2 pt-1 border-t border-white/15 flex justify-between items-baseline text-[9px] font-mono">
                              <span className="opacity-80">Payout:</span>
                              <span className="font-black text-xs text-white">
                                ${((parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10) * (1 + ((gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5) / 100))).toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[8px] opacity-75 mt-0.5 block">Win if Expiry &lt; Entry</span>
                          </button>
                        </div>
                      )}

                      {/* DIGITS OVER / UNDER CONTROLS */}
                      {selectedContractType === 'digit-over-under' && (
                        <div className="space-y-2">
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-900">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1.5">
                              <span>Target Digit (0-9):</span>
                              <span className="text-amber-400 font-bold">Selected: {targetDigit}</span>
                            </div>
                            <div className="grid grid-cols-10 gap-1">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setTargetDigit(d)}
                                  className={`py-1 text-center font-mono font-bold text-xs rounded transition-all cursor-pointer ${
                                    targetDigit === d
                                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => executeSpotTrade('over')}
                              className="group rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] active:scale-[0.98] text-white p-3 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-emerald-500/40"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-black text-xs uppercase tracking-wider">
                                  OVER &gt; {targetDigit} ▲
                                </span>
                                <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                  +90%
                                </span>
                              </div>
                              <span className="text-[8px] opacity-75 mt-1 block">Win if Last Digit &gt; {targetDigit}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => executeSpotTrade('under')}
                              className="group rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] active:scale-[0.98] text-white p-3 shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-rose-500/40"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-black text-xs uppercase tracking-wider">
                                  UNDER &lt; {targetDigit} ▼
                                </span>
                                <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                  +90%
                                </span>
                              </div>
                              <span className="text-[8px] opacity-75 mt-1 block">Win if Last Digit &lt; {targetDigit}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TOUCH / NO-TOUCH BARRIER CONTROLS */}
                      {selectedContractType === 'touch-no-touch' && (
                        <div className="space-y-2">
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-900">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1.5">
                              <span>Barrier Offset:</span>
                              <span className="text-amber-400 font-bold">±${barrierOffset.toFixed(2)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {[0.5, 1.0, 2.5, 5.0].map((off) => (
                                <button
                                  key={off}
                                  type="button"
                                  onClick={() => setBarrierOffset(off)}
                                  className={`py-1 text-center font-mono font-bold text-xs rounded transition-all cursor-pointer ${
                                    barrierOffset === off
                                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                      : 'bg-slate-900 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  ±${off.toFixed(2)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => executeSpotTrade('touch')}
                              className="group rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] active:scale-[0.98] text-white p-3 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-emerald-500/40"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-black text-xs uppercase tracking-wider">
                                  TOUCH BARRIER ★
                                </span>
                                <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                  +140%
                                </span>
                              </div>
                              <span className="text-[8px] opacity-75 mt-1 block">Hits barrier anytime = WIN</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => executeSpotTrade('no-touch')}
                              className="group rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] active:scale-[0.98] text-white p-3 shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between text-left border border-rose-500/40"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-black text-xs uppercase tracking-wider">
                                  NO TOUCH ✖
                                </span>
                                <span className="text-[9px] font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                                  +85%
                                </span>
                              </div>
                              <span className="text-[8px] opacity-75 mt-1 block">Never touches barrier = WIN</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* QUICK 1-CLICK REPETITION / MARTINGALE BAR */}
                      {lastTradeConfig && (
                        <div className="pt-2 border-t border-slate-900/60 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRepeatLastTrade(1)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                            title="Repeat previous trade with 1 click"
                          >
                            <span>↺ Repeat Last (${lastTradeConfig.stake.toFixed(2)})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRepeatLastTrade(2)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-black transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                            title="Double stake (Martingale recovery)"
                          >
                            <span>⚡ 2x Double (${(lastTradeConfig.stake * 2).toFixed(2)})</span>
                          </button>
                        </div>
                      )}

                      {/* Secondary Confirmation Strip (When 1-click is OFF) */}
                      {!oneClickTrading && (
                        <button
                          type="button"
                          onClick={() => executeSpotTrade(selectedBinaryDirection)}
                          className="w-full py-2 px-3 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60 hover:bg-slate-900 hover:text-white border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                        >
                          <span>CONFIRM SELECTED {selectedBinaryDirection.toUpperCase()} (${(parseFloat(spotAmountUsd) || parseFloat(spotAmount) || 10).toFixed(2)})</span>
                          <span>{selectedBinaryDirection === 'call' ? '▲' : '▼'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Account info section inside box bottom */}
                <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-400 font-mono items-center shrink-0">
                  <div className="flex flex-col">
                    <span>Balance: ${formatBalance(account.balance)}</span>
                    <span className="text-emerald-450">Available: ${formatBalance(freeBalance)}</span>
                  </div>
                  {activeContracts.length > 0 && (
                    <div className="text-right">
                      <span className="text-amber-500 font-semibold">{activeContracts.length} Active Deals</span>
                      <span className="block text-[8px] text-slate-500">Locked: ${formatBalance(activeStakes)}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Quick Balance Header & Open Positions, Statements, Metrics & Stats terminal spreading to both ends */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} space-y-4 mt-5`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 rounded-lg bg-slate-900/15 dark:bg-slate-950/45 border border-slate-150 dark:border-slate-850 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block font-mono">Live Account Wallet Balance</span>
                    <span className="text-lg md:text-xl font-mono font-black text-amber-500 leading-none">${formatBalance(account.balance)} <span className="text-[10px] text-slate-400 font-normal">USDT</span></span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-10 text-left font-mono w-full md:w-auto">
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Available</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-500 dark:text-emerald-400 leading-none">${formatBalance(freeBalance)}</span>
                  </div>
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Active Deals</span>
                    <span className="text-xs sm:text-sm font-extrabold text-amber-550 leading-none">{activeContracts.length} Open</span>
                  </div>
                  <div className="border-l border-slate-250 dark:border-slate-800/85 pl-2 sm:pl-3.5">
                    <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold block leading-none mb-1">Locked</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-450 leading-none">${formatBalance(activeStakes)}</span>
                  </div>
                </div>
              </div>

              <div className="tour-positions flex flex-col flex-1 mt-4 md:mt-0 col-span-12 relative shadow-lg">
                <PositionsList 
                  theme={theme}
                  activeContracts={activeContracts}
                  closedContracts={tradeHistory}
                  onSellContract={handleSellContractEarly}
                  activeTab={positionsTab}
                  onChangeTab={handlePositionsTabChange}
                  cashoutMode={(gameSettings as any)?.cashoutMode || 'enabled'}
                  pendingLimitOrders={pendingLimitOrders}
                  onCancelPendingOrder={handleCancelPendingLimitOrder}
                />
              </div>
            </div>
          </div>
          
          {/* RIGHT COLUMN (Order Book, Markets search list, Wallet Pie, Bot config, News) */}
          {/* ===================================================== */}
          <div className="w-full xl:w-96 shrink-0 flex flex-col space-y-5">
            
            {/* Split Panel: Order Book (Left) Markets Search Table (Right) */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-200'} flex flex-col space-y-4`}>
              
              <div className="flex border-b border-slate-900 pb-2.5 justify-between items-center text-xs font-bold uppercase tracking-wider select-none">
                <span className="text-white">Live Operations Desk</span>
                <span className="text-slate-500 text-[10px] font-mono lowercase">0.01 accuracy</span>
              </div>

              {/* Split layout inside desk container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visual Order Book Pane */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wider">Dynamic Order Book</span>
                  
                  {/* Asks (Sell, Red) */}
                  <div className="space-y-0.5 font-mono text-[10px]">
                    {askRows.map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center hover:bg-slate-900/30 px-1 py-0.5 rounded">
                        <span className="text-rose-500 font-bold">{row?.price?.toFixed(activeAsset?.decimals > 2 ? 4 : 2) ?? '0.00'}</span>
                        <span className="text-slate-400 text-right">{row?.quantity?.toFixed(2) ?? '0.00'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Spread indicator central display */}
                  <div className="border-t border-b border-slate-900 py-1 flex flex-col items-center select-none bg-slate-900/10">
                    <span className="text-xs font-black text-emerald-500 font-mono tracking-tighter">
                      ${activeAsset?.price?.toFixed(activeAsset?.decimals ?? 2) ?? '0.00'}
                    </span>
                    <span className="text-[8px] text-slate-500 tracking-wider">Spread 0.05 (USD Conversion)</span>
                  </div>

                  {/* Bids (Buy, Green) */}
                  <div className="space-y-0.5 font-mono text-[10px]">
                    {bidRows.map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center hover:bg-slate-900/30 px-1 py-0.5 rounded">
                        <span className="text-emerald-500 font-bold">{row?.price?.toFixed(activeAsset?.decimals > 2 ? 4 : 2) ?? '0.00'}</span>
                        <span className="text-slate-400 text-right">{row?.quantity?.toFixed(2) ?? '0.00'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dual ratio gauge bar */}
                  <div className="pt-2 font-mono text-[8px] text-slate-500 flex flex-col space-y-1">
                    <div className="flex justify-between">
                      <span>Bids 51.4%</span>
                      <span>Asks 48.6%</span>
                    </div>
                    <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-slate-900">
                      <div className="bg-emerald-500 h-full" style={{ width: '51.4%' }} />
                      <div className="bg-rose-500 h-full" style={{ width: '48.6%' }} />
                    </div>
                  </div>
                </div>

                {/* Markets Selection List Table */}
                <div className="space-y-2 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-black block uppercase tracking-wider">Market Search</span>
                  </div>
                  
                  {/* Category selectors */}
                  <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded bg-slate-900 text-[8px] font-black uppercase tracking-tighter leading-none select-none">
                    <button 
                      onClick={() => setSelectedMarketTab('indices')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'indices' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Idx
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('usdt')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'usdt' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      U-S
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('btc')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'btc' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Crp
                    </button>
                    <button 
                      onClick={() => setSelectedMarketTab('favorites')}
                      className={`py-1 rounded text-center ${selectedMarketTab === 'favorites' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'}`}
                    >
                      Fav
                    </button>
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search coins..." 
                      value={marketSearchText}
                      onChange={(e) => setMarketSearchText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-900 focus:outline-none rounded text-[10px] px-2 py-1 font-mono text-white placeholder-slate-500 focus:border-slate-800"
                    />
                    <Search className="w-3 h-3 text-slate-500 absolute right-2 top-1.5 pointer-events-none" />
                  </div>

                  {/* Coins list scrollport */}
                  <div className="flex-1 overflow-y-auto max-h-52 space-y-1 pr-1 scrollbar-thin">
                    {filteredRegistry.map((item) => {
                      const selected = item.id === activeAsset.id;
                      const star = starredMarkets.includes(item.id);
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setActiveAsset(item)}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                            selected ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-900/30 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <button onClick={(e) => toggleStarMarket(item.id, e)} className="text-slate-600 hover:text-amber-400 focus:outline-none">
                              <Star className={`w-3.5 h-3.5 ${star ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                            <span className="font-mono text-[10px] text-slate-200">{item.symbol}</span>
                          </div>
                          <div className="text-right font-mono text-[9px] -space-y-0.5">
                            <div className="text-slate-300 font-extrabold leading-none">{item?.price?.toFixed(item?.decimals > 2 ? 4 : 2) ?? '0.00'}</div>
                            <div className={item?.change >= 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                              {item?.change !== undefined ? (item.change >= 0 ? '+' : '') + item.change.toFixed(1) + '%' : '0.0%'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Assets list holdings & Donut Allocations panel */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-905' : 'bg-white border-slate-200'} space-y-4 flex flex-col`}>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider border-b border-slate-900 pb-2">
                <span className="text-white">Assets Breakdown</span>
              </div>

              {/* Elegant SVG donut visual with legends side-by-side */}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="relative flex items-center justify-center">
                  {/* SVG circular overlay representing allocation bands */}
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Ring 1 base */}
                    <circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                    {/* Segment 1: USDT (45%) */}
                    <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="131.285" fill="transparent" />
                    {/* Segment 2: BTC (28%) */}
                    <circle cx="50" cy="50" r="38" stroke="#f59e0b" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="198.12" fill="transparent" />
                    {/* Segment 3: ETH (15%) */}
                    <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="212" fill="transparent" />
                    {/* Segment 4: Others (12%) */}
                    <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="10" 
                      strokeDasharray="238.7" strokeDashoffset="228.8" fill="transparent" />
                  </svg>
                  <div className="absolute text-center select-none font-mono -space-y-0.5">
                    <div className="text-slate-400 text-[8px] font-black uppercase">PORTFOLIO</div>
                    <div className="text-[10px] font-black text-white leading-none">REAL</div>
                  </div>
                </div>

                {/* Legends */}
                <div className="flex-1 space-y-1.5 font-mono text-[9px] text-slate-450 uppercase select-none">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 block" /> USDT (45.3%)</span>
                    <span className="font-bold text-slate-300">$11,637</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 block" /> BTC (28.1%)</span>
                    <span className="font-bold text-slate-300">$7,215</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 block" /> ETH (15.2%)</span>
                    <span className="font-bold text-slate-300">$3,903</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500 block" /> OTHERS (11.3%)</span>
                    <span className="font-bold text-slate-300">$2,923</span>
                  </div>
                </div>
              </div>

               <div className="grid grid-cols-3 gap-2">
                 <button 
                   onClick={() => handleOpenCashierWithTab('deposit')}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Deposit
                 </button>
                 <button 
                   onClick={() => handleOpenCashierWithTab('withdraw')}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Withdraw
                 </button>
                 <button 
                   onClick={() => triggerToast("Transfer sandbox loading...", true)}
                   className="border border-slate-905 hover:bg-slate-900 border-dashed rounded text-[9px] font-bold text-slate-350 py-1.5 text-center uppercase cursor-pointer"
                 >
                   Transfer
                 </button>
               </div>
            </div>

            {/* AI Grid Trading Bot Promo Card Banner */}
            <div className="p-5 rounded-xl bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-slate-950 border border-purple-500/10 shadow-xl space-y-4 flex flex-col relative overflow-hidden group select-none">
              <div className="absolute right-2 -bottom-2 w-24 h-24 opacity-10 pointer-events-none group-hover:scale-105 transition-transform">
                {/* Visual SVG robot outline coordinates */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2V6M12 18V22M4 12H1M23 12H20M5.6 5.6L3.5 3.5M20.5 20.5L18.4 18.4M5.6 18.4L3.5 20.5M20.5 3.5L18.4 5.6" />
                  <circle cx="12" cy="12" r="6" />
                </svg>
              </div>

              <div>
                <span className="inline-flex items-center space-x-1.5 bg-purple-500/25 border border-purple-500/30 text-purple-300 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider block w-max">
                  <Bot className="w-3 h-3 animate-spin text-purple-400" />
                  <span>KNEX AI Copilot</span>
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wide mt-2">SMART TRADING SIGNALS</h3>
                <p className="text-[10px] text-slate-400 mt-1">Get real-time insights, algorithmic strategies, and consult your dedicated quant bot.</p>
              </div>

              <button 
                onClick={() => setIsCopilotOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 hover:border-indigo-400 font-extrabold text-white text-[10px] uppercase py-2 tracking-wider rounded transition-all text-center select-none shadow-[0_4px_12px_rgba(79,70,229,0.3)] animate-pulse"
              >
                Access KNEX Copilot
              </button>
            </div>

            {/* Live Market News Streams */}
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-900' : 'bg-white border-slate-205'} space-y-4 flex flex-col`}>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider border-b border-slate-900 pb-2">
                <span className="text-white">Live Cryptosphere News</span>
              </div>

              <div className="space-y-3.5 select-none font-sans text-xs">
                {[
                  {
                    id: 1,
                    title: "Bitcoin Options Spot Volatility Peeks High at $68,000 Expiring Contracts",
                    time: "2 min ago",
                    opinion: "Bitcoin's spot price hover is ideal for Digit Over/Under execution. Arbitrage indices recommend options with 15 Ticks targets."
                  },
                  {
                    id: 2,
                    title: "MFLOW Index Breakout Coordinates Signal Consolidation Mode",
                    time: "15 min ago",
                    opinion: "The moving average shows MFLOW is approaching immediate support levels. Try purchasing Rise options at touch bounds."
                  },
                  {
                    id: 3,
                    title: "KNEX Certified as Secure Institutional High-Frequency Derivatives Outlet",
                    time: "1 hour ago",
                    opinion: "Corporate licensing has authorized secure fast-walk smart indexes on the main catalog. Stable connections and real-time ledger verify real security."
                  }
                ].map((news) => (
                  <div 
                    key={news.id}
                    onClick={() => setNewsDetail(news)}
                    className="hover:bg-slate-900/30 p-2.5 rounded-lg border border-transparent hover:border-slate-900 transition-all cursor-pointer space-y-1 block -mx-2.5"
                  >
                    <div className="flex justify-between items-center text-[9px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono uppercase font-black"><BadgeAlert className="w-3 h-3 text-amber-500" /> NEWS ALERTER</span>
                      <span className="font-mono">{news.time}</span>
                    </div>
                    <p className="text-[11px] font-bold leading-snug text-slate-200 hover:text-white line-clamp-2">{news.title}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1 block leading-normal">{news.opinion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Interactive Alerts component */}
            <PriceAlertsManager 
              theme={theme}
              activeAsset={activeAsset}
              assetsRegistry={assetsRegistry}
              priceAlerts={priceAlerts}
              onAddAlert={handleAddPriceAlert}
              onDeleteAlert={handleDeletePriceAlert}
            />

          </div>

        </div>
        )}

        {/* ========================================================= */}
        {/* 2.4 SECURE DISH NEWS POPUP OVERLAYS */}
        {/* ========================================================= */}
        {newsDetail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative transform scale-100 transition-all">
              <button 
                onClick={() => setNewsDetail(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2 text-[10px] text-amber-500 font-mono tracking-wider font-extrabold uppercase">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>KNEX Market Commentary</span>
              </div>

              <h4 className="text-sm font-extrabold text-white leading-snug">{newsDetail.title}</h4>

              <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-300 leading-relaxed font-mono border border-slate-850 space-y-2">
                <span className="font-black text-emerald-500 block uppercase text-[10px]">KNEX AI Analysis:</span>
                <p>{newsDetail.opinion}</p>
                <p className="text-[9px] text-slate-400">Disclaimer: Esoteric mathematical models exhibit drift variance. Ensure proper stake bounds on binary option contracts.</p>
              </div>

              <button 
                onClick={() => { setNewsDetail(null); setIsCopilotOpen(true); }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase py-2 rounded transition-colors text-center block"
              >
                Ask KNEX Copilot
              </button>
            </div>
          </div>
        )}

        </div>

        {/* ======================================================== */}
        {/* 2.5 CLIENT-SIDE FOOTER SECTION (Matches Platform Constraints) */}
        {/* ======================================================== */}
        <footer className={`h-11 border-t text-[10px] font-mono flex items-center justify-between px-6 select-none shrink-0 transition-colors ${
          theme === 'dark' ? 'border-slate-900 bg-slate-950 text-slate-500' : 'border-gray-200 bg-white text-gray-450'
        }`}>
          <div className="flex items-center space-x-4">
            <span>© 2026 KNEX INC.</span>
            <span className="hidden md:inline text-slate-650">•</span>
            <span className="hidden md:inline">Terms of Services</span>
            <span className="hidden md:inline">Privacy Protocol</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[9px] font-bold text-amber-500/80">
            <Shield className="w-3.5 h-3.5" />
            <span>INSTITUTIONALLY LICENSED BY DERIV INDEX GATEWAY</span>
          </div>
        </footer>

      </div>

      {/* FLOAT COPILOT AI OVERLAY TRIGGER BTN */}
      {!isCopilotOpen && (
        <button 
          onClick={() => setIsCopilotOpen(true)}
          className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
            isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          title="Ask KNEX Copilot for market reports"
        >
          <Bot className="h-6 h-6 animate-pulse" />
        </button>
      )}

      {/* ============================================== */}
      {/* 4. MODALS & CO-PILOT SLIDERS */}
      {/* ============================================== */}
      <Suspense fallback={null}>
        <WizardBot 
          theme={theme}
          asset={activeAsset}
          tickHistory={activeTicks}
          indicatorConfig={indicatorConfig}
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          currentUser={currentUser}
          tradeHistory={tradeHistory}
          onTriggerAuth={handleTriggerAuth}
          triggerToast={triggerToast}
        />
      </Suspense>

      <CashierModal 
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        account={account}
        onDeposit={handleDepositCashier}
        onWithdraw={handleWithdrawCashier}
        currentUser={currentUser}
        theme={theme}
        gameSettings={gameSettings}
      />

      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        triggerToast={triggerToast}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        account={account}
        theme={theme}
        currentUser={currentUser}
        onUpdateUser={handleUserUpdate}
        onLogout={handleLogout}
        tradeHistory={tradeHistory}
      />

      <InviteModal 
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        currentUser={currentUser}
        theme={theme}
        triggerToast={triggerToast}
        onOpenMarketing={() => setIsMarketingOpen(true)}
      />

      <MarketingHub
        isOpen={isMarketingOpen}
        onClose={() => setIsMarketingOpen(false)}
        theme={theme}
        triggerToast={triggerToast}
        referralCode={currentUser?.referralCode || currentUser?.fullName || 'KNEXVIP'}
      />

      <TradeValidationChecklistModal
        isOpen={showValidationChecklist}
        onClose={() => setShowValidationChecklist(false)}
        activeAsset={activeAsset}
        activeContracts={activeContracts}
        freeBalance={freeBalance}
        totalBalance={account.balance}
        payoutRate={gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5}
        theme={theme}
      />

      {/* APK Feature Modal */}
      {showApkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className={`bg-slate-900 border ${isDark ? 'border-cyan-500/30' : 'border-slate-300'} p-6 rounded-xl max-w-sm w-full shadow-2xl relative overflow-hidden`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
              <button className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors" onClick={() => setShowApkModal(false)}>
                 <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4 mt-2">
                 <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30">
                    <Download className="w-6 h-6 text-cyan-400" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-white leading-tight uppercase tracking-wide">Mobile App</h2>
                    <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Encrypted • Real-time</p>
                 </div>
              </div>

              <p className="text-sm text-slate-300 mb-4 font-mono leading-relaxed">
                Download the highly optimized Android mobile application. Hardened with anti-reverse engineering protocols and real-time OTA (Over-The-Air) feature updates.
              </p>
              
              <div className="bg-slate-950 p-3 shadow-inner border border-slate-800 rounded mb-5 font-mono text-[9px] sm:text-[10px] text-emerald-400 space-y-1">
                 <div className="flex justify-between items-center"><span>[SYS] Codec:</span> <span className="text-slate-300">AES-256 Enabled</span></div>
                 <div className="flex justify-between items-center"><span>[SYS] Anti-Tamper:</span> <span className="text-slate-300">Active</span></div>
                 <div className="flex justify-between items-center"><span>[SYS] Auto-Update:</span> <span className="text-slate-300">Enforced</span></div>
              </div>

              <button 
                onClick={() => {
                   triggerToast('Initiating secure encrypted tunnel for APK download...', true);
                   setTimeout(() => {
                      triggerToast('Download packaged for your device architecture.', true);
                      setShowApkModal(false);
                   }, 2000);
                }} 
                className="w-full bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 font-black tracking-wider py-3.5 rounded shadow-lg shadow-cyan-500/20 uppercase transition-all"
              >
                COMPILE & DOWNLOAD
              </button>
           </div>
        </div>
      )}

      {/* QUICK QUICK-ORDER MODAL (TRIGGERED BY CHART CLICK) */}
      {quickOrderPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-5 sm:p-6 rounded-xl max-w-sm w-full shadow-2xl relative shadow-slate-900">
            <button className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors" onClick={() => setQuickOrderPrompt(null)}>
               <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
               <Activity className="w-5 h-5 text-amber-500" />
               Pending Trigger
            </h2>
            <p className="text-xs text-slate-300 mb-5">Set an automatic limit execution. The trade triggers instantly once market touches exactly <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded">${(quickOrderPrompt?.price ?? 0).toFixed(activeAsset?.decimals ?? 2)}</span>.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setSpotPriceLimit(quickOrderPrompt.price);
                  setSpotType('limit');
                  // To be safe we let them adjust sizes before firing directly, OR we fire right away.
                  // The prompt asks them to be prompted to buy/sell within the set time. We will execute it using the existing states (spotAmount etc).
                  executeSpotTrade('sell');
                  setQuickOrderPrompt(null);
                }}
                className="w-full bg-[#f23645] hover:bg-[#d92c3a] active:scale-95 text-white font-black py-4 rounded-lg shadow-lg shadow-rose-500/20 uppercase transition-all whitespace-nowrap text-xs flex flex-col items-center justify-center gap-1 leading-none"
              >
                <span>PUT / DOWN ▼</span>
                <span className="font-mono text-[9px] opacity-80">(Lower)</span>
              </button>
              
              <button 
                onClick={() => {
                  setSpotPriceLimit(quickOrderPrompt.price);
                  setSpotType('limit');
                  executeSpotTrade('buy');
                  setQuickOrderPrompt(null);
                }}
                className="w-full bg-[#089981] hover:bg-[#07806f] active:scale-95 text-white font-black py-4 rounded-lg shadow-lg shadow-emerald-500/20 uppercase transition-all whitespace-nowrap text-xs flex flex-col items-center justify-center gap-1 leading-none"
              >
                <span>CALL / UP ▲</span>
                <span className="font-mono text-[9px] opacity-80">(Higher)</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-500 font-mono mt-4 uppercase">Uses Current Set Total: {formattedUsdValue} USD</p>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        theme={theme}
        onSuccess={handleUserUpdate}
        initialView={authModalInitialView}
      />

      <AdminErrorBoundary theme={theme} onReset={() => setIsAdminOpen(true)}>
        <AdminDashboard 
          isOpen={isAdminOpen}
          onClose={handleCloseAdmin}
          theme={theme}
          triggerToast={triggerToast}
          isDirectRoute={isDirectAdminUrl()}
        />
      </AdminErrorBoundary>

      <WelcomeModal 
        isOpen={isWelcomeModalOpen} 
        onClose={() => setIsWelcomeModalOpen(false)} 
      />

      <SessionTimeoutModal
        isOpen={isSessionTimeoutOpen}
        secondsRemaining={sessionSecondsRemaining}
        onKeepAlive={handleKeepAlive}
        onClearSession={handleExpireSession}
        theme={theme}
      />

      {/* BINARY TRADE SETTLEMENT RESULT MODAL */}
      {latestSettlement && (
        <div 
          onClick={() => setLatestSettlement(null)}
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`cursor-default p-6 rounded-2xl max-w-md w-full border shadow-2xl transition-all ${
            latestSettlement.status === 'won'
              ? 'bg-slate-900 border-emerald-500/50 shadow-emerald-500/20'
              : latestSettlement.status === 'draw'
              ? 'bg-slate-900 border-amber-500/50 shadow-amber-500/20'
              : 'bg-slate-900 border-rose-500/50 shadow-rose-500/20'
          }`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
                  Official Trade Settlement
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{latestSettlement.assetName}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                    {latestSettlement.direction}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setLatestSettlement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* RESULT BADGE */}
            <div className={`p-4 rounded-xl text-center mb-4 border ${
              latestSettlement.status === 'won'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : latestSettlement.status === 'draw'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
            }`}>
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold block mb-0.5 text-slate-400">
                Settlement Outcome
              </span>
              <div className="text-3xl font-black tracking-tight flex items-center justify-center gap-2">
                {latestSettlement.status === 'won' && <span>WIN 🎉</span>}
                {latestSettlement.status === 'lost' && <span>LOSS</span>}
                {latestSettlement.status === 'draw' && <span>DRAW / TIE</span>}
                {latestSettlement.status === 'sold' && <span>EARLY EXIT</span>}
              </div>
              <span className="text-[11px] font-mono opacity-90 mt-1 block">
                Trade Status: <strong className="font-extrabold uppercase text-white">SETTLED</strong>
              </span>
            </div>

            {/* PRICE COMPARISON SECTION */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2 mb-4 font-mono text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex justify-between">
                <span>Compare Prices</span>
                <span className="text-amber-400">Captured at Expiry</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Captured Entry Price:</span>
                  <span className="text-sm font-bold text-white">
                    ${(latestSettlement.entryPrice ?? 0).toFixed(latestSettlement.decimals ?? 2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Official Expiry Price:</span>
                  <span className={`text-sm font-bold ${
                    (latestSettlement.exitPrice ?? 0) > (latestSettlement.entryPrice ?? 0)
                      ? 'text-emerald-400'
                      : (latestSettlement.exitPrice ?? 0) < (latestSettlement.entryPrice ?? 0)
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    ${(latestSettlement.exitPrice ?? 0).toFixed(latestSettlement.decimals ?? 2)}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-center text-slate-300 font-mono">
                {(() => {
                  const dec = latestSettlement.decimals ?? 2;
                  const entryStr = (latestSettlement.entryPrice ?? 0).toFixed(dec);
                  const exitStr = (latestSettlement.exitPrice ?? 0).toFixed(dec);
                  const isCall = (latestSettlement.direction ?? '').includes('CALL') || (latestSettlement.direction ?? '').includes('UP');
                  const exitP = latestSettlement.exitPrice ?? 0;
                  const entryP = latestSettlement.entryPrice ?? 0;
                  if (isCall) {
                    if (exitP > entryP) return `Expiry ($${exitStr}) > Entry ($${entryStr}) = WIN`;
                    if (exitP < entryP) return `Expiry ($${exitStr}) < Entry ($${entryStr}) = LOSS`;
                    return `Expiry ($${exitStr}) == Entry ($${entryStr}) = DRAW`;
                  } else {
                    if (exitP < entryP) return `Expiry ($${exitStr}) < Entry ($${entryStr}) = WIN`;
                    if (exitP > entryP) return `Expiry ($${exitStr}) > Entry ($${entryStr}) = LOSS`;
                    return `Expiry ($${exitStr}) == Entry ($${entryStr}) = DRAW`;
                  }
                })()}
              </div>
            </div>

            {/* FINANCIAL SETTLEMENT BREAKDOWN */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2 mb-5 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Locked Stake:</span>
                <span className="text-white font-bold">${(latestSettlement.stake ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Settlement Payout:</span>
                <span className={`font-bold ${(latestSettlement.payout ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  ${(latestSettlement.payout ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm">
                <span>Net Profit:</span>
                <span className={(latestSettlement.profit ?? 0) > 0 ? 'text-emerald-400' : (latestSettlement.profit ?? 0) < 0 ? 'text-rose-400' : 'text-amber-400'}>
                  {(latestSettlement.profit ?? 0) > 0 ? '+' : ''}${(latestSettlement.profit ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-900">
                ✓ Wallet balance updated &amp; ledger synchronized
              </div>
            </div>

            {/* QUICK RETRY & 1-CLICK ACTIONS */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => {
                  setLatestSettlement(null);
                  handleRepeatLastTrade(1);
                }}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1 active:scale-95"
                title="Repeat the exact same trade with 1 click (Space)"
              >
                <span>↺ Repeat (${(latestSettlement.stake ?? 10).toFixed(2)})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLatestSettlement(null);
                  handleRepeatLastTrade(2);
                }}
                className="py-2 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center gap-1 active:scale-95"
                title="Double stake (Martingale recovery) (D)"
              >
                <span>⚡ 2x (${((latestSettlement.stake ?? 10) * 2).toFixed(2)})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLatestSettlement(null);
                  handleRepeatLastTrade(1, true);
                }}
                className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1 active:scale-95"
                title="Flip to opposite direction"
              >
                <span>⇄ Flip Dir</span>
              </button>
            </div>

            <button
              onClick={() => setLatestSettlement(null)}
              className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-black text-xs uppercase tracking-wider transition-all cursor-pointer border border-amber-500/30 text-center"
            >
              Continue Trading (Esc)
            </button>

            {/* Auto dismiss countdown toggle */}
            <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDismissSettlement}
                  onChange={(e) => setAutoDismissSettlement(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <span>Auto-dismiss in 3s for fast trading</span>
              </label>
              {autoDismissSettlement && (
                <span className="text-amber-400 font-bold text-[9px] animate-pulse">Closing soon...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRADING KEYBOARD SHORTCUTS CHEATSHEET MODAL */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-2xl max-w-md w-full border border-slate-800 bg-slate-900 shadow-2xl text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-sm">
                  ⌨
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Trading Hotkeys</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Lightning-fast trade execution</span>
                </div>
              </div>
              <button
                onClick={() => setShowHotkeysModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Buy CALL / UP</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-black">W or ↑</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Buy PUT / DOWN</span>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-black">S or ↓</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Repeat Last Trade</span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-black">Spacebar</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Double Stake (2x Martingale)</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">D</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Halve Stake (½)</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">H</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Max Available Balance</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">M</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Cash Out Running Contract</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">C</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Quick Stakes ($5, $10, $25, $50, $100)</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">1 to 5</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-300">Close Settlement / Modals</span>
                <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-black">Esc</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">Hotkeys Active:</span>
              <button
                type="button"
                onClick={() => setHotkeysEnabled(!hotkeysEnabled)}
                className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer border ${
                  hotkeysEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {hotkeysEnabled ? '✓ Enabled' : '✗ Disabled'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowHotkeysModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md text-center"
            >
              Done / Got It
            </button>
          </div>
        </div>
      )}

      {/* AUTO-UPDATE NOTIFICATION BANNER */}
      {showUpdatePrompt && (
        <div className="fixed bottom-6 right-6 z-[120] max-w-sm w-full p-4 rounded-xl border border-amber-500/30 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl shadow-amber-500/10 flex items-start gap-3.5 animate-bounce-short">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Update Available</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-sans">
              We've deployed new trading engine updates and performance optimizations. Keep your features current!
            </p>
            <div className="flex gap-2.5 mt-3">
              <button
                onClick={() => {
                  if (swRegistration && swRegistration.waiting) {
                    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    window.location.reload();
                  }
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-md shadow-md shadow-amber-500/15 transition-all text-center select-none cursor-pointer"
              >
                Refresh Now
              </button>
              <button
                onClick={() => setShowUpdatePrompt(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white font-semibold text-[10px] uppercase tracking-wider rounded-md transition-all text-center select-none cursor-pointer border border-slate-700"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href="https://chat.whatsapp.com/FA32GpUv1OyES3AYFidIKw?s=cl&p=a&mlu=1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-6 z-[110] bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg shadow-green-500/20 transition-all active:scale-95 animate-pulse"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* PRO SUITE INTERACTIVE PLAY GRID MODAL */}
      <ProPlayGridModal
        contractType={proPlayGridModal}
        isOpen={proPlayGridModal !== null}
        onClose={() => setProPlayGridModal(null)}
        activeAsset={activeAsset}
        assetsTicksMap={assetsTicksMap}
        spotAmountUsd={spotAmountUsd}
        handleUsdChange={handleUsdChange}
        spotDuration={spotDuration}
        setSpotDuration={setSpotDuration}
        spotDurationUnit={spotDurationUnit}
        setSpotDurationUnit={setSpotDurationUnit}
        targetDigit={targetDigit}
        setTargetDigit={setTargetDigit}
        barrierOffset={barrierOffset}
        setBarrierOffset={setBarrierOffset}
        executeSpotTrade={(dir, stake, type, dur, unit, digit, barrier) => {
          executeSpotTrade(dir, stake, type, dur, unit, digit, barrier);
        }}
        freeBalance={freeBalance}
        gameSettings={gameSettings}
        activeContracts={activeContracts}
        handleSellContractEarly={handleSellContractEarly}
        tradeHistory={tradeHistory}
        theme={theme}
      />

    </div>
  );
}

// Pro Suite Interactive Play Grid Component
function ProPlayGridModal({
  contractType,
  isOpen,
  onClose,
  activeAsset,
  assetsTicksMap,
  spotAmountUsd,
  handleUsdChange,
  spotDuration,
  setSpotDuration,
  spotDurationUnit,
  setSpotDurationUnit,
  targetDigit,
  setTargetDigit,
  barrierOffset,
  setBarrierOffset,
  executeSpotTrade,
  freeBalance,
  gameSettings,
  activeContracts,
  handleSellContractEarly,
  tradeHistory,
  theme
}: {
  contractType: ContractType | null;
  isOpen: boolean;
  onClose: () => void;
  activeAsset: any;
  assetsTicksMap: Record<string, any[]>;
  spotAmountUsd: string;
  handleUsdChange: (val: string) => void;
  spotDuration: number;
  setSpotDuration: React.Dispatch<React.SetStateAction<number>>;
  spotDurationUnit: 'ticks' | 'seconds' | 'minutes' | 'hours' | 'days';
  setSpotDurationUnit: (unit: any) => void;
  targetDigit: number;
  setTargetDigit: (d: number) => void;
  barrierOffset: number;
  setBarrierOffset: (o: number) => void;
  executeSpotTrade: (dir: any, stake?: number, type?: ContractType, dur?: number, unit?: any, digit?: number, barrier?: number) => void;
  freeBalance: number;
  gameSettings: any;
  activeContracts: any[];
  handleSellContractEarly: (id: string) => void;
  tradeHistory: any[];
  theme: string;
}) {
  if (!isOpen || !contractType) return null;

  const currentTicks = activeAsset ? (assetsTicksMap[activeAsset.id] || []) : [];
  const latestPrice = currentTicks[currentTicks.length - 1]?.price || activeAsset?.price || 100;
  const stakeNum = parseFloat(spotAmountUsd) || 10;
  const ratePct = contractType === 'digit-over-under' ? 90 : contractType === 'touch-no-touch' ? 140 : (gameSettings?.payoutRate !== undefined ? gameSettings.payoutRate : 95.5);
  const profitAmt = stakeNum * (ratePct / 100);
  const payoutAmt = stakeNum + profitAmt;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/40 p-5 rounded-2xl max-w-lg w-full shadow-2xl relative overflow-hidden text-white font-mono space-y-4">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500"></div>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-base">
              {contractType === 'rise-fall' ? '⚡' : contractType === 'digit-over-under' ? '🔢' : '🎯'}
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {contractType === 'rise-fall' ? 'Pro Suite: Rise / Fall Grid' : contractType === 'digit-over-under' ? 'Pro Suite: Digits 0-9 Grid' : 'Pro Suite: Barrier Touch Grid'}
              </h3>
              <span className="text-[10px] text-amber-400 font-bold">
                {activeAsset?.name} ({activeAsset?.symbol}) · Spot: ${latestPrice.toFixed(activeAsset?.decimals || 2)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
          >
            ✕ Exit
          </button>
        </div>

        {/* Instant Results & Active Trades Feed */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 max-h-36 overflow-y-auto">
          <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1">
            <span className="font-bold uppercase tracking-wider text-amber-400">⚡ Live Results &amp; Active Runs</span>
            <span>{activeContracts.length} Running | {tradeHistory.length} Settled</span>
          </div>

          {activeContracts.length > 0 && (
            <div className="space-y-1">
              {activeContracts.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-[9px] bg-amber-500/10 border border-amber-500/30 p-1.5 rounded text-amber-300">
                  <span>{c.assetName} ({c.direction.toUpperCase()}) - Stake: ${c.stake}</span>
                  <span className="animate-pulse font-bold">RUNNING...</span>
                </div>
              ))}
            </div>
          )}

          {tradeHistory.length > 0 ? (
            <div className="space-y-1">
              {tradeHistory.slice(0, 3).map((item: any) => (
                <div key={item.id} className={`flex justify-between items-center text-[9px] p-1.5 rounded border ${
                  item.status === 'won' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' :
                  item.status === 'draw' ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' :
                  'bg-rose-950/40 text-rose-400 border-rose-500/30'
                }`}>
                  <span className="font-bold">{item.assetName} · {item.direction.toUpperCase()} (${item.stake})</span>
                  <span className="font-black uppercase">
                    {item.status === 'won' ? `+${(item.profit || 0).toFixed(2)} ✓ WON` : item.status === 'draw' ? 'DRAW (Refund)' : `-${item.stake.toFixed(2)} ✗ LOST`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[9px] text-slate-500 text-center py-1">No settled trades yet. Click play above!</div>
          )}
        </div>

        {/* Live Sparkline / Ticker Box */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Live Ticks Stream ({currentTicks.length} samples)</span>
            <span className="text-emerald-400 font-bold">● Active Stream</span>
          </div>
          <div className="h-14 flex items-end gap-1 pt-2 border-t border-slate-900">
            {currentTicks.slice(-20).map((t: any, idx: number, arr: any[]) => {
              const minP = Math.min(...arr.map(x => x.price));
              const maxP = Math.max(...arr.map(x => x.price));
              const range = maxP - minP || 1;
              const hPct = Math.max(15, Math.min(100, ((t.price - minP) / range) * 100));
              const isUp = idx > 0 && t.price >= arr[idx - 1].price;
              return (
                <div
                  key={t.timestamp || idx}
                  className={`flex-1 rounded-t transition-all ${isUp ? 'bg-emerald-500/80' : 'bg-rose-500/80'}`}
                  style={{ height: `${hPct}%` }}
                  title={`$${t.price.toFixed(activeAsset?.decimals || 2)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Contract Specific Configuration inside Grid */}
        {contractType === 'digit-over-under' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Target Digit (0-9):</span>
              <span className="text-amber-400 font-black">Selected: {targetDigit}</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTargetDigit(d)}
                  className={`py-1.5 text-center font-mono font-black text-xs rounded transition-all cursor-pointer ${
                    targetDigit === d
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {contractType === 'touch-no-touch' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Barrier Offset:</span>
              <span className="text-amber-400 font-black">±${barrierOffset.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.5, 1.0, 2.5, 5.0].map((off) => (
                <button
                  key={off}
                  type="button"
                  onClick={() => setBarrierOffset(off)}
                  className={`py-1.5 text-center font-mono font-black text-xs rounded transition-all cursor-pointer ${
                    barrierOffset === off
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                      : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  ±${off.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stake & Duration Selector in Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase block">Stake ($)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
              <input
                type="number"
                min="1"
                max="5000"
                value={spotAmountUsd}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-6 pr-2 text-center font-mono font-black text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Expiry Duration</span>
              <span className="text-amber-400 font-bold">{spotDuration} {spotDurationUnit}</span>
            </div>
            {/* Quick Duration Chips */}
            <div className="grid grid-cols-6 gap-1">
              {[
                { label: '5s', dur: 5, unit: 'seconds' },
                { label: '15s', dur: 15, unit: 'seconds' },
                { label: '30s', dur: 30, unit: 'seconds' },
                { label: '1m', dur: 1, unit: 'minutes' },
                { label: '5t', dur: 5, unit: 'ticks' },
                { label: '10t', dur: 10, unit: 'ticks' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setSpotDuration(item.dur);
                    setSpotDurationUnit(item.unit as any);
                  }}
                  className={`py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center ${
                    spotDuration === item.dur && spotDurationUnit === item.unit
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 pt-1">
              <input
                type="number"
                min="1"
                max="300"
                value={spotDuration}
                onChange={(e) => setSpotDuration(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1.5 text-center font-mono font-black text-white focus:outline-none focus:border-amber-500"
              />
              <select
                value={spotDurationUnit}
                onChange={(e) => setSpotDurationUnit(e.target.value as any)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-1 text-[10px] font-mono font-bold text-amber-400 focus:outline-none"
              >
                <option value="ticks">Ticks</option>
                <option value="seconds">Sec</option>
                <option value="minutes">Min</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stake Preset Chips */}
        <div className="grid grid-cols-6 gap-1">
          {[5, 10, 25, 50, 100, 250].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleUsdChange(val.toString())}
              className={`py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                stakeNum === val
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              ${val}
            </button>
          ))}
        </div>

        {/* Play Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {contractType === 'rise-fall' && (
            <>
              <button
                type="button"
                onClick={() => executeSpotTrade('call', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] text-white p-3 font-black text-xs uppercase shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between border border-emerald-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>CALL / UP ▲</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+{ratePct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${payoutAmt.toFixed(2)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => executeSpotTrade('put', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] text-white p-3 font-black text-xs uppercase shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between border border-rose-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>PUT / DOWN ▼</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+{ratePct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${payoutAmt.toFixed(2)}
                </div>
              </button>
            </>
          )}

          {contractType === 'digit-over-under' && (
            <>
              <button
                type="button"
                onClick={() => executeSpotTrade('over', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] text-white p-3 font-black text-xs uppercase shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between border border-emerald-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>OVER &gt; {targetDigit} ▲</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+90%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${(stakeNum * 1.9).toFixed(2)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => executeSpotTrade('under', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] text-white p-3 font-black text-xs uppercase shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between border border-rose-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>UNDER &lt; {targetDigit} ▼</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+90%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${(stakeNum * 1.9).toFixed(2)}
                </div>
              </button>
            </>
          )}

          {contractType === 'touch-no-touch' && (
            <>
              <button
                type="button"
                onClick={() => executeSpotTrade('touch', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#089981] to-[#067a67] hover:from-[#0aa98f] hover:to-[#089981] text-white p-3 font-black text-xs uppercase shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex flex-col justify-between border border-emerald-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>TOUCH ▲</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+140%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${(stakeNum * 2.4).toFixed(2)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => executeSpotTrade('no-touch', stakeNum, contractType, spotDuration, spotDurationUnit, targetDigit, barrierOffset)}
                className="rounded-xl bg-gradient-to-b from-[#f23645] to-[#c92230] hover:from-[#f44754] hover:to-[#f23645] text-white p-3 font-black text-xs uppercase shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex flex-col justify-between border border-rose-500/40 active:scale-95"
              >
                <div className="flex justify-between items-center w-full">
                  <span>NO TOUCH ▼</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded">+140%</span>
                </div>
                <div className="mt-2 text-[10px] opacity-90 text-left font-mono">
                  Payout: ${(stakeNum * 2.4).toFixed(2)}
                </div>
              </button>
            </>
          )}
        </div>

        {/* Exit / Close Grid Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
        >
          <span>🚪 Exit Game &amp; Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
}

// Inline fallback icons for safety to avoid build crashes
function CoinsIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="8" cy="8" r="6" />
      <circle cx="18" cy="18" r="4" />
      <path d="M12 18a6 6 0 0 0-6-6" />
    </svg>
  );
}
