import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle2, AlertTriangle, Loader2, Sparkles, Trash2, Plus } from 'lucide-react';
import TestHint from '../components/TestHint';

export default function DynamicLab() {
  // Scenario 1: AJAX Delayed Fetch
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);

  // Scenario 2: Element Appearance after timer
  const [spawnCountdown, setSpawnCountdown] = useState(null);
  const [isSpawned, setIsSpawned] = useState(false);
  const [spawnClicked, setSpawnClicked] = useState(false);

  // Scenario 3: Button Enable after timer
  const [enableCountdown, setEnableCountdown] = useState(null);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [enabledButtonClicked, setEnabledButtonClicked] = useState(false);

  // Scenario 4: Progress Bar
  const [progress, setProgress] = useState(0);
  const [isProgressRunning, setIsProgressRunning] = useState(false);

  // Scenario 5: Stale Element / Removal
  const [elementExists, setElementExists] = useState(true);

  // Scenario 6: Load More items
  const [items, setItems] = useState([
    { id: 1, title: 'Test Record #1', status: 'Loaded' },
    { id: 2, title: 'Test Record #2', status: 'Loaded' },
    { id: 3, title: 'Test Record #3', status: 'Loaded' }
  ]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // AJAX Fetch Handler
  const handleFetch = async () => {
    setIsFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch(`/api/delay/${delaySeconds}`);
      const data = await res.json();
      setFetchResult(data);
    } catch {
      setFetchResult({ error: 'Network failure' });
    } finally {
      setIsFetching(false);
    }
  };

  // Spawn Timer
  const startSpawnTimer = () => {
    setIsSpawned(false);
    setSpawnClicked(false);
    setSpawnCountdown(3);
    const interval = setInterval(() => {
      setSpawnCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsSpawned(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Enable Button Timer
  const startEnableTimer = () => {
    setIsButtonEnabled(false);
    setEnabledButtonClicked(false);
    setEnableCountdown(4);
    const interval = setInterval(() => {
      setEnableCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsButtonEnabled(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Progress Bar Runner
  const startProgressBar = () => {
    setProgress(0);
    setIsProgressRunning(true);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProgressRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  // Load More Items Handler
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      const currentLength = items.length;
      const newItems = [
        { id: currentLength + 1, title: `Test Record #${currentLength + 1}`, status: 'Loaded Async' },
        { id: currentLength + 2, title: `Test Record #${currentLength + 2}`, status: 'Loaded Async' }
      ];
      setItems([...items, ...newItems]);
      setIsLoadingMore(false);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Dynamic Content & Async Waits Lab</h1>
          <TestHint
            testId="dynamic-lab-header"
            tip="Test explicit waits (WebDriverWait / waitFor / should('be.visible')), polling intervals, and element detachment."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Simulate real-world network latency, delayed DOM rendering, progress bars, and state changes to master robust automation waits without brittle <code className="text-rose-600 font-mono">sleep()</code> calls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Scenario 1: AJAX Delayed Fetch */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>1. Configurable AJAX Response Delay</span>
              </h2>
              <TestHint testId="fetch-delayed-btn" tip="In Playwright: await page.getByTestId('fetch-delayed-btn').click(); await expect(page.getByTestId('delayed-response-box')).toBeVisible({ timeout: 10000 });" />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              The backend Express route waits for the specified seconds before sending the HTTP JSON payload.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <label htmlFor="delay-select" className="text-xs font-semibold text-slate-700">
                Delay Duration:
              </label>
              <select
                id="delay-select"
                data-testid="select-delay-seconds"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value={1}>1 second</option>
                <option value={2}>2 seconds</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={8}>8 seconds</option>
              </select>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              data-testid="fetch-delayed-btn"
              disabled={isFetching}
              onClick={handleFetch}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" data-testid="fetch-spinner" />
                  <span>Waiting for Server ({delaySeconds}s)...</span>
                </>
              ) : (
                <span>Fetch Delayed Data</span>
              )}
            </button>

            {fetchResult && (
              <div
                data-testid="delayed-response-box"
                className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1 animate-fadeIn"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Response Received!</span>
                </div>
                <p className="text-[11px] font-mono">{fetchResult.message}</p>
                <p className="text-[10px] text-slate-500">Timestamp: {fetchResult.receivedAt}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scenario 2: Delayed Element Appearance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>2. Delayed DOM Element Rendering</span>
              </h2>
              <TestHint testId="delayed-spawned-btn" tip="Element is not initially in the DOM. Wait for locator to be attached & visible." />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Triggers a 3-second timer. The target button is completely absent from the DOM until the timer expires.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              data-testid="start-spawn-timer-btn"
              onClick={startSpawnTimer}
              disabled={spawnCountdown !== null}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              {spawnCountdown !== null
                ? `Spawning in ${spawnCountdown} second(s)...`
                : 'Start 3s Spawn Timer'}
            </button>

            {isSpawned && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <button
                  type="button"
                  data-testid="delayed-spawned-btn"
                  onClick={() => setSpawnClicked(true)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  🎯 Click Me to Confirm (Spawned!)
                </button>

                {spawnClicked && (
                  <p data-testid="spawned-btn-clicked-msg" className="text-xs text-indigo-800 font-semibold text-center">
                    ✅ Spawned button was successfully clicked!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scenario 3: Button Enable after Countdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500" />
                <span>3. Button Enabling After Latency</span>
              </h2>
              <TestHint testId="delayed-enable-btn" tip="In Cypress: cy.get('[data-testid=delayed-enable-btn]').should('be.enabled').click();" />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              The target button exists in the DOM immediately, but has the <code className="text-rose-600 font-mono">disabled</code> attribute for 4 seconds.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              data-testid="start-enable-timer-btn"
              onClick={startEnableTimer}
              disabled={enableCountdown !== null}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              {enableCountdown !== null
                ? `Enabling in ${enableCountdown}s...`
                : 'Start 4s Enable Timer'}
            </button>

            <button
              type="button"
              data-testid="delayed-enable-btn"
              disabled={!isButtonEnabled}
              onClick={() => setEnabledButtonClicked(true)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              {isButtonEnabled ? '🔓 Click Me! (Now Enabled)' : '🔒 Locked / Disabled'}
            </button>

            {enabledButtonClicked && (
              <p data-testid="enabled-btn-clicked-msg" className="text-xs text-emerald-700 font-semibold text-center">
                🎉 Enabled button clicked successfully!
              </p>
            )}
          </div>
        </div>

        {/* Scenario 4: Progress Bar Completion */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-500" />
                <span>4. Dynamic Progress Bar</span>
              </h2>
              <TestHint testId="progress-finished-badge" tip="Wait for progress bar to reach 100% or for the finished badge to appear." />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Progress increments steadily from 0% to 100%. Assert dynamic text changes and completion state.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span>Progress:</span>
                <span data-testid="progress-percentage-label" className="font-mono text-indigo-600">
                  {progress}%
                </span>
              </div>
              <div
                data-testid="progress-bar-container"
                className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"
              >
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              data-testid="start-progress-btn"
              disabled={isProgressRunning}
              onClick={startProgressBar}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              {isProgressRunning ? 'Processing Task...' : 'Start Progress Simulation'}
            </button>

            {progress === 100 && (
              <div
                data-testid="progress-finished-badge"
                className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold text-center animate-fadeIn"
              >
                ✅ 100% Task Completed!
              </div>
            )}
          </div>
        </div>

        {/* Scenario 5: Stale Element / DOM Removal */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>5. DOM Detachment (Stale Reference)</span>
              </h2>
              <TestHint testId="stale-candidate-box" tip="Tests if the framework handles StaleElementReferenceException or waitFor({ state: 'detached' })." />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Remove an element from the DOM while an automation test might still hold a reference to it.
            </p>

            <div className="mt-4">
              {elementExists ? (
                <div
                  data-testid="stale-candidate-box"
                  className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium"
                >
                  🗑️ I am a target element in the DOM. Once destroyed, I will be completely removed.
                </div>
              ) : (
                <div
                  data-testid="element-detached-notice"
                  className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium text-center"
                >
                  Element is detached from DOM.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              data-testid="destroy-element-btn"
              onClick={() => setElementExists(!elementExists)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              {elementExists ? 'Remove Element from DOM' : 'Restore Element'}
            </button>
          </div>
        </div>

        {/* Scenario 6: Load More Items (Infinite Scroll / Async Feed) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                <span>6. Dynamic &quot;Load More&quot; Async Feed</span>
              </h2>
              <TestHint testId="load-more-btn" tip="Verify list item count increases after clicking Load More." />
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Appends new asynchronous items to the list after a 1.5s delay. Test counting child elements.
            </p>

            <div
              data-testid="dynamic-items-list"
              className="mt-4 space-y-1.5 max-h-36 overflow-y-auto pr-1"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  data-testid={`dynamic-item-${item.id}`}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center"
                >
                  <span className="font-medium text-slate-800">{item.title}</span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              data-testid="load-more-btn"
              disabled={isLoadingMore}
              onClick={handleLoadMore}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Items...</span>
                </>
              ) : (
                <span>Load More Records (+2)</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

