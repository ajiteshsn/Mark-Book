// McMaster GPA requirements, researched 2026-11-05.
// These change between calendar years - every row carries its source and a confidence flag,
// and the UI always tells students to confirm with the Academic Calendar.

export const VERIFIED_ON = '2026-11-05';
export const CALENDAR_URL = 'https://academiccalendars.romcmaster.ca/';

export const DEGREES = {
    'B.Tech': [
        'Automation Engineering Technology',
        'Automotive & Vehicle Engineering Technology',
        'Biotechnology',
        'Degree Completion Program (DCP)',
    ],
    'B.Eng': ['Engineering I', 'Level II+ Engineering program'],
    'Other': ['Other McMaster program'],
};

const SOURCES = {
    standing: 'https://undergraduate.science.mcmaster.ca/?p=3416',
    automation: 'https://academiccalendars.romcmaster.ca/preview_degree_planner.php?catoid=24&poid=14084&print=',
    automotive: 'https://academiccalendars.romcmaster.ca/preview_degree_planner.php?catoid=7&poid=4052&print=',
    engFaq: 'https://www.eng.mcmaster.ca/future-students/future-undergraduate-students/how-to-apply/faqs/',
    coop: 'https://www.eng.mcmaster.ca/co-op-career-experience/how-co-op-works/co-op-policies/',
    dcpCoop: 'https://eng.mcmaster.ca//app/uploads/2024/12/B.Tech-DCP-Co-op-Registration-Criteria.pdf',
    deansList: 'https://macinsiders.com/showthread.php/deans-honour-list-41894.html',
    hatch: 'https://ouinfo.ca/scholarships/1715',
};

// How close to a threshold counts as "at risk"
const RISK_MARGIN = 0.5;

const fmt = (v) => (v === null || v === undefined ? '—' : v.toFixed(2));

const thresholdStatus = (value, threshold) => {
    if (value === null || value === undefined) return 'na';
    if (value < threshold) return 'notmet';
    if (value < threshold + RISK_MARGIN) return 'risk';
    return 'met';
};

const hasPassed = (ctx, code) => ctx.passedCodes.includes(code.replace(/\s+/g, '').toUpperCase());

