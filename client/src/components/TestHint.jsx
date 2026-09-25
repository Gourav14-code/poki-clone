import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

export default function TestHint({ testId, selector, tip }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="inline-block relative text-left ml-2 align-middle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        title="View Automation Locator & Tips"
      >
        <Code2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-xs">
            <div className="font-semibold text-slate-800 pb-1 mb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Automation Locator</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {testId && (
              <div className="mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">data-testid</span>
                <div className="flex items-center justify-between bg-slate-100 px-2 py-1 rounded font-mono text-indigo-700 mt-0.5">
                  <span className="truncate">{testId}</span>
                  <button
                    onClick={() => copyToClipboard(`[data-testid="${testId}"]`)}
                    className="ml-1 text-slate-500 hover:text-indigo-600"
                    title="Copy CSS Selector"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            {selector && (
              <div className="mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">CSS / XPath</span>
                <div className="bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 mt-0.5 break-all">
                  {selector}
                </div>
              </div>
            )}

            {tip && (
              <div className="mt-2 text-slate-600 bg-amber-50 border border-amber-200 p-2 rounded text-[11px] leading-relaxed">
                💡 <span className="font-semibold">Tip:</span> {tip}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

