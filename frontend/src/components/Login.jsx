import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplets, Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    if (!email.trim() || !password) {
      setValidationError('Please enter both email address and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      // Error handled by AuthContext and displayed via context error state
    } finally {
      setLoading(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
            <Droplets className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Sign in to <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">JalRakshak AI</span>
          </h2>
          <p className="text-slate-400 text-sm">
            Water Intelligence & Anomaly Detection Platform
          </p>
        </div>

        {displayError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{displayError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@jalrakshak.org"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                Authenticating...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800/80">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none underline underline-offset-4"
            >
              Register new account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
