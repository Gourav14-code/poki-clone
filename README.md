# 🧪 AutoTest Playground

A modern, full-featured web application designed specifically for **Test Automation Practice** with **Playwright**, **Cypress**, **Selenium**, **Puppeteer**, and **Robot Framework**.

---

## 🚀 Quick Start

### 1. Start Both Client and Backend Server
From the root directory:
```bash
npm run dev
```

This starts:
- **Frontend App**: [http://localhost:5173](http://localhost:5173) (Vite + React + Tailwind CSS)
- **Mock REST API Backend**: [http://localhost:4000](http://localhost:4000) (Express)

*(Alternatively, run them in separate terminals with `npm run server` and `npm run client`)*.

---

## 🎯 Practice Labs Overview

| Lab Route | Module Name | Focus Areas & Automation Challenges |
| :--- | :--- | :--- |
| `/forms` | **Form Controls & File Transfer** | Text, email, passwords, checkboxes (single + master select all), radio buttons, native single/multi-select dropdowns, custom combobox, date/time pickers, range sliders, file upload (`/api/upload`), and file download (`/api/download`). |
| `/auth` | **Authentication & Sessions** | Login with valid/invalid credentials, password visibility toggle, remember me session persistence, mock JWT token verification, and role-based permissions (Admin vs QA Tester). |
| `/dynamic` | **Dynamic Content & Async Waits** | AJAX responses with configurable delays (1s to 8s), loading spinners, dynamic DOM element rendering after timers, countdown enable buttons, progress bars, and DOM detachment (stale reference). |
| `/dialogs` | **Alerts, Windows & iFrames** | Native JavaScript `alert()`, `confirm()`, `prompt()` dialog events, accessible HTML modals, toast notifications, new browser tabs (`target="_blank"`), popups, and nested iFrames. |
| `/interactions` | **Mouse Actions & Drag-and-Drop** | 3-column Kanban board drag-and-drop, drag item into Trash target, hover cards/tooltips, double-click counters, right-click custom context menus, and keyboard hotkeys (`Ctrl + S`). |
| `/tables` | **Data Grids & CRUD** | Searchable & sortable table headers, department filtering, pagination, inline Add/Edit/Delete row modals with confirmation, and CSV data export. |
| `/store` | **E-Commerce End-to-End Flow** | Realistic shopping workflow: category filtering, adding to cart, cart drawer quantity adjustment, applying promo code (`SAVE20`), and multi-step checkout wizard. |
| `/shadow` | **Shadow DOM & Edge Cases** | Piercing open Shadow DOM roots, broken image detection (`naturalWidth === 0`), and click interception / overlay handling. |
| `/api-tester` | **Mock REST API & Network Codes** | Trigger real HTTP status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `500`, `503`) and practice network interception / mocking. |
| `/play` | **Super Puppy Bros. — NES Retro Arcade** | Full interactive 2D platformer featuring a golden retriever puppy, erupting dog bones from blocks, scurrying brown mice, paw-print ground, and Cozy Doghouse finish line, with keyboard and virtual gamepad automation. |

---

## 🔍 Automation Locators

Every interactive element includes standard, deterministic test attributes:
- `data-testid="..."`: Recommended selector for Playwright (`page.getByTestId(...)`) and Cypress (`cy.get('[data-testid=...]')`).
- `id` and `name`: For traditional Selenium / standard form selectors.
- Built-in **Automation Cheat Sheet**: Click the **Cheat Sheet** button in the top navigation bar to copy ready-to-use snippets for Playwright, Cypress, and Selenium.

---

## 💻 Sample Test Runs

### Running Playwright Tests
A ready-to-run Playwright test file is provided in `tests/example.spec.js`:
```bash
npm install -D @playwright/test
npx playwright test tests/example.spec.js
```

### Running Selenium Python Tests
A ready-to-run pytest suite is provided in `tests/test_selenium.py`:
```bash
pip install selenium pytest
pytest tests/test_selenium.py
```

