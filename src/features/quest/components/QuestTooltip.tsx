// Shared quest form chrome: info tooltip and selector button.

import React from 'react';

export const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex items-center group cursor-help ml-1 align-middle select-none">
    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-[9px] font-bold leading-none shadow-xs transition-colors">
      i
    </span>
    <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-[99999] pointer-events-none">
      <span className="block bg-slate-900 text-white text-[11px] font-normal leading-relaxed rounded-md py-1.5 px-2.5 shadow-2xl border border-slate-700 w-max max-w-[280px] text-left break-words">
        {text}
      </span>
    </span>
  </span>
);

export const SelectorButton: React.FC<{ onClick: () => void; title?: string }> = ({
  onClick,
  title = 'Open selector modal',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 active:bg-blue-600 active:text-white rounded text-slate-700 font-bold font-mono inline-flex items-center leading-none transition-colors cursor-pointer shadow-xs border border-slate-300"
    title={title}
  >
    ...
  </button>
);
