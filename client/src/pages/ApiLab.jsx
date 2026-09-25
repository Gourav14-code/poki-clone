import React, { useState } from 'react';
import { Globe, Send, CheckCircle2, AlertTriangle, Copy, Check, Terminal } from 'lucide-react';
import TestHint from '../components/TestHint';

export default function ApiLab() {
  const [selectedCode, setSelectedCode] = useState(200);
  const [customCode, setCustomCode] = useState('');
  const [responseDetails, setResponseDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedFramework, setCopiedFramework] = useState(null);

  const statusCodes = [
    { code: 200, label: '200 OK', type: 'success' },
    { code: 201, label: '201 Created', type: 'success' },
    { code: 204, label: '204 No Content', type: 'success' },
    { code: 400, label: '400 Bad Request', type: 'warning' },
    { code: 401, label: '401 Unauthorized', type: 'warning' },
    { code: 403, label: '403 Forbidden', type: 'warning' },
    { code: 404, label: '404 Not Found', type: 'warning' },
    { code: 500, label: '500 Server Error', type: 'error' },
    { code: 503, label: '503 Unavailable', type: 'error' }
  ];

  const triggerApi = async (codeToTest) => {
    const code = codeToTest || selectedCode;
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const res = await fetch(`/api/status/${code}`);
      const duration = Math.round(performance.now() - startTime);

      let body = null;
      if (res.status !== 204) {
        try {
          body = await res.json();
        } catch {
          body = await res.text();
        }
      }

      const headers = {};
      res.headers.forEach((val, key) => {
        headers[key] = val;
      });

      setResponseDetails({
        status: res.status,
        statusText: res.statusText,
        duration,
        headers,
        body
      });
    } catch (err) {
      setResponseDetails({
        status: 0,
        statusText: 'Network / Connection Error',
        duration: Math.round(performance.now() - startTime),
        headers: {},
        body: { error: err.message }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = (text, framework) => {
    navigator.clipboard.writeText(text);
    setCopiedFramework(framework);
    setTimeout(() => setCopiedFramework(null), 1500);
  };

  const playwrightMockCode = `// Playwright Network Mocking / Interception
await page.route('**/api/status/500', async route => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Mocked Server Crash by Playwright' })
  });
});
await page.getByTestId('status-btn-500').click();`;

  const cypressMockCode = `// Cypress Network Stubbing
cy.intercept('GET', '/api/status/401', {
  statusCode: 401,
  body: { error: 'Mocked unauthorized by Cypress' }
}).as('mockAuth');

cy.get('[data-testid="status-btn-401"]').click();
cy.wait('@mockAuth');`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Mock REST API & Network Codes Lab</h1>
          <TestHint
            testId="api-lab-header"
            tip="Test triggering and asserting HTTP responses, headers, status codes, and mock/stub routes in Playwright page.route() and Cypress cy.intercept()."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Trigger real backend HTTP responses with customizable status codes for API automation and network interception testing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Status Code Buttons Trigger Column */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Select HTTP Status Code</span>
              <TestHint testId="status-buttons-panel" />
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Click any code to trigger a real HTTP request to Express backend:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statusCodes.map((item) => (
              <button
                key={item.code}
                type="button"
                data-testid={`status-btn-${item.code}`}
                onClick={() => {
                  setSelectedCode(item.code);
                  triggerApi(item.code);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                  item.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100'
                    : item.type === 'warning'
                    ? 'border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100'
                    : 'border-rose-200 bg-rose-50/50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>{item.label}</span>
                <span className="font-mono text-[10px] opacity-70">HTTP</span>
              </button>
            ))}
          </div>

          {/* Custom Code Input */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Custom Status Code:</label>
            <div className="flex gap-2">
              <input
                type="number"
                data-testid="custom-status-input"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="e.g. 418, 429"
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
              <button
                type="button"
                data-testid="custom-status-submit-btn"
                disabled={!customCode}
                onClick={() => triggerApi(parseInt(customCode, 10))}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Live Response Inspector (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Live HTTP Response Inspector</span>
              </h2>
              <TestHint testId="api-response-inspector" tip="Assert status code: expect(response.status()).toBe(200);" />
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Sending HTTP Request...
              </div>
            ) : responseDetails ? (
              <div data-testid="api-response-details" className="space-y-4 animate-fadeIn">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span
                      data-testid="response-status-badge"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        responseDetails.status >= 200 && responseDetails.status < 300
                          ? 'bg-emerald-600 text-white'
                          : responseDetails.status >= 400 && responseDetails.status < 500
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {responseDetails.status} {responseDetails.statusText}
                    </span>
                  </div>

                  <span data-testid="response-duration" className="text-xs text-slate-500 font-mono">
                    ⏱️ {responseDetails.duration} ms
                  </span>
                </div>

                {/* Response Body */}
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Response JSON Body:
                  </span>
                  <pre
                    data-testid="response-body-pre"
                    className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto max-h-56"
                  >
                    {responseDetails.status === 204
                      ? '(No Content - HTTP 204)'
                      : JSON.stringify(responseDetails.body, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs">
                Select a status code on the left to inspect the response.
              </div>
            )}
          </div>

          {/* Network Interception Snippets */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Terminal className="w-4 h-4" />
              <span>How to Mock / Intercept These in Tests</span>
            </div>

            <div className="space-y-3">
              {/* Playwright */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
                  <span className="font-semibold text-indigo-300">Playwright (page.route)</span>
                  <button
                    onClick={() => copyCode(playwrightMockCode, 'pw')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedFramework === 'pw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <code>{playwrightMockCode}</code>
                </pre>
              </div>

              {/* Cypress */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">Cypress (cy.intercept)</span>
                  <button
                    onClick={() => copyCode(cypressMockCode, 'cy')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedFramework === 'cy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <code>{cypressMockCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

