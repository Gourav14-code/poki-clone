import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SCENARIOS = [
  {
    id: 'form-controls',
    title: 'Form Controls & File Transfer',
    level: 'BEGINNER',
    category: 'forms',
    route: '/forms',
    icon: 'fa-pen-to-square',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    description: 'Practice text inputs, masked passwords, checkboxes, radio groups, multi-select dropdowns, datepickers, range sliders, file uploads, and file downloads.',
    tags: ['#inputs', '#checkbox', '#radio', '#dropdown', '#upload', '#download', '#slider'],
    locators: [
      "data-testid='input-fullname'",
      "data-testid='file-upload-input'",
      "data-testid='form-submit-btn'",
      "data-testid='download-txt-btn'"
    ],
    code: `// Playwright - Form Automation & File Upload
await page.getByTestId('input-fullname').fill('Automated Tester');
await page.getByTestId('select-country').selectOption('US');
await page.getByTestId('checkbox-select-all').check();
await page.setInputFiles('[data-testid=file-upload-input]', 'sample.txt');
await page.getByTestId('form-submit-btn').click();`
  },
  {
    id: 'auth-session',
    title: 'Authentication & Session Access',
    level: 'BEGINNER',
    category: 'auth',
    route: '/auth',
    icon: 'fa-shield-halved',
    iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    description: 'Test login/logout with valid and invalid credentials, verify session tokens, handle login errors, and test role-based view restrictions (Admin vs Tester).',
    tags: ['#login', '#auth', '#session', '#jwt', '#roles', '#credentials'],
    locators: [
      "data-testid='username-input'",
      "data-testid='password-input'",
      "data-testid='login-submit-btn'",
      "data-testid='session-token-display'"
    ],
    code: `// Playwright - Authentication & Privileges
await page.getByTestId('username-input').fill('admin');
await page.getByTestId('password-input').fill('password123');
await page.getByTestId('login-submit-btn').click();
await expect(page.getByTestId('user-welcome-message')).toBeVisible();
await page.getByTestId('admin-action-btn').click();`
  },
  {
    id: 'dynamic-waits',
    title: 'Dynamic Content & Async Waits',
    level: 'INTERMEDIATE',
    category: 'waits',
    route: '/dynamic',
    icon: 'fa-wave-square',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    description: 'Master explicit and implicit waits! Deal with delayed AJAX responses (1-8s), loading spinners, elements appearing/disappearing, and countdown enable buttons.',
    tags: ['#waits', '#delay', '#ajax', '#spinners', '#stale-element'],
    locators: [
      "data-testid='fetch-delayed-btn'",
      "data-testid='delayed-response-box'",
      "data-testid='delayed-spawned-btn'",
      "data-testid='delayed-enable-btn'"
    ],
    code: `// Playwright - Explicit Wait for Delayed Element
await page.getByTestId('select-delay-seconds').selectOption('3');
await page.getByTestId('fetch-delayed-btn').click();
const result = page.getByTestId('delayed-response-box');
await expect(result).toBeVisible({ timeout: 6000 });`
  },
  {
    id: 'dialogs-frames',
    title: 'Alerts, Modals, Windows & iFrames',
    level: 'INTERMEDIATE',
    category: 'alerts',
    route: '/dialogs',
    icon: 'fa-window-maximize',
    iconBg: 'bg-pink-500/10 text-pink-400 border border-pink-500/30',
    description: 'Interact with native JavaScript alert(), confirm(), and prompt() dialogs, custom modal popups, toast notifications, new browser tabs, and nested iFrames.',
    tags: ['#alert', '#confirm', '#prompt', '#modal', '#iframe', '#tabs'],
    locators: [
      "data-testid='js-confirm-btn'",
      "data-testid='open-modal-btn'",
      "data-testid='simple-iframe'",
      "data-testid='new-tab-link'"
    ],
    code: `// Playwright - Handling Native Dialog
page.once('dialog', async dialog => {
  expect(dialog.type()).toBe('confirm');
  await dialog.accept();
});
await page.getByTestId('js-confirm-btn').click();`
  },
  {
    id: 'interactions-mouse',
    title: 'Mouse Actions & Drag and Drop',
    level: 'INTERMEDIATE',
    category: 'interactions',
    route: '/interactions',
    icon: 'fa-hand-pointer',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    description: 'Automate Kanban drag-and-drop, drag to trash target, hover triggers, tooltips, double-click actions, right-click context menus, and keyboard shortcut listeners.',
    tags: ['#drag-drop', '#hover', '#double-click', '#context-menu', '#shortcuts'],
    locators: [
      "data-testid='task-task-1'",
      "data-testid='column-done'",
      "data-testid='trash-dropzone'",
      "data-testid='double-click-btn'"
    ],
    code: `// Playwright - Drag and Drop
const card = page.getByTestId('task-task-1');
const targetCol = page.getByTestId('column-done');
await card.dragTo(targetCol);`
  },
  {
    id: 'tables-crud',
    title: 'Complex Tables & Data CRUD',
    level: 'INTERMEDIATE',
    category: 'tables',
    route: '/tables',
    icon: 'fa-table-cells',
    iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    description: 'Handle dynamic data tables, column sorting, pagination controls, inline row editing, search filtering inside tables, and batch row deletions.',
    tags: ['#tables', '#crud', '#pagination', '#sorting', '#export'],
    locators: [
      "data-testid='table-search-input'",
      "data-testid='sort-name'",
      "data-testid='add-user-btn'",
      "data-testid='export-csv-btn'"
    ],
    code: `// Playwright - Table Search & Row Assertion
await page.getByTestId('table-search-input').fill('Sarah');
const firstRow = page.locator('[data-testid^=user-row-]').first();
await expect(firstRow).toContainText('Sarah Connor');`
  },
  {
    id: 'ecommerce-store',
    title: 'E-commerce Store Flow & Cart',
    level: 'ADVANCED',
    category: 'ecommerce',
    route: '/store',
    icon: 'fa-cart-shopping',
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    description: 'Complete end-to-end shopping workflow: product search, cart quantity updates, discount coupon code verification, and simulated checkout payment gateways.',
    tags: ['#ecommerce', '#checkout', '#e2e', '#cart', '#discount'],
    locators: [
      "data-testid='add-to-cart-btn-prod-1'",
      "data-testid='open-cart-btn'",
      "data-testid='coupon-input'",
      "data-testid='place-order-btn'"
    ],
    code: `// Playwright - E-Commerce Flow
await page.getByTestId('add-to-cart-btn-prod-1').click();
await page.getByTestId('open-cart-btn').click();
await page.getByTestId('coupon-input').fill('SAVE20');
await page.getByTestId('apply-coupon-btn').click();
await page.getByTestId('proceed-to-checkout-btn').click();`
  },
  {
    id: 'shadow-dom-frames',
    title: 'Shadow DOM & Custom Elements',
    level: 'ADVANCED',
    category: 'shadow',
    route: '/shadow',
    icon: 'fa-cubes',
    iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    description: 'Pierce open Shadow Root DOM trees, interact with custom web components, handle broken image detection, and solve click interception errors.',
    tags: ['#shadow-dom', '#web-components', '#broken-images', '#intercepted'],
    locators: [
      "data-testid='shadow-host-root'",
      "id='shadow-input'",
      "data-testid='broken-image'",
      "data-testid='obscured-target-btn'"
    ],
    code: `// Playwright - Piercing Open Shadow Root
// Playwright pierces shadow DOM automatically!
await page.locator('#shadow-input').fill('Automated Value');
await page.locator('#shadow-btn').click();`
  },
  {
    id: 'api-tester',
    title: 'Mock REST API & Network Codes',
    level: 'BEGINNER',
    category: 'api',
    route: '/api-tester',
    icon: 'fa-network-wired',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    description: 'Trigger and intercept real HTTP responses (200, 201, 204, 400, 401, 403, 404, 500, 503). Perfect for Playwright page.route() and Cypress cy.intercept().',
    tags: ['#api', '#status-codes', '#network', '#intercept', '#rest'],
    locators: [
      "data-testid='status-btn-200'",
      "data-testid='status-btn-500'",
      "data-testid='response-status-badge'",
      "data-testid='response-body-pre'"
    ],
    code: `// Playwright - Network Interception / Stubbing
await page.route('**/api/status/500', async route => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Mocked Error' })
  });
});
await page.getByTestId('status-btn-500').click();`
  },
  {
    id: 'super-puppy-bros',
    title: 'Super Puppy Bros. — NES Retro Arcade',
    level: 'ADVANCED',
    category: 'games',
    route: '/play',
    icon: 'fa-paw',
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    description: 'Guide the golden retriever puppy! Jump up to hit item blocks and erupt fountains of pixel bones, pounce on scurrying brown mice, and trot across paw-print brick grounds to reach the cozy doghouse.',
    tags: ['#canvas', '#games', '#puppy', '#bones', '#keyboard', '#gamepad', '#nes-1988'],
    locators: [
      "data-testid='game-canvas'",
      "data-testid='mario-score'",
      "data-testid='mario-coins'",
      "data-testid='gamepad-jump'",
      "data-testid='gamepad-bark'"
    ],
    code: `// Playwright - Super Puppy Bros Automation
await page.goto('http://localhost:5173/play');
// Trot Puppy Right
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1000);
// Jump into Bone Block to erupt dog bones!
await page.keyboard.press('Space');
await page.waitForTimeout(800);
await page.keyboard.up('ArrowRight');`
  },
  {
    id: 'elephanta-temple-run',
    title: 'Elephanta Temple Run — 3D Endless Runner',
    level: 'ADVANCED',
    category: 'games',
    route: '/play?game=elephant',
    icon: 'fa-shoe-prints',
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    description: 'Help Elephanta the giant cartoon elephant dodge obstacles across 3 lanes while running away from the relentless tiny Ant! Jump over logs and slide under high temple arches with mobile touch swipes or keyboard controls.',
    tags: ['#canvas', '#3d-runner', '#elephant', '#ant', '#temple-run', '#mobile-touch', '#offline-pwa'],
    locators: [
      "canvas",
      "text='SCORE'",
      "text='ANT CHASER'",
      "text='JUMP'",
      "text='SLIDE'"
    ],
    code: `// Playwright - Elephanta Temple Run Automation
await page.goto('http://localhost:5173/play?game=elephant');
// Jump over low fallen log
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(600);
// Slide under high cyber arch
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(600);
// Switch to Left Lane
await page.keyboard.press('ArrowLeft');`
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [notification, setNotification] = useState('');
  const [robotSpeech, setRobotSpeech] = useState('');
  const [isRobotJumping, setIsRobotJumping] = useState(false);
  const [isRobotHovered, setIsRobotHovered] = useState(false);

  const heroRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const rippleCanvasRef = useRef(null);

  // Show floating toast notification
  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Click on robot handler -> says "Hi user" with voice, chime, jump animation, and speech bubble!
  const handleRobotClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsRobotJumping(true);
    setRobotSpeech('Hi user! 👋🤖');
    setTimeout(() => setIsRobotJumping(false), 900);

    // 1. Futuristic sci-fi sound effect with Web Audio API
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.16); // D6
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch {
      // AudioContext fallback
    }

    // 2. Web Speech Synthesis: speaks "Hi user"
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Hi user');
      utterance.pitch = 1.35;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }

    triggerNotification('🤖 Robot says: "Hi user!"');

    setTimeout(() => {
      setRobotSpeech('');
    }, 4500);
  };

  // 1. Initialize Background Particle Canvas
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 800),
        y: Math.random() * (canvas.height || 600),
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 243, 255, ${p.alpha})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. Initialize Fast-Dissipating Liquid Ripple Engine
  useEffect(() => {
    const hero = heroRef.current;
    const canvas = rippleCanvasRef.current;
    if (!hero || !canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ripples = [];

    class FastRipple {
      constructor(x, y, isClick = false) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.maxRadius = isClick ? 130 : 90;
        this.maxDuration = isClick ? 2500 : 2000;
        this.startTime = Date.now();
        this.cyanHue = Math.random() > 0.3 ? 'rgba(0, 243, 255,' : 'rgba(168, 85, 247,';
        this.opacity = 0.7;
      }

      update() {
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(1, elapsed / this.maxDuration);
        const easeOut = 1 - Math.pow(1 - progress, 2);
        this.radius = 4 + (this.maxRadius - 4) * easeOut;
        this.opacity = Math.max(0, (1 - progress) * 0.7);
      }

      draw(context) {
        if (this.opacity <= 0) return;
        context.save();
        context.beginPath();
        context.arc(this.x, this.y, Math.max(0, this.radius), 0, Math.PI * 2);
        context.lineWidth = Math.max(0.5, 4.5 * (1 - this.radius / this.maxRadius));
        context.strokeStyle = `${this.cyanHue}${this.opacity})`;
        context.shadowColor = 'rgba(0, 243, 255, 0.4)';
        context.shadowBlur = 8;
        context.stroke();

        if (this.radius > 15) {
          context.beginPath();
          context.arc(this.x, this.y, Math.max(0, this.radius - 12), 0, Math.PI * 2);
          context.lineWidth = 1.2;
          context.strokeStyle = `rgba(0, 243, 255, ${this.opacity * 0.35})`;
          context.stroke();
        }
        context.restore();
      }

      isFinished() {
        return Date.now() - this.startTime >= this.maxDuration || this.opacity <= 0;
      }
    }

    let lastX = 0;
    let lastY = 0;
    let lastSpawnTime = 0;

    const spawnRipple = (clientX, clientY, isClick = false) => {
      const rect = hero.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const now = Date.now();
      const dist = Math.hypot(x - lastX, y - lastY);

      if (isClick) {
        ripples.push(new FastRipple(x, y, true));
        return;
      }

      if (dist > 15 || now - lastSpawnTime > 100) {
        ripples.push(new FastRipple(x, y, false));
        lastX = x;
        lastY = y;
        lastSpawnTime = now;
      }
    };

    const handleMouseMove = (e) => spawnRipple(e.clientX, e.clientY, false);
    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        spawnRipple(e.touches[0].clientX, e.touches[0].clientY, false);
      }
    };
    const handleClick = (e) => spawnRipple(e.clientX, e.clientY, true);

    hero.addEventListener('mousemove', handleMouseMove);
    hero.addEventListener('touchmove', handleTouchMove, { passive: true });
    hero.addEventListener('click', handleClick);

    const renderRipples = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.update();
        r.draw(ctx);
        if (r.isFinished()) {
          ripples.splice(i, 1);
        }
      }
      animationFrameId = requestAnimationFrame(renderRipples);
    };
    renderRipples();

    return () => {
      window.removeEventListener('resize', resize);
      hero.removeEventListener('mousemove', handleMouseMove);
      hero.removeEventListener('touchmove', handleTouchMove);
      hero.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Filter Scenarios
  const filteredScenarios = SCENARIOS.filter((scenario) => {
    const matchesLevel = filterLevel === 'ALL' || scenario.level === filterLevel;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      scenario.title.toLowerCase().includes(q) ||
      scenario.description.toLowerCase().includes(q) ||
      scenario.category.toLowerCase().includes(q) ||
      scenario.tags.some((t) => t.toLowerCase().includes(q));

    return matchesLevel && matchesSearch;
  });

  const launchRandomScenario = () => {
    const random = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    setSelectedScenario(random);
  };

  const copySnippet = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    triggerNotification('Playwright code snippet copied to clipboard!');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="w-full flex-grow flex flex-col">
      {/* HERO SECTION WITH AI ROBOTICS & DYNAMIC RIPPLES */}
      <section
        ref={heroRef}
        id="heroSection"
        className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-20 border-b border-slate-800/80 bg-cyber-grid min-h-[620px] flex items-center hero-fluid-container"
      >
        {/* Interactive Particle Canvas Background Grid */}
        <canvas ref={particleCanvasRef} id="particleCanvas" />

        {/* Fast-Dissipating Liquid Ripple Canvas */}
        <canvas ref={rippleCanvasRef} id="slowRippleCanvas" />

        {/* Dynamic Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-purple-600/15 rounded-full animate-glow-pulse blur-3xl pointer-events-none" />
        <div
          className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full animate-glow-pulse blur-3xl pointer-events-none"
          style={{ animationDelay: '-2s' }}
        />

        {/* BACKGROUND HUD OVERLAYS & ROBOTIC ARM */}
        <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none overflow-hidden z-10">
          {/* LEFT: ANIMATED ROBOTIC ARM */}
          <div className="absolute top-12 -left-12 lg:left-0 opacity-80 lg:opacity-100 transition-all duration-500 hidden md:block">
            <svg
              width="320"
              height="360"
              viewBox="0 0 340 380"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="filter drop-shadow-[0_0_15px_rgba(0,243,255,0.3)]"
            >
              <rect x="20" y="300" width="80" height="30" rx="6" fill="#1e293b" stroke="#00f3ff" strokeWidth="2" />
              <circle cx="60" cy="315" r="8" fill="#00f3ff" className="animate-ping" opacity="0.6" />
              <path d="M 60 300 L 110 200" stroke="#475569" strokeWidth="12" strokeLinecap="round" />
              <path d="M 60 300 L 110 200" stroke="#00f3ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 6" />
              <circle cx="110" cy="200" r="16" fill="#0f172a" stroke="#a855f7" strokeWidth="4" />
              <path d="M 110 200 L 210 220" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
              <circle cx="210" cy="220" r="12" fill="#0f172a" stroke="#00f3ff" strokeWidth="3" />
              <path d="M 210 220 L 250 210" stroke="#64748b" strokeWidth="6" />
              <path d="M 250 200 L 265 210 L 250 220" fill="none" stroke="#00f3ff" strokeWidth="3" />
              <line x1="265" y1="210" x2="330" y2="280" stroke="#ec4899" strokeWidth="2.5" className="animate-pulse" strokeDasharray="100" opacity="0.8" />
              <text x="70" y="170" fill="#00f3ff" fontFamily="monospace" fontSize="10" opacity="0.7">
                &gt; ROBOTIC_ARM_ONLINE
              </text>
            </svg>
          </div>

          {/* TOP LEFT: FLOATING TECH DRONE */}
          <div className="absolute top-4 left-6 lg:left-24 animate-drone-hover hidden sm:block">
            <svg
              width="200"
              height="130"
              viewBox="0 0 220 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="filter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <rect x="70" y="50" width="80" height="35" rx="12" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <circle cx="110" cy="67" r="10" fill="#030712" stroke="#00f3ff" strokeWidth="2" />
              <circle cx="110" cy="67" r="5" fill="#00f3ff" className="animate-pulse" />
              <line x1="40" y1="40" x2="80" y2="55" stroke="#475569" strokeWidth="4" />
              <line x1="180" y1="40" x2="140" y2="55" stroke="#475569" strokeWidth="4" />
              <ellipse cx="40" cy="38" rx="28" ry="4" fill="rgba(0, 243, 255, 0.3)" className="animate-spin" />
              <ellipse cx="180" cy="38" rx="28" ry="4" fill="rgba(0, 243, 255, 0.3)" className="animate-spin" />
            </svg>
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
            <line x1="10%" y1="20%" x2="90%" y2="20%" className="blueprint-line" />
            <line x1="10%" y1="80%" x2="90%" y2="80%" className="blueprint-line" />
          </svg>
        </div>

        {/* HERO MAIN CONTENT CONTAINER */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Hero Text Content */}
          <div className="text-center lg:text-left max-w-2xl">
            {/* Hero Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-mono mb-6 shadow-[0_0_15px_rgba(0,243,255,0.2)] backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <i className="fa-solid fa-wand-magic-sparkles text-cyan-400" />
              <span>The Modern Automation Testing Sandbox</span>
              <span className="bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded text-[10px] font-bold border border-cyan-500/30">
                AI v3.5
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
              Master Test Automation <br />
              with <span className="gradient-text-hero">Real Scenarios</span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-300 text-base sm:text-lg mb-8 font-normal leading-relaxed">
              A full-featured testing playground designed specifically for writing and practicing reliable automated tests in{' '}
              <strong className="text-cyan-400">Playwright</strong>,{' '}
              <strong className="text-purple-400">Cypress</strong>,{' '}
              <strong className="text-pink-400">Selenium</strong>, and{' '}
              <strong className="text-emerald-400">Puppeteer</strong>. Every scenario includes deterministic locators (
              <code className="text-cyan-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs">
                data-testid
              </code>
              ) and real backend APIs.
            </p>

            {/* Framework Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-8">
              {[
                { name: 'Playwright', icon: 'fa-masks-theater', color: 'text-amber-400', hover: 'hover:border-amber-400 hover:text-amber-300' },
                { name: 'Cypress', icon: 'fa-tree', color: 'text-emerald-400', hover: 'hover:border-emerald-400 hover:text-emerald-300' },
                { name: 'Selenium', icon: 'fa-bolt', color: 'text-cyan-400', hover: 'hover:border-cyan-400 hover:text-cyan-300' },
                { name: 'Robot Framework', icon: 'fa-robot', color: 'text-rose-400', hover: 'hover:border-rose-400 hover:text-rose-300' },
                { name: 'Appium Web', icon: 'fa-mobile-screen-button', color: 'text-purple-400', hover: 'hover:border-purple-400 hover:text-purple-300' }
              ].map((fw) => (
                <div
                  key={fw.name}
                  onClick={() => setSearchQuery(fw.name.toLowerCase())}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-semibold shadow-md ${fw.hover} hover:scale-105 transition duration-200 cursor-pointer`}
                >
                  <i className={`fa-solid ${fw.icon} ${fw.color}`} />
                  <span>{fw.name}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                type="button"
                data-testid="hero-play-puppy-btn"
                onClick={() => navigate('/play')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:scale-105 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🐶</span>
                <span>Play Super Puppy Bros.</span>
              </button>
              <a
                href="#scenarios"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <i className="fa-solid fa-list-check text-cyan-400" />
                <span>Explore Scenarios</span>
              </a>
              <button
                type="button"
                onClick={launchRandomScenario}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <i className="fa-solid fa-shuffle text-purple-400" />
                <span>Random Test</span>
              </button>
            </div>
          </div>

          {/* RIGHT: AI ROBOT POD WITH FAST-FADING FLUID RIPPLE INTERACTIVITY */}
          <div className="w-full lg:w-[420px] flex justify-center">
            <div
              onClick={handleRobotClick}
              onMouseEnter={() => setIsRobotHovered(true)}
              onMouseLeave={() => setIsRobotHovered(false)}
              data-testid="interactive-robot"
              className="robot-glass-pod relative w-full max-w-[380px] h-[390px] flex flex-col items-center justify-center cursor-pointer group select-none"
              title="Hover to make the robot wave, click to say Hi!"
            >
              {/* Animated Floating Speech Bubble when clicked */}
              {robotSpeech ? (
                <div
                  data-testid="robot-speech-bubble"
                  className="absolute -top-6 z-40 px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(0,243,255,0.7)] border-2 border-cyan-300 animate-bounce flex items-center gap-2"
                >
                  <i className="fa-solid fa-comment-dots text-cyan-200 text-base" />
                  <span>{robotSpeech}</span>
                  {/* Bubble Pointer Arrow */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-indigo-600" />
                </div>
              ) : (
                /* Interactive Tooltip Overlay Badge */
                <div className="absolute top-4 z-30 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-400/40 backdrop-blur-md shadow-lg flex items-center gap-2 group-hover:border-cyan-400 group-hover:scale-105 transition-all">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-cyan-300 font-mono text-[11px] font-bold uppercase tracking-wider">
                    {isRobotHovered ? '👋 Waving! Click To Say Hi!' : '👋 Hover Robot to Wave'}
                  </span>
                </div>
              )}

              {/* AI Robot Vector Graphic with active floating and jumping animations */}
              <div className={`relative z-10 ${isRobotJumping ? 'animate-robot-jump' : 'animate-float'} flex flex-col items-center group-hover:scale-105 transition-transform duration-300`}>
                <svg
                  width="250"
                  height="270"
                  viewBox="0 0 280 300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="filter drop-shadow-[0_0_25px_rgba(0,243,255,0.45)] group-hover:drop-shadow-[0_0_35px_rgba(0,243,255,0.75)] transition-all"
                >
                  {/* Floating Base Glow Ring */}
                  <ellipse cx="140" cy="270" rx="75" ry="14" fill="rgba(0,243,255,0.25)" className="robot-base-glow" />
                  <ellipse cx="140" cy="270" rx="45" ry="7" fill="rgba(168,85,247,0.5)" />

                  {/* Robot Body */}
                  <rect x="90" y="125" width="100" height="85" rx="28" fill="#0f172a" stroke="#00f3ff" strokeWidth="3" />
                  {/* Core Pulsing Heart Light */}
                  <circle cx="140" cy="168" r="15" fill="#030712" stroke="#ec4899" strokeWidth="2" />
                  <circle cx="140" cy="168" r="7" fill="#00f3ff" className="robot-core-pulse" />

                  {/* Robot Head */}
                  <rect x="80" y="40" width="120" height="72" rx="24" fill="#0f172a" stroke="#a855f7" strokeWidth="3" />
                  {/* Face Display Screen */}
                  <rect x="95" y="52" width="90" height="48" rx="14" fill="#030712" stroke="#00f3ff" strokeWidth="1.5" />
                  
                  {/* Glowing Animated Eyes with Pupils */}
                  <circle cx="120" cy="74" r="7.5" fill="#00f3ff" className="robot-eye-pulse" opacity="0.8" />
                  <circle cx="120" cy="74" r="4" fill="#ffffff" />
                  <circle cx="160" cy="74" r="7.5" fill="#00f3ff" className="robot-eye-pulse" opacity="0.8" />
                  <circle cx="160" cy="74" r="4" fill="#ffffff" />
                  
                  {/* Expressive Smile Curve */}
                  <path d="M 128 88 Q 140 96 152 88" fill="none" stroke="#00f3ff" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Antenna with Pulsing Beacon */}
                  <line x1="140" y1="40" x2="140" y2="20" stroke="#a855f7" strokeWidth="3" />
                  <circle cx="140" cy="16" r="6" fill="#00f3ff" stroke="#ec4899" strokeWidth="2" className="robot-beacon-pulse" />

                  {/* Right Arm: ONLY waves when user hovers (or when robotSpeech is active) */}
                  <g className={`robot-arm-right ${isRobotHovered || robotSpeech ? 'wave-active' : ''}`}>
                    <path d="M 190 140 C 218 135 228 108 222 88" fill="none" stroke="#00f3ff" strokeWidth="7" strokeLinecap="round" />
                    <circle cx="222" cy="83" r="9" fill="#a855f7" />
                  </g>
                  
                  {/* Left Arm: subtle idle motion */}
                  <g className="animate-left-arm">
                    <path d="M 90 140 C 65 155 60 175 70 195" fill="none" stroke="#00f3ff" strokeWidth="7" strokeLinecap="round" />
                    <circle cx="70" cy="198" r="9" fill="#a855f7" />
                  </g>
                </svg>

                {/* HUD Status Badge */}
                <div className="mt-2 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 font-mono text-[10px] text-cyan-300 flex items-center gap-1.5 shadow-md">
                  <i className="fa-solid fa-water text-cyan-400" />
                  <span>FLUID_SIM: FAST_DISSIPATE_2S</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCENARIOS & FILTERING SECTION */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full" id="scenarios">
        {/* Search & Difficulty Level Bar */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 mb-10 border border-slate-800 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <i className="fa-solid fa-magnifying-glass text-sm text-cyan-400" />
              </div>
              <input
                type="text"
                id="searchInput"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scenarios (e.g. wait, upload, modal, shadow)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              )}
            </div>

            {/* Level Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider mr-2 hidden lg:inline">
                LEVEL:
              </span>
              {['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFilterLevel(level)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterLevel === level
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(0,243,255,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SCENARIOS CARDS GRID */}
        <div id="cardsGrid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => {
            let levelBadgeStyle = '';
            if (scenario.level === 'BEGINNER') {
              levelBadgeStyle = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]';
            } else if (scenario.level === 'INTERMEDIATE') {
              levelBadgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
            } else {
              levelBadgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
            }

            return (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:-translate-y-1.5 transition duration-300 group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition duration-500" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${scenario.iconBg} flex items-center justify-center text-xl group-hover:scale-110 transition duration-200`}
                    >
                      <i className={`fa-solid ${scenario.icon}`} />
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${levelBadgeStyle} tracking-wider`}>
                      {scenario.level}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition mb-2">
                    {scenario.title}
                  </h3>

                  <p className="text-slate-400 text-xs leading-relaxed mb-6 line-clamp-3">
                    {scenario.description}
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {scenario.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition">
                    <span>Inspect &amp; Launch</span>
                    <i className="fa-solid fa-arrow-right" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results View */}
        {filteredScenarios.length === 0 && (
          <div className="text-center py-16 glass-card rounded-2xl my-6 border border-slate-800">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <i className="fa-solid fa-filter-circle-xmark text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">No matching test scenarios found</h3>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your search query or difficulty level filters.</p>
            <button
              type="button"
              onClick={() => {
                setFilterLevel('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>

      {/* SCENARIO DETAILS MODAL */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${selectedScenario.iconBg} flex items-center justify-center text-lg`}>
                  <i className={`fa-solid ${selectedScenario.icon}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedScenario.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {selectedScenario.level}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Scenario Overview
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedScenario.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                  Deterministic Locators (<code className="text-cyan-300">data-testid</code>)
                </h4>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-cyan-300 space-y-1">
                  {selectedScenario.locators.map((loc) => (
                    <div key={loc}>• <code>{loc}</code></div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                  Playwright Code Snippet
                </h4>
                <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
                  <pre className="text-emerald-400">
                    <code>{selectedScenario.code}</code>
                  </pre>
                  <button
                    type="button"
                    onClick={() => copySnippet(selectedScenario.code)}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition"
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <i className="fa-regular fa-copy" />
                    <span>{copiedSnippet ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500">STATUS: READY_TO_TEST</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedScenario(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const route = selectedScenario.route;
                    setSelectedScenario(null);
                    navigate(route);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white shadow-[0_0_15px_rgba(0,243,255,0.4)] transition flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                  <span>Open Live Sandbox</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-cyan-400/40 animate-slideUp">
          <i className="fa-solid fa-circle-check" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}

