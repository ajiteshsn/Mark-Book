import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    GraduationCap,
    Plus,
    Trash2,
    BookOpen,
    LogOut,
    Save,
    Download,
    FolderOpen,
    ChevronRight,
    Calendar,
    Cloud,
    ShieldCheck,
    LineChart as LineChartIcon,
    Target,
    Check,
    X,
} from 'lucide-react';
import CourseView from './CourseView.jsx';
import TermOverview from './TermOverview.jsx';
import RequirementsPanel from './RequirementsPanel.jsx';
import ImportModal from './ImportModal.jsx';
import OcrModal from './OcrModal.jsx';
import { DEFAULT_SCHOLARSHIPS } from './requirements.js';
import {
    cumulativeGPA,
    latestSessional,
    allCourses,
    courseFinal,
    sortTerms,
    NON_GPA_STATUSES,
} from './gpa.js';

// McMaster data lives under its own keys - the Ontario keys (markbook_*) are never written here
const TERMS_KEY = 'mcmaster_terms';
const PROFILE_KEY = 'mcmaster_profile';
const SETTINGS_KEY = 'mcmaster_settings';
const ONTARIO_AUTH_KEY = 'markbook_auth';

const DEFAULT_PROFILE = {
    degree: 'B.Tech',
    program: 'Automation Engineering Technology',
    coop: true,
    targetCGPA: 9,
    plannedUnits: 30,
    scholarships: DEFAULT_SCHOLARSHIPS,
};

const DEFAULT_SETTINGS = {
    includeInProgress: true,
    roundingMode: 'none',
};

const SESSIONS = [
    { value: 'fall', label: 'Fall' },
    { value: 'winter', label: 'Winter' },
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
];

const loadJSON = (key, fallback) => {
    try {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error(`Failed to load ${key}:`, e);
    }
    return fallback;
};