// ctx: { cgpa, units, sessional: { gpa, units, failures, year }, passedCodes, profile }
export const REQUIREMENTS = [
    {
        id: 'standing',
        category: 'Academic standing',
        label: 'Good academic standing',
        appliesTo: () => true,
        rule: 'CGPA ≥ 3.5 is good standing. 3.0–3.4 → Academic Probation. Below 3.0 → May Not Continue at the University. On probation and still below 3.5 at the next review → Required to Withdraw.',
        source: SOURCES.standing,
        confidence: 'high',
        evaluate: (ctx) => {
            const v = ctx.cgpa;
            if (v === null) return { status: 'na', value: '—', detail: 'Add graded courses to see your standing.' };
            if (v >= 3.5) return { status: v < 4.0 ? 'risk' : 'met', value: fmt(v), detail: v < 4.0 ? 'Good standing, but close to the probation line.' : 'Good standing.' };
            if (v >= 3.0) return { status: 'risk', value: fmt(v), detail: 'Academic Probation range (3.0–3.4).' };
            return { status: 'notmet', value: fmt(v), detail: 'Below 3.0 — May Not Continue at the University.' };
        },
    },
    {
        id: 'btech-automation-l2',
        category: 'Level II entry',
        label: 'Automation Eng. Tech — Level II',
        appliesTo: (p) => p.degree === 'B.Tech' && p.program === 'Automation Engineering Technology',
        rule: 'Complete Automation Engineering Technology I, including ENGTECH 1AC3 and ENGTECH 1PR3, with a GPA of at least 3.5.',
        source: SOURCES.automation,
        confidence: 'high',
        evaluate: (ctx) => {
            const missing = ['ENGTECH 1AC3', 'ENGTECH 1PR3'].filter(c => !hasPassed(ctx, c));
            const base = thresholdStatus(ctx.cgpa, 3.5);
            const status = base === 'notmet' ? 'notmet' : missing.length ? (base === 'na' ? 'na' : 'risk') : base;
            const detail = missing.length
                ? `GPA ${fmt(ctx.cgpa)} vs 3.5 — still need to pass ${missing.join(' & ')}.`
                : `GPA ${fmt(ctx.cgpa)} vs 3.5 required. Key courses passed.`;
            return { status, value: fmt(ctx.cgpa), detail };
        },
    },
    {
        id: 'btech-automotive-l2',
        category: 'Level II entry',
        label: 'Automotive & Vehicle Eng. Tech — Level II',
        appliesTo: (p) => p.degree === 'B.Tech' && p.program === 'Automotive & Vehicle Engineering Technology',
        rule: 'Complete B.Tech I with a Cumulative Average (CA) of at least 3.5.',
        source: SOURCES.automotive,
        confidence: 'high',
        evaluate: (ctx) => ({ status: thresholdStatus(ctx.cgpa, 3.5), value: fmt(ctx.cgpa), detail: `CA ${fmt(ctx.cgpa)} vs 3.5 required.` }),
    },
    {
        id: 'btech-biotech-l2',
        category: 'Level II entry',
        label: 'Biotechnology — Level II',
        appliesTo: (p) => p.degree === 'B.Tech' && p.program === 'Biotechnology',
        rule: 'Not confirmed in research. Other B.Tech streams require a 3.5 GPA after Level I; check the Biotechnology calendar page for the exact rule.',
        source: 'https://academiccalendars.romcmaster.ca/',
        confidence: 'low',
        evaluate: (ctx) => ({ status: thresholdStatus(ctx.cgpa, 3.5), value: fmt(ctx.cgpa), detail: `Compared against 3.5 (assumed — verify).` }),
    },
    {
        id: 'beng-continue',
        category: 'Level II entry',
        label: 'Engineering I → Level II / continue in Engineering',
        appliesTo: (p) => p.degree === 'B.Eng',
        rule: 'A GPA of at least 4.0 is required to move into Level II and to continue in Engineering. Cut-offs for specific Level II programs vary with demand and are usually higher.',
        source: SOURCES.engFaq,
        confidence: 'high',
        evaluate: (ctx) => ({ status: thresholdStatus(ctx.cgpa, 4.0), value: fmt(ctx.cgpa), detail: `GPA ${fmt(ctx.cgpa)} vs 4.0 minimum (competitive programs need more).` }),
    },
    {
        id: 'coop-btech',
        category: 'Co-op',
        label: 'Co-op eligibility (B.Tech)',
        appliesTo: (p) => p.coop && p.degree === 'B.Tech' && !p.program.startsWith('Degree Completion'),
        rule: 'CGPA ≥ 3.5, full-time (≥ 9 units) in the terms before and after the work term, and ENGTECH 1ET0 completed with COM.',
        source: SOURCES.coop,
        confidence: 'high',
        evaluate: (ctx) => {
            const prep = hasPassed(ctx, 'ENGTECH 1ET0');
            const base = thresholdStatus(ctx.cgpa, 3.5);
            return {
                status: base === 'met' && !prep ? 'risk' : base,
                value: fmt(ctx.cgpa),
                detail: `CGPA ${fmt(ctx.cgpa)} vs 3.5.${prep ? '' : ' Add ENGTECH 1ET0 with status Pass/Fail and official final COM once you have it.'}`,
            };
        },
    },
    {
        id: 'coop-dcp',
        category: 'Co-op',
        label: 'Co-op registration (B.Tech DCP)',
        appliesTo: (p) => p.coop && p.degree === 'B.Tech' && p.program.startsWith('Degree Completion'),
        rule: 'Full-time: ≥ 9 units in the terms before and after the work term. Part-time: ≥ 3 units. A second 4-month term needs ≥ 9 units still remaining in the degree.',
        source: SOURCES.dcpCoop,
        confidence: 'high',
        evaluate: () => ({ status: 'info', value: '', detail: 'Unit-load rule — check your planned terms.' }),
    },
    {
        id: 'coop-beng',
        category: 'Co-op',
        label: 'Co-op eligibility (B.Eng / CompSci / IBEHS)',
        appliesTo: (p) => p.coop && p.degree === 'B.Eng',
        rule: 'CGPA ≥ 4.0, full-time (≥ 9 units) in the terms before and after the work term, and the co-op prep course (ENGINEER 1EE0 / 701) completed with COM.',
        source: SOURCES.coop,
        confidence: 'high',
        evaluate: (ctx) => ({ status: thresholdStatus(ctx.cgpa, 4.0), value: fmt(ctx.cgpa), detail: `CGPA ${fmt(ctx.cgpa)} vs 4.0.` }),
    },
    {
        id: 'coop-other',
        category: 'Co-op',
        label: 'Co-op eligibility (other faculties)',
        appliesTo: (p) => p.coop && p.degree === 'Other',
        rule: 'Only Engineering-faculty co-op rules are built in. Science, Business, Humanities and Social Sciences set their own co-op GPA minimums.',
        source: CALENDAR_URL,
        confidence: 'low',
        evaluate: (ctx) => ({ status: 'info', value: fmt(ctx.cgpa), detail: `Your CGPA is ${fmt(ctx.cgpa)} — check the minimum with your faculty's co-op office.` }),
    },
    {
        id: 'deans-list',
        category: 'Honours',
        label: "Dean's Honour List",
        appliesTo: () => true,
        rule: 'An average of at least 9.5 on at least 30 units completed since the previous review (usually the Fall/Winter sessional average).',
        source: SOURCES.deansList,
        confidence: 'medium',
        evaluate: (ctx) => {
            const s = ctx.sessional;
            if (!s || s.gpa === null) return { status: 'na', value: '—', detail: 'No Fall/Winter grades yet.' };
            const enoughUnits = s.units >= 30;
            const base = thresholdStatus(s.gpa, 9.5);
            return {
                status: base === 'met' && !enoughUnits ? 'risk' : base,
                value: fmt(s.gpa),
                detail: `${s.year}–${s.year + 1} sessional ${fmt(s.gpa)} vs 9.5 on ${s.units}/30 units.`,
            };
        },
    },
];

// Renewable award rules differ per award - students edit these presets
export const DEFAULT_SCHOLARSHIPS = [
    {
        id: 'hatch',
        name: 'Hatch Scholarship (example preset)',
        minAvg: 9.5,
        minUnits: 24,
        noFailures: true,
        source: SOURCES.hatch,
    },
];

export const evaluateScholarship = (sch, ctx) => {
    const s = ctx.sessional;
    if (!s || s.gpa === null) return { status: 'na', value: '—', detail: 'No Fall/Winter grades yet.' };
    const problems = [];
    if (s.units < sch.minUnits) problems.push(`${s.units}/${sch.minUnits} units`);
    if (sch.noFailures && s.failures > 0) problems.push(`${s.failures} failure(s)`);
    let status = thresholdStatus(s.gpa, parseFloat(sch.minAvg) || 0);
    if (status === 'met' && problems.length) status = 'risk';
    return {
        status,
        value: fmt(s.gpa),
        detail: `Sessional ${fmt(s.gpa)} vs ${sch.minAvg}${problems.length ? ` — ${problems.join(', ')}` : ''}.`,
    };
};
