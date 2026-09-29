import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import AppShell from './components/AppShell';
import { Loader2 } from 'lucide-react';

function MainContent() {
  const { isAuthenticated, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-sm font-medium text-slate-400">Verifying session token...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <AppShell />;
  }

  if (authMode === 'register') {
    return <Register onSwitchToLogin={() => setAuthMode('login')} />;
  }

  return <Login onSwitchToRegister={() => setAuthMode('register')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
