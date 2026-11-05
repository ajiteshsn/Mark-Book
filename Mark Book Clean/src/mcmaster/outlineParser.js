// Pulls the course details and grading breakdown out of a course outline's plain text.
// Heuristic by design: everything it finds is shown to the student for review before it's applied.

const PCT = /(\d{1,3}(?:\.\d+)?)\s*(?:%|percent\b)/gi;
const PCT_ONLY_LINE = /^\s*\d{1,3}(?:\.\d+)?\s*%\s*$/;

// Lines that mention a percentage but aren't a graded component
const NOISE = /(\blate\b|penalt|deduct|per\s+day|reduc|polic|bonus|extra\s+credit|plagiar|academic\s+(?:dishonesty|integrity)|at\s+least|minimum|must\s+(?:achieve|obtain|pass|receive|score)|shift|re-?weight|transferr|moved\s+to|msaf|curve|scaled|grade\s+of\s+\d|accommodat|discretion|attendance\s+is\s+mandatory)/i;
const TOTAL = /^\s*(?:total|overall|sum|grand\s+total)\b/i;
const SECTION_HEADER = /\b(evaluation|assessments?|grading|marking|grade\s+(?:breakdown|distribution|weighting|calculation)|breakdown|weighting|course\s+requirements|methods?\s+of\s+(?:evaluation|assessment))\b/i;

const COUNTABLE = '(?:labs?|assignments?|quiz(?:zes)?|tests?|tutorials?|problem\\s+sets?|homeworks?|reports?|presentations?|projects?|deliverables?|reflections?|exercises?|worksheets?|modules?|milestones?|activities)';
const COUNT_PREFIX = new RegExp(`\\b(\\d{1,2})\\s+(?:[a-z-]+\\s+)?${COUNTABLE}\\b`, 'i');

const COMPONENT_WORDS = /\b(?:final\s+(?:exam(?:ination)?|project|test|report)|mid-?term(?:\s+(?:test|exam))?|design\s+project|term\s+(?:paper|project|test)|labs?|assignments?|quiz(?:zes)?|tests?|tutorials?|projects?|participation|presentations?|reports?|homework|problem\s+sets?|essays?|portfolio|reflections?)\b/i;

const titleCase = (s) => s.replace(/\s+/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase());

const singularize = (word) => word
    .replace(/zzes$/i, 'z')
    .replace(/ies$/i, 'y')
    .replace(/s$/i, '');

const MONTH_DATE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b.*$/i;

export const SESSION_NAMES = { fall: 'Fall', winter: 'Winter', spring: 'Spring', summer: 'Summer' };

const normalize = (text) => String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/ /g, ' ')
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .filter(l => l.trim());

// Paragraph-style outlines: give each sentence its own line so one penalty clause doesn't sink the rest
const splitSentences = (lines) => lines.flatMap(line =>
    line.length > 100 ? line.split(/(?<=[.;!?])\s+(?=[A-Z])/) : [line]);

// Word tables often put "20%" in its own cell/line - join it back onto its label
const mergeOrphanPercents = (lines) => {
    const out = [];
    lines.forEach(line => {
        if (PCT_ONLY_LINE.test(line) && out.length && !/%/.test(out[out.length - 1])) {
            out[out.length - 1] = `${out[out.length - 1]}  ${line.trim()}`;
        } else {
            out.push(line);
        }
    });
    return out;
};

export const findCourseCode = (text) => {
    const counts = new Map();
    for (const m of String(text).matchAll(/\b([A-Z]{2,9})[ \t]?(\d[A-Z]{1,3}\d)\b/g)) {
        const code = `${m[1]} ${m[2]}`;
        counts.set(code, (counts.get(code) || 0) + 1);
    }
    let best = null;
    counts.forEach((n, code) => {
        if (!best || n > best.n) best = { code, n };
    });
    return best?.code || null;
};

const cleanTitle = (s) => s
    .replace(/\b(?:course\s+)?(?:outline|syllabus)\b/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/^[\s:–—|,.-]+/, '')
    .split(/\s[|–—-]\s|\s{2,}/)[0]
    .replace(/^[\s:–—|,.-]+|[\s:–—|,.-]+$/g, '')
    .trim();

