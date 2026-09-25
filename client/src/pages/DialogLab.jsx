import React, { useState } from 'react';
import { 
  MessageSquare, 
  ExternalLink, 
  Layers, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Bell,
  PanelTop
} from 'lucide-react';
import TestHint from '../components/TestHint';

export default function DialogLab() {
  // Native JS Dialog States
  const [alertResult, setAlertResult] = useState('');
  const [confirmResult, setConfirmResult] = useState('');
  const [promptResult, setPromptResult] = useState('');

  // Custom Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFeedback, setModalFeedback] = useState('');

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Trigger JS Alert
  const handleJsAlert = () => {
    window.alert('Hello from AutoTest Playground! This is a native JavaScript alert.');
    setAlertResult('Native alert was triggered and accepted.');
  };

  // Trigger JS Confirm
  const handleJsConfirm = () => {
    const response = window.confirm('Are you sure you want to proceed with this automation test action?');
    if (response) {
      setConfirmResult('User accepted the confirmation (Clicked OK).');
    } else {
      setConfirmResult('User dismissed the confirmation (Clicked Cancel).');
    }
  };

  // Trigger JS Prompt
  const handleJsPrompt = () => {
    const input = window.prompt('Please enter your automation tester name:', 'Playwright Tester');
    if (input !== null) {
      setPromptResult(`Prompt submitted with: "${input}"`);
    } else {
      setPromptResult('Prompt was cancelled by the user.');
    }
  };

  // Add Toast
  const addToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Alerts, Modals, Windows & iFrames Lab</h1>
          <TestHint
            testId="dialog-lab-header"
            tip="Test native dialog event listeners, HTML modal DOM interactions, window switching (target=_blank), and frameLocator contexts."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Automate browser dialogs, modals, multi-tabs, popups, and nested iFrames.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Native JavaScript Dialogs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-pink-500" />
              <span>1. Native JavaScript Dialogs</span>
            </h2>
            <TestHint testId="js-alert-btn" tip="In Playwright: page.once('dialog', dialog => dialog.accept());" />
          </div>

          <p className="text-xs text-slate-600">
            Native dialogs block browser thread execution. Automated tests must listen for dialog events before triggering them.
          </p>

          <div className="space-y-4 pt-2">
            {/* Alert */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Native alert()</span>
                <button
                  type="button"
                  data-testid="js-alert-btn"
                  onClick={handleJsAlert}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Trigger Alert
                </button>
              </div>
              {alertResult && (
                <div data-testid="js-alert-result" className="text-xs text-indigo-700 font-medium bg-white p-2 rounded border border-indigo-100">
                  {alertResult}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Native confirm()</span>
                <button
                  type="button"
                  data-testid="js-confirm-btn"
                  onClick={handleJsConfirm}
                  className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Trigger Confirm
                </button>
              </div>
              {confirmResult && (
                <div data-testid="js-confirm-result" className="text-xs text-pink-700 font-medium bg-white p-2 rounded border border-pink-100">
                  {confirmResult}
                </div>
              )}
            </div>

            {/* Prompt */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Native prompt()</span>
                <button
                  type="button"
                  data-testid="js-prompt-btn"
                  onClick={handleJsPrompt}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Trigger Prompt
                </button>
              </div>
              {promptResult && (
                <div data-testid="js-prompt-result" className="text-xs text-violet-700 font-medium bg-white p-2 rounded border border-violet-100">
                  {promptResult}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Custom HTML Modals & Toasts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PanelTop className="w-4 h-4 text-purple-500" />
                <span>2. HTML Modals & Toasts</span>
              </h2>
              <TestHint testId="open-modal-btn" tip="Custom modals exist within the DOM. Check for visibility, backdrop overlay, and keyboard ESC." />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Custom web dialogs that render inside the root DOM with backdrop overlays and dismiss triggers.
            </p>

            <div className="space-y-4 mt-4">
              {/* Modal Trigger */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Custom Modal Popup</span>
                  <span className="text-[11px] text-slate-500">Opens overlay dialog</span>
                </div>
                <button
                  type="button"
                  data-testid="open-modal-btn"
                  onClick={() => setIsModalOpen(true)}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  Launch Modal
                </button>
              </div>

              {modalFeedback && (
                <div data-testid="modal-action-feedback" className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-medium">
                  {modalFeedback}
                </div>
              )}

              {/* Toast Triggers */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Trigger Toast Notifications</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="trigger-toast-success-btn"
                    onClick={() => addToast('success', 'Operation completed successfully!')}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Success Toast
                  </button>
                  <button
                    type="button"
                    data-testid="trigger-toast-error-btn"
                    onClick={() => addToast('error', 'An unexpected error was encountered!')}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Error Toast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Browser Tabs & Popups */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" />
              <span>3. New Tabs & Windows</span>
            </h2>
            <TestHint testId="new-tab-link" tip="In Playwright: const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByTestId('new-tab-link').click()]);" />
          </div>

          <p className="text-xs text-slate-600">
            Test multi-window and multi-tab automation workflows. Switch browser focus to target window.
          </p>

          <div className="space-y-3 pt-2">
            <a
              href="/auth"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="new-tab-link"
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors text-xs font-semibold text-slate-800"
            >
              <span>Open Auth Lab in New Tab (target=&quot;_blank&quot;)</span>
              <ExternalLink className="w-4 h-4 text-indigo-600" />
            </a>

            <button
              type="button"
              data-testid="window-open-btn"
              onClick={() => window.open('/forms', 'AutoTestPopup', 'width=800,height=600')}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors text-xs font-semibold text-slate-800"
            >
              <span>Open Popup Window (window.open 800x600)</span>
              <ExternalLink className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Section 4: iFrames */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>4. Simple & Nested iFrames</span>
            </h2>
            <TestHint testId="simple-iframe" tip="In Playwright: page.frameLocator('#simple-iframe').getByTestId('iframe-btn').click();" />
          </div>

          <p className="text-xs text-slate-600">
            Automating iframe content requires switching frame contexts. Below is a live embedded iframe served by Express:
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">Simple iFrame:</span>
              <iframe
                id="simple-iframe"
                data-testid="simple-iframe"
                src="/iframe/simple"
                title="Simple Frame"
                className="w-full h-44 rounded-xl border-2 border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Custom Modal Dialog Markup */}
      {isModalOpen && (
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            data-testid="modal-content"
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Custom Modal Confirmation</h3>
              <button
                type="button"
                data-testid="close-modal-x-btn"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This is a standard accessible HTML modal. You can click the Confirm button, the Cancel button, or the top right &apos;X&apos;.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                data-testid="cancel-modal-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setModalFeedback('Modal cancelled by user.');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-modal-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setModalFeedback('Modal action CONFIRMED successfully!');
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Containers */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.type}`}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl flex items-center justify-between border text-xs font-medium animate-slideUp ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-300 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

