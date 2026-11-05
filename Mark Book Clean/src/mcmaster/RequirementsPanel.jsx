import React from 'react';
import { ShieldCheck, ExternalLink, Plus, Trash2, Award, AlertCircle } from 'lucide-react';
import { REQUIREMENTS, DEGREES, CALENDAR_URL, VERIFIED_ON, evaluateScholarship } from './requirements.js';

const STATUS_STYLES = {
    met: { label: 'Met', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
    risk: { label: 'At risk', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
    notmet: { label: 'Not met', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
    na: { label: 'No data', badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300' },
    info: { label: 'Info', badge: 'bg-mac-maroon-light text-mac-maroon', bar: 'bg-mac-grey' },
};

const CONFIDENCE_STYLES = {
    high: 'text-emerald-600',
    medium: 'text-amber-600',
    low: 'text-red-600',
};

const RequirementCard = ({ title, rule, result, source, confidence, children }) => {
    const s = STATUS_STYLES[result.status] || STATUS_STYLES.na;
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
            <div className={`w-1.5 shrink-0 ${s.bar}`}></div>
            <div className="p-5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-slate-800">{title}</h4>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${s.badge}`}>{s.label}</span>
                </div>
                {rule && <p className="text-xs text-slate-500 leading-relaxed mb-3">{rule}</p>}
                {children}
                <p className="text-sm font-medium text-slate-700">{result.detail}</p>
                <div className="flex items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider">
                    {source && (
                        <a href={source} target="_blank" rel="noreferrer" className="text-mac-maroon hover:underline flex items-center gap-1">
                            Source <ExternalLink size={10} />
                        </a>
                    )}
                    {confidence && <span className={CONFIDENCE_STYLES[confidence]}>Confidence: {confidence}</span>}
                </div>
            </div>
        </div>
    );
};

const RequirementsPanel = ({ ctx, profile, onProfileChange }) => {
    const applicable = REQUIREMENTS.filter(r => r.appliesTo(profile));
    const categories = [...new Set(applicable.map(r => r.category))];

    const updateScholarship = (id, patch) => onProfileChange({
        scholarships: profile.scholarships.map(s => s.id === id ? { ...s, ...patch } : s)
    });

    return (
        <div className="space-y-8">
            {/* Profile */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Degree</label>
                    <select
                        value={profile.degree}
                        onChange={(e) => onProfileChange({ degree: e.target.value, program: DEGREES[e.target.value][0] })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-mac-maroon bg-white"
                    >
                        {Object.keys(DEGREES).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Program</label>
                    <select
                        value={profile.program}
                        onChange={(e) => onProfileChange({ program: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-mac-maroon bg-white"
                    >
                        {(DEGREES[profile.degree] || []).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                        type="checkbox" checked={profile.coop}
                        onChange={() => onProfileChange({ coop: !profile.coop })}
                        className="w-4 h-4 accent-mac-maroon"
                    />
                    <span className="text-sm font-bold text-slate-700">Co-op stream</span>
                </label>
            </div>

            <div className="bg-mac-gold-light border border-mac-gold rounded-2xl p-4 flex items-start gap-3 text-sm text-slate-700">
                <AlertCircle size={18} className="text-mac-maroon shrink-0 mt-0.5" />
                <p>
                    Requirements were researched on {VERIFIED_ON} and can change each year. Always confirm with the{' '}
                    <a href={CALENDAR_URL} target="_blank" rel="noreferrer" className="font-bold text-mac-maroon underline">Undergraduate Calendar</a>{' '}
                    or your academic advisor. Your CGPA here is {ctx.cgpa === null ? 'not available yet' : <b>{ctx.cgpa.toFixed(2)}</b>}
                    {ctx.includeInProgress ? ' (including in-progress courses).' : ' (completed courses only).'}
                </p>
            </div>

            {categories.map(cat => (
                <div key={cat}>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-mac-maroon" /> {cat}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {applicable.filter(r => r.category === cat).map(r => (
                            <RequirementCard
                                key={r.id}
                                title={r.label}
                                rule={r.rule}
                                result={r.evaluate(ctx)}
                                source={r.source}
                                confidence={r.confidence}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Scholarships */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Award size={14} className="text-mac-maroon" /> Renewable Scholarships
                    </h3>
                    <button
                        onClick={() => onProfileChange({
                            scholarships: [...profile.scholarships, { id: `sch-${Date.now()}`, name: 'My scholarship', minAvg: 9.5, minUnits: 30, noFailures: true, source: '' }]
                        })}
                        className="text-[10px] bg-mac-maroon text-white px-2 py-1 rounded hover:bg-mac-maroon-dark font-bold uppercase flex items-center gap-1"
                    >
                        <Plus size={12} /> Add
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">Each award sets its own renewal terms. Copy them from your award letter. Checked against your latest Fall/Winter sessional average.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.scholarships.map(sch => (
                        <RequirementCard
                            key={sch.id}
                            title={
                                <input
                                    value={sch.name}
                                    onChange={(e) => updateScholarship(sch.id, { name: e.target.value })}
                                    className="font-bold text-slate-800 outline-none border-b border-transparent focus:border-mac-maroon w-full"
                                />
                            }
                            result={evaluateScholarship(sch, ctx)}
                            source={sch.source}
                        >
                            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
                                <label className="flex items-center gap-1 text-slate-500">
                                    Min avg
                                    <input type="text" value={sch.minAvg} onChange={(e) => updateScholarship(sch.id, { minAvg: e.target.value })}
                                        className="w-12 border border-slate-200 rounded p-1 text-center font-bold outline-none focus:border-mac-maroon" />
                                </label>
                                <label className="flex items-center gap-1 text-slate-500">
                                    Min units
                                    <input type="text" value={sch.minUnits} onChange={(e) => updateScholarship(sch.id, { minUnits: parseFloat(e.target.value) || 0 })}
                                        className="w-12 border border-slate-200 rounded p-1 text-center font-bold outline-none focus:border-mac-maroon" />
                                </label>
                                <label className="flex items-center gap-1 text-slate-500 cursor-pointer">
                                    <input type="checkbox" checked={sch.noFailures} onChange={() => updateScholarship(sch.id, { noFailures: !sch.noFailures })} className="accent-mac-maroon" />
                                    No failures
                                </label>
                                <button
                                    onClick={() => onProfileChange({ scholarships: profile.scholarships.filter(s => s.id !== sch.id) })}
                                    className="ml-auto text-slate-300 hover:text-red-500"
                                    title="Remove"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </RequirementCard>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RequirementsPanel;
