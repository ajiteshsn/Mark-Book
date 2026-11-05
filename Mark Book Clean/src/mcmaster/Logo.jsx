import React, { useId } from 'react';

// Mark Book logo: a grade line rising out of an open book, in McMaster maroon and gold.
// Original artwork - deliberately not the McMaster crest or wordmark.
export const LogoMark = ({ size = 40, className = '' }) => {
    const gid = useId().replace(/:/g, '');
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Mark Book logo">
            <defs>
                <linearGradient id={`bg-${gid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8E0F4C" />
                    <stop offset="1" stopColor="#5C002D" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill={`url(#bg-${gid})`} />
            {/* open book */}
            <path d="M9 41.5c7-3.6 15.5-3.6 23 0V54c-7.5-3.6-16-3.6-23 0z" fill="#FDBF57" />
            <path d="M55 41.5c-7-3.6-15.5-3.6-23 0V54c7.5-3.6 16-3.6 23 0z" fill="#FFD68E" />
            <path d="M32 41.5V54" stroke="#5C002D" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            {/* rising grade line */}
            <path d="M14 33l9.5-7.5 7.5 3.5L45.5 14" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M38.5 13.2l7.4-.6-.6 7.4" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="14" cy="33" r="3" fill="#FDBF57" />
            <circle cx="23.5" cy="25.5" r="3" fill="#FDBF57" />
            <circle cx="31" cy="29" r="3" fill="#FDBF57" />
        </svg>
    );
};

const Logo = ({ size = 40, light = false, tagline = true }) => (
    <div className="flex items-center gap-2.5">
        <LogoMark size={size} className="shrink-0 drop-shadow-sm" />
        <div className="leading-none">
            <p className={`font-black tracking-tight ${light ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: size * 0.48 }}>
                Mark <span className={light ? 'text-mac-gold' : 'text-mac-maroon'}>Book</span>
            </p>
            {tagline && (
                <p className={`font-bold uppercase tracking-[0.18em] mt-1 ${light ? 'text-white/60' : 'text-slate-400'}`} style={{ fontSize: Math.max(8, size * 0.2) }}>
                    for McMaster students
                </p>
            )}
        </div>
    </div>
);

export default Logo;
