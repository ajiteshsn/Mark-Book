import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { X, Check, Trash2, FileText, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { parseOcrText } from './parsers.js';

const OcrModal = ({ componentName, onClose, onImport }) => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (JPG, PNG, etc.)');
            return;
        }
        setImage(file);
        setError('');
        setResults([]);
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleProcess = async () => {
        if (!image) {
            setError('Please select an image first');
            return;
        }
        setProcessing(true);
        setProgress(0);
        setError('');
        setResults([]);
        try {
            const result = await Tesseract.recognize(image, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
                }
            });
            const parsed = parseOcrText(result.data.text);
            if (parsed.length === 0) {
                setError('No marks detected. Try a clearer screenshot with rows like "Lab 1   18/20"');
            } else {
                setResults(parsed);
            }
        } catch (err) {
            console.error('OCR Error:', err);
            setError('Failed to process image. Please try again.');
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };

    const updateResult = (id, field, value) => {
        setResults(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleImport = () => {
        onImport(results.map(r => ({
            id: Date.now() + Math.random(),
            name: r.name,
            score: r.score,
            total: r.total,
            weight: r.weight,
            active: true
        })));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="text-mac-maroon" size={22} />
                        Scan Grades into {componentName}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                    Upload a screenshot of your Avenue to Learn grades or a marked syllabus. Supported formats: <code className="bg-slate-100 px-1 rounded">Lab 1: 18/20</code>, <code className="bg-slate-100 px-1 rounded">Quiz 2 - 92%</code>
                </p>

                <div className="mb-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-lg file:border-0
                            file:text-sm file:font-semibold
                            file:bg-mac-maroon-light file:text-mac-maroon
                            hover:file:bg-mac-gold-light
                            cursor-pointer"
                    />
                </div>

                {preview && (
                    <div className="mb-4 border border-slate-200 rounded-xl p-2 bg-slate-50">
                        <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                    </div>
                )}

                {image && !processing && results.length === 0 && (
                    <button
                        onClick={handleProcess}
                        className="w-full py-3 bg-mac-maroon text-white rounded-xl font-bold hover:bg-mac-maroon-dark transition-colors flex items-center justify-center gap-2 mb-4"
                    >
                        <FileText size={18} />
                        Extract Marks
                    </button>
                )}

                {processing && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin w-5 h-5 border-2 border-mac-maroon border-t-transparent rounded-full"></div>
                            <span className="text-sm font-medium text-slate-600">Processing image... {progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-mac-maroon transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {results.length > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-slate-600">Detected Marks ({results.length})</h4>
                            <span className="text-xs text-slate-400">Review and edit before importing</span>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-slate-500 text-xs uppercase">
                                        <th className="px-3 py-2 text-left">Name</th>
                                        <th className="px-3 py-2 text-left">Score</th>
                                        <th className="px-3 py-2 text-left">Total</th>
                                        <th className="px-3 py-2 text-left">Weight</th>
                                        <th className="px-3 py-2 text-center">Conf.</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map(r => (
                                        <tr key={r.id} className={r.confidence < 90 ? 'bg-amber-50' : ''}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text" value={r.name}
                                                    onChange={(e) => updateResult(r.id, 'name', e.target.value)}
                                                    className="w-full bg-transparent border-b border-slate-200 focus:border-mac-maroon outline-none px-1 py-0.5 text-xs font-bold"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text" value={r.score}
                                                    onChange={(e) => updateResult(r.id, 'score', e.target.value)}
                                                    className="w-16 bg-transparent border-b border-slate-200 focus:border-mac-maroon outline-none px-1 py-0.5 text-center"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text" value={r.total}
                                                    onChange={(e) => updateResult(r.id, 'total', e.target.value)}
                                                    className="w-16 bg-transparent border-b border-slate-200 focus:border-mac-maroon outline-none px-1 py-0.5 text-center"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text" value={r.weight}
                                                    onChange={(e) => updateResult(r.id, 'weight', e.target.value)}
                                                    className="w-12 bg-transparent border-b border-slate-200 focus:border-mac-maroon outline-none px-1 py-0.5 text-center"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.confidence >= 95 ? 'bg-green-100 text-green-700' : r.confidence >= 90 ? 'bg-mac-gold-light text-mac-maroon' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.confidence}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => setResults(prev => prev.filter(x => x.id !== r.id))} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {results.some(r => r.confidence < 90) && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Highlighted rows have lower confidence. Please verify.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    {results.length > 0 && (
                        <button
                            onClick={handleImport}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            Import {results.length} Marks
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OcrModal;
