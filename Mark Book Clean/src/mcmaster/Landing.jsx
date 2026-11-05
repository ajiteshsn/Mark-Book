import React from 'react';
import {
    ChevronRight,
    FileUp,
    Target,
    LineChart,
    ShieldCheck,
    Calculator,
    ScanLine,
    Lock,
    Sparkles,
    CheckCircle2,
    UserX,
} from 'lucide-react';
import Logo from './Logo.jsx';

const FEATURES = [
    {
        icon: FileUp,
        title: 'Import your course outline',
        body: 'Drop in the PDF or Word outline. Mark Book reads the course code, units, term and grading breakdown for you.',
    },
    {
        icon: Target,
        title: 'Know what you need',
        body: 'Pick a target letter and see the exact average you need on everything that’s left, down to the final exam.',
    },
    {
        icon: Calculator,
        title: '12-point GPA, done right',
        body: 'Unit-weighted term, sessional and cumulative GPA on McMaster’s 12-point scale, with 4.0 equivalents.',
    },
    {
        icon: LineChart,
        title: 'Plan your CGPA',
        body: 'See your GPA term by term and work out the average you need to hit your goal by graduation.',
    },
    {
        icon: ShieldCheck,
        title: 'Program requirement checks',
        body: 'Level II entry, co-op eligibility, academic standing, Dean’s Honour List and scholarship renewal at a glance.',
    },
    {
        icon: ScanLine,
        title: 'Scan or paste your marks',
        body: 'Screenshot your Avenue to Learn grades or paste them in, and they’ll drop into the right component.',
    },
];

const STEPS = [
    ['Add your courses', 'Import each course outline, or set the weights yourself in seconds.'],
    ['Enter marks as they come back', 'Type them in, paste them or scan a screenshot.'],
    ['Plan ahead', 'Watch your projected grade, GPA and requirements update instantly.'],
];

const RULES = [
    ['3.5', 'B.Tech Level II entry & co-op CGPA'],
    ['4.0', 'B.Eng Level II & co-op minimum'],
    ['9.5', 'Dean’s Honour List average'],
    ['3.0–3.4', 'Academic probation range'],
];

