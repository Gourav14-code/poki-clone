import React, { useEffect, useRef, useState } from 'react';
import { Layers, Image, ShieldAlert, CheckCircle2 } from 'lucide-react';
import TestHint from '../components/TestHint';

export default function ShadowLab() {
  const shadowHostRef = useRef(null);
  const [obscuredClicked, setObscuredClicked] = useState(false);
  const [overlayActive, setOverlayActive] = useState(true);

  // Mount Open Shadow DOM Custom Component
  useEffect(() => {
    if (shadowHostRef.current && !shadowHostRef.current.shadowRoot) {
      const shadowRoot = shadowHostRef.current.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = `
        <style>
          .shadow-box {
            padding: 16px;
            background: #f8fafc;
            border: 2px dashed #6366f1;
            border-radius: 12px;
            font-family: system-ui, sans-serif;
            color: #1e293b;
          }
          .shadow-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 13px;
            box-sizing: border-box;
            margin-top: 8px;
            margin-bottom: 8px;
          }
          .shadow-btn {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .shadow-btn:hover {
            background: #4338ca;
          }
          .shadow-result {
            margin-top: 10px;
            font-size: 12px;
            font-weight: bold;
            color: #059669;
          }
        </style>
        <div class="shadow-box" id="shadow-container" data-testid="shadow-container">
          <h4 id="shadow-heading" data-testid="shadow-heading" style="margin: 0 0 6px 0; font-size: 14px;">
            Inside Open Shadow Root
          </h4>
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            This element is encapsulated within an open Shadow DOM root.
          </p>
          <input
            type="text"
            id="shadow-input"
            data-testid="shadow-input"
            class="shadow-input"
            placeholder="Type inside Shadow DOM..."
          />
          <button
            type="button"
            id="shadow-btn"
            data-testid="shadow-btn"
            class="shadow-btn"
          >
            Submit Shadow Value
          </button>
          <div id="shadow-result" data-testid="shadow-result" class="shadow-result"></div>
        </div>
      `;

      const input = shadowRoot.getElementById('shadow-input');
      const btn = shadowRoot.getElementById('shadow-btn');
      const result = shadowRoot.getElementById('shadow-result');

      btn.addEventListener('click', () => {
        result.innerText = `Submitted: "${input.value}" from inside Shadow DOM!`;
      });
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Shadow DOM & Edge Cases Lab</h1>
          <TestHint
            testId="shadow-lab-header"
            tip="Test piercing open Shadow DOM, validating broken image links (naturalWidth), and resolving click interception errors."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Specialized automation test challenges: open Shadow DOM encapsulation, broken image validation, and click interception handling.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Scenario 1: Shadow DOM Host */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>1. Open Shadow DOM Piercing</span>
            </h2>
            <TestHint
              testId="shadow-host-root"
              tip="In Playwright: page.locator('#shadow-input').fill('hello'); (Playwright pierces shadow roots automatically!) In Cypress: cy.get('#shadow-host-root').shadow().find('#shadow-input').type('hello')"
            />
          </div>

          <p className="text-xs text-slate-600">
            The host container below houses an open shadow root created via JavaScript.
          </p>

          <div
            id="shadow-host-root"
            data-testid="shadow-host-root"
            ref={shadowHostRef}
            className="mt-2"
          />
        </div>

        {/* Scenario 2: Broken Images */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Image className="w-4 h-4 text-emerald-600" />
              <span>2. Broken Image Verification</span>
            </h2>
            <TestHint
              testId="broken-image"
              tip="Check if image rendered: const isLoaded = await page.evaluate(img => img.complete && img.naturalWidth > 0, imgElement);"
            />
          </div>

          <p className="text-xs text-slate-600">
            Automated tests frequently need to verify whether images load successfully or fail with HTTP 404.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Valid Image */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
              <span className="text-[11px] font-semibold text-emerald-700 block">Valid Image</span>
              <img
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80"
                alt="Valid Microchip"
                data-testid="valid-image"
                className="w-full h-24 object-cover rounded-lg border border-slate-200"
              />
              <span className="text-[10px] text-slate-500 font-mono">naturalWidth &gt; 0</span>
            </div>

            {/* Broken Image */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
              <span className="text-[11px] font-semibold text-rose-700 block">Broken Image (404)</span>
              <img
                src="/missing-nonexistent-image.png"
                alt="Missing Image"
                data-testid="broken-image"
                className="w-full h-24 object-cover rounded-lg border border-rose-200 bg-rose-50"
              />
              <span className="text-[10px] text-rose-500 font-mono">naturalWidth === 0</span>
            </div>
          </div>
        </div>

        {/* Scenario 3: Click Interception / Overlay */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>3. Element Click Interception Simulator</span>
            </h2>
            <TestHint
              testId="obscured-target-btn"
              tip="When overlay is active, standard clicks fail with ElementClickInterceptedException. Dismiss overlay first or click via JS."
            />
          </div>

          <p className="text-xs text-slate-600">
            A transparent or semi-transparent overlay sits on top of the target button. In Selenium, clicking it triggers <code className="text-rose-600 font-mono">ElementClickInterceptedException</code>.
          </p>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Overlay Status:</label>
            <button
              type="button"
              data-testid="toggle-overlay-btn"
              onClick={() => setOverlayActive(!overlayActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                overlayActive
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {overlayActive ? 'Active (Blocking Clicks)' : 'Inactive (Unblocked)'}
            </button>
          </div>

          <div className="relative p-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Target Button */}
            <button
              type="button"
              id="obscured-target-btn"
              data-testid="obscured-target-btn"
              onClick={() => setObscuredClicked(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Click Target Button
            </button>

            {/* Overlapping Obstacle Layer */}
            {overlayActive && (
              <div
                data-testid="blocking-overlay"
                className="absolute inset-0 bg-amber-500/20 backdrop-blur-2xs flex items-center justify-center text-amber-900 text-xs font-bold cursor-not-allowed select-none"
              >
                ⚠️ Blocking Overlay Layer (Intercepting Clicks)
              </div>
            )}
          </div>

          {obscuredClicked && (
            <div
              data-testid="obscured-click-success"
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Target button was successfully clicked!</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

