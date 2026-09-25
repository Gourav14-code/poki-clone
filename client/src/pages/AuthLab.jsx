import React, { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ShieldAlert, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import TestHint from '../components/TestHint';

export default function AuthLab() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [logoutMsg, setLogoutMsg] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [adminActionStatus, setAdminActionStatus] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('autotest_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLogoutMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const sessionData = {
          user: data.user,
          token: data.token,
          loginTime: new Date().toLocaleTimeString()
        };
        setCurrentUser(sessionData);
        if (rememberMe) {
          localStorage.setItem('autotest_user', JSON.stringify(sessionData));
        }
      } else {
        setErrorMsg(data.message || 'Authentication failed. Please check credentials.');
      }
    } catch {
      setErrorMsg('Failed to communicate with authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('autotest_user');
    setLogoutMsg('You have successfully logged out.');
    setAdminActionStatus('');
  };

  const handleAdminAction = () => {
    if (currentUser?.user?.role === 'Administrator') {
      setAdminActionStatus('Admin action executed successfully: Database purge simulated.');
    } else {
      setAdminActionStatus('Permission Denied: Only Administrator role can perform this action.');
    }
  };

  const autofill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setLogoutMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Authentication & Session Access Lab</h1>
          <TestHint
            testId="auth-lab-header"
            tip="Test happy path logins, negative invalid credential flows, session persistence in localStorage/cookies, and role-based access control."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Automate login forms, test valid & invalid credentials, inspect session tokens, and verify role-based permissions.
        </p>
      </div>

      {/* Quick Autofill Helpers */}
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
          Quick Test Credentials (Click to fill)
        </span>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            data-testid="autofill-admin-btn"
            onClick={() => autofill('admin', 'password123')}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-2xs"
          >
            🔑 Admin: <span className="font-mono text-indigo-600">admin / password123</span>
          </button>
          <button
            type="button"
            data-testid="autofill-tester-btn"
            onClick={() => autofill('tester', 'testpass')}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-2xs"
          >
            👤 Tester: <span className="font-mono text-indigo-600">tester / testpass</span>
          </button>
          <button
            type="button"
            data-testid="autofill-invalid-btn"
            onClick={() => autofill('invalid_user', 'wrongpass')}
            className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
          >
            ❌ Invalid: <span className="font-mono text-rose-500">invalid_user / wrongpass</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!currentUser ? (
        /* Login Card */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your automation credentials below</p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div
              data-testid="auth-error-alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-shake"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Authentication Error</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Logout Alert */}
          {logoutMsg && (
            <div
              data-testid="logout-success-msg"
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{logoutMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="username" className="block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <TestHint testId="username-input" selector="#username" />
              </div>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  data-testid="username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or tester"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <TestHint testId="password-input" selector="#password" />
              </div>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  data-testid="password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  id="remember-me"
                  data-testid="remember-me-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Remember session</span>
              </label>
              <TestHint testId="remember-me-checkbox" />
            </div>

            <button
              type="submit"
              data-testid="login-submit-btn"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span
                    data-testid="login-spinner"
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Authenticated Dashboard State */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-lg">
                {currentUser.user.fullName[0]}
              </div>
              <div>
                <h2
                  data-testid="user-welcome-message"
                  className="text-xl font-bold text-slate-900"
                >
                  Welcome, {currentUser.user.fullName}!
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    data-testid="user-role-badge"
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      currentUser.user.role === 'Administrator'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {currentUser.user.role === 'Administrator' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {currentUser.user.role}
                  </span>
                  <span className="text-xs text-slate-400">Logged in at {currentUser.loginTime}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Session Token Info Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Mock JWT Session Token
              </span>
              <TestHint testId="session-token-display" tip="Assert token existence in localStorage or UI" />
            </div>
            <div
              data-testid="session-token-display"
              className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs break-all"
            >
              {currentUser.token}
            </div>
          </div>

          {/* Role-Based Permissions Demonstration */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm">Role-Based Privileged Action</h3>
              <TestHint testId="admin-action-btn" tip="Verify whether clicking this button succeeds for Admin and fails/disables for Tester" />
            </div>
            <p className="text-xs text-slate-500">
              Only users with the <span className="font-semibold text-purple-700">Administrator</span> role have permission to execute system tasks.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <button
                type="button"
                data-testid="admin-action-btn"
                onClick={handleAdminAction}
                disabled={currentUser.user.role !== 'Administrator'}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Execute Admin Maintenance Task
              </button>

              {currentUser.user.role !== 'Administrator' && (
                <span data-testid="permission-denied-badge" className="text-xs text-rose-600 font-medium">
                  ⚠️ Action restricted to Administrator role.
                </span>
              )}
            </div>

            {adminActionStatus && (
              <div
                data-testid="admin-action-status-msg"
                className={`p-3 rounded-xl text-xs font-medium border ${
                  adminActionStatus.includes('successfully')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {adminActionStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

