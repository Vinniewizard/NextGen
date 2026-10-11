import React, { useState, useEffect } from 'react';
import { 
  Building, Smartphone, CreditCard, ShieldCheck, Award, 
  Clock, CheckCircle2, Plus, Edit2, Trash2, X, Save, AlertCircle
} from 'lucide-react';
import { UserInfo } from './P2PTypes';

interface P2PUserCenterProps {
  currentUser: any;
  userInfo: UserInfo;
  isDark: boolean;
  onTriggerToast: (msg: string, success?: boolean) => void;
}

export default function P2PUserCenter({
  currentUser,
  userInfo,
  isDark,
  onTriggerToast
}: P2PUserCenterProps) {
  const [fullName, setFullName] = useState(currentUser?.fullName || currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'Bank Transfer', title: 'Bank Account (USD)', details: 'Bank of America · **** 4410', active: true },
    { id: '2', type: 'M-Pesa', title: 'Safaricom M-Pesa (KES)', details: '0712 *** 678 · Vincent K.', active: true },
    { id: '3', type: 'Chipper Cash', title: 'Chipper Cash Tag', details: '@vinnie_global', active: true }
  ]);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState('Bank Transfer');
  const [newMethodDetails, setNewMethodDetails] = useState('');

  // My Posted Ads state
  const [myAds, setMyAds] = useState<any[]>([]);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [adEditForm, setAdEditForm] = useState({
    price: '',
    amount: '',
    min_limit: '',
    max_limit: '',
    paymentMethod: '',
    terms: '',
    status: 'open'
  });
  const [isSavingAd, setIsSavingAd] = useState(false);

  useEffect(() => {
    fetchMyAds();
  }, [currentUser]);

  const fetchMyAds = async () => {
    try {
      const res = await fetch('/api/p2p/orders');
      const data = await res.json();
      if (data.success && data.orders) {
        const userId = currentUser?.id;
        const userAds = data.orders.filter((o: any) => o.user_id === userId);
        setMyAds(userAds);
      }
    } catch (e) {
      console.error('Failed to fetch user ads:', e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const token = currentUser?.id || localStorage.getItem('knex_user_id') || 'guest';
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, phone })
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Profile updated successfully!', true);
      } else {
        onTriggerToast(data.message || 'Failed to update profile', false);
      }
    } catch (err: any) {
      onTriggerToast(err.message || 'Error updating profile', false);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodDetails.trim()) return;
    setPaymentMethods(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        type: newMethodType,
        title: `${newMethodType} Account`,
        details: newMethodDetails.trim(),
        active: true
      }
    ]);
    setNewMethodDetails('');
    setShowAddMethod(false);
    onTriggerToast('New payment method saved to your P2P profile.', true);
  };

  const handleDeleteMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
    onTriggerToast('Payment method removed.', true);
  };

  const handleOpenEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdEditForm({
      price: ad.price.toString(),
      amount: ad.amount.toString(),
      min_limit: ad.min_limit?.toString() || '10',
      max_limit: ad.max_limit?.toString() || '1000',
      paymentMethod: ad.paymentMethod || 'Bank Transfer',
      terms: ad.terms || '',
      status: ad.status || 'open'
    });
  };

  const handleSaveAdEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    setIsSavingAd(true);
    try {
      const token = currentUser?.id || localStorage.getItem('knex_user_id') || 'guest';
      const res = await fetch(`/api/p2p/orders/${editingAd.id}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adEditForm)
      });
      const data = await res.json();
      if (data.success) {
        onTriggerToast('Market offer updated successfully!', true);
        setEditingAd(null);
        fetchMyAds();
      } else {
        onTriggerToast(data.message || 'Failed to update market offer', false);
      }
    } catch (err: any) {
      onTriggerToast(err.message || 'Error updating market offer', false);
    } finally {
      setIsSavingAd(false);
    }
  };

  return (
    <div className={`p-6 md:p-8 rounded-2xl border space-y-8 font-sans ${
      isDark ? 'bg-[#181a20] border-[#2b313a]' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Merchant Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b0e11] border border-[#2b313a]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#2b313a] to-[#363d47] border-2 border-[#fcd535] flex items-center justify-center font-black text-white text-xl">
            {(fullName || currentUser?.email || 'Trader').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">
                {fullName || 'Verified Trader'}
              </h2>
              <span className="p-0.5 rounded bg-yellow-400/10 text-[#fcd535]" title="Verified Merchant">
                <Award className="w-4 h-4 fill-[#fcd535]/20 text-[#fcd535]" />
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                VIP Tier 1
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              UID: {currentUser?.id?.substring(0, 10) || 'USER-98412'} · Email: {currentUser?.email || 'trader@knex.io'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#181a20] border border-[#2b313a] text-right">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Funding Wallet</span>
            <span className="text-sm font-black font-mono text-[#fcd535]">${userInfo.balance.toFixed(2)} USDT</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="p-5 rounded-2xl bg-[#0b0e11] border border-[#2b313a] space-y-4">
        <div>
          <h3 className="text-xs font-mono font-bold text-[#fcd535] uppercase tracking-wider">
            Edit Profile & Identity
          </h3>
          <p className="text-xs text-slate-400">Update your merchant profile name and contact information visible in escrow trades.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-400 block mb-1">Full Name / Merchant Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#fcd535]"
              placeholder="e.g. Satoshi Trading Desk"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Phone Number (M-Pesa / SMS)</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#fcd535]"
              placeholder="+1 555 019 2834"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdatingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* My Posted Market Offers (Ads) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Your Posted Market Offers ({myAds.length})
            </h3>
            <p className="text-xs text-slate-400">Manage, edit prices, or close your published P2P ads.</p>
          </div>
        </div>

        {myAds.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0b0e11] border border-[#2b313a] text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-300">No active market offers posted</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Post Ad" button on the top navigation bar to create and publish your crypto buy or sell market offer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {myAds.map(ad => (
              <div 
                key={ad.id}
                className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                      ad.type === 'sell' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {ad.type === 'sell' ? 'Selling' : 'Buying'} {ad.coin}
                    </span>
                    <span className="text-white font-bold">{ad.amount} {ad.coin} @ ${ad.price} {ad.fiat_currency || 'USD'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      ad.status === 'open' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {ad.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Limits: ${ad.min_limit} - ${ad.max_limit} · Method: <strong className="text-slate-200">{ad.paymentMethod}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditAd(ad)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2b313a] hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#fcd535]" />
                    <span>Edit Offer</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to close this market offer?')) return;
                      const token = currentUser?.id || localStorage.getItem('knex_user_id') || 'guest';
                      await fetch(`/api/p2p/orders/${ad.id}/update`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ status: 'closed', price: ad.price, amount: ad.amount })
                      });
                      onTriggerToast('Market offer closed.', true);
                      fetchMyAds();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 30-Day Statistics Grid */}
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3">
          30-Day Trading Performance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase">30d Orders</span>
            <span className="text-xl font-bold text-white">{userInfo.completedTrades + 124}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase">30d Completion</span>
            <span className="text-xl font-bold text-emerald-400">99.6%</span>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase">Avg Pay Time</span>
            <span className="text-xl font-bold text-white">1.8 min</span>
          </div>
          <div className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] space-y-1">
            <span className="text-[10px] text-slate-400 block uppercase">Avg Release Time</span>
            <span className="text-xl font-bold text-[#fcd535]">2.1 min</span>
          </div>
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Payment Methods (Buyer will see this when you sell)
            </h3>
            <p className="text-xs text-slate-400">Your accounts for receiving fiat currency.</p>
          </div>
          <button
            onClick={() => setShowAddMethod(true)}
            className="px-3.5 py-1.5 bg-[#fcd535] hover:bg-yellow-300 text-[#0b0e11] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Method</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paymentMethods.map(m => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-[#0b0e11] border border-[#2b313a] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#181a20] border border-[#2b313a] flex items-center justify-center text-[#fcd535]">
                  {m.type === 'M-Pesa' ? <Smartphone className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{m.title}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{m.details}</div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteMethod(m.id)}
                className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Ad Modal */}
      {editingAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#2b313a] pb-3">
              <h3 className="text-base font-black text-white">Edit P2P Market Offer</h3>
              <button 
                onClick={() => setEditingAd(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Price ({editingAd.fiat_currency || 'USD'})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={adEditForm.price}
                    onChange={(e) => setAdEditForm({ ...adEditForm, price: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Total Quantity ({editingAd.coin})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={adEditForm.amount}
                    onChange={(e) => setAdEditForm({ ...adEditForm, amount: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Min Order Limit ($)</label>
                  <input
                    type="number"
                    value={adEditForm.min_limit}
                    onChange={(e) => setAdEditForm({ ...adEditForm, min_limit: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Max Order Limit ($)</label>
                  <input
                    type="number"
                    value={adEditForm.max_limit}
                    onChange={(e) => setAdEditForm({ ...adEditForm, max_limit: e.target.value })}
                    className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Method</label>
                <input
                  type="text"
                  value={adEditForm.paymentMethod}
                  onChange={(e) => setAdEditForm({ ...adEditForm, paymentMethod: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Offer Status</label>
                <select
                  value={adEditForm.status}
                  onChange={(e) => setAdEditForm({ ...adEditForm, status: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="open">Open (Active in Marketplace)</option>
                  <option value="closed">Closed / Paused</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  value={adEditForm.terms}
                  onChange={(e) => setAdEditForm({ ...adEditForm, terms: e.target.value })}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
                <button
                  type="button"
                  onClick={() => setEditingAd(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAd}
                  className="px-5 py-2 text-xs font-black bg-[#fcd535] text-[#0b0e11] rounded-xl cursor-pointer"
                >
                  {isSavingAd ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Method Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#181a20] border border-[#2b313a] text-white space-y-4 font-mono text-xs">
            <h3 className="text-base font-black">Add Payment Method</h3>
            <form onSubmit={handleAddMethod} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Method Type</label>
                <select
                  value={newMethodType}
                  onChange={(e) => setNewMethodType(e.target.value)}
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="Bank Transfer">Bank Transfer (Wire / ACH)</option>
                  <option value="M-Pesa">Safaricom M-Pesa</option>
                  <option value="Chipper Cash">Chipper Cash</option>
                  <option value="Revolut">Revolut</option>
                  <option value="Wise">Wise</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Account Details / Phone / Tag</label>
                <input
                  type="text"
                  value={newMethodDetails}
                  onChange={(e) => setNewMethodDetails(e.target.value)}
                  placeholder="e.g. Account: 12345678, Bank: Chase, Name: Vincent K."
                  className="w-full bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b313a]">
                <button
                  type="button"
                  onClick={() => setShowAddMethod(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#fcd535] text-[#0b0e11] rounded-xl cursor-pointer"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
