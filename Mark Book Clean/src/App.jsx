import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import OntarioApp from './ontario/OntarioApp.jsx';

// The McMaster add-on is loaded on demand so the Ontario mark book stays light
const McMasterApp = lazy(() => import('./mcmaster/McMasterApp.jsx'));

const MODE_KEY = 'markbook_mode';

const readMode = () => {
    try {
        return localStorage.getItem(MODE_KEY) === 'mcmaster' ? 'mcmaster' : 'ontario';
    } catch (e) {
        return 'ontario';
    }
};

const App = () => {
    const [mode, setMode] = useState(readMode);

    useEffect(() => {
        try {
            localStorage.setItem(MODE_KEY, mode);
        } catch (e) {
            // Storage unavailable (private window) - mode just won't persist
        }
    }, [mode]);

    const isMac = mode === 'mcmaster';

    // Both apps stay mounted once opened, so unsaved edits survive a switch
    // (the Ontario mark book only writes to storage when Save is clicked)
    const [macLoaded, setMacLoaded] = useState(isMac);
    useEffect(() => {
        if (isMac) setMacLoaded(true);
    }, [isMac]);

    // Charts measured while hidden need a resize nudge when shown again
    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [isMac]);

    return (
        <>
            <div className={isMac ? 'hidden' : undefined}>
                <OntarioApp />
            </div>
            {(isMac || macLoaded) && (
                <div className={isMac ? undefined : 'hidden'}>
                    <Suspense fallback={
                        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-mac-maroon border-t-transparent rounded-full"></div>
                        </div>
                    }>
                        <McMasterApp />
                    </Suspense>
                </div>
            )}

            <button
                onClick={() => setMode(isMac ? 'ontario' : 'mcmaster')}
                className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold shadow-xl transition-all active:scale-95 ${isMac
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                    : 'bg-mac-maroon text-white hover:bg-mac-maroon-dark shadow-mac-maroon/30'
                    }`}
                title={isMac ? 'Switch to the Ontario high school mark book' : 'Switch to the McMaster University grade calculator'}
            >
                <ArrowLeftRight size={14} className={isMac ? 'text-white' : 'text-mac-gold'} />
                {isMac ? 'Switch to Ontario HS' : 'Switch to McMaster'}
            </button>
        </>
    );
};

export default App;
