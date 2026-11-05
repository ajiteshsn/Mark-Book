import React, { useMemo } from 'react';
import { GraduationCap, Calendar, TrendingUp, Calculator, Settings2, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { pointsToFourScale, gradeColor } from './gradeScale.js';
import {
    courseFinal,
    termGPA,
    cumulativeGPA,
    latestSessional,
    unitsEarned,
    levelFromUnits,
    requiredFutureGPA,
    sortTerms,
    cgpaTimeline,
    NON_GPA_STATUSES,
} from './gpa.js';

const fmt = (v, d = 2) => (v === null || v === undefined ? '—' : v.toFixed(d));

const StatTile = ({ label, value, sub, accent }) => (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-mac-maroon border-mac-maroon text-white shadow-xl shadow-mac-maroon/20' : 'bg-white border-slate-200 shadow-sm'}`}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${accent ? 'text-mac-gold' : 'text-slate-400'}`}>{label}</p>
        <p className="text-3xl font-black tabular-nums">{value}</p>
        {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-slate-500'}`}>{sub}</p>}
    </div>
);

const TermOverview = ({ terms, settings, profile, onSettingsChange, onProfileChange, onOpenCourse, onDeleteTerm }) => {
    const sorted = useMemo(() => sortTerms(terms), [terms]);
    const cum = useMemo(() => cumulativeGPA(terms, settings), [terms, settings]);
    const earned = useMemo(() => unitsEarned(terms, settings), [terms, settings]);
    const sessional = latestSessional(terms, settings);
    const latestYear = sessional?.year;
    const timeline = useMemo(() => cgpaTimeline(terms, settings), [terms, settings]);

    const plannedUnits = parseFloat(profile.plannedUnits) || 0;
    const targetCGPA = parseFloat(profile.targetCGPA) || 0;
    const needed = requiredFutureGPA(cum.gpa, cum.units, targetCGPA, plannedUnits);
    // Course letters are whole grade points, so round up to the letter that guarantees the average
    const neededLetter = needed !== null && needed > 0 && needed <= 12 ? letterForPoints(Math.ceil(needed)) : null;

    return (
        <div className="space-y-8">
            {/* Headline stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile accent label="Cumulative GPA" value={fmt(cum.gpa)} sub={`${fmt(cum.four)} / 4.0 · ${cum.units} GPA units`} />
                <StatTile
                    label={latestYear !== undefined ? `Sessional ${latestYear}–${String(latestYear + 1).slice(2)}` : 'Sessional Avg'}
                    value={fmt(sessional?.gpa)}
                    sub={sessional ? `Fall + Winter · ${sessional.units} units` : 'Fall/Winter average'}
                />
                <StatTile label="Units Earned" value={earned} sub={`Unit-based Level ${levelFromUnits(earned)} (estimate)`} />
                <StatTile
                    label="Grade Equivalent"
                    value={cum.gpa !== null ? letterBandOf(cum.gpa) : '—'}
                    sub="Letter band of your CGPA"
                />
            </div>

            {/* Terms */}
            <div className="space-y-6">
                {sorted.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
                        No terms yet — add one from the header.
                    </div>
                )}
                {sorted.map(term => {
                    const t = termGPA(term, settings);
                    return (
                        <div key={term.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Calendar className="text-mac-maroon" size={18} /> {term.name}
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Term GPA</p>
                                        <p className="text-lg font-black text-mac-maroon leading-none">{fmt(t.gpa)} <span className="text-xs text-slate-400 font-bold">/ {fmt(t.four, 2)}</span></p>
                                    </div>
                                    <button onClick={() => onDeleteTerm(term.id)} className="text-slate-300 hover:text-red-500" title="Delete term">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                                            <th className="px-6 py-2 font-black">Course</th>
                                            <th className="px-3 py-2 font-black text-center">Units</th>
                                            <th className="px-3 py-2 font-black text-center">Grade</th>
                                            <th className="px-3 py-2 font-black text-center">Letter</th>
                                            <th className="px-3 py-2 font-black text-center">12-pt</th>
                                            <th className="px-3 py-2 font-black text-center">4.0</th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {term.courses.length === 0 && (
                                            <tr><td colSpan="7" className="px-6 py-6 text-center text-slate-400">No courses in this term.</td></tr>
                                        )}
                                        {term.courses.map(course => {
                                            const f = courseFinal(course, settings);
                                            const excluded = NON_GPA_STATUSES.includes(course.status);
                                            return (
                                                <tr key={course.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onOpenCourse(term.id, course.id)}>
                                                    <td className="px-6 py-3">
                                                        <p className="font-bold text-slate-800">{course.code || course.name}</p>
                                                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                                                            {course.status === 'completed' ? 'Completed' : course.status === 'in-progress' ? 'In progress · projected' : course.status === 'pass-fail' ? 'Pass/Fail · not in GPA' : 'Transfer · not in GPA'}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-3 text-center font-mono">{course.units}</td>
                                                    <td className="px-3 py-3 text-center font-mono">{f?.pct != null ? `${f.pct.toFixed(1)}%` : '—'}</td>
                                                    <td className={`px-3 py-3 text-center font-black ${excluded ? 'text-slate-400' : gradeColor(f?.points)}`}>{f?.letter ?? (excluded && course.manualFinal ? String(course.manualFinal).toUpperCase() : '—')}</td>
                                                    <td className="px-3 py-3 text-center font-bold">{f ? f.points : '—'}</td>
                                                    <td className="px-3 py-3 text-center text-slate-500">{f ? f.four.toFixed(1) : '—'}</td>
                                                    <td className="px-3 py-3 text-right text-slate-300"><ChevronRight size={16} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CGPA planner */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Calculator className="text-mac-maroon" size={20} /> CGPA Planner
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target CGPA (/12)</label>
                            <input
                                type="text" value={profile.targetCGPA}
                                onChange={(e) => onProfileChange({ targetCGPA: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2 text-lg font-black text-center text-mac-maroon outline-none focus:border-mac-maroon"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Units Still To Take</label>
                            <input
                                type="text" value={profile.plannedUnits}
                                onChange={(e) => onProfileChange({ plannedUnits: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2 text-lg font-black text-center outline-none focus:border-mac-maroon"
                            />
                        </div>
                    </div>
                    <div className="bg-mac-gold-light border border-mac-gold p-5 rounded-2xl text-sm text-slate-700 leading-snug">
                        {needed === null ? (
                            'Enter how many units you still plan to take.'
                        ) : needed > 12 ? (
                            <>A CGPA of <b>{targetCGPA}</b> isn't reachable in {plannedUnits} units — you'd need <b className="text-red-600">{needed.toFixed(2)}</b>/12.</>
                        ) : needed <= 0 ? (
                            <>You'll stay at or above <b>{targetCGPA}</b> whatever you get in the next {plannedUnits} units.</>
                        ) : (
                            <>To finish at <b className="text-mac-maroon">{targetCGPA}</b>, average <b className="text-mac-maroon">{needed.toFixed(2)}</b>/12 (≈ {fmt(pointsToFourScale(needed), 2)}/4.0, about {neededLetter ?? '—'} in every course) over your next {plannedUnits} units.</>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400">A typical full-time Fall or Winter term is 15 units; a 4-year degree is 120 units.</p>
                </div>

                {/* Settings */}
                <div className="bg-slate-100 rounded-3xl p-8 space-y-5">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-4">
                        <Settings2 className="text-mac-maroon" size={20} /> Calculation Settings
                    </h3>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox" checked={settings.includeInProgress}
                            onChange={() => onSettingsChange({ includeInProgress: !settings.includeInProgress })}
                            className="w-4 h-4 mt-0.5 accent-mac-maroon"
                        />
                        <span className="text-sm text-slate-700">
                            <b>Include in-progress courses</b> (projected GPA)
                            <span className="block text-xs text-slate-500">Turn off to see only completed courses — the number Mosaic shows.</span>
                        </span>
                    </label>
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">Percent → letter rounding</p>
                        <div className="flex gap-2">
                            {[['none', 'No rounding (79.9 = B+)'], ['nearest', 'Round to nearest (79.5 = A-)']].map(([val, label]) => (
                                <button
                                    key={val}
                                    onClick={() => onSettingsChange({ roundingMode: val })}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${settings.roundingMode === val ? 'bg-mac-maroon text-white' : 'bg-white text-slate-600 hover:bg-mac-maroon-light'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Rounding at band edges is up to each instructor — check your course outline.</p>
                    </div>
                </div>
            </div>

            {/* CGPA trend */}
            {timeline.some(t => t.cgpa !== null) && (
                <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-mac-gold-light rounded-xl flex items-center justify-center">
                            <TrendingUp className="text-mac-maroon" size={22} />
                        </div>
                        GPA by Term
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                                <YAxis domain={[0, 12]} ticks={[0, 3, 6, 9, 12]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#5C002D', border: 'none', borderRadius: '12px', color: '#fff', padding: '10px 14px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(v) => (v === null ? '—' : v.toFixed(2))}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Line type="monotone" dataKey="cgpa" name="Cumulative GPA" stroke="#7A003C" strokeWidth={3} dot={{ r: 5, fill: '#7A003C', stroke: '#fff', strokeWidth: 2 }} connectNulls />
                                <Line type="monotone" dataKey="termGPA" name="Term GPA" stroke="#FDBF57" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#FDBF57', stroke: '#fff', strokeWidth: 2 }} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <GraduationCap size={12} />
                GPA = Σ(units × grade points) ÷ Σ(units). Pass/Fail, COM and transfer credits don't count. 4.0 values use the Registrar's per-course equivalents.
            </p>
        </div>
    );
};

const LETTER_BY_POINTS = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
const letterForPoints = (p) => LETTER_BY_POINTS[Math.max(0, Math.min(12, p))];

// Letter band a 12-point average falls in (e.g. 9.4 -> B+)
const letterBandOf = (gpa) => letterForPoints(Math.floor(gpa + 1e-9));

export default TermOverview;
