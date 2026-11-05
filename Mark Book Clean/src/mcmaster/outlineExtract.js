// Turns an uploaded course outline (PDF, Word, image or text) into plain text, entirely in the browser.
// The heavy libraries are loaded only when a file of that type is opened.

const MAX_OCR_PAGES = 6;

const extOf = (file) => (file.name.split('.').pop() || '').toLowerCase();

export const SUPPORTED_ACCEPT = '.pdf,.docx,.txt,.md,.rtf,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

const ocrImage = async (image, onProgress, label) => {
    const { default: Tesseract } = await import('tesseract.js');
    const result = await Tesseract.recognize(image, 'eng', {
        logger: (m) => {
            if (m.status === 'recognizing text') onProgress?.(`${label} ${Math.round(m.progress * 100)}%`);
        }
    });
    return result.data.text;
};

const loadPdfjs = async () => {
    const pdfjs = await import('pdfjs-dist');
    const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
};

// Rebuild visual lines from PDF text runs so table rows ("Labs   15%") stay on one line
const pageToText = async (page) => {
    const content = await page.getTextContent();
    const rows = new Map();
    content.items.forEach(item => {
        if (!item.str || !item.str.trim()) return;
        const y = Math.round(item.transform[5] / 2) * 2;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ x: item.transform[4], w: item.width || 0, str: item.str });
    });
    return [...rows.keys()]
        .sort((a, b) => b - a)
        .map(y => {
            const parts = rows.get(y).sort((a, b) => a.x - b.x);
            let line = '';
            let lastEnd = null;
            parts.forEach(p => {
                if (lastEnd !== null) line += p.x - lastEnd > 12 ? '   ' : (p.x - lastEnd > 1 ? ' ' : '');
                line += p.str;
                lastEnd = p.x + p.w;
            });
            return line;
        })
        .join('\n');
};

const pdfToText = async (file, onProgress) => {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        onProgress?.(`Reading page ${i} of ${doc.numPages}`);
        pages.push(await pageToText(await doc.getPage(i)));
    }
    let text = pages.join('\n');

    // A scanned PDF has no text layer - render the first pages and OCR them
    if (text.replace(/\s/g, '').length < 80) {
        const ocrPages = [];
        const n = Math.min(doc.numPages, MAX_OCR_PAGES);
        for (let i = 1; i <= n; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            ocrPages.push(await ocrImage(canvas, onProgress, `Scanning page ${i} of ${n}`));
        }
        text = ocrPages.join('\n');
    }
    return text;
};

// Word: convert to HTML so table rows keep their cells together on one line
const docxToText = async (file, onProgress) => {
    onProgress?.('Reading Word document');
    const { default: mammoth } = await import('mammoth/mammoth.browser.js');
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const lines = [];
    doc.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, tr').forEach(el => {
        if (el.tagName === 'TR') {
            lines.push([...el.children].map(td => td.textContent.trim()).filter(Boolean).join('   '));
        } else if (!el.closest('tr')) {
            lines.push(el.textContent.trim());
        }
    });
    return lines.filter(Boolean).join('\n');
};

export const extractOutlineText = async (file, onProgress) => {
    const ext = extOf(file);
    if (file.type === 'application/pdf' || ext === 'pdf') return pdfToText(file, onProgress);
    if (ext === 'docx') return docxToText(file, onProgress);
    if (ext === 'doc') throw new Error('Old .doc files are not supported — save it as .docx or PDF first.');
    if (file.type.startsWith('image/')) return ocrImage(file, onProgress, 'Scanning image');
    if (file.type.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) return file.text();
    throw new Error('Unsupported file type. Use a PDF, Word (.docx), image or text file.');
};
