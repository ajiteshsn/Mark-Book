// Optional account sync through Supabase (one `user_data` row per user, protected by row-level security).
// Local storage stays the source of truth on each device; the cloud copy is reconciled on sign-in,
// pushed shortly after every change, and pulled when the app regains focus.
import { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

// The Supabase client is loaded after first paint so it doesn't slow down opening the app
let clientPromise = null;
const getClient = () => {
    if (!clientPromise) {
        clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
            createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
    }
    return clientPromise;
};

const TABLE = 'user_data';
const META_KEY = 'mcmaster_sync_meta';
const PUSH_DELAY_MS = 1200;
const PULL_INTERVAL_MS = 60000;

// Postgres jsonb reorders object keys, so hash a key-sorted form to compare content, not layout
const stableStringify = (value) => {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value ?? null);
};

export const hashOf = (snapshot) => {
    const s = stableStringify({ terms: snapshot.terms, profile: snapshot.profile, settings: snapshot.settings });
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return `${s.length}:${h}`;
};

const courseCount = (terms) => (terms || []).reduce((n, t) => n + (t.courses || []).length, 0);

const pick = (row) => ({ terms: row.terms || [], profile: row.profile || {}, settings: row.settings || {} });

const loadMeta = () => {
    try {
        return JSON.parse(localStorage.getItem(META_KEY)) || {};
    } catch (e) {
        return {};
    }
};

const saveMeta = (meta) => {
    try {
        localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
        // storage unavailable - sync still works for this session
    }
};

// Did this page load come from clicking a sign-in link?
export const arrivedFromSignInLink = () => /access_token=|type=magiclink|code=/.test(window.location.hash + window.location.search);

/**
 * data: { terms, profile, settings } for this device
 * applyData(snapshot): replace this device's data with a snapshot from the account
 */
