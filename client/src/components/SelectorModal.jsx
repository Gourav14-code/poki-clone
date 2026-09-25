import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

export default function SelectorModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('playwright');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const snippets = {
    playwright: [
      { id: 'pw-1', title: 'By Test ID', code: `await page.getByTestId('submit-btn').click();` },
      { id: 'pw-2', title: 'By Role & Name', code: `await page.getByRole('button', { name: 'Submit' }).click();` },
      { id: 'pw-3', title: 'By Label (Forms)', code: `await page.getByLabel('Email Address').fill('test@example.com');` },
      { id: 'pw-4', title: 'Wait for Element', code: `await page.locator('[data-testid="success-toast"]').waitFor({ state: 'visible', timeout: 5000 });` },
      { id: 'pw-5', title: 'Handle JS Alert', code: `page.once('dialog', async dialog => {\n  console.log(dialog.message());\n  await dialog.accept();\n});` },
      { id: 'pw-6', title: 'Inside iFrame', code: `const frame = page.frameLocator('#test-frame');\nawait frame.getByTestId('iframe-btn').click();` },
      { id: 'pw-7', title: 'Shadow DOM Piercing', code: `// Playwright pierces open shadow root by default!\nawait page.locator('#shadow-input').fill('Playwright Shadow');` }
    ],
    cypress: [
      { id: 'cy-1', title: 'By Test ID', code: `cy.get('[data-testid="submit-btn"]').click();` },
      { id: 'cy-2', title: 'Type in Input', code: `cy.get('#email-input').type('test@example.com');` },
      { id: 'cy-3', title: 'Wait & Assert', code: `cy.get('[data-testid="async-card"]', { timeout: 10000 }).should('be.visible');` },
      { id: 'cy-4', title: 'Handle Alert / Confirm', code: `cy.on('window:confirm', (text) => {\n  expect(text).to.contains('Are you sure?');\n  return true;\n});` },
      { id: 'cy-5', title: 'File Upload', code: `cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.txt');` },
      { id: 'cy-6', title: 'Intercept API', code: `cy.intercept('GET', '/api/users').as('getUsers');\ncy.wait('@getUsers');` }
    ],
    selenium: [
      { id: 'sel-1', title: 'Python - By Test ID (CSS)', code: `from selenium.webdriver.common.by import By\n\nelement = driver.find_element(By.CSS_SELECTOR, "[data-testid='submit-btn']")\nelement.click()` },
      { id: 'sel-2', title: 'Python - By XPath', code: `element = driver.find_element(By.XPATH, "//button[@data-testid='submit-btn']")\nelement.click()` },
      { id: 'sel-3', title: 'Python - Explicit Wait', code: `from selenium.webdriver.support.ui import WebDriverWait\nfrom selenium.webdriver.support import expected_conditions as EC\n\nelem = WebDriverWait(driver, 10).until(\n    EC.visibility_of_element_located((By.ID, "delayed-content"))\n)` },
      { id: 'sel-4', title: 'Python - Handle Alert', code: `alert = driver.switch_to.alert\nprint(alert.text)\nalert.accept()` },
      { id: 'sel-5', title: 'Python - Switch to iFrame', code: `driver.switch_to.frame("test-frame")\n# interact inside iframe\ndriver.switch_to.default_content()` }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-microchip text-cyan-400 text-lg"></i>
            <div>
              <h3 className="font-bold text-base text-white">Automation Selector Cheat Sheet</h3>
              <p className="text-xs text-slate-400 font-mono">Quick locator patterns for Playwright, Cypress, & Selenium</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Framework Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-3 gap-2">
          {['playwright', 'cypress', 'selenium'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'playwright' && '🎭 Playwright'}
              {tab === 'cypress' && '🌲 Cypress'}
              {tab === 'selenium' && '⚡ Selenium (Python)'}
            </button>
          ))}
        </div>

        {/* Code Snippets List */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-3.5 bg-slate-900">
          {snippets[activeTab].map((item) => (
            <div key={item.id} className="bg-slate-950 text-slate-100 rounded-xl p-3.5 relative group border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium text-cyan-300">{item.title}</span>
                <button
                  onClick={() => copyCode(item.code, item.id)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs font-mono bg-slate-900 p-2.5 rounded-lg overflow-x-auto text-emerald-400 border border-slate-800/60">
                <code>{item.code}</code>
              </pre>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl hover:brightness-110 shadow-md transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
