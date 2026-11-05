import React, { useMemo } from 'react';
import {
    Plus,
    Trash2,
    BookOpen,
    BarChart3,
    Percent,
    Undo2,
    Upload,
    Target,
    TrendingUp,
    AlertCircle,
    Image as ImageIcon,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { GRADE_SCALE, LETTERS, letterLowerBound, gradeColor } from './gradeScale.js';
import { courseStats, courseFinal, requiredOnRemaining, componentAverage, unitsFromCode } from './gpa.js';

const STATUS_OPTIONS = [
    { value: 'in-progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'pass-fail', label: 'Pass/Fail (COM)' },
    { value: 'transfer', label: 'Transfer credit' },
];

const CourseView = ({ course, settings, onChange, onOpenImport, onOpenOcr }) => {
    const stats = useMemo(() => courseStats(course), [course]);
    const final = useMemo(() => courseFinal(course, settings), [course, settings]);
    const targetPct = letterLowerBound(course.targetLetter) ?? 80;
    const required = requiredOnRemaining(stats, targetPct);
    const remainingNames = stats.perComponent.filter(c => c.avg === null && c.weight > 0).map(c => `${c.name} ${c.weight}%`);

    const update = (patch) => onChange(c => ({ ...c, ...patch }));

    const updateComponent = (id, patch) => onChange(c => ({
        ...c,
        components: c.components.map(comp => comp.id === id ? { ...comp, ...patch } : comp)
    }));

    const updateItem = (compId, itemId, field, value) => onChange(c => ({
        ...c,
        components: c.components.map(comp => comp.id !== compId ? comp : {
            ...comp,
            items: comp.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
        })
    }));

    const addItem = (compId) => onChange(c => ({
        ...c,
        components: c.components.map(comp => comp.id !== compId ? comp : {
            ...comp,
            items: [...comp.items, { id: Date.now(), name: `${comp.name} ${comp.items.length + 1}`, score: '', total: 100, weight: 1, active: true }]
        })
    }));

    const removeItem = (compId, itemId) => onChange(c => ({
        ...c,
        components: c.components.map(comp => comp.id !== compId ? comp : { ...comp, items: comp.items.filter(it => it.id !== itemId) })
    }));

    const addComponent = () => onChange(c => ({
        ...c,
        components: [...c.components, { id: `comp-${Date.now()}`, name: 'New Component', weight: 0, items: [] }]
    }));

    const removeComponent = (id) => {
        if (!confirm('Delete this component and all its marks?')) return;
        onChange(c => ({ ...c, components: c.components.filter(comp => comp.id !== id) }));
    };

    const chartData = course.components
        .flatMap(comp => comp.items
            .filter(it => it.active && it.score !== '' && parseFloat(it.total) > 0)
            .map(it => ({ name: it.name, component: comp.name, grade: parseFloat(((parseFloat(it.score) / parseFloat(it.total)) * 100).toFixed(1)) })))
        .map((d, idx) => ({ ...d, index: idx + 1 }));

    const weightOff = Math.abs(stats.totalWeight - 100) > 0.01;

    // Strategy gap message for the chosen target letter
    let gapMessage;
    if (stats.gradedWeight === 0) {
        gapMessage = <>Enter some marks to see what you need for <b className="text-mac-maroon">{course.targetLetter}</b>.</>;
    } else if (required === null) {
        gapMessage = <>All weight is graded — your course grade is locked at <b className="text-mac-maroon">{stats.current.toFixed(1)}%</b>.</>;
    } else if (required <= 0) {
        gapMessage = <><b className="text-mac-maroon">{course.targetLetter}</b> is already secured, even with 0% on the rest.</>;
    } else if (required > 100) {
        gapMessage = <>Reaching <b className="text-mac-maroon">{course.targetLetter}</b> ({targetPct}%) would need <b className="text-red-600">{required.toFixed(1)}%</b> on the remaining {stats.remainingWeight}% — not reachable without bonus marks.</>;
    } else {
        gapMessage = <>To finish with <span className="font-black text-mac-maroon underline underline-offset-2">{course.targetLetter}</span> ({targetPct}%), you need an average of <span className="font-black text-mac-maroon">{required.toFixed(1)}%</span> on the remaining {stats.remainingWeight}%{remainingNames.length ? ` (${remainingNames.join(', ')})` : ''}.</>;
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">

                    {/* Course details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Code</label>
                            <input
                                value={course.code}
                                onChange={(e) => {
                                    const code = e.target.value;
                                    const u = unitsFromCode(code);
                                    update(u !== null ? { code, units: u } : { code });
                                }}
                                placeholder="ENGTECH 1PR3"
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold uppercase outline-none focus:border-mac-maroon"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Units</label>
                            <input
                                type="text" value={course.units}
                                onChange={(e) => update({ units: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-mac-maroon"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                            <select
                                value={course.status}
                                onChange={(e) => update({ status: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-mac-maroon bg-white"
                            >
                                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1" title="Optional: the official grade from Mosaic. Overrides the calculator.">Official Final</label>
                            <input
                                value={course.manualFinal ?? ''}
                                onChange={(e) => update({ manualFinal: e.target.value })}
                                placeholder="e.g. A- or 82"
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-mac-maroon"
                            />
                        </div>
                    </div>

                    {weightOff && course.components.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-700 text-sm">
                            <AlertCircle size={16} />
                            Component weights add up to {stats.totalWeight}% — match them to your course outline (100%).
                        </div>
                    )}

                    {/* Syllabus components */}
                    {course.components.map(comp => {
                        const avg = componentAverage(comp);
                        return (
                            <div key={comp.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 px-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <BookOpen className="text-mac-maroon shrink-0" size={18} />
                                        <input
                                            value={comp.name}
                                            onChange={(e) => updateComponent(comp.id, { name: e.target.value })}
                                            className="bg-transparent font-semibold text-slate-800 outline-none min-w-0 w-40"
                                        />
                                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                                            <input
                                                type="text" value={comp.weight}
                                                onChange={(e) => updateComponent(comp.id, { weight: e.target.value })}
                                                className="w-8 text-right text-sm font-bold text-mac-maroon outline-none"
                                            />
                                            <span className="text-xs text-slate-400">%</span>
                                        </div>
                                        {avg !== null && (
                                            <span className="text-[10px] font-mono text-mac-maroon bg-mac-maroon-light px-1.5 py-0.5 rounded">{avg.toFixed(1)}%</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onOpenImport(comp.id)} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300" title="Import marks from text">
                                            <Upload size={14} />
                                        </button>
                                        <button onClick={() => onOpenOcr(comp.id)} className="p-1.5 rounded-lg bg-mac-gold text-mac-maroon-dark hover:brightness-95" title="Scan marks from a screenshot">
                                            <ImageIcon size={14} />
                                        </button>
                                        <button
                                            onClick={() => addItem(comp.id)}
                                            className="bg-mac-maroon text-white px-3 py-1.5 rounded-lg hover:bg-mac-maroon-dark text-xs font-bold transition-all shadow-md shadow-mac-maroon/20 uppercase tracking-wider"
                                        >
                                            Add Entry
                                        </button>
                                        <button onClick={() => removeComponent(comp.id)} className="p-1.5 text-slate-300 hover:text-red-500" title="Delete component">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                                                <th className="px-6 py-2 font-black">SIM</th>
                                                <th className="px-6 py-2 font-black">Name</th>
                                                <th className="px-6 py-2 font-black">Score / Total</th>
                                                <th className="px-6 py-2 font-black text-center">WGT</th>
                                                <th className="px-6 py-2 font-black text-right pr-10">DEL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {comp.items.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-6 text-center text-slate-400 text-sm">
                                                        Not graded yet — counts toward your remaining weight.
                                                    </td>
                                                </tr>
                                            )}
                                            {comp.items.map(it => (
                                                <tr key={it.id} className={`transition-all ${!it.active ? 'bg-slate-50 opacity-40 grayscale' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-6 py-3 text-center">
                                                        <input
                                                            type="checkbox" checked={it.active}
                                                            onChange={() => updateItem(comp.id, it.id, 'active', !it.active)}
                                                            className="w-4 h-4 accent-mac-maroon rounded cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <input
                                                            value={it.name} onChange={(e) => updateItem(comp.id, it.id, 'name', e.target.value)}
                                                            className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none w-32"
                                                            placeholder="Name"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-1 font-mono text-xs">
                                                            <input
                                                                type="text" value={it.score} className="w-12 border border-slate-200 rounded p-1 text-center outline-none focus:border-mac-maroon"
                                                                onChange={(e) => updateItem(comp.id, it.id, 'score', e.target.value)}
                                                                placeholder="0"
                                                            />
                                                            <span className="text-slate-300">/</span>
                                                            <input
                                                                type="text" value={it.total} className="w-12 border border-slate-200 rounded p-1 text-center outline-none focus:border-mac-maroon"
                                                                onChange={(e) => updateItem(comp.id, it.id, 'total', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <input
                                                            type="text" value={it.weight} className="w-10 border border-slate-200 rounded p-1 text-[10px] text-center font-bold text-slate-500"
                                                            onChange={(e) => updateItem(comp.id, it.id, 'weight', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3 text-right pr-10">
                                                        <button onClick={() => removeItem(comp.id, it.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    <button
                        onClick={addComponent}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold text-sm hover:border-mac-maroon hover:text-mac-maroon transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Syllabus Component
                    </button>
                </div>

                {/* Sidebar Analytics */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4">
                            <BarChart3 className="text-mac-maroon" size={20} /> Course Breakdown
                        </h3>

                        <div className="space-y-5">
                            {stats.perComponent.map(c => (
                                <div key={c.id} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{c.name} ({c.weight}%)</span>
                                        <span className="text-sm font-bold text-slate-900">{c.avg === null ? '—' : `${c.avg.toFixed(1)}%`}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-mac-maroon transition-all duration-500" style={{ width: `${Math.min(100, c.avg ?? 0)}%` }}></div>
                                    </div>
                                </div>
                            ))}

                            <div className="p-8 bg-mac-maroon rounded-2xl shadow-2xl shadow-mac-maroon/30 text-white flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-mac-gold mb-2 border-b border-white/20 pb-1 w-full">
                                    {final?.manual ? 'Official Final' : 'Current Grade'}
                                </span>
                                {final ? (
                                    <>
                                        <span className="text-5xl font-black tabular-nums">
                                            {final.pct !== null ? final.pct.toFixed(1) : final.letter}
                                            {final.pct !== null && <span className="text-xl opacity-40">%</span>}
                                        </span>
                                        <div className="mt-3 flex items-center gap-3 text-sm">
                                            <span className="bg-mac-gold text-mac-maroon-dark font-black px-3 py-1 rounded-lg">{final.letter}</span>
                                            <span className="font-bold">{final.points}<span className="opacity-50">/12</span></span>
                                            <span className="opacity-70">{final.four.toFixed(1)}<span className="opacity-60">/4.0</span></span>
                                        </div>
                                        {!final.manual && stats.remainingWeight > 0 && (
                                            <p className="text-[10px] mt-3 opacity-70">
                                                Based on {stats.gradedWeight}% graded · range {stats.floor.toFixed(1)}–{stats.ceiling.toFixed(1)}%
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-3xl font-black opacity-60">—</span>
                                )}
                            </div>
                        </div>

                        <div className="bg-mac-gold-light border border-mac-gold p-5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Percent size={14} className="text-mac-maroon" />
                                <p className="text-[10px] font-black text-mac-maroon uppercase tracking-tight">Strategy Gap Analysis</p>
                            </div>
                            <p className="text-sm text-slate-700 leading-snug">{gapMessage}</p>
                            <p className="text-[10px] text-slate-500 mt-2">Components with at least one mark are assumed to stay at their current average.</p>
                        </div>
                    </div>

                    <div className="bg-slate-100 rounded-3xl p-6 space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest flex items-center gap-1">
                                <Target size={12} /> Target Letter Grade
                            </label>
                            <div className="grid grid-cols-6 gap-1.5">
                                {LETTERS.filter(l => l !== 'F').map(l => (
                                    <button
                                        key={l}
                                        onClick={() => update({ targetLetter: l })}
                                        className={`py-1.5 rounded-lg text-xs font-black transition-all ${course.targetLetter === l
                                            ? 'bg-mac-maroon text-white shadow-md'
                                            : 'bg-white text-slate-600 hover:bg-mac-maroon-light'
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {stats.gradedWeight > 0 && stats.remainingWeight > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">What's Still Possible</p>
                                <div className="bg-white rounded-xl overflow-hidden divide-y divide-slate-100">
                                    {GRADE_SCALE.filter(g => g.letter !== 'F').map(g => {
                                        const need = requiredOnRemaining(stats, g.min);
                                        const label = need <= 0 ? 'Secured' : need > 100 ? 'Out of reach' : `${need.toFixed(1)}%`;
                                        const tone = need <= 0 ? 'text-emerald-600' : need > 100 ? 'text-slate-300' : 'text-slate-700';
                                        return (
                                            <div key={g.letter} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                                <span className={`font-black w-8 ${gradeColor(g.points)}`}>{g.letter}</span>
                                                <span className="text-slate-400">{g.points}/12 · ≥{g.min}%</span>
                                                <span className={`font-bold w-24 text-right ${tone}`}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Average needed on the remaining {stats.remainingWeight}% for each letter.</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 uppercase tracking-widest font-bold opacity-60">
                            <Undo2 size={10} /> Tip: Toggle "Sim" checks to simulate dropped marks
                        </p>
                    </div>
                </div>
            </div>

            {/* Grade Progress Graph */}
            {chartData.length > 0 && (
                <div className="mt-8 bg-white rounded-3xl shadow-lg border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-mac-gold-light rounded-xl flex items-center justify-center">
                                <TrendingUp className="text-mac-maroon" size={22} />
                            </div>
                            Grade Progress
                        </h3>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Graded Entries</p>
                            <p className="text-2xl font-black text-slate-800">{chartData.length}</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="index"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={{ stroke: '#cbd5e1' }}
                                    label={{ value: 'Entry #', position: 'bottom', offset: 0, style: { fontSize: 11, fill: '#94a3b8' } }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={{ stroke: '#cbd5e1' }}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <ReferenceLine y={targetPct} stroke="#FDBF57" strokeDasharray="6 4" strokeWidth={2} label={{ value: `${course.targetLetter} target`, position: 'insideTopRight', fill: '#5C002D', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#5C002D',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        color: '#fff',
                                        padding: '12px 16px',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value, dataKey, props) => [`${value}%`, `${props.payload.name} (${props.payload.component})`]}
                                    labelFormatter={(label) => `Entry #${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="grade"
                                    stroke="#7A003C"
                                    strokeWidth={3}
                                    dot={{ fill: '#7A003C', strokeWidth: 3, r: 6, stroke: '#fff' }}
                                    activeDot={{ r: 8, fill: '#FDBF57', stroke: '#7A003C', strokeWidth: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </>
    );
};

export default CourseView;
