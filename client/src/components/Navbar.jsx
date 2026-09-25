import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import SelectorModal from './SelectorModal';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [logoSpeech, setLogoSpeech] = useState(false);

  // PWA (Progressive Web App) States
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const checkServer = async () => {
    try {
      const res = await fetch('/api/health');
      setServerOnline(res.ok);
    } catch {
      setServerOnline(false);
    }
  };

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 10000);

    // Detect Standalone PWA Mode
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(standaloneQuery.matches || window.navigator.standalone === true);

    const handleStandaloneChange = (e) => setIsStandalone(e.matches);
    standaloneQuery.addEventListener('change', handleStandaloneChange);

    // Capture PWA Install Prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Network connectivity listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      standaloneQuery.removeEventListener('change', handleStandaloneChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setPwaModalOpen(true);
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      html.classList.add('light');
      setIsDark(false);
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      setIsDark(true);
    }
  };

  const handleRobotLogoClick = (e) => {
    e.preventDefault();
    setLogoSpeech(true);

    // Audio chime
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio fallback
    }

    // Speak "Hi user"
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Hi user');
      utterance.pitch = 1.35;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }

    setTimeout(() => {
      setLogoSpeech(false);
    }, 3500);
  };

  const navItems = [
    { name: 'Auth', path: '/auth', icon: 'fa-shield-halved', color: 'text-purple-400' },
    { name: 'Forms', path: '/forms', icon: 'fa-microchip', color: 'text-emerald-400' },
    { name: 'Dynamic & Waits', path: '/dynamic', icon: 'fa-wave-square', color: 'text-amber-400' },
    { name: 'Alerts & Frames', path: '/dialogs', icon: 'fa-window-maximize', color: 'text-pink-400' },
    { name: 'Interactions', path: '/interactions', icon: 'fa-hand-pointer', color: 'text-cyan-400' },
    { name: 'Tables', path: '/tables', icon: 'fa-table-cells', color: 'text-blue-400' },
    { name: 'Store Flow', path: '/store', icon: 'fa-cart-shopping', color: 'text-purple-400' },
    { name: 'Shadow DOM', path: '/shadow', icon: 'fa-cubes', color: 'text-rose-400' },
    { name: 'API Tester', path: '/api-tester', icon: 'fa-network-wired', color: 'text-cyan-400' },
    { name: 'Play Now',   path: '/play',    icon: 'fa-gamepad',         color: 'text-yellow-400' },
    { name: 'Web Games',  path: '/webgame', icon: 'fa-gamepad-modern',  color: 'text-pink-400'   },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo with Click-to-Say-Hi Robot */}
            <div className="flex items-center gap-3 cursor-pointer group relative">
              <div
                onClick={handleRobotLogoClick}
                data-testid="navbar-robot-logo"
                className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 active:scale-95 transition-transform"
                title="Click me to say Hi!"
              >
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <i className="fa-solid fa-robot text-cyan-400 text-lg animate-pulse"></i>
                </div>
              </div>

              {/* Logo Speech Bubble */}
              {logoSpeech && (
                <div
                  data-testid="navbar-speech-bubble"
                  className="absolute left-12 -top-1 z-50 px-3 py-1 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg border border-cyan-300 animate-bounce whitespace-nowrap"
                >
                  Hi user! 👋🤖
                </div>
              )}

              <Link to="/">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                  AutoTest <span className="text-cyan-400 font-extrabold drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">Playground</span>
                </span>
                <div className="text-[10px] tracking-widest uppercase font-mono text-cyan-400/80 -mt-1 hidden sm:block">
                  AI & ROBOTIC AUTOMATION HUB
                </div>
              </Link>
            </div>

            {/* Nav Scenarios Quick Links */}
            <nav className="hidden xl:flex items-center space-x-1 text-xs font-medium text-slate-300">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'text-cyan-300 bg-slate-900 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                        : 'hover:text-cyan-400 hover:bg-slate-900/80'
                    }`
                  }
                >
                  <i className={`fa-solid ${item.icon} text-xs ${item.color}`}></i>
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>

            {/* Actions & Theme Toggle */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-cyan-400 hover:text-white hover:border-cyan-500/50 transition cursor-pointer"
                title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {isDark ? (
                  <i className="fa-solid fa-moon"></i>
                ) : (
                  <i className="fa-solid fa-sun text-amber-400"></i>
                )}
              </button>

              {/* API Online Badge */}
              <div
                onClick={checkServer}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs shadow-inner cursor-pointer"
                title="Click to check API status on port 4000"
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverOnline ? 'bg-cyan-400' : 'bg-rose-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${serverOnline ? 'bg-cyan-400' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">API Engine:</span>
                <span className={`font-mono font-bold ${serverOnline ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {serverOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* Play Now (Super Puppy Bros. Arcade) Button */}
              <Link
                to="/play"
                data-testid="nav-play-now-btn"
                className="relative group flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Play Super Puppy Bros. NES Game!"
              >
                <span>🐶</span>
                <span>Play Now</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                </span>
              </Link>

              {/* Web Games (Poki-style) Button */}
              <Link
                to="/webgame"
                data-testid="nav-webgame-btn"
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Play Free Web Games (Poki-style)"
              >
                <span>🎯</span>
                <span>Web Games</span>
              </Link>

              {/* PWA Install Button or Standalone Badge */}
              {isStandalone ? (
                <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm" title="Running in Standalone PWA Desktop App Mode">
                  <i className="fa-solid fa-mobile-screen-button"></i>
                  <span>PWA App</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  data-testid="nav-pwa-install-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:bg-cyan-500/20 shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
                  title="Install AutoTest Hub as Desktop / Mobile PWA App"
                >
                  <i className="fa-solid fa-download text-cyan-400 animate-bounce"></i>
                  <span className="hidden sm:inline">Install PWA</span>
                </button>
              )}

              {/* Cheat Sheet Button */}
              <button
                type="button"
                onClick={() => setCheatSheetOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:brightness-110 text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition cursor-pointer"
              >
                <i className="fa-solid fa-code"></i>
                <span>Cheat Sheet</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
              >
                <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
              </button>
            </div>
          </div>
        </div>

        {/* Offline Banner Indicator */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg">
            <i className="fa-solid fa-wifi-slash"></i>
            <span>Offline Mode Active — AutoTest Hub PWA is running locally with offline service worker cache.</span>
          </div>
        )}

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-1">
            <Link
              to="/play"
              data-testid="mobile-play-now-btn"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 shadow-md mb-2"
            >
              <div className="flex items-center gap-2">
                <span>🐶</span>
                <span>🎮 Play Now (Super Puppy Bros.)</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded font-mono">NEW</span>
            </Link>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-900"
            >
              <i className="fa-solid fa-house mr-2 text-cyan-400"></i> Home Hub
            </Link>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive
                      ? 'text-cyan-300 bg-slate-900 font-semibold'
                      : 'text-slate-300 hover:text-cyan-400 hover:bg-slate-900'
                  }`
                }
              >
                <i className={`fa-solid ${item.icon} text-xs ${item.color}`}></i>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Cheat Sheet Modal */}
      <SelectorModal isOpen={cheatSheetOpen} onClose={() => setCheatSheetOpen(false)} />

      {/* PWA Installation Guide Modal */}
      {pwaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-500/20 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <i className="fa-solid fa-laptop-code text-cyan-400 text-lg"></i>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install Progressive Web App (PWA)</h3>
                  <p className="text-xs text-cyan-400 font-mono">STANDALONE DESKTOP &amp; MOBILE APP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPwaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-300">
              <p>
                AutoTest Playground is equipped with a high-performance <strong>PWA Service Worker</strong> and <strong>Web Manifest</strong>, allowing you to install it as a native standalone application on Windows, Mac, Linux, Android, and iOS!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <i className="fa-brands fa-chrome text-sm"></i>
                    <span>Chrome &amp; Edge (Desktop)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Look for the <strong className="text-white">Install (⊕)</strong> icon on the right side of the address bar, or click <strong className="text-white">Settings (⋮) → Install AutoTest Hub</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <i className="fa-brands fa-apple text-sm"></i>
                    <span>iPhone &amp; iPad (Safari)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tap the <strong className="text-white">Share</strong> button in Safari, scroll down, and tap <strong className="text-white">"Add to Home Screen"</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <i className="fa-brands fa-android text-sm"></i>
                    <span>Android (Chrome)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tap the menu <strong className="text-white">(⋮)</strong> and select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <i className="fa-solid fa-gamepad text-sm"></i>
                    <span>100% Offline Game</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Arcade games and automation labs remain fully playable offline without internet!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPwaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

