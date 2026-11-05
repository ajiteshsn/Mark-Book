import React, { useState } from 'react';
import { X } from 'lucide-react';
import { parseImportText } from './parsers.js';

const ImportModal = ({ componentName, onClose, onImport }) => {
    const [text, setText] = useState('');

    const handleImport = () => {
        const items = text.trim() ? parseImportText(text) : [];
        onImport(items);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Import into {componentName}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-3">
                    Paste your marks (e.g. copied from Avenue to Learn). Each line should be: <br />
                    <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">name, score, total, weight</code>
                </p>
                <p className="text-xs text-slate-400 mb-4">
                    Example: <code className="bg-slate-100 px-1 rounded">Lab 1, 18, 20, 1</code> or just <code className="bg-slate-100 px-1 rounded">Quiz 2, 92</code> (defaults: total=100, weight=1)
                </p>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Lab 1, 18, 20, 1&#10;Lab 2, 17.5, 20, 1&#10;Quiz 1, 92"
                    className="w-full h-48 border border-slate-200 rounded-xl p-4 text-sm font-mono outline-none focus:border-mac-maroon resize-none"
                />

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        className="flex-1 py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors"
                    >
                        Import
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
