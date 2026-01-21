import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator,
    Plus,
    Trash2,
    BookOpen,
    Target,
    BarChart3,
    Undo2,
    Trash,
    Edit2,
    Check,
    Layers,
    Percent,
    ChevronRight,
    LogOut,
    Save,
    Upload,
    X,
    User,
    Lock,
    Cloud,
    CloudOff,
    RefreshCw
} from 'lucide-react';

const STORAGE_KEY = 'markbook_courses';
const AUTH_KEY = 'markbook_auth';
const API_URL = 'https://scholr-api.onrender.com/api';

// Empty default - users will add their own courses
const defaultCourses = [];

const App = () => {
    const [view, setView] = useState('start');
    const [authView, setAuthView] = useState(null); // 'login' or 'register'
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem(AUTH_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');

    const [courses, setCourses] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved courses:', e);
            }
        }
        return defaultCourses;
    });
    const [activeCourseId, setActiveCourseId] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed[0]?.id || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [editingNameId, setEditingNameId] = useState(null);
    const [tempName, setTempName] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');

    // Auth form state
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');

    const activeCourse = useMemo(() => {
        return courses.find(c => c.id === activeCourseId) || courses[0] || null;
    }, [courses, activeCourseId]);

    // Load data from server on login
    useEffect(() => {
        if (user && user.token) {
            fetchCloudData();
        }
    }, [user]);

    const fetchCloudData = async () => {
        if (!user || !user.token) return;

        try {
            setSyncStatus('Loading...');
            const response = await fetch(`${API_URL}/data`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.courses && data.courses.length > 0) {
                    setCourses(data.courses);
                    setActiveCourseId(data.courses[0]?.id || null);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.courses));
                }
                setSyncStatus('');
            } else {
                setSyncStatus('');
            }
        } catch (error) {
            console.error('Fetch cloud data error:', error);
            setSyncStatus('');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authUsername, password: authPassword })
            });

            const data = await response.json();

            if (response.ok) {
                const userData = { token: data.token, username: data.user.username, id: data.user.id };
                setUser(userData);
                localStorage.setItem(AUTH_KEY, JSON.stringify(userData));

                // Load courses from server
                if (data.courses && data.courses.length > 0) {
                    setCourses(data.courses);
                    setActiveCourseId(data.courses[0]?.id || null);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.courses));
                }

                setAuthView(null);
                setAuthUsername('');
                setAuthPassword('');
                setView('dashboard');
            } else {
                setAuthError(data.error || 'Login failed');
            }
        } catch (error) {
            setAuthError('Cannot connect to server. Make sure the server is running.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authUsername, password: authPassword })
            });

            const data = await response.json();

            if (response.ok) {
                const userData = { token: data.token, username: data.user.username, id: data.user.id };
                setUser(userData);
                localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
                setAuthView(null);
                setAuthUsername('');
                setAuthPassword('');
                setView('dashboard');
            } else {
                setAuthError(data.error || 'Registration failed');
            }
        } catch (error) {
            setAuthError('Cannot connect to server. Make sure the server is running.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
        setView('start');
    };

    const handleSave = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
            setSaveStatus('Saved!');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (e) {
            console.error('Failed to save:', e);
            setSaveStatus('Error saving');
            setTimeout(() => setSaveStatus(''), 2000);
        }
    };

    const handleCloudSync = async () => {
        if (!user || !user.token) {
            setSaveStatus('Login required');
            setTimeout(() => setSaveStatus(''), 2000);
            return;
        }

        try {
            setSyncStatus('Syncing...');
            const response = await fetch(`${API_URL}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ courses })
            });

            if (response.ok) {
                setSyncStatus('Synced!');
                setTimeout(() => setSyncStatus(''), 2000);
            } else {
                setSyncStatus('Sync failed');
                setTimeout(() => setSyncStatus(''), 2000);
            }
        } catch (error) {
            console.error('Cloud sync error:', error);
            setSyncStatus('Server offline');
            setTimeout(() => setSyncStatus(''), 2000);
        }
    };

    const handleImport = () => {
        if (!activeCourse || !importText.trim()) {
            setShowImportModal(false);
            setImportText('');
            return;
        }

        const lines = importText.trim().split('\n');
        const newAssessments = [];

        lines.forEach(line => {
            const parts = line.split(/[,\t]+/).map(p => p.trim());
            if (parts.length >= 2) {
                // Format: category, score, total (optional), weight (optional)
                // or just: category, score (assumes total=100, weight=1)
                const cat = parts[0] || 'ITEM';
                const score = parts[1] || '';
                const total = parts[2] || '100';
                const weight = parts[3] || '1';

                newAssessments.push({
                    id: Date.now() + Math.random(),
                    cat: cat.toUpperCase(),
                    score: score,
                    total: total,
                    weight: weight,
                    active: true
                });
            }
        });

        if (newAssessments.length > 0) {
            updateCourseField(activeCourseId, 'assessments', [
                ...activeCourse.assessments,
                ...newAssessments
            ]);
            setSaveStatus(`Added ${newAssessments.length} entries!`);
            setTimeout(() => setSaveStatus(''), 2000);
        }

        setShowImportModal(false);
        setImportText('');
    };

    const stats = useMemo(() => {
        const defaultStats = { courseworkAvg: 0, fptAvg: 0, examAvg: 0, finalGrade: 0, requiredEvalAvg: 0 };
        if (!activeCourse) return defaultStats;

        const parseVal = (val) => {
            const n = parseFloat(val);
            return isNaN(n) ? 0 : n;
        };

        const activeAssessments = activeCourse.assessments.filter(a => a.active);
        let cwWeightedScore = 0;
        let cwTotalWeight = 0;
        activeAssessments.forEach(a => {
            const score = parseVal(a.score);
            const total = parseVal(a.total);
            const weight = parseVal(a.weight);
            const pct = total > 0 ? (score / total) * 100 : 0;
            cwWeightedScore += (pct * weight);
            cwTotalWeight += weight;
        });
        const courseworkAvg = cwTotalWeight > 0 ? (cwWeightedScore / cwTotalWeight) : 0;

        let fptWeightedScore = 0;
        let fptTotalWeight = 0;
        activeCourse.fptParts.forEach(e => {
            const score = parseVal(e.score);
            const total = parseVal(e.total);
            const weight = parseVal(e.weight);
            const pct = total > 0 ? (score / total) * 100 : 0;
            fptWeightedScore += (pct * weight);
            fptTotalWeight += weight;
        });
        const fptAvg = fptTotalWeight > 0 ? (fptWeightedScore / fptTotalWeight) : 0;

        const examScore = parseVal(activeCourse.exam.score);
        const examTotal = parseVal(activeCourse.exam.total);
        const examAvg = examTotal > 0 ? (examScore / examTotal) * 100 : 0;

        // Use dynamic weights from course settings
        const fptWeight = parseVal(activeCourse.fptParts.reduce((sum, p) => sum + parseVal(p.weight), 0)) || 15;
        const examWeight = parseVal(activeCourse.exam.weight) || 15;
        const courseworkWeight = 100 - fptWeight - examWeight;

        const finalGrade = (courseworkAvg * (courseworkWeight / 100)) + (fptAvg * (fptWeight / 100)) + (examAvg * (examWeight / 100));

        const currentPoints = (courseworkAvg * (courseworkWeight / 100));
        const evalWeight = fptWeight + examWeight;
        const neededFromFinal = activeCourse.target - currentPoints;
        const requiredEvalAvg = evalWeight > 0 ? (neededFromFinal / (evalWeight / 100)) : 0;

        return { courseworkAvg, fptAvg, examAvg, finalGrade, requiredEvalAvg, courseworkWeight, fptWeight, examWeight };
    }, [activeCourse]);

    const updateCourseField = (id, field, value) => {
        setCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const addFptPart = () => {
        const nid = `fpt-${Date.now()}`;
        setCourses(prev => prev.map(c => {
            if (c.id !== activeCourseId) return c;
            return {
                ...c,
                fptParts: [...c.fptParts, { id: nid, name: `Part ${c.fptParts.length + 1}`, score: '', total: 100, weight: 10 }]
            };
        }));
    };

    const removeFptPart = (id) => {
        setCourses(prev => prev.map(c => {
            if (c.id !== activeCourseId) return c;
            return { ...c, fptParts: c.fptParts.filter(p => p.id !== id) };
        }));
    };

    const updateFptField = (id, field, value) => {
        setCourses(prev => prev.map(c => {
            if (c.id !== activeCourseId) return c;
            return {
                ...c,
                fptParts: c.fptParts.map(p => p.id === id ? { ...p, [field]: value } : p)
            };
        }));
    };

    const updateExamField = (field, value) => {
        setCourses(prev => prev.map(c => {
            if (c.id !== activeCourseId) return c;
            return { ...c, exam: { ...c.exam, [field]: value } };
        }));
    };

    const updateAssessment = (id, field, value) => {
        setCourses(prev => prev.map(c => {
            if (c.id !== activeCourseId) return c;
            return {
                ...c,
                assessments: c.assessments.map(a => a.id === id ? { ...a, [field]: value } : a)
            };
        }));
    };

    const startRenaming = (course) => {
        setEditingNameId(course.id);
        setTempName(course.name);
    };

    const saveName = () => {
        updateCourseField(editingNameId, 'name', tempName);
        setEditingNameId(null);
    };

    const addNewCourse = () => {
        const id = `c-${Date.now()}`;
        const newCourse = {
            id,
            name: 'New Course',
            target: 85,
            evaluationWeight: 30,
            fptParts: [{ id: 'f1', name: 'FPT Part 1', score: '', total: 100, weight: 15 }],
            exam: { score: '', total: 100, weight: 15 },
            assessments: []
        };
        setCourses([...courses, newCourse]);
        setActiveCourseId(id);
        startRenaming(newCourse);
    };

    // --- AUTH SCREENS ---
    if (authView === 'login') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                    <button
                        onClick={() => { setAuthView(null); setAuthError(''); }}
                        className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 text-sm"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <User className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">Login</h2>
                            <p className="text-sm text-slate-500">Access your account</p>
                        </div>
                    </div>

                    {authError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
                            {authError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={authUsername}
                                    onChange={(e) => setAuthUsername(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                        >
                            {authLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Don't have an account?{' '}
                        <button onClick={() => { setAuthView('register'); setAuthError(''); }} className="text-blue-600 font-bold hover:underline">
                            Create one
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    if (authView === 'register') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                    <button
                        onClick={() => { setAuthView(null); setAuthError(''); }}
                        className="text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 text-sm"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                            <User className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">Create Account</h2>
                            <p className="text-sm text-slate-500">Sync across devices</p>
                        </div>
                    </div>

                    {authError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
                            {authError}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={authUsername}
                                    onChange={(e) => setAuthUsername(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500"
                                    placeholder="Choose a username (min 3 chars)"
                                    minLength={3}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500"
                                    placeholder="Choose a password (min 4 chars)"
                                    minLength={4}
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50"
                        >
                            {authLoading ? 'Creating...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Already have an account?{' '}
                        <button onClick={() => { setAuthView('login'); setAuthError(''); }} className="text-blue-600 font-bold hover:underline">
                            Login
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    // --- RENDERING START SCREEN ---
    if (view === 'start') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                        <Calculator className="text-white" size={40} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Mark Book</h1>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Ontario high school mark management and final evaluation simulation.
                    </p>

                    <div className="w-full space-y-4 mb-10">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                                <Target size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">70/15/15 Logic</p>
                                <p className="text-xs font-semibold">Coursework + FPT + Exam</p>
                            </div>
                        </div>
                        {user && (
                            <div className="flex items-center gap-4 bg-green-50 p-4 rounded-2xl border border-green-100">
                                <div className="bg-green-100 p-2.5 rounded-xl text-green-600">
                                    <Cloud size={20} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Logged In</p>
                                    <p className="text-xs font-semibold">{user.username}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-slate-400 hover:text-red-500 p-2"
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setView('dashboard')}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                        Open Mark Book <ChevronRight size={20} />
                    </button>

                    {!user && (
                        <div className="w-full mt-4 flex gap-3">
                            <button
                                onClick={() => setAuthView('login')}
                                className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                            >
                                <User size={18} /> Login
                            </button>
                            <button
                                onClick={() => setAuthView('register')}
                                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                            >
                                <Plus size={18} /> Create Account
                            </button>
                        </div>
                    )}
                </div>
                <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-50">
                    Ontario Based Curriculum Mark Book
                </p>
            </div>
        );
    }

    // --- RENDERING DASHBOARD ---
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 flex-1">
                        <button
                            onClick={() => setView('start')}
                            className="p-2 mr-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                            title="Exit to Start"
                        >
                            <LogOut size={20} />
                        </button>
                        {courses.map(course => (
                            <div key={course.id} className="relative group shrink-0">
                                {editingNameId === course.id ? (
                                    <div className="flex items-center bg-white border border-blue-500 rounded-lg overflow-hidden pr-2">
                                        <input
                                            autoFocus
                                            className="px-4 py-2 text-sm outline-none"
                                            value={tempName}
                                            onChange={(e) => setTempName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveName()}
                                        />
                                        <button onClick={saveName} className="text-green-600"><Check size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setActiveCourseId(course.id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeCourseId === course.id
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            {course.name}
                                        </button>
                                        {activeCourseId === course.id && (
                                            <>
                                                <button onClick={() => startRenaming(course)} className="p-1.5 text-slate-400 hover:text-blue-500" title="Rename course">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Permanently delete this course?')) {
                                                            const next = courses.filter(c => c.id !== activeCourseId);
                                                            setCourses(next);
                                                            setActiveCourseId(next[0]?.id || null);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500"
                                                    title="Delete course"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button onClick={addNewCourse} className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shrink-0" title="Add new course">
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md text-sm font-bold"
                                title="Save to browser"
                            >
                                <Save size={16} />
                                Save
                            </button>
                            {user && (
                                <button
                                    onClick={handleCloudSync}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md text-sm font-bold"
                                    title="Sync to cloud"
                                >
                                    <Cloud size={16} />
                                    Sync
                                </button>
                            )}
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-medium"
                                title="Import assessments from text"
                            >
                                <Upload size={16} />
                            </button>
                            {(saveStatus || syncStatus) && (
                                <span className="text-green-600 text-sm font-bold animate-pulse">{saveStatus || syncStatus}</span>
                            )}
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center justify-end gap-2">
                                <Calculator className="text-blue-600" size={20} /> Mark Book
                            </h1>
                            <div className="flex items-center gap-2 justify-end">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">70/15/15 Curriculum Model</p>
                                {user && (
                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Cloud size={10} /> {user.username}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Empty State - No Courses */}
                {courses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                            <BookOpen className="text-slate-400" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-700 mb-2">No Courses Yet</h2>
                        <p className="text-slate-500 mb-8 max-w-md">
                            Get started by adding your first course. Click the + button above or the button below to create a new course.
                        </p>
                        <button
                            onClick={addNewCourse}
                            className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                        >
                            <Plus size={20} /> Add Your First Course
                        </button>
                    </div>
                )}

                {/* Dashboard Content - Only show if there are courses */}
                {courses.length > 0 && activeCourse && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">

                            {/* Final Evaluation Section */}
                            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden text-white border border-slate-800">
                                <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                                    <div className="flex items-center gap-2">
                                        <Target size={18} className="text-blue-400" />
                                        <h3 className="font-bold text-sm tracking-tight">Final Evaluation ({stats.fptWeight + stats.examWeight}% Total)</h3>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-[8px] font-bold text-slate-500 uppercase">FPT Result</p>
                                            <p className="text-xs font-mono text-blue-400">{stats.fptAvg.toFixed(1)}%</p>
                                        </div>
                                        <div className="text-center border-l border-slate-700 pl-4">
                                            <p className="text-[8px] font-bold text-slate-500 uppercase">Exam Result</p>
                                            <p className="text-xs font-mono text-blue-400">{stats.examAvg.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* FPT Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Layers size={16} className="text-blue-400" />
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">FPT Tasks ({stats.fptWeight}%)</span>
                                            </div>
                                            <button onClick={addFptPart} className="text-[10px] bg-blue-600 px-2 py-0.5 rounded hover:bg-blue-700 transition-colors font-bold uppercase">Add Task</button>
                                        </div>

                                        <div className="space-y-3">
                                            {activeCourse.fptParts.map(p => {
                                                const partPct = (parseFloat(p.score) / parseFloat(p.total)) * 100;
                                                return (
                                                    <div key={p.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 relative group transition-all hover:border-slate-600">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <input
                                                                className="bg-transparent text-[10px] font-bold text-slate-400 uppercase w-full outline-none"
                                                                value={p.name}
                                                                onChange={(e) => updateFptField(p.id, 'name', e.target.value)}
                                                            />
                                                            {!isNaN(partPct) && isFinite(partPct) && (
                                                                <span className="text-[10px] font-mono text-blue-400 bg-blue-900/40 px-1.5 rounded">{partPct.toFixed(1)}%</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="text" className="w-12 bg-slate-900 border border-slate-700 rounded text-xs p-1 outline-none focus:border-blue-500 text-center"
                                                                    value={p.score} onChange={(e) => updateFptField(p.id, 'score', e.target.value)}
                                                                    placeholder="0"
                                                                />
                                                                <span className="text-slate-600">/</span>
                                                                <input
                                                                    type="text" className="w-12 bg-slate-900 border border-slate-700 rounded text-xs p-1 outline-none focus:border-blue-500 text-center"
                                                                    value={p.total} onChange={(e) => updateFptField(p.id, 'total', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-[10px] text-right">
                                                                    <span className="text-slate-500 block">Weight Ratio</span>
                                                                    <input
                                                                        type="text" className="bg-transparent text-blue-400 font-mono w-8 text-right outline-none"
                                                                        value={p.weight} onChange={(e) => updateFptField(p.id, 'weight', e.target.value)}
                                                                    />
                                                                </div>
                                                                <button onClick={() => removeFptPart(p.id)} className="text-slate-600 hover:text-red-500 transition-colors ml-1"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {activeCourse.fptParts.length === 0 && <p className="text-xs text-slate-600 italic">No FPT parts added.</p>}
                                        </div>
                                    </div>

                                    {/* Exam Column */}
                                    <div className="space-y-4 border-l border-slate-800 pl-0 md:pl-8">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Final Exam ({stats.examWeight}%)</span>
                                            </div>
                                        </div>
                                        <div className="bg-blue-900/10 p-5 rounded-2xl border border-blue-500/20 space-y-4">
                                            <div>
                                                <label className="text-[10px] text-blue-400 font-bold uppercase block mb-2 tracking-tighter">Raw Score</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text" className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-bold w-24 outline-none focus:border-blue-500 text-center"
                                                        value={activeCourse.exam.score} onChange={(e) => updateExamField('score', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                    <span className="text-2xl text-slate-700 font-light">/</span>
                                                    <input
                                                        type="text" className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-lg font-bold w-24 outline-none focus:border-blue-500 text-center text-slate-400"
                                                        value={activeCourse.exam.total} onChange={(e) => updateExamField('total', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Weight %</label>
                                                    <input
                                                        type="text" className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm font-bold w-16 outline-none focus:border-blue-500 text-center text-blue-400"
                                                        value={activeCourse.exam.weight} onChange={(e) => updateExamField('weight', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex-1 text-right">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Exam %</p>
                                                    <p className="text-xl font-black text-blue-400 tracking-tight">{stats.examAvg.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coursework Ledger */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <BookOpen className="text-blue-500" size={20} /> Coursework Ledger ({stats.courseworkWeight}%)
                                    </h2>
                                    <button
                                        onClick={() => {
                                            const nid = Date.now();
                                            updateCourseField(activeCourseId, 'assessments', [...activeCourse.assessments, { id: nid, cat: 'NEW', score: '', total: 100, weight: 1, active: true }]);
                                        }}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-bold transition-all shadow-md shadow-blue-100 uppercase tracking-wider"
                                    >
                                        Add Entry
                                    </button>
                                </div>

                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 shadow-sm z-20">
                                            <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                                                <th className="px-6 py-3 font-black">SIM</th>
                                                <th className="px-6 py-3 font-black">CAT</th>
                                                <th className="px-6 py-3 font-black">Score / Total</th>
                                                <th className="px-6 py-3 font-black text-center">WGT</th>
                                                <th className="px-6 py-3 font-black text-right pr-10">DEL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeCourse.assessments.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                                        <p className="text-sm">No assessments yet. Click "Add Entry" to add your first assessment.</p>
                                                    </td>
                                                </tr>
                                            )}
                                            {activeCourse.assessments.map(a => (
                                                <tr key={a.id} className={`transition-all ${!a.active ? 'bg-slate-50 opacity-40 grayscale' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="checkbox" checked={a.active}
                                                            onChange={() => updateAssessment(a.id, 'active', !a.active)}
                                                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            value={a.cat} onChange={(e) => updateAssessment(a.id, 'cat', e.target.value)}
                                                            className="bg-transparent border-none text-[10px] font-black text-slate-600 outline-none w-16"
                                                            placeholder="Label"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1 font-mono text-xs">
                                                            <input
                                                                type="text" value={a.score} className="w-10 border border-slate-200 rounded p-1 text-center outline-none focus:border-blue-500"
                                                                onChange={(v) => updateAssessment(a.id, 'score', v.target.value)}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-slate-300">/</span>
                                                            <input
                                                                type="text" value={a.total} className="w-10 border border-slate-200 rounded p-1 text-center outline-none focus:border-blue-500"
                                                                onChange={(v) => updateAssessment(a.id, 'total', v.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="text" value={a.weight} className="w-10 border border-slate-200 rounded p-1 text-[10px] text-center font-bold text-slate-500"
                                                            onChange={(v) => updateAssessment(a.id, 'weight', v.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right pr-10">
                                                        <button onClick={() => updateCourseField(activeCourseId, 'assessments', activeCourse.assessments.filter(x => x.id !== a.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Analytics */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                                    <BarChart3 className="text-blue-500" size={20} /> Cumulative Report
                                </h3>

                                <div className="space-y-5">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Coursework ({stats.courseworkWeight}%)</span>
                                            <span className="text-sm font-bold text-slate-900">{stats.courseworkAvg.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 transition-all duration-500" style={{ width: `${stats.courseworkAvg}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">FPT Category ({stats.fptWeight}%)</span>
                                            <span className="text-sm font-bold text-slate-900">{stats.fptAvg.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${stats.fptAvg}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 pb-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Final Exam ({stats.examWeight}%)</span>
                                            <span className="text-sm font-bold text-slate-900">{stats.examAvg.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${stats.examAvg}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-900 rounded-2xl shadow-2xl text-white flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 border-b border-slate-700 pb-1 w-full opacity-70">Projected Grade</span>
                                        <span className="text-5xl font-black tabular-nums">{stats.finalGrade.toFixed(1)}<span className="text-xl opacity-40">%</span></span>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Percent size={14} className="text-amber-600" />
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Strategy Gap Analysis</p>
                                    </div>
                                    <p className="text-sm text-amber-700 leading-snug">
                                        To reach your <span className="font-black text-amber-900 underline underline-offset-2">{activeCourse.target}%</span> goal, your combined average for the final evaluations (FPT + Exam) must be <span className="font-black text-amber-900">{stats.requiredEvalAvg.toFixed(1)}%</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-100 rounded-3xl p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Target Threshold</label>
                                    <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-inner">
                                        <input
                                            type="range" min="60" max="100"
                                            value={activeCourse.target}
                                            onChange={(e) => updateCourseField(activeCourseId, 'target', parseInt(e.target.value))}
                                            className="flex-1 accent-slate-900 h-1"
                                        />
                                        <span className="text-sm font-black w-10 text-slate-700">{activeCourse.target}%</span>
                                    </div>
                                </div>

                            </div>

                            <div className="text-center">
                                <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 uppercase tracking-widest font-bold opacity-60">
                                    <Undo2 size={10} /> Tip: Toggle "Sim" checks to simulate drops in marks
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Import Assessments</h3>
                            <button
                                onClick={() => { setShowImportModal(false); setImportText(''); }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-3">
                            Paste your data below. Each line should be: <br />
                            <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">category, score, total, weight</code>
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                            Example: <code className="bg-slate-100 px-1 rounded">Quiz, 85, 100, 1</code> or just <code className="bg-slate-100 px-1 rounded">Test, 92</code> (defaults: total=100, weight=1)
                        </p>

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="Quiz, 85, 100, 1&#10;Test, 92, 100, 2&#10;Assignment, 78, 100, 1"
                            className="w-full h-48 border border-slate-200 rounded-xl p-4 text-sm font-mono outline-none focus:border-blue-500 resize-none"
                        />

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setShowImportModal(false); setImportText(''); }}
                                className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