export const findTitle = (lines, code) => {
    for (const line of lines) {
        const m = line.match(/^\s*(?:course\s+(?:title|name)|title)\s*[:–-]\s*(.+)$/i);
        if (m && cleanTitle(m[1]).length >= 4) return cleanTitle(m[1]);
    }
    if (!code) return '';
    const [subject, number] = code.split(' ');
    const codeRe = new RegExp(`${subject}\\s?${number}`);
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(codeRe);
        if (!m) continue;
        const rest = cleanTitle(lines[i].slice(m.index + m[0].length));
        if (/[a-z]{3}/i.test(rest) && rest.length >= 4 && !/^(?:fall|winter|spring|summer)\b/i.test(rest)) return rest.slice(0, 80);
        const next = lines[i + 1] ? cleanTitle(lines[i + 1]) : '';
        if (next.length >= 4 && next.length <= 80 && /[a-z]{3}/i.test(next) && !/[:@]/.test(lines[i + 1]) && !SECTION_HEADER.test(next)) {
            return next;
        }
        return '';
    }
    return '';
};

export const findTerm = (text) => {
    const t = String(text);
    let m = t.match(/\b(fall|autumn|winter|spring|summer)\b(?:\s*\/\s*summer)?[\s,/-]*(?:term|semester|session)?[\s,/-]*(20\d{2})\b/i);
    if (m) return { session: m[1].toLowerCase() === 'autumn' ? 'fall' : m[1].toLowerCase(), year: parseInt(m[2]) };
    m = t.match(/\b(20\d{2})[\s,/-]*(fall|autumn|winter|spring|summer)\b/i);
    if (m) return { session: m[2].toLowerCase() === 'autumn' ? 'fall' : m[2].toLowerCase(), year: parseInt(m[1]) };
    return null;
};

const cleanComponentName = (line) => {
    const s = line
        .replace(/(\d{1,2})\s*[x×]\s*\d{1,3}(?:\.\d+)?\s*%/gi, ' ')
        .replace(/\d{1,3}(?:\.\d+)?\s*(?:%|percent\b)(?:\s*each)?/gi, ' ')
        .replace(/\bof\s+(?:the|your)\s+(?:final|overall|total|course)\s+(?:grade|mark)\b/gi, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\b(?:due|week|wk|weekly|tba|tbd)\b.*$/i, ' ')
        .replace(MONTH_DATE, ' ')
        .replace(/^[\s•·*▪◦►–—-]+/, '')
        .replace(/^\d{1,2}[.)]\s+/, '')
        .replace(/\b(?:worth|weighted|weight|is|are|will\s+be|counts?\s+(?:for|towards?)|each|the)\b/gi, ' ')
        .replace(/[|:.–—_,;=]+/g, ' ')
        .replace(/\s-\s/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .replace(/^\d{1,2}\s+(?=[a-z])/i, '')
        .trim();
    if (!/[a-z]{3}/i.test(s)) return null;
    if (s.split(' ').length > 6) return null; // a sentence, not a component label
    return s.slice(0, 40);
};

export const parseComponentLine = (line) => {
    if (NOISE.test(line) || TOTAL.test(line)) return null;
    let weight;
    let count = null;
    let m;
    if ((m = line.match(/(\d{1,2})\s*[x×]\s*(\d{1,3}(?:\.\d+)?)\s*%/i))) {
        count = parseInt(m[1]);
        weight = count * parseFloat(m[2]);
    } else if ((m = line.match(/(\d{1,3}(?:\.\d+)?)\s*%\s*each/i))) {
        const n = line.match(COUNT_PREFIX) || line.match(/\((\d{1,2})\)/);
        if (!n) return null;
        count = parseInt(n[1]);
        weight = count * parseFloat(m[1]);
    } else {
        const all = [...line.matchAll(PCT)];
        if (!all.length) return null;
        weight = parseFloat(all[0][1]);
        const n = line.match(/\((\d{1,2})\)/) || line.match(COUNT_PREFIX);
        if (n) count = parseInt(n[1]);
    }
    if (!(weight > 0 && weight <= 100)) return null;
    // Table rows ("Labs (10) | 15% | Weekly"): the name is in the cells before the weight
    const cells = line.split(/\s{3,}|\s*\|\s*/).filter(c => c.trim());
    const pctCell = cells.findIndex(c => /%|percent/i.test(c));
    const nameSource = cells.length >= 2 && pctCell > 0 ? cells.slice(0, pctCell).join(' ') : line;
    let name = cleanComponentName(nameSource);
    // In prose ("The midterm is worth 30% of the final grade") fall back to a known component word
    if (!name || line.length > 70) {
        const vocab = line.match(COMPONENT_WORDS);
        name = vocab ? titleCase(vocab[0]) : null;
    }
    if (!name) return null;
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return { name, weight: Math.round(weight * 100) / 100, count: count && count > 1 && count <= 30 ? count : null };
};