// Static preview of the course screen for the hero
const HeroPreview = () => (
    <div className="relative w-full max-w-md mx-auto">
        <div className="absolute -inset-6 bg-mac-gold/30 blur-3xl rounded-full"></div>
        <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 rotate-1">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fall 2026</p>
                    <p className="font-black text-slate-800 text-lg">ENGTECH 1PR3</p>
                </div>
                <span className="bg-mac-maroon-light text-mac-maroon text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full">3 units</span>
            </div>
            <div className="space-y-3 mb-5">
                {[['Assignments', 20, 90], ['Midterm', 25, 70], ['Labs', 15, null], ['Final Exam', 40, null]].map(([name, w, avg]) => (
                    <div key={name}>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-bold text-slate-500">{name} ({w}%)</span>
                            <span className="font-bold text-slate-800">{avg === null ? '—' : `${avg}%`}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-mac-maroon rounded-full" style={{ width: `${avg ?? 0}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-mac-maroon rounded-2xl p-5 text-white flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black text-mac-gold uppercase tracking-widest">Current Grade</p>
                    <p className="text-4xl font-black">78.9<span className="text-lg opacity-50">%</span></p>
                </div>
                <div className="text-right">
                    <span className="bg-mac-gold text-mac-maroon-dark font-black px-3 py-1 rounded-lg">B+</span>
                    <p className="text-xs mt-2 opacity-80">9 / 12</p>
                </div>
            </div>
            <div className="mt-4 bg-mac-gold-light border border-mac-gold rounded-2xl p-4 text-sm text-slate-700">
                Need <b className="text-mac-maroon">80.9%</b> on the remaining 55% to finish with an <b className="text-mac-maroon">A-</b>.
            </div>
        </div>
        <div className="absolute -left-4 sm:-left-10 -bottom-8 bg-white rounded-2xl shadow-xl border border-slate-100 px-5 py-4 -rotate-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative GPA</p>
            <p className="text-2xl font-black text-mac-maroon">9.67<span className="text-xs text-slate-400 font-bold"> / 12</span></p>
        </div>
    </div>
);

const Landing = ({ onOpen, onImportOutline, summary }) => (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
        {/* Nav */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
            <Logo size={40} />
            <button
                onClick={() => onOpen()}
                className="bg-mac-maroon text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-mac-maroon-dark transition-all flex items-center gap-1"
            >
                Open App <ChevronRight size={16} />
            </button>
        </nav>

        {/* Hero */}
        <header className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-mac-gold-light/70 via-white to-white"></div>
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-24 grid lg:grid-cols-2 gap-16 items-center">
                <div>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-mac-gold text-mac-maroon text-xs font-bold px-3 py-1.5 rounded-full shadow-sm mb-6">
                        <Sparkles size={14} className="text-mac-gold" /> Built for McMaster's 12-point scale
                    </span>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-6">
                        Know exactly what you need on the <span className="text-mac-maroon">final.</span>
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                        Mark Book turns your course outlines into a live grade tracker. See your current grade, what you need to hit your target, and how it all adds up to your CGPA.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <button
                            onClick={() => onOpen()}
                            className="bg-mac-maroon text-white font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-mac-maroon-dark transition-all shadow-lg shadow-mac-maroon/25 active:scale-95"
                        >
                            {summary.courses > 0 ? 'Continue to Your Grades' : 'Start Tracking'} <ChevronRight size={20} />
                        </button>
                        <button
                            onClick={onImportOutline}
                            className="bg-white text-mac-maroon font-bold px-6 py-4 rounded-2xl flex items-center justify-center gap-2 border-2 border-mac-maroon/15 hover:border-mac-maroon transition-all"
                        >
                            <FileUp size={18} /> Import a Course Outline
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-600" /> Free</span>
                        <span className="flex items-center gap-1.5"><UserX size={16} className="text-emerald-600" /> No account needed</span>
                        <span className="flex items-center gap-1.5"><Lock size={16} className="text-emerald-600" /> Grades stay on your device</span>
                    </div>

                    {summary.courses > 0 && (
                        <div className="mt-8 inline-flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your CGPA</p>
                                <p className="text-xl font-black text-mac-maroon">{summary.cgpa !== null ? summary.cgpa.toFixed(2) : '—'}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Courses</p>
                                <p className="text-xl font-black text-slate-800">{summary.courses}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Program</p>
                                <p className="text-sm font-bold text-slate-700">{summary.degree} {summary.program.split(' ')[0]}</p>
                            </div>
                        </div>
                    )}
                </div>
                <HeroPreview />
            </div>
        </header>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <p className="text-xs font-black text-mac-maroon uppercase tracking-[0.2em] mb-3">Everything in one place</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-12 max-w-2xl">From your first quiz to your final CGPA.</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                    <div key={title} className="group bg-slate-50 hover:bg-white border border-slate-100 hover:border-mac-maroon/20 hover:shadow-xl rounded-3xl p-7 transition-all">
                        <div className="w-12 h-12 bg-mac-maroon rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                            <Icon className="text-mac-gold" size={22} />
                        </div>
                        <h3 className="font-black text-lg mb-2">{title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-50 border-y border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-12 text-center">Up and running in a minute</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {STEPS.map(([title, body], i) => (
                        <div key={title} className="text-center">
                            <div className="w-14 h-14 mx-auto bg-mac-gold text-mac-maroon-dark rounded-full flex items-center justify-center text-xl font-black mb-4 shadow-md">{i + 1}</div>
                            <h3 className="font-black text-lg mb-2">{title}</h3>
                            <p className="text-sm text-slate-600 max-w-xs mx-auto">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* McMaster rules band */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <div className="bg-mac-maroon rounded-[2rem] p-8 sm:p-12 text-white relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-72 h-72 bg-mac-gold/20 rounded-full blur-2xl"></div>
                <div className="relative grid lg:grid-cols-2 gap-10 items-center">
                    <div>
                        <p className="text-xs font-black text-mac-gold uppercase tracking-[0.2em] mb-3">Built around McMaster's rules</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Always know where you stand.</h2>
                        <p className="text-white/75 leading-relaxed mb-6">
                            Mark Book checks your GPA against the numbers that matter for your program, with a link to the source for each one.
                        </p>
                        <button
                            onClick={() => onOpen('requirements')}
                            className="bg-mac-gold text-mac-maroon-dark font-black px-6 py-3.5 rounded-2xl inline-flex items-center gap-2 hover:brightness-105 transition-all"
                        >
                            Check My Requirements <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {RULES.map(([num, label]) => (
                            <div key={label} className="bg-white/10 border border-white/15 rounded-2xl p-5">
                                <p className="text-3xl font-black text-mac-gold">{num}</p>
                                <p className="text-xs text-white/75 mt-1 leading-snug">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <Logo size={32} />
                <p className="text-xs text-slate-400 text-center md:text-right max-w-md leading-relaxed">
                    An unofficial student tool, not affiliated with or endorsed by McMaster University. Requirements can change each year, so always confirm with the Undergraduate Calendar or your academic advisor.
                </p>
            </div>
        </footer>
    </div>
);

export default Landing;
