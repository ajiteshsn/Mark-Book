// Text-import and OCR parsers, copied from the Ontario mark book (src/ontario/OntarioApp.jsx)
// as pure functions so the Ontario app stays untouched. Results use `name` instead of `cat`.

const newId = () => Date.now() + Math.random();

// "Quiz 1, 85, 100, 1" or "Lab 2<TAB>18" -> items (defaults: total=100, weight=1)
export const parseImportText = (text) => {
    const items = [];
    text.trim().split('\n').forEach(line => {
        const parts = line.split(/[,\t]+/).map(p => p.trim());
        if (parts.length >= 2) {
            items.push({
                id: newId(),
                name: parts[0] || 'Item',
                score: parts[1] || '',
                total: parts[2] || '100',
                weight: parts[3] || '1',
                active: true,
            });
        }
    });
    return items;
};

export const parseOcrText = (text) => {
    const results = [];
    const lines = text.split('\n').filter(line => line.trim());

    // Match patterns like "14.5/17", "26.3/30", also OCR errors like "14,5/17" or "14.5\17"
    const extractScoreTotal = (str) => {
        const match = str.match(/(\d+(?:[.,]\d+)?)\s*[\/\\|]\s*(\d+(?:[.,]\d+)?)/);
        if (match) {
            return {
                score: match[1].replace(',', '.'),
                total: match[2].replace(',', '.')
            };
        }
        return null;
    };

    const cleanEntryName = (name) => {
        return name
            .replace(/^\d+\.\s*/, '')        // Remove leading "1. ", "2. ", etc.
            .replace(/^[·•*]\s*/, '')        // Remove bullet points
            .replace(/^\*/, '')               // Remove leading asterisks
            .replace(/\s+/g, ' ')             // Normalize whitespace
            .trim()
            .substring(0, 30);                // Limit length
    };

    const isDate = (str) => {
        return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[.\s]?\s*\d{1,2}/i.test(str) ||
            /^\d{1,2}[\/\-]\d{1,2}/i.test(str);
    };

    const isCategoryCode = (str) => {
        return /^(know|appl|think|comm|k|a|t|c)$/i.test(str.trim());
    };

    const push = (name, score, total, confidence, line) => {
        results.push({ id: newId(), name, score, total, weight: '1', confidence, originalLine: line });
    };

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.length < 3) return;

        const skipPatterns = [
            /^entry\s*titles?$/i,
            /^actual\s*marks?$/i,
            /^mark\s*%$/i,
            /^date$/i,
            /^unit$/i,
            /^total$/i,
            /^score$/i,
            /^category$/i,
            /^weight$/i,
            /^date\s+unit\s+category/i,
            /^entry\s+titles.*date.*unit.*category.*mark/i
        ];
        if (skipPatterns.some(p => p.test(trimmedLine))) return;

        // STRATEGY 1: score/total somewhere on the line (Avenue/D2L style rows)
        const scoreData = extractScoreTotal(trimmedLine);
        if (scoreData) {
            const scoreMatch = trimmedLine.match(/(\d+(?:[.,]\d+)?)\s*[\/\\|]\s*(\d+(?:[.,]\d+)?)/);
            if (scoreMatch) {
                const beforeScore = trimmedLine.substring(0, trimmedLine.indexOf(scoreMatch[0])).trim();
                const columns = beforeScore.split(/\t+|\s{2,}/).filter(c => c.trim());

                let entryName = '';
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i].trim();
                    if (isDate(col)) continue;
                    if (/^\d+$/.test(col) && parseInt(col) <= 10) continue;
                    if (isCategoryCode(col)) continue;
                    if (col.length > 2) {
                        entryName = col;
                        break;
                    }
                }

                if (!entryName) {
                    const nameMatch = beforeScore.match(/^(.+?)(?:\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-9]{1,2}[\/\-]))/i);
                    entryName = nameMatch ? nameMatch[1] : beforeScore;
                }

                entryName = cleanEntryName(entryName);
                if (!entryName || entryName.length < 2) entryName = `Item ${results.length + 1}`;

                const scoreNum = parseFloat(scoreData.score);
                const totalNum = parseFloat(scoreData.total);
                if (isNaN(scoreNum) || isNaN(totalNum) || totalNum <= 0) return;
                if (scoreNum < 0 || scoreNum > totalNum * 1.5) return; // Allow buffer for bonus

                let confidence = 85;
                if (entryName.match(/quiz|test|assignment|exam|lab|project|unit|midterm|tutorial/i)) confidence += 10;
                if (scoreNum <= totalNum) confidence += 5;
                push(entryName, scoreData.score, scoreData.total, Math.min(confidence, 100), trimmedLine);
                return;
            }
        }

        // STRATEGY 2: Percentage pattern (85% or 85 %)
        const pctMatch = trimmedLine.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*%\s*$/);
        if (pctMatch) {
            const entryName = cleanEntryName(pctMatch[1]);
            const scoreNum = parseFloat(pctMatch[2]);
            if (entryName.length >= 2 && !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100) {
                push(entryName, pctMatch[2], '100', 85, trimmedLine);
            }
            return;
        }

        // STRATEGY 3: Tab or multi-space separated columns
        const columns = trimmedLine.split(/\t+|\s{3,}/);
        if (columns.length >= 2) {
            for (let i = columns.length - 1; i >= 0; i--) {
                const colScoreData = extractScoreTotal(columns[i]);
                if (colScoreData) {
                    const nameParts = columns.slice(0, i).filter(c => {
                        const t = c.trim();
                        return t && !isDate(t) && !isCategoryCode(t) && !/^\d+$/.test(t);
                    });
                    let entryName = cleanEntryName(nameParts.join(' '));
                    if (!entryName || entryName.length < 2) entryName = `Item ${results.length + 1}`;
                    const scoreNum = parseFloat(colScoreData.score);
                    const totalNum = parseFloat(colScoreData.total);
                    if (!isNaN(scoreNum) && !isNaN(totalNum) && totalNum > 0 && scoreNum <= totalNum * 1.5) {
                        push(entryName, colScoreData.score, colScoreData.total, 75, trimmedLine);
                    }
                    break;
                }
            }
        }
    });

    return results;
};
