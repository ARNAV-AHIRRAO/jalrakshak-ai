import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
  Droplets,
  Activity,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react';

function KpiCard({ icon: Icon, label, value, unit, color, subtext }) {
  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
    red: 'bg-red-500/10 text-red-400 ring-red-500/20',
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-3 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className={`p-2.5 rounded-xl ring-1 ${colorMap[color] || colorMap.cyan}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white tabular-nums">
          {value}
          {unit && <span className="text-sm font-medium text-slate-400 ml-1">{unit}</span>}
        </p>
        {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function MiniTrendChart({ readings }) {
  if (!readings || readings.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-slate-500">
        Not enough data points for trend visualization
      </div>
    );
  }

  const sorted = [...readings]
    .filter((r) => r.flow_rate_lps !== null && r.flow_rate_lps !== undefined)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(-20);

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-slate-500">
        Not enough flow rate data for trend chart
      </div>
    );
  }

  const values = sorted.map((r) => Number(r.flow_rate_lps));
  const maxVal = Math.max(...values) * 1.15 || 1;
  const minVal = Math.min(...values) * 0.85;
  const range = maxVal - minVal || 1;
  const chartHeight = 140;
  const chartWidth = 100;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * chartWidth;
    const y = ((maxVal - v) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const areaPoints = `0,${chartHeight} ${polyline} ${chartWidth},${chartHeight}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 10}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#flowGradient)" />
        <polyline points={polyline} fill="none" stroke="rgb(34 211 238)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = (i / (values.length - 1)) * chartWidth;
          const y = ((maxVal - v) / range) * chartHeight;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="rgb(34 211 238)" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 px-1 -mt-1">
        <span>{new Date(sorted[0].recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(sorted[sorted.length - 1].recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [readings, setReadings] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [readRes, anomRes, intRes] = await Promise.all([
        apiFetch('/water-readings?limit=100'),
        apiFetch('/anomalies?limit=100'),
        apiFetch('/interventions?limit=100'),
      ]);
      setReadings(readRes.data || []);
      setAnomalies(anomRes.data || []);
      setInterventions(intRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-xs text-slate-400">Loading dashboard overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-red-950/20 border border-red-900/40 gap-3 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-300">{error}</p>
        <button onClick={fetchData} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Retry
        </button>
      </div>
    );
  }

  // Calculate KPIs
  const totalReadings = readings.length;

  const flowRates = readings.filter((r) => r.flow_rate_lps !== null && r.flow_rate_lps !== undefined);
  const avgFlowRate = flowRates.length > 0
    ? (flowRates.reduce((s, r) => s + Number(r.flow_rate_lps), 0) / flowRates.length).toFixed(1)
    : '0.0';

  const totalAnomalies = anomalies.length;
  const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  const completedInterventions = interventions.filter((i) => i.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Dashboard Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time KPI aggregates from your water monitoring network</p>
        </div>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors">
          <RefreshCw className="w-4 h-4 text-cyan-400" /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Droplets} label="Total Readings" value={totalReadings} color="cyan" subtext={`${flowRates.length} with flow data`} />
        <KpiCard icon={Activity} label="Baseline Avg Flow" value={avgFlowRate} unit="LPS" color="emerald" subtext={`Across ${flowRates.length} measurements`} />
        <KpiCard icon={AlertTriangle} label="Anomalies Detected" value={totalAnomalies} color={criticalAnomalies > 0 ? 'red' : 'amber'} subtext={criticalAnomalies > 0 ? `${criticalAnomalies} high/critical severity` : 'No high-severity events'} />
        <KpiCard icon={TrendingDown} label="Interventions" value={interventions.length} color="indigo" subtext={`${completedInterventions.length} completed actions`} />
      </div>

      {/* Trend Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Flow Rate Trend
          </h3>
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Last 20 readings</span>
        </div>
        <MiniTrendChart readings={readings} />
      </div>
    </div>
  );
}