const saveJSON = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Failed to save ${key}:`, e);
        return false;
    }
};

const currentSession = () => {
    const now = new Date();
    const m = now.getMonth() + 1;
    if (m >= 9) return { session: 'fall', year: now.getFullYear() };
    if (m <= 4) return { session: 'winter', year: now.getFullYear() };
    return { session: m <= 6 ? 'spring' : 'summer', year: now.getFullYear() };
};

const makeTerm = (session, year) => ({
    id: `t-${Date.now()}`,
    name: `${SESSIONS.find(s => s.value === session).label} ${year}`,
    session,
    year,
    courses: [],
});

// A typical McMaster course outline - students edit the weights to match theirs
const makeCourse = () => ({
    id: `c-${Date.now()}`,
    code: '',
    units: 3,
    status: 'in-progress',
    manualFinal: '',
    targetLetter: 'A-',
    components: [
        { id: `comp-${Date.now()}-1`, name: 'Assignments', weight: 20, items: [] },
        { id: `comp-${Date.now()}-2`, name: 'Labs', weight: 15, items: [] },
        { id: `comp-${Date.now()}-3`, name: 'Midterm', weight: 25, items: [] },
        { id: `comp-${Date.now()}-4`, name: 'Final Exam', weight: 40, items: [] },
    ],
});

const McMasterApp = () => {
    const [view, setView] = useState('start');
    const [tab, setTab] = useState('course');
    const [terms, setTerms] = useState(() => loadJSON(TERMS_KEY, []));
    const [profile, setProfile] = useState(() => ({ ...DEFAULT_PROFILE, ...loadJSON(PROFILE_KEY, {}) }));
    const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...loadJSON(SETTINGS_KEY, {}) }));
    const [activeTermId, setActiveTermId] = useState(() => {
        const saved = sortTerms(loadJSON(TERMS_KEY, []));
        return saved[saved.length - 1]?.id || null;
    });
    const [activeCourseId, setActiveCourseId] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');
    const [showAddTerm, setShowAddTerm] = useState(false);
    const [newTerm, setNewTerm] = useState(currentSession);
    const [importTarget, setImportTarget] = useState(null); // { componentId, mode: 'text' | 'ocr' }
    const backupInputRef = useRef(null);

    const ontarioUser = useMemo(() => loadJSON(ONTARIO_AUTH_KEY, null), []);

    // Autosave - the McMaster calculator keeps everything in this browser
    useEffect(() => { saveJSON(TERMS_KEY, terms); }, [terms]);
    useEffect(() => { saveJSON(PROFILE_KEY, profile); }, [profile]);
    useEffect(() => { saveJSON(SETTINGS_KEY, settings); }, [settings]);

    const flash = (msg, ms = 2000) => {
        setSaveStatus(msg);
        setTimeout(() => setSaveStatus(''), ms);
    };

    const activeTerm = useMemo(() => terms.find(t => t.id === activeTermId) || sortTerms(terms)[terms.length - 1] || null, [terms, activeTermId]);
    const activeCourse = useMemo(() => {
        if (!activeTerm) return null;
        return activeTerm.courses.find(c => c.id === activeCourseId) || activeTerm.courses[0] || null;
    }, [activeTerm, activeCourseId]);

    // Everything the requirement checks need
    const reqCtx = useMemo(() => {
        const cum = cumulativeGPA(terms, settings);
        const passedCodes = allCourses(terms)
            .filter(c => {
                const official = String(c.manualFinal || '').trim();
                if (/^(COM|P)$/i.test(official)) return true;
                if (NON_GPA_STATUSES.includes(c.status)) return !/^(NC|F)$/i.test(official);
                if (c.status !== 'completed' && !settings.includeInProgress) return false;
                const f = courseFinal(c, settings);
                return f && f.points > 0;
            })
            .map(c => String(c.code || '').replace(/\s+/g, '').toUpperCase());
        return {
            cgpa: cum.gpa,
            units: cum.units,
            sessional: latestSessional(terms, settings),
            passedCodes,
            profile,
            includeInProgress: settings.includeInProgress,
        };
    }, [terms, settings, profile]);

    const updateTerm = (termId, updater) => setTerms(prev => prev.map(t => t.id === termId ? updater(t) : t));

    const updateCourse = (termId, courseId, updater) => updateTerm(termId, t => ({
        ...t,
        courses: t.courses.map(c => c.id === courseId ? updater(c) : c)
    }));

    const addTerm = () => {
        const term = makeTerm(newTerm.session, parseInt(newTerm.year) || new Date().getFullYear());
        if (terms.some(t => t.name === term.name)) {
            flash(`${term.name} already exists`);
            return;
        }
        setTerms(prev => [...prev, term]);
        setActiveTermId(term.id);
        setActiveCourseId(null);
        setShowAddTerm(false);
    };

    const deleteTerm = (termId) => {
        const term = terms.find(t => t.id === termId);
        if (!confirm(`Permanently delete ${term?.name} and all its courses?`)) return;
        const next = terms.filter(t => t.id !== termId);
        setTerms(next);
        if (activeTermId === termId) setActiveTermId(sortTerms(next)[next.length - 1]?.id || null);
    };

    const addCourse = () => {
        let termId = activeTerm?.id;
        if (!termId) {
            const { session, year } = currentSession();
            const term = makeTerm(session, year);
            setTerms(prev => [...prev, term]);
            termId = term.id;
            setActiveTermId(termId);
        }
        const course = makeCourse();
        updateTerm(termId, t => ({ ...t, courses: [...t.courses, course] }));
        setActiveCourseId(course.id);
        setTab('course');
    };

    const deleteCourse = () => {
        if (!activeTerm || !activeCourse) return;
        if (!confirm('Permanently delete this course?')) return;
        const remaining = activeTerm.courses.filter(c => c.id !== activeCourse.id);
        updateTerm(activeTerm.id, t => ({ ...t, courses: remaining }));
        setActiveCourseId(remaining[0]?.id || null);
    };

    const handleSave = () => {
        const ok = saveJSON(TERMS_KEY, terms) && saveJSON(PROFILE_KEY, profile) && saveJSON(SETTINGS_KEY, settings);
        flash(ok ? 'Saved!' : 'Error saving');
    };

    const handleExport = () => {
        const data = { app: 'markbook-mcmaster', version: 1, exportedAt: new Date().toISOString(), terms, profile, settings };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcmaster-grades-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        flash('Exported!');
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data.terms)) throw new Error('No terms in file');
                if (!confirm('Replace your current McMaster data with this backup?')) return;
                setTerms(data.terms);
                if (data.profile) setProfile({ ...DEFAULT_PROFILE, ...data.profile });
                if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
                const sorted = sortTerms(data.terms);
                setActiveTermId(sorted[sorted.length - 1]?.id || null);
                setActiveCourseId(null);
                flash('Backup restored!');
            } catch (err) {
                flash('Invalid backup file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleItemsImport = (items) => {
        if (items.length > 0 && activeTerm && activeCourse && importTarget) {
            updateCourse(activeTerm.id, activeCourse.id, c => ({
                ...c,
                components: c.components.map(comp => comp.id === importTarget.componentId ? { ...comp, items: [...comp.items, ...items] } : comp)
            }));
            flash(`Added ${items.length} entries!`, 3000);
        }
        setImportTarget(null);
    };

    const importComponentName = activeCourse?.components.find(c => c.id === importTarget?.componentId)?.name || 'component';

    const footer = (
        <p className="mt-10 mb-16 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60">
            Unofficial tool — not affiliated with or endorsed by McMaster University
        </p>
    );

    // --- RENDERING START SCREEN ---
    if (view === 'start') {
        const cum = reqCtx.cgpa;
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="h-2 bg-mac-gold"></div>
                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-mac-maroon rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-mac-maroon/30">
                            <GraduationCap className="text-mac-gold" size={40} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight mb-1">McMaster Grade Calculator</h1>
                        <p className="text-[10px] font-black text-mac-maroon uppercase tracking-widest mb-3">Mark Book · University Edition</p>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Course grades, 12-point GPA, CGPA and program requirements for McMaster students.
                        </p>

                        <div className="w-full space-y-4 mb-10">
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="bg-mac-maroon-light p-2.5 rounded-xl text-mac-maroon">
                                    <Target size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">12-Point Scale</p>
                                    <p className="text-xs font-semibold">A+ = 12 · Syllabus-weighted courses</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-mac-gold-light p-4 rounded-2xl border border-mac-gold/50">
                                <div className="bg-mac-gold p-2.5 rounded-xl text-mac-maroon-dark">
                                    <ShieldCheck size={20} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-[10px] font-bold text-mac-maroon uppercase tracking-widest">{profile.degree} · {profile.coop ? 'Co-op' : 'Non co-op'}</p>
                                    <p className="text-xs font-semibold">{profile.program}</p>
                                </div>
                                {cum !== null && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-mac-maroon uppercase tracking-widest">CGPA</p>
                                        <p className="text-lg font-black text-mac-maroon leading-none">{cum.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                            {ontarioUser && (
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="bg-slate-200 p-2.5 rounded-xl text-slate-500">
                                        <Cloud size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged in as {ontarioUser.username}</p>
                                        <p className="text-xs font-semibold text-slate-500">McMaster data is saved on this device — cloud sync coming soon</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setView('dashboard')}
                            className="w-full bg-mac-maroon text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-mac-maroon-dark transition-all shadow-lg shadow-mac-maroon/20 active:scale-95"
                        >
                            Open Grade Calculator <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                {footer}
            </div>
        );
    }

    // --- RENDERING DASHBOARD ---
    const sortedTerms = sortTerms(terms);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 flex-1">
                        <button
                            onClick={() => setView('start')}
                            className="p-2 mr-1 text-slate-400 hover:text-mac-maroon hover:bg-white rounded-lg transition-all shrink-0"
                            title="Exit to Start"
                        >
                            <LogOut size={20} />
                        </button>

                        {/* Term selector */}
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg pl-2 shrink-0">
                            <Calendar size={14} className="text-mac-maroon" />
                            <select
                                value={activeTerm?.id || ''}
                                onChange={(e) => { setActiveTermId(e.target.value); setActiveCourseId(null); }}
                                className="py-2 pr-2 text-sm font-bold text-slate-700 bg-transparent outline-none"
                            >
                                {sortedTerms.length === 0 && <option value="">No terms</option>}
                                {sortedTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => setShowAddTerm(v => !v)} className="p-2 text-slate-400 hover:text-mac-maroon" title="Add term">
                                <Plus size={14} />
                            </button>
                        </div>

                        {showAddTerm && (
                            <div className="flex items-center gap-1 bg-white border border-mac-maroon rounded-lg px-2 shrink-0">
                                <select
                                    value={newTerm.session}
                                    onChange={(e) => setNewTerm(n => ({ ...n, session: e.target.value }))}
                                    className="py-2 text-sm outline-none bg-transparent"
                                >
                                    {SESSIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                                <input
                                    value={newTerm.year}
                                    onChange={(e) => setNewTerm(n => ({ ...n, year: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                                    className="w-14 py-2 text-sm outline-none text-center"
                                />
                                <button onClick={addTerm} className="text-green-600"><Check size={16} /></button>
                                <button onClick={() => setShowAddTerm(false)} className="text-slate-400"><X size={16} /></button>
                            </div>
                        )}

                        {/* Course tabs */}
                        {activeTerm?.courses.map(course => (
                            <div key={course.id} className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => { setActiveCourseId(course.id); setTab('course'); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeCourse?.id === course.id && tab === 'course'
                                        ? 'bg-mac-maroon text-white shadow-lg shadow-mac-maroon/20'
                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {course.code || 'New Course'}
                                </button>
                                {activeCourse?.id === course.id && tab === 'course' && (
                                    <button onClick={deleteCourse} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete course">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button onClick={addCourse} className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shrink-0" title="Add course to this term">
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md text-sm font-bold"
                                title="Save to browser (also saves automatically)"
                            >
                                <Save size={16} />
                                Save
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-medium"
                                title="Export a JSON backup"
                            >
                                <Download size={16} />
                            </button>
                            <button
                                onClick={() => backupInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-medium"
                                title="Restore a JSON backup"
                            >
                                <FolderOpen size={16} />
                            </button>
                            <input ref={backupInputRef} type="file" accept="application/json,.json" onChange={handleRestore} className="hidden" />
                            {saveStatus && (
                                <span className="text-green-600 text-sm font-bold animate-pulse">{saveStatus}</span>
                            )}
                        </div>
                        <div className="text-right">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center justify-end gap-2 whitespace-nowrap">
                                <GraduationCap className="text-mac-maroon" size={20} /> McMaster
                            </h1>
                            <p className="text-[10px] font-bold text-mac-maroon uppercase tracking-widest whitespace-nowrap">12-Point GPA Model</p>
                        </div>
                    </div>
                </header>

                {/* Section tabs */}
                <nav className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto">
                    {[
                        ['course', 'Course', BookOpen],
                        ['overview', 'GPA Overview', LineChartIcon],
                        ['requirements', 'Requirements', ShieldCheck],
                    ].map(([key, label, Icon]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${tab === key ? 'bg-mac-maroon text-white' : 'text-slate-500 hover:bg-mac-maroon-light hover:text-mac-maroon'}`}
                        >
                            <Icon size={16} className={tab === key ? 'text-mac-gold' : ''} /> {label}
                        </button>
                    ))}
                </nav>

                {tab === 'course' && (
                    activeCourse ? (
                        <CourseView
                            key={activeCourse.id}
                            course={activeCourse}
                            settings={settings}
                            onChange={(updater) => updateCourse(activeTerm.id, activeCourse.id, updater)}
                            onOpenImport={(componentId) => setImportTarget({ componentId, mode: 'text' })}
                            onOpenOcr={(componentId) => setImportTarget({ componentId, mode: 'ocr' })}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-24 h-24 bg-mac-maroon-light rounded-3xl flex items-center justify-center mb-6">
                                <BookOpen className="text-mac-maroon" size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-700 mb-2">No Courses {activeTerm ? `in ${activeTerm.name}` : 'Yet'}</h2>
                            <p className="text-slate-500 mb-8 max-w-md">
                                Add a course, then set its components to match the grading breakdown in your course outline.
                            </p>
                            <button
                                onClick={addCourse}
                                className="bg-mac-maroon text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-mac-maroon-dark transition-all shadow-lg shadow-mac-maroon/20"
                            >
                                <Plus size={20} /> Add Your First Course
                            </button>
                        </div>
                    )
                )}

                {tab === 'overview' && (
                    <TermOverview
                        terms={terms}
                        settings={settings}
                        profile={profile}
                        onSettingsChange={(patch) => setSettings(s => ({ ...s, ...patch }))}
                        onProfileChange={(patch) => setProfile(p => ({ ...p, ...patch }))}
                        onOpenCourse={(termId, courseId) => { setActiveTermId(termId); setActiveCourseId(courseId); setTab('course'); }}
                        onDeleteTerm={deleteTerm}
                    />
                )}

                {tab === 'requirements' && (
                    <RequirementsPanel
                        ctx={reqCtx}
                        profile={profile}
                        onProfileChange={(patch) => setProfile(p => ({ ...p, ...patch }))}
                    />
                )}

                {footer}
            </div>

            {importTarget?.mode === 'text' && (
                <ImportModal componentName={importComponentName} onClose={() => setImportTarget(null)} onImport={handleItemsImport} />
            )}
            {importTarget?.mode === 'ocr' && (
                <OcrModal componentName={importComponentName} onClose={() => setImportTarget(null)} onImport={handleItemsImport} />
            )}
        </div>
    );
};

export default McMasterApp;
