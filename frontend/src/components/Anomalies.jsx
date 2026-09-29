import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Activity,
  MapPin,
  Clock,
  Brain,
  Lightbulb,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Droplets,
} from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'bg-red-950/60 text-red-300 border-red-800/60',
  high: 'bg-orange-950/60 text-orange-300 border-orange-800/60',
  medium: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  low: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
};

const SEVERITY_DOT = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

const STATUS_STYLES = {
  detected: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
  investigating: 'bg-blue-950/50 text-blue-300 border-blue-800/50',
  resolved: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  ignored: 'bg-slate-800/50 text-slate-400 border-slate-700/50',
};

function AnomalyDetail({ anomalyId, onBack }) {
  const [anomaly, setAnomaly] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiError, setAiError] = useState(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/anomalies/${anomalyId}`);
      setAnomaly(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiAnalysis = async (forceRefresh = false) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiFetch(`/ai/analyze-anomaly/${anomalyId}`, {
        method: 'POST',
        body: JSON.stringify({ forceRefresh }),
      });
      setAiAnalysis(res.data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchAiAnalysis(false);
  }, [anomalyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-xs text-slate-400">Loading anomaly details...</p>
      </div>
    );
  }

  if (error || !anomaly) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-red-950/20 border border-red-900/40 gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-300">{error || 'Anomaly not found'}</p>
        <button onClick={onBack} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to List
        </button>
      </div>
    );
  }

  const reading = anomaly.reading;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Anomalies
      </button>

      {/* Anomaly Header */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">{anomaly.title}</h3>
            <p className="text-sm text-slate-400">{anomaly.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${SEVERITY_STYLES[anomaly.severity]}`}>
              {anomaly.severity}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${STATUS_STYLES[anomaly.status]}`}>
              {anomaly.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(anomaly.detected_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Associated Reading */}
      {reading && (
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-400" /> Associated Water Reading
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase">Location</p>
              <p className="text-sm font-semibold text-white mt-0.5">{reading.location_name}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase">Flow Rate</p>
              <p className="text-sm font-semibold text-cyan-300 mt-0.5">{reading.flow_rate_lps ?? '—'} LPS</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase">pH Level</p>
              <p className="text-sm font-semibold text-emerald-300 mt-0.5">{reading.ph_level ?? '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <p className="text-[10px] text-slate-500 uppercase">Recorded</p>
              <p className="text-sm font-semibold text-white mt-0.5">{new Date(reading.recorded_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" /> AI Analysis & Recommendations
          </h4>
          <button
            onClick={() => fetchAiAnalysis(true)}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider border border-indigo-800/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        {aiLoading && !aiAnalysis ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">Running AI analysis...</p>
          </div>
        ) : aiError && !aiAnalysis ? (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
            {aiError}
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-4">
            {/* Risk Score & Summary */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
              <div className="shrink-0 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Risk Score</span>
                  <span className={`text-lg font-extrabold ${aiAnalysis.risk_score >= 70 ? 'text-red-400' : aiAnalysis.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {aiAnalysis.risk_score}/100
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.summary}</p>
              </div>
            </div>

            {/* Probable Causes */}
            {aiAnalysis.raw_model_output?.probable_causes && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Probable Causes
                </h5>
                <ul className="space-y-2">
                  {aiAnalysis.raw_model_output.probable_causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 p-3 rounded-xl bg-slate-950/40 border border-slate-800/40">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        {i + 1}
                      </span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-400" /> Recommendations
                </h5>
                <ul className="space-y-2">
                  {aiAnalysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300 p-3 rounded-xl bg-slate-950/40 border border-slate-800/40">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">No AI analysis available yet. Click "Refresh Analysis" to generate.</p>
        )}
      </div>
    </div>
  );
}

export default function Anomalies() {
  const [anomalies, setAnomalies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(null);

  const fetchAnomalies = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: String(pagination.limit) });
        if (severityFilter) params.append('severity', severityFilter);
        if (statusFilter) params.append('status', statusFilter);

        const res = await apiFetch(`/anomalies?${params.toString()}`);
        setAnomalies(res.data || []);
        setPagination(res.pagination || { page: pageNum, limit: 10, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [severityFilter, statusFilter, pagination.limit]
  );

  useEffect(() => {
    fetchAnomalies(1);
  }, [fetchAnomalies]);

  if (selectedAnomalyId) {
    return (
      <AnomalyDetail
        anomalyId={selectedAnomalyId}
        onBack={() => {
          setSelectedAnomalyId(null);
          fetchAnomalies(pagination.page);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            Detected Anomalies
          </h2>
          <p className="text-xs text-slate-400 mt-1">Water consumption anomalies flagged by baseline deviation analysis</p>
        </div>
        <button onClick={() => fetchAnomalies(1)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors">
          <RefreshCw className="w-4 h-4 text-cyan-400" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">All Statuses</option>
          <option value="detected">Detected</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
          <button onClick={() => fetchAnomalies(1)} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white border border-slate-700">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-900/40 border border-slate-800/60 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs text-slate-400">Loading anomalies...</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center gap-3">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-10 h-10" />
          </div>
          <h3 className="text-base font-semibold text-white">No Anomalies Detected</h3>
          <p className="text-xs text-slate-400 max-w-sm">All water consumption patterns are within normal baseline thresholds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAnomalyId(a.id)}
              className="w-full text-left p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all group space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_DOT[a.severity]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{a.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${SEVERITY_STYLES[a.severity]}`}>{a.severity}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 pl-5">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.detected_at).toLocaleString()}</span>
              </div>
            </button>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3">
              <p className="text-xs text-slate-400">
                Page <span className="font-semibold text-white">{pagination.page}</span> of <span className="font-semibold text-white">{pagination.totalPages}</span> ({pagination.total} anomalies)
              </p>
              <div className="flex items-center gap-2">
                <button disabled={pagination.page <= 1} onClick={() => fetchAnomalies(pagination.page - 1)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchAnomalies(pagination.page + 1)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
