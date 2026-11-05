import React, { useState, useRef } from 'react';
import { X, FileUp, FileText, AlertCircle, Plus, Trash2, RefreshCw, ClipboardPaste, Lock } from 'lucide-react';
import { extractOutlineText, SUPPORTED_ACCEPT } from './outlineExtract.js';
import { parseOutline, SESSION_NAMES } from './outlineParser.js';

const OutlineModal = ({ activeCourse, defaultTerm, onClose, onApply }) => {
    const [step, setStep] = useState('pick'); // pick | reading | review
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const [rawText, setRawText] = useState('');
    const [draft, setDraft] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const review = (text, name) => {
        const parsed = parseOutline(text);
        const term = parsed.term || defaultTerm;
        setRawText(text);
        setFileName(name);
        setDraft({
            code: parsed.code,
            title: parsed.title,
            units: parsed.units,
            session: term.session,
            year: term.year,
            termFromOutline: !!parsed.term,
            warnings: parsed.warnings,
            components: parsed.components.map(c => ({ ...c, include: true })),
        });
        setStep('review');
    };

    const handleFile = async (file) => {
        if (!file) return;
        setError('');
        setStep('reading');
        setProgress('Opening file');
        try {
            const text = await extractOutlineText(file, setProgress);
            if (!text || !text.trim()) throw new Error('No text could be read from this file.');
            review(text, file.name);
        } catch (err) {
            console.error('Outline import error:', err);
            setError(err.message || 'Could not read this file.');
            setStep('pick');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const updateComponent = (id, patch) => setDraft(d => ({
        ...d,
        components: d.components.map(c => c.id === id ? { ...c, ...patch } : c)
    }));

    const included = draft ? draft.components.filter(c => c.include) : [];
    const total = included.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
    const totalOk = Math.abs(total - 100) < 0.51;

    const apply = (mode) => {
        onApply({
            mode,
            code: draft.code.trim().toUpperCase(),
            name: draft.title.trim(),
            units: parseFloat(draft.units) || 3,
            term: { session: draft.session, year: parseInt(draft.year) || defaultTerm.year },
            components: included.map(({ include, ...c }) => ({ ...c, weight: parseFloat(c.weight) || 0 })),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileUp className="text-mac-maroon" size={22} />
                        Import Course Outline
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {step === 'pick' && (
                    <>
                        <p className="text-sm text-slate-500 mb-4">
                            Upload your course outline and Mark Book will fill in the course code, title, units, term and grading breakdown. You can review everything before it's added.
                        </p>

                        {!pasteMode ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-mac-maroon bg-mac-maroon-light' : 'border-slate-300 hover:border-mac-maroon hover:bg-slate-50'}`}
                            >
                                <div className="w-14 h-14 bg-mac-gold-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <FileText className="text-mac-maroon" size={28} />
                                </div>
                                <p className="font-bold text-slate-700">Drop your outline here or click to browse</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx), photo/screenshot or text file</p>
                                <input ref={fileInputRef} type="file" accept={SUPPORTED_ACCEPT} className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    placeholder={'Paste the outline text, or just the evaluation section, e.g.\n\nENGTECH 1PR3 - Introduction to Programming\nAssignments   20%\nLabs   15%\nMidterm   25%\nFinal Exam   40%'}
                                    className="w-full h-56 border border-slate-200 rounded-xl p-4 text-sm font-mono outline-none focus:border-mac-maroon resize-none"
                                />
                                <button
                                    onClick={() => pasteText.trim() && review(pasteText, 'Pasted text')}
                                    disabled={!pasteText.trim()}
                                    className="w-full mt-3 py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors disabled:opacity-40"
                                >
                                    Read Outline
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => { setPasteMode(p => !p); setError(''); }}
                            className="mt-3 text-xs font-bold text-mac-maroon hover:underline flex items-center gap-1"
                        >
                            {pasteMode ? <><FileUp size={12} /> Upload a file instead</> : <><ClipboardPaste size={12} /> Paste text instead</>}
                        </button>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle size={18} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1">
                            <Lock size={11} /> Your file is read in this browser and never uploaded anywhere.
                        </p>
                    </>
                )}

                {step === 'reading' && (
                    <div className="py-14 flex flex-col items-center text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-mac-maroon border-t-transparent rounded-full mb-4"></div>
                        <p className="font-bold text-slate-700">Reading your outline…</p>
                        <p className="text-sm text-slate-400 mt-1">{progress}</p>
                    </div>
                )}

                {step === 'review' && draft && (
                    <>
                        <p className="text-xs text-slate-400 mb-4">From <b className="text-slate-600">{fileName}</b> — check and edit before adding.</p>

                        {draft.warnings.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {draft.warnings.map(w => (
                                    <div key={w} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-700 text-sm">
                                        <AlertCircle size={16} className="shrink-0" /> {w}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Code</label>
                                <input
                                    value={draft.code} onChange={(e) => setDraft(d => ({ ...d, code: e.target.value }))}
                                    placeholder="ENGTECH 1PR3"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold uppercase outline-none focus:border-mac-maroon"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Title</label>
                                <input
                                    value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
                                    placeholder="Introduction to Programming"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-mac-maroon"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Units</label>
                                <input
                                    value={draft.units} onChange={(e) => setDraft(d => ({ ...d, units: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-mac-maroon"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                    Term {draft.termFromOutline && <span className="text-emerald-600 normal-case tracking-normal font-bold">· found in outline</span>}
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={draft.session} onChange={(e) => setDraft(d => ({ ...d, session: e.target.value }))}
                                        className="flex-1 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-mac-maroon bg-white"
                                    >
                                        {Object.entries(SESSION_NAMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                    <input
                                        value={draft.year} onChange={(e) => setDraft(d => ({ ...d, year: e.target.value }))}
                                        className="w-24 border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-mac-maroon"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grading Breakdown</span>
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${totalOk ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Total {Math.round(total * 100) / 100}%
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {draft.components.length === 0 && (
                                    <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing found — add components below.</p>
                                )}
                                {draft.components.map(c => (
                                    <div key={c.id} className={`flex items-center gap-3 px-4 py-2 ${c.include ? '' : 'opacity-40'}`}>
                                        <input
                                            type="checkbox" checked={c.include}
                                            onChange={() => updateComponent(c.id, { include: !c.include })}
                                            className="w-4 h-4 accent-mac-maroon"
                                        />
                                        <input
                                            value={c.name} onChange={(e) => updateComponent(c.id, { name: e.target.value })}
                                            className="flex-1 min-w-0 text-sm font-semibold text-slate-700 outline-none border-b border-transparent focus:border-mac-maroon"
                                        />
                                        {c.items.length > 0 && (
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{c.items.length} entries</span>
                                        )}
                                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1">
                                            <input
                                                value={c.weight} onChange={(e) => updateComponent(c.id, { weight: e.target.value })}
                                                className="w-10 text-right text-sm font-bold text-mac-maroon outline-none"
                                            />
                                            <span className="text-xs text-slate-400">%</span>
                                        </div>
                                        <button onClick={() => setDraft(d => ({ ...d, components: d.components.filter(x => x.id !== c.id) }))} className="text-slate-300 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setDraft(d => ({ ...d, components: [...d.components, { id: `comp-${Date.now()}`, name: 'New Component', weight: 0, items: [], include: true }] }))}
                            className="text-xs font-bold text-mac-maroon hover:underline flex items-center gap-1 mb-4"
                        >
                            <Plus size={12} /> Add component
                        </button>

                        <details className="mb-5">
                            <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-600">Show text read from the outline</summary>
                            <pre className="mt-2 max-h-48 overflow-auto bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 whitespace-pre-wrap">{rawText}</pre>
                        </details>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => { setStep('pick'); setDraft(null); }}
                                className="sm:w-auto py-3 px-4 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Start Over
                            </button>
                            {activeCourse && (
                                <button
                                    onClick={() => apply('replace')}
                                    className="flex-1 py-3 border-2 border-mac-maroon text-mac-maroon rounded-xl font-bold hover:bg-mac-maroon-light transition-colors"
                                    title="Replaces this course's components and their marks"
                                >
                                    Update {activeCourse.code || 'current course'}
                                </button>
                            )}
                            <button
                                onClick={() => apply('new')}
                                className="flex-1 py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors"
                            >
                                Add as New Course
                            </button>
                        </div>
                        {activeCourse && (
                            <p className="text-[11px] text-slate-400 mt-2">"Update" replaces {activeCourse.code || 'the current course'}'s grading components, including any marks already entered.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OutlineModal;
