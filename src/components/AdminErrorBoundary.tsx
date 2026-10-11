import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home, KeyRound } from 'lucide-react';

interface Props {
  children: ReactNode;
  theme?: 'dark' | 'light';
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminDashboard encountered an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.removeItem('knex_admin_key');
      localStorage.removeItem('knex_admin_demo_enabled');
      localStorage.removeItem('knex_admin_real_enabled');
    } catch (e) {
      // ignore
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, document.title, '/');
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isDark = this.props.theme !== 'light';
      return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${
          isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
        }`}>
          <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Admin Console Diagnostic Mode</h3>
                <p className="text-xs text-slate-400">A display exception was safely trapped to prevent a blank screen.</p>
              </div>
            </div>

            {this.state.error && (
              <div className={`p-3 rounded-lg border font-mono text-xs overflow-x-auto ${
                isDark ? 'bg-slate-950/70 border-slate-800 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                <p className="font-bold">Error: {this.state.error.message || String(this.state.error)}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Reset Keys</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Exchange</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