// First run of consecutive entries that adds up to 100%
const runTo100 = (entries) => {
    for (let i = 0; i < entries.length; i++) {
        let sum = 0;
        for (let j = i; j < entries.length; j++) {
            sum += entries[j].weight;
            if (Math.abs(sum - 100) < 0.51) return entries.slice(i, j + 1);
            if (sum > 100.5) break;
        }
    }
    return null;
};

const pluralize = (word) => {
    if (/s$/i.test(word)) return word;
    if (/z$/i.test(word)) return `${word}zes`;
    return `${word}s`;
};

// "Lab 1 5%, Lab 2 5%" -> one "Labs" component (10%) with two items; "4 x 5% Assignments" -> 4 items
const groupComponents = (entries, makeId) => {
    const groups = [];
    const byKey = new Map();
    entries.forEach(e => {
        const base = e.name.replace(/\s*(?:#|no\.?)?\s*\d{1,2}[a-z]?$/i, '').trim();
        const numbered = base !== e.name && base.length >= 3;
        const key = numbered ? base.toLowerCase().replace(/s$/, '') : null;
        if (key && byKey.has(key)) {
            const g = byKey.get(key);
            g.weight += e.weight;
            g.items.push({ name: e.name, weight: e.weight });
            return;
        }
        const g = numbered
            ? { name: base, weight: e.weight, items: [{ name: e.name, weight: e.weight }], numbered: true }
            : { name: e.name, weight: e.weight, items: [], count: e.count };
        groups.push(g);
        if (key) byKey.set(key, g);
    });
    return groups.map(g => {
        // A lone "Midterm 1" is just a component, not a group
        if (g.numbered && g.items.length === 1) {
            g.name = g.items[0].name;
            g.numbered = false;
            g.items = [];
        }
        let items;
        if (g.numbered) {
            items = g.items.map(it => ({ id: makeId(), name: it.name, score: '', total: 100, weight: it.weight, active: true }));
        } else if (g.count) {
            const base = singularize(g.name);
            items = Array.from({ length: g.count }, (_, i) => ({ id: makeId(), name: `${base} ${i + 1}`, score: '', total: 100, weight: 1, active: true }));
        } else {
            items = [];
        }
        const name = g.numbered && g.items.length > 1 ? pluralize(g.name) : g.name;
        return {
            id: `comp-${makeId()}`,
            name,
            weight: Math.round(g.weight * 100) / 100,
            isFinalExam: /final\s+(?:exam|examination|test|assessment)/i.test(name),
            items,
        };
    });
};

export const findComponents = (lines, makeId) => {
    const entries = [];
    lines.forEach((line, idx) => {
        const parsed = parseComponentLine(line);
        if (parsed) entries.push({ ...parsed, line: idx });
    });
    if (!entries.length) return { components: [], total: 0, exact: false };

    // Prefer an exact-100% run that starts after a grading/evaluation heading
    const headerLines = lines.map((l, i) => (l.length < 80 && SECTION_HEADER.test(l) ? i : -1)).filter(i => i >= 0);
    let chosen = null;
    for (const h of headerLines) {
        const run = runTo100(entries.filter(e => e.line > h && e.line <= h + 60));
        if (run) { chosen = run; break; }
    }
    if (!chosen) chosen = runTo100(entries);

    let exact = true;
    if (!chosen) {
        // Nothing adds to 100 - fall back to the densest block under a heading, or everything
        exact = false;
        const h = headerLines.find(hl => entries.some(e => e.line > hl && e.line <= hl + 60));
        chosen = h !== undefined ? entries.filter(e => e.line > h && e.line <= h + 60) : entries;
    }
    const components = groupComponents(chosen, makeId);
    const total = Math.round(components.reduce((s, c) => s + c.weight, 0) * 100) / 100;
    return { components, total, exact };
};

export const parseOutline = (text) => {
    let n = 0;
    const makeId = () => `${Date.now()}-${n++}`;
    const lines = mergeOrphanPercents(splitSentences(normalize(text)));
    const joined = lines.join('\n');
    const code = findCourseCode(joined);
    const unitsMatch = code?.match(/(\d)$/);
    const { components, total, exact } = findComponents(lines, makeId);

    const warnings = [];
    if (!code) warnings.push('No course code found (e.g. ENGTECH 1PR3) - enter it below.');
    if (!components.length) warnings.push('No grading breakdown found. Add components by hand, or paste just the evaluation section.');
    else if (!exact) warnings.push(`Component weights add up to ${total}%, not 100% - check them against the outline.`);

    return {
        code: code || '',
        title: findTitle(lines, code),
        units: unitsMatch ? parseInt(unitsMatch[1]) : 3,
        term: findTerm(joined),
        components,
        total,
        warnings,
        textLength: joined.length,
    };
};
