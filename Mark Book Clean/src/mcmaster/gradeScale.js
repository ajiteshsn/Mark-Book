// McMaster undergraduate grading scale
// Source: Office of the Registrar - https://registrar.mcmaster.ca/exams-grades/grades/
export const GRADE_SCALE_SOURCE = 'https://registrar.mcmaster.ca/exams-grades/grades/';

export const GRADE_SCALE = [
    { letter: 'A+', points: 12, min: 90, max: 100, four: 4.0 },
    { letter: 'A', points: 11, min: 85, max: 89, four: 3.9 },
    { letter: 'A-', points: 10, min: 80, max: 84, four: 3.7 },
    { letter: 'B+', points: 9, min: 77, max: 79, four: 3.3 },
    { letter: 'B', points: 8, min: 73, max: 76, four: 3.0 },
    { letter: 'B-', points: 7, min: 70, max: 72, four: 2.7 },
    { letter: 'C+', points: 6, min: 67, max: 69, four: 2.3 },
    { letter: 'C', points: 5, min: 63, max: 66, four: 2.0 },
    { letter: 'C-', points: 4, min: 60, max: 62, four: 1.7 },
    { letter: 'D+', points: 3, min: 57, max: 59, four: 1.3 },
    { letter: 'D', points: 2, min: 53, max: 56, four: 1.0 },
    { letter: 'D-', points: 1, min: 50, max: 52, four: 0.7 },
    { letter: 'F', points: 0, min: 0, max: 49, four: 0 },
];

export const LETTERS = GRADE_SCALE.map(g => g.letter);

// roundingMode: 'none' -> 79.9 stays B+; 'nearest' -> 79.5 rounds up to A-
// (rounding at band edges is the instructor's call, so it's a user setting)
export const percentToGrade = (pct, roundingMode = 'none') => {
    if (pct === null || pct === undefined || isNaN(pct)) return null;
    const p = roundingMode === 'nearest' ? Math.round(pct) : pct;
    return GRADE_SCALE.find(g => p >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
};

export const letterToGrade = (letter) => {
    if (!letter) return null;
    const norm = String(letter).trim().toUpperCase();
    return GRADE_SCALE.find(g => g.letter === norm) || null;
};

export const letterLowerBound = (letter) => letterToGrade(letter)?.min ?? null;

// Approximate a 12-point average on the Registrar's 4.0 column by interpolating
// between the two neighbouring letter grades
export const pointsToFourScale = (points) => {
    if (points === null || points === undefined || isNaN(points)) return null;
    const asc = [...GRADE_SCALE].reverse();
    if (points <= 0) return 0;
    if (points >= 12) return 4.0;
    const lo = asc[Math.floor(points)];
    const hi = asc[Math.ceil(points)];
    if (lo === hi) return lo.four;
    return lo.four + (hi.four - lo.four) * (points - Math.floor(points));
};

export const gradeColor = (points) => {
    if (points === null || points === undefined) return 'text-slate-400';
    if (points >= 10) return 'text-emerald-600';
    if (points >= 7) return 'text-mac-maroon';
    if (points >= 4) return 'text-amber-600';
    return 'text-red-600';
};