export const useCloudSync = ({ data, applyData }) => {
    const [session, setSession] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | syncing | pending | synced | offline | error | conflict
    const [lastSynced, setLastSynced] = useState(null);
    const [conflict, setConflict] = useState(null);
    const [ready, setReady] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const syncedHashRef = useRef(null);
    const dataRef = useRef(data);
    dataRef.current = data;
    const applyRef = useRef(applyData);
    applyRef.current = applyData;
    const userId = session?.user?.id || null;

    useEffect(() => {
        if (!cloudEnabled) return undefined;
        let sub = null;
        let cancelled = false;
        getClient().then(supabase => {
            if (cancelled) return;
            supabase.auth.getSession().then(({ data: { session: s } }) => !cancelled && setSession(s));
            sub = supabase.auth.onAuthStateChange((_event, s) => setSession(s)).data.subscription;
        });
        return () => {
            cancelled = true;
            sub?.unsubscribe();
        };
    }, []);

    const failed = useCallback(() => setStatus(navigator.onLine ? 'error' : 'offline'), []);

    const markSynced = useCallback((snapshot, updatedAt) => {
        const hash = hashOf(snapshot);
        syncedHashRef.current = hash;
        saveMeta({ userId, hash, syncedAt: updatedAt });
        setLastSynced(updatedAt);
        setStatus('synced');
    }, [userId]);

    const fetchRemote = useCallback(async () => {
        const supabase = await getClient();
        const { data: row, error } = await supabase.from(TABLE).select('terms, profile, settings, updated_at').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        return row;
    }, [userId]);

    const push = useCallback(async () => {
        const snapshot = dataRef.current;
        const updatedAt = new Date().toISOString();
        setStatus('syncing');
        const supabase = await getClient();
        const { error } = await supabase.from(TABLE).upsert({ user_id: userId, ...pick(snapshot), updated_at: updatedAt });
        if (error) {
            console.error('Sync upload failed:', error);
            failed();
            return;
        }
        markSynced(snapshot, updatedAt);
    }, [userId, markSynced, failed]);

    const applyRemote = useCallback((row) => {
        const snapshot = pick(row);
        syncedHashRef.current = hashOf(snapshot);
        applyRef.current(snapshot);
        markSynced(snapshot, row.updated_at);
    }, [markSynced]);

    // Reconcile this device with the account when someone signs in (or comes back online)
    useEffect(() => {
        if (!userId) {
            syncedHashRef.current = null;
            setReady(false);
            setConflict(null);
            setStatus('idle');
            return undefined;
        }
        let cancelled = false;
        (async () => {
            setStatus('syncing');
            try {
                const row = await fetchRemote();
                if (cancelled) return;
                const local = dataRef.current;
                const localHash = hashOf(local);
                const meta = loadMeta();
                if (!row) {
                    await push(); // first sign-in anywhere: this device's grades become the account copy
                } else if (!courseCount(row.terms) && courseCount(local.terms)) {
                    await push(); // the account copy is empty - nothing to lose by filling it from this device
                } else if (hashOf(pick(row)) === localHash) {
                    markSynced(local, row.updated_at);
                } else if (meta.userId === userId) {
                    const localChanged = localHash !== meta.hash;
                    // Postgres returns "+00:00" where the client wrote "Z" - compare as times, not strings
                    const remoteChanged = Date.parse(row.updated_at) !== Date.parse(meta.syncedAt);
                    if (!localChanged) applyRemote(row);
                    else if (!remoteChanged) await push();
                    else {
                        setConflict(row);
                        setStatus('conflict');
                        return;
                    }
                } else if (!courseCount(local.terms)) {
                    applyRemote(row); // new device with nothing on it
                } else {
                    setConflict(row);
                    setStatus('conflict');
                    return;
                }
                if (!cancelled) setReady(true);
            } catch (err) {
                console.error('Sync failed:', err);
                if (!cancelled) failed();
            }
        })();
        return () => { cancelled = true; };
    }, [userId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

    // Push local edits shortly after they happen
    useEffect(() => {
        if (!userId || !ready || conflict) return undefined;
        if (hashOf(data) === syncedHashRef.current) return undefined;
        setStatus('pending');
        const t = setTimeout(push, PUSH_DELAY_MS);
        return () => clearTimeout(t);
    }, [data, userId, ready, conflict, push]);

    // Pull changes made on another device when this one comes back into view
    useEffect(() => {
        if (!userId || !ready) return undefined;
        const pull = async () => {
            if (document.hidden || hashOf(dataRef.current) !== syncedHashRef.current) return;
            try {
                const row = await fetchRemote();
                if (row && hashOf(pick(row)) !== syncedHashRef.current) applyRemote(row);
            } catch (err) {
                failed();
            }
        };
        window.addEventListener('focus', pull);
        document.addEventListener('visibilitychange', pull);
        const interval = setInterval(pull, PULL_INTERVAL_MS);
        return () => {
            window.removeEventListener('focus', pull);
            document.removeEventListener('visibilitychange', pull);
            clearInterval(interval);
        };
    }, [userId, ready, fetchRemote, applyRemote, failed]);

    // Retry after a dropped connection
    useEffect(() => {
        const retry = () => {
            if (userId && !ready && !conflict) setAttempt(a => a + 1);
            else if (userId && ready && hashOf(dataRef.current) !== syncedHashRef.current) push();
        };
        window.addEventListener('online', retry);
        return () => window.removeEventListener('online', retry);
    }, [userId, ready, conflict, push]);

    const resolveConflict = async (choice) => {
        const row = conflict;
        setConflict(null);
        if (choice === 'account') applyRemote(row);
        else await push();
        setReady(true);
    };

    const signIn = async (email) => {
        const supabase = await getClient();
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` },
        });
        if (error) throw error;
    };

    const verifyCode = async (email, token) => {
        const supabase = await getClient();
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
    };

    const signOut = async () => {
        const supabase = await getClient();
        await supabase.auth.signOut();
        saveMeta({});
    };

    const syncNow = () => {
        if (!userId) return;
        if (!ready) setAttempt(a => a + 1);
        else if (hashOf(dataRef.current) !== syncedHashRef.current) push();
        else setAttempt(a => a + 1);
    };

    return {
        enabled: cloudEnabled,
        user: session?.user || null,
        status,
        lastSynced,
        conflict,
        resolveConflict,
        signIn,
        verifyCode,
        signOut,
        syncNow,
    };
};
