import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Copy, Laptop, Smartphone, Globe, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

interface SecuritySettingsProps {
  currentUser: any;
  isDark: boolean;
  onUpdateUser: (user: any) => void;
}

interface ActiveSession {
  sessionId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt?: string;
  isCurrent: boolean;
}

export default function SecuritySettings({ currentUser, isDark, onUpdateUser }: SecuritySettingsProps) {
  const [antiPhishingCode, setAntiPhishingCode] = useState(currentUser?.anti_phishing_code || '');
  const [twoFaQr, setTwoFaQr] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Active Sessions State
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('knex_token') || currentUser?.id || '';

  const fetchActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const saveAntiPhishing = async () => {
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/user/security/anti-phishing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify({ antiPhishingCode })
      });
      if (response.ok) setMessage('Anti-phishing code updated successfully!');
      else throw new Error('Failed to update anti-phishing code.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generate2Fa = async () => {
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/user/security/2fa/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setTwoFaQr(data.qrCode);
        setTwoFaSecret(data.secret);
      } else throw new Error(data.message || 'Failed to initialize 2FA.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const verify2Fa = async () => {
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/user/security/2fa/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${getAuthToken()}` 
        },
        body: JSON.stringify({ otp: otpInput })
      });
      const data = await response.json();
      if (data.success) {
        setMessage('2FA enabled successfully! Your account is now secured.');
        onUpdateUser({ ...currentUser, two_factor_enabled: 1 });
      } else throw new Error(data.message || 'Invalid 2FA code.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Session revoked successfully.');
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      } else {
        throw new Error(data.message || 'Failed to revoke session.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessage('All other active sessions have been terminated.');
        setSessions(prev => prev.filter(s => s.isCurrent));
      } else {
        throw new Error(data.message || 'Failed to revoke other sessions.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Anti-Phishing */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Anti-Phishing Security Phrase
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          This customized phrase will appear in official Knex notifications to verify authenticity.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={antiPhishingCode} 
            onChange={(e) => setAntiPhishingCode(e.target.value)} 
            className={`flex-1 p-2 rounded text-xs border ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-200 text-black'
            }`} 
            placeholder="e.g. My-Knex-Trading-Vault" 
          />
          <button 
            onClick={saveAntiPhishing} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Save Code
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" /> Two-Factor Authentication (2FA)
        </h3>
        {currentUser?.two_factor_enabled ? (
          <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" /> Two-Factor Authentication is active and protecting your login.
          </div>
        ) : (
          <>
            {!twoFaQr ? (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Protect your trading balance and withdrawals with Google Authenticator or standard TOTP app.
                </p>
                <button 
                  onClick={generate2Fa} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Configure 2FA
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/20 p-3 rounded-lg">
                  <img src={twoFaQr} alt="2FA QR Code" className="w-28 h-28 rounded bg-white p-1" />
                  <div className="text-xs space-y-1">
                    <p className="text-gray-400">Scan this QR code with Google Authenticator or Authy.</p>
                    <p className="font-mono text-[11px] text-yellow-400 select-all break-all">
                      Secret: {twoFaSecret}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={otpInput} 
                    onChange={(e) => setOtpInput(e.target.value)} 
                    className={`flex-1 p-2 rounded text-xs border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-200 text-black'
                    }`} 
                    placeholder="Enter 6-digit code from authenticator app" 
                  />
                  <button 
                    onClick={verify2Fa} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Verify & Enable
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Active Sessions Management */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Laptop className="h-4 w-4 text-sky-400" /> Active Devices & Sessions
            </h3>
            <p className="text-xs text-gray-500">
              Manage devices currently signed into your account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchActiveSessions}
              disabled={loadingSessions}
              className={`p-1.5 rounded text-xs border transition-colors cursor-pointer ${
                isDark ? 'border-zinc-700 text-zinc-400 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-black'
              }`}
              title="Refresh Sessions"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
            </button>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={revokeAllOtherSessions}
                className="text-[11px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
              >
                Log Out Other Devices
              </button>
            )}
          </div>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">
            {loadingSessions ? 'Loading active sessions...' : 'No other sessions found.'}
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const isMobile = s.userAgent.toLowerCase().includes('mobile') || s.userAgent.toLowerCase().includes('android') || s.userAgent.toLowerCase().includes('iphone');
              return (
                <div 
                  key={s.sessionId}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    s.isCurrent
                      ? isDark 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-emerald-200 bg-emerald-50/50'
                      : isDark
                        ? 'border-zinc-800 bg-zinc-900/50'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      s.isCurrent 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isMobile ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">
                          {s.deviceId || (isMobile ? 'Mobile Device' : 'Desktop Browser')}
                        </span>
                        {s.isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> This Device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{s.ipAddress}</span>
                        <span>•</span>
                        <span>Logged in: {new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => revokeSession(s.sessionId)}
                      disabled={revokingId === s.sessionId}
                      className="text-xs font-semibold px-2 py-1 rounded text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{revokingId === s.sessionId ? 'Revoking...' : 'Revoke'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {message && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-semibold flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
