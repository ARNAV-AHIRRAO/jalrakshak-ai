import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import WaterReadings from './WaterReadings';
import Anomalies from './Anomalies';
import Interventions from './Interventions';
import { Activity, AlertTriangle, BarChart3, Droplets, LogOut, Menu, Target, UserCheck, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, component: Dashboard },
  { id: 'readings', label: 'Water readings', icon: Droplets, component: WaterReadings },
  { id: 'anomalies', label: 'Anomalies & AI', icon: AlertTriangle, component: Anomalies },
  { id: 'interventions', label: 'Interventions', icon: Target, component: Interventions },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const ActiveComponent = NAV_ITEMS.find((item) => item.id === activePage)?.component || Dashboard;
  const navigate = (page) => { setActivePage(page); setMobileNavOpen(false); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-lg border-b border-slate-800/80 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20"><Droplets className="w-6 h-6" /></div>
            <div><h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">JalRakshak AI</h1><p className="text-xs text-slate-400 hidden sm:block">Water management & anomaly intelligence</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs"><UserCheck className="w-4 h-4 text-cyan-400" /><span className="font-medium text-slate-200">{user?.full_name || 'Authenticated user'}</span><span className="text-slate-500">•</span><span className="text-slate-400">{user?.email}</span></div>
            <button onClick={() => setMobileNavOpen((open) => !open)} className="lg:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300" aria-label="Toggle navigation">{mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <button onClick={logout} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"><LogOut className="w-4 h-4 text-slate-400" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto flex-1 lg:flex">
        <aside className={`${mobileNavOpen ? 'block' : 'hidden'} lg:block lg:w-56 shrink-0 p-4 lg:pr-0`}>
          <nav className="lg:sticky lg:top-24 p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-xs font-semibold transition-colors ${activePage === id ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'}`}><Icon className="w-4 h-4" />{label}</button>)}
            <div className="px-3 pt-4 pb-2 text-[10px] leading-relaxed text-slate-500"><Activity className="w-4 h-4 text-emerald-400 mb-2" />Record → detect → act → measure.</div>
          </nav>
        </aside>
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8"><ActiveComponent /></main>
      </div>
    </div>
  );
}
