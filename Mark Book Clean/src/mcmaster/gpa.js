import { percentToGrade, letterToGrade } from './gradeScale.js';

const parseVal = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

const isGraded = (item) => item.active && item.score !== '' && item.score !== null && item.score !== undefined && parseVal(item.total) > 0;

// Statuses that never count toward GPA units (Registrar: P/COM/transfer/extra are excluded)
export const NON_GPA_STATUSES = ['pass-fail', 'transfer'];

// Weighted average of one syllabus component (e.g. "Labs 15%") from its graded, active items
export const componentAverage = (component) => {
    let weighted = 0;
    let totalWeight = 0;
    (component.items || []).filter(isGraded).forEach(item => {
        const w = parseVal(item.weight) || 1;
        weighted += (parseVal(item.score) / parseVal(item.total)) * 100 * w;
        totalWeight += w;
    });
    return totalWeight > 0 ? weighted / totalWeight : null;
};

// Course standing from its syllabus components.
// A component counts as "graded" once it has at least one graded item; the rest is still up for grabs.
export const courseStats = (course) => {
    const components = course.components || [];
    let earnedPoints = 0;
    let gradedWeight = 0;
    let totalWeight = 0;
    const perComponent = components.map(c => {
        const weight = parseVal(c.weight);
        const avg = componentAverage(c);
        totalWeight += weight;
        if (avg !== null) {
            earnedPoints += avg * (weight / 100);
            gradedWeight += weight;
        }
        return { id: c.id, name: c.name, weight, avg };
    });
    const current = gradedWeight > 0 ? earnedPoints / (gradedWeight / 100) : null;
    return {
        perComponent,
        earnedPoints,
        gradedWeight,
        totalWeight,
        remainingWeight: Math.max(0, totalWeight - gradedWeight),
        current,
        // Worst / best case if every remaining component scored 0% / 100%
        floor: totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : null,
        ceiling: totalWeight > 0 ? ((earnedPoints + Math.max(0, totalWeight - gradedWeight)) / totalWeight) * 100 : null,
    };
};

// % needed across the ungraded weight to finish the course at targetPct
export const requiredOnRemaining = (stats, targetPct) => {
    if (!stats || stats.remainingWeight <= 0) return null;
    const scale = stats.totalWeight > 0 ? stats.totalWeight / 100 : 1;
    return (targetPct * scale - stats.earnedPoints) / (stats.remainingWeight / 100);
};

// The final (or projected) grade of a course: a manual final overrides the calculator
export const courseFinal = (course, settings = {}) => {
    const manual = course.manualFinal;
    if (manual !== null && manual !== undefined && String(manual).trim() !== '') {
        const byLetter = letterToGrade(manual);
        if (byLetter) return { pct: null, ...byLetter, manual: true };
        const n = parseFloat(manual);
        if (!isNaN(n)) return { pct: n, ...percentToGrade(n, settings.roundingMode), manual: true };
    }
    const stats = courseStats(course);
    if (stats.current === null) return null;
    return { pct: stats.current, ...percentToGrade(stats.current, settings.roundingMode), manual: false };
};

// Unit-weighted GPA on the 12-point scale (and the matching 4.0 average, converted course by course)
export const gpaOf = (courses, settings = {}) => {
    let units = 0;
    let points = 0;
    let four = 0;
    let failures = 0;
    courses.forEach(course => {
        if (NON_GPA_STATUSES.includes(course.status)) return;
        if (course.status !== 'completed' && settings.includeInProgress === false) return;
        const final = courseFinal(course, settings);
        if (!final) return;
        const u = parseVal(course.units);
        if (u <= 0) return;
        units += u;
        points += u * final.points;
        four += u * final.four;
        if (final.points === 0) failures += 1;
    });
    return {
        gpa: units > 0 ? points / units : null,
        four: units > 0 ? four / units : null,
        units,
        failures,
    };
};

export const allCourses = (terms) => terms.flatMap(t => t.courses || []);

export const termGPA = (term, settings) => gpaOf(term.courses || [], settings);

export const cumulativeGPA = (terms, settings) => gpaOf(allCourses(terms), settings);

const SESSION_ORDER = { winter: 0, spring: 1, summer: 2, fall: 3 };

export const sortTerms = (terms) => [...terms].sort((a, b) =>
    (parseInt(a.year) - parseInt(b.year)) || (SESSION_ORDER[a.session] - SESSION_ORDER[b.session]));

// CGPA as it stood after each term, oldest first
export const cgpaTimeline = (terms, settings) => {
    const sorted = sortTerms(terms);
    return sorted.map((term, idx) => ({
        term: term.name,
        termGPA: termGPA(term, settings).gpa,
        cgpa: cumulativeGPA(sorted.slice(0, idx + 1), settings).gpa,
    }));
};

// Fall of year Y and Winter/Spring/Summer of Y+1 belong to academic year Y
export const academicYearOf = (term) => term.session === 'fall' ? parseInt(term.year) : parseInt(term.year) - 1;

// Sessional (Fall/Winter) average - what the Dean's Honour List and most renewable awards look at
export const sessionalGPA = (terms, academicYear, settings) => {
    const courses = terms
        .filter(t => (t.session === 'fall' || t.session === 'winter') && academicYearOf(t) === academicYear)
        .flatMap(t => t.courses || []);
    return gpaOf(courses, settings);
};

export const academicYears = (terms) => [...new Set(terms.map(academicYearOf))].filter(y => !isNaN(y)).sort((a, b) => a - b);

// Most recent academic year that actually has Fall/Winter grades (an empty new term shouldn't blank it out)
export const latestSessional = (terms, settings) => {
    const years = academicYears(terms);
    for (let i = years.length - 1; i >= 0; i--) {
        const s = sessionalGPA(terms, years[i], settings);
        if (s.gpa !== null) return { ...s, year: years[i] };
    }
    return null;
};

// A McMaster course code ends in level digit + letters + unit digit (ENGTECH 1PR3 -> 3, 1ET0 -> 0)
export const unitsFromCode = (code) => {
    const m = String(code || '').trim().match(/\d[A-Z]{1,3}(\d)$/i);
    return m ? parseInt(m[1]) : null;
};

// Units earned towards the degree: passed courses plus pass/fail and transfer credit
export const unitsEarned = (terms, settings) => allCourses(terms).reduce((sum, course) => {
    if (course.status !== 'completed' && settings?.includeInProgress === false) return sum;
    if (NON_GPA_STATUSES.includes(course.status)) return sum + parseVal(course.units);
    const final = courseFinal(course, settings);
    return final && final.points > 0 ? sum + parseVal(course.units) : sum;
}, 0);

// Calendar unit-based levels (non-co-op programs; co-op programs may differ)
export const levelFromUnits = (units) => {
    if (units < 24) return 1;
    if (units < 54) return 2;
    if (units < 84) return 3;
    return 4;
};

// Average needed over plannedUnits to land on targetGPA
export const requiredFutureGPA = (currentGPA, unitsDone, targetGPA, plannedUnits) => {
    if (!(plannedUnits > 0)) return null;
    const cur = currentGPA ?? 0;
    return (targetGPA * (unitsDone + plannedUnits) - cur * unitsDone) / plannedUnits;
};
