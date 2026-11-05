import React, { useState } from 'react';
import { X, Cloud, CloudOff, Mail, Check, RefreshCw, LogOut, AlertCircle, Smartphone, Laptop } from 'lucide-react';

const timeAgo = (iso) => {
    if (!iso) return 'never';
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(iso).toLocaleDateString();
};

const STATUS_TEXT = {
    idle: 'Not synced yet',
    syncing: 'Syncing…',
    pending: 'Saving changes…',
    synced: 'All changes synced',
    offline: "You're offline — changes will sync when you reconnect",
    error: "Couldn't reach the sync server — will retry",
    conflict: 'Choose which grades to keep',
};

// Header button showing sync state
export const SyncButton = ({ cloud, onClick }) => {
    if (!cloud.enabled) return null;
    if (!cloud.user) {
        return (
            <button
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-mac-maroon hover:text-mac-maroon transition-all text-sm font-bold whitespace-nowrap"
                title="Sign in to sync your grades between devices"
            >
                <Cloud size={16} />
                <span className="hidden sm:inline">Sign in to sync</span>
            </button>
        );
    }
    const bad = cloud.status === 'offline' || cloud.status === 'error' || cloud.status === 'conflict';
    const busy = cloud.status === 'syncing' || cloud.status === 'pending';
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap border transition-all ${bad ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-mac-maroon'}`}
            title={STATUS_TEXT[cloud.status]}
        >
            {bad ? <CloudOff size={16} /> : busy ? <RefreshCw size={16} className="animate-spin text-mac-maroon" /> : <Cloud size={16} className="text-emerald-600" />}
            <span className="hidden sm:inline">{bad ? 'Sync paused' : busy ? 'Syncing' : 'Synced'}</span>
        </button>
    );
};

const AccountModal = ({ cloud, onClose }) => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const run = async (fn) => {
        setBusy(true);
        setError('');
        try {
            await fn();
        } catch (err) {
            setError(err.message || 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const sendLink = () => run(async () => {
        await cloud.signIn(email.trim());
        setSent(true);
    });

    const submitCode = () => run(async () => {
        await cloud.verifyCode(email.trim(), code.trim());
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Cloud className="text-mac-maroon" size={22} />
                        {cloud.user ? 'Sync' : 'Sync Between Devices'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {cloud.user ? (
                    <>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                            <p className="font-bold text-slate-800 break-all">{cloud.user.email}</p>
                        </div>
                        <div className="flex items-start gap-3 mb-5">
                            {cloud.status === 'synced' ? <Check size={18} className="text-emerald-600 mt-0.5" /> : <RefreshCw size={18} className="text-mac-maroon mt-0.5" />}
                            <div>
                                <p className="text-sm font-bold text-slate-700">{STATUS_TEXT[cloud.status]}</p>
                                <p className="text-xs text-slate-400">Last synced {timeAgo(cloud.lastSynced)}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            Sign in with the same email on your phone and computer. Changes save to your account automatically and show up on your other device when you open the app.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={cloud.syncNow}
                                className="flex-1 py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={16} /> Sync Now
                            </button>
                            <button
                                onClick={() => run(async () => { await cloud.signOut(); onClose(); })}
                                className="py-3 px-4 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3">Signing out keeps your grades on this device.</p>
                    </>
                ) : !sent ? (
                    <>
                        <div className="flex items-center justify-center gap-3 py-4 mb-2 text-mac-maroon">
                            <Smartphone size={28} />
                            <RefreshCw size={18} className="text-mac-gold" />
                            <Laptop size={32} />
                        </div>
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                            Enter your email and we'll send you a sign-in link. No password needed. Your grades on this device will be saved to your account.
                        </p>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && sendLink()}
                            placeholder="you@mcmaster.ca"
                            autoComplete="email"
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-mac-maroon mb-3"
                        />
                        <button
                            onClick={sendLink}
                            disabled={busy || !email.includes('@')}
                            className="w-full py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <Mail size={16} /> {busy ? 'Sending…' : 'Email Me a Sign-in Link'}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-14 h-14 bg-mac-gold-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Mail className="text-mac-maroon" size={28} />
                        </div>
                        <p className="text-center font-bold text-slate-700 mb-1">Check your email</p>
                        <p className="text-center text-sm text-slate-500 mb-5">
                            We sent a sign-in link to <b className="text-slate-700">{email}</b>. Open it on this device to finish signing in.
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Got a code instead?</p>
                        <div className="flex gap-2">
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && submitCode()}
                                placeholder="123456"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                className="flex-1 border border-slate-200 rounded-xl p-3 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-mac-maroon"
                            />
                            <button
                                onClick={submitCode}
                                disabled={busy || code.length < 6}
                                className="px-5 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark disabled:opacity-40"
                            >
                                Verify
                            </button>
                        </div>
                        <button onClick={() => { setSent(false); setCode(''); }} className="mt-4 text-xs font-bold text-mac-maroon hover:underline">
                            Use a different email
                        </button>
                    </>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle size={16} className="shrink-0" /> {error}
                    </div>
                )}
            </div>
        </div>
    );
};

// Shown when this device and the account both have different grades
export const ConflictModal = ({ conflict, local, onResolve, onExport }) => {
    const count = (terms) => {
        const n = (terms || []).reduce((sum, t) => sum + (t.courses || []).length, 0);
        return `${n} course${n === 1 ? '' : 's'}`;
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <AlertCircle className="text-amber-500" size={22} /> Which grades should we keep?
                </h3>
                <p className="text-sm text-slate-500 mb-5">This device and your account both have grades, and they're different. Pick one to use everywhere.</p>
                <div className="space-y-3">
                    <button
                        onClick={() => onResolve('account')}
                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-mac-maroon transition-colors"
                    >
                        <p className="font-bold text-slate-800 flex items-center gap-2"><Cloud size={16} className="text-mac-maroon" /> Use my account's grades</p>
                        <p className="text-xs text-slate-500 mt-1">{count(conflict.terms)} · last saved {timeAgo(conflict.updated_at)}. Replaces what's on this device.</p>
                    </button>
                    <button
                        onClick={() => onResolve('device')}
                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-mac-maroon transition-colors"
                    >
                        <p className="font-bold text-slate-800 flex items-center gap-2"><Smartphone size={16} className="text-mac-maroon" /> Use this device's grades</p>
                        <p className="text-xs text-slate-500 mt-1">{count(local.terms)}. Replaces what's saved in your account.</p>
                    </button>
                </div>
                <button onClick={onExport} className="mt-4 text-xs font-bold text-mac-maroon hover:underline">
                    Not sure? Download a backup of this device's grades first
                </button>
            </div>
        </div>
    );
};

export default AccountModal;
