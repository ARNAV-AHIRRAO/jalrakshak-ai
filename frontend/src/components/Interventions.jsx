import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { CheckCircle2, Edit2, Loader2, Plus, RefreshCw, Save, Target, Trash2, X } from 'lucide-react';

const EMPTY_FORM = { location_name: '', action_type: '', description: '', status: 'planned', notes: '', start_date: '', completion_date: '' };

function InterventionForm({ value, saving, onChange, onSubmit, onCancel }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <form onSubmit={onSubmit} className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/20 space-y-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold text-white">{value.id ? 'Edit intervention' : 'Track an intervention'}</h3><button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input required value={value.location_name} onChange={(e) => set('location_name', e.target.value)} placeholder="Location" className="field" />
      <input required value={value.action_type} onChange={(e) => set('action_type', e.target.value)} placeholder="Action type (e.g. repair leak)" className="field" />
      <select value={value.status} onChange={(e) => set('status', e.target.value)} className="field"><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
      <input type="date" value={value.start_date} onChange={(e) => set('start_date', e.target.value)} className="field" />
      <input type="date" value={value.completion_date} onChange={(e) => set('completion_date', e.target.value)} className="field" />
      <input value={value.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description" className="field" />
    </div>
    <textarea value={value.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes" rows="2" className="field w-full" />
    <div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button disabled={saving} className="btn-primary"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save intervention'}</button></div>
  </form>;
}

export default function Interventions() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [impact, setImpact] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const query = status ? `&status=${encodeURIComponent(status)}` : ''; const result = await apiFetch(`/interventions?limit=100${query}`); setItems(result.data || []); }
    catch (err) { setError(err.message || 'Could not load interventions'); } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { const payload = { ...form }; delete payload.id; await apiFetch(form.id ? `/interventions/${form.id}` : '/interventions', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); setForm(null); await load(); }
    catch (err) { setError(err.message || 'Could not save intervention'); } finally { setSaving(false); }
  };
  const remove = async (item) => { if (!window.confirm(`Delete the intervention at ${item.location_name}?`)) return; try { await apiFetch(`/interventions/${item.id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message || 'Could not delete intervention'); } };
  const showImpact = async (id) => { setImpact((current) => ({ ...current, [id]: { loading: true } })); try { const result = await apiFetch(`/interventions/${id}/impact`); setImpact((current) => ({ ...current, [id]: result })); } catch (err) { setImpact((current) => ({ ...current, [id]: { error: err.message } })); } };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800"><div><h2 className="text-2xl font-bold text-white flex items-center gap-2.5"><Target className="w-7 h-7 text-emerald-400" />Interventions</h2><p className="text-xs text-slate-400 mt-1">Track actions and measure estimated water savings.</p></div><div className="flex gap-2"><button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" />Refresh</button><button onClick={() => setForm({ ...EMPTY_FORM })} className="btn-primary"><Plus className="w-4 h-4" />Add action</button></div></div>
    {form && <InterventionForm value={form} onChange={setForm} onSubmit={save} onCancel={() => setForm(null)} saving={saving} />}
    <select value={status} onChange={(e) => setStatus(e.target.value)} className="field max-w-xs"><option value="">All statuses</option><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
    {error && <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-sm text-red-300">{error}</div>}
    {loading ? <div className="panel-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /><span>Loading interventions…</span></div> : items.length === 0 ? <div className="panel-center"><CheckCircle2 className="w-10 h-10 text-emerald-400" /><h3 className="text-white font-semibold">No interventions yet</h3><p>Add the first action after investigating an anomaly.</p></div> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-white">{item.action_type}</h3><span className="badge">{String(item.status).replace('_', ' ')}</span></div><p className="text-sm text-cyan-300 mt-1">{item.location_name}</p><p className="text-xs text-slate-400 mt-2">{item.description || item.notes || 'No description recorded.'}</p></div><div className="flex gap-2 shrink-0"><button onClick={() => setForm({ ...EMPTY_FORM, ...item, start_date: item.start_date?.slice(0, 10) || '', completion_date: item.completion_date?.slice(0, 10) || '' })} className="icon-btn" title="Edit"><Edit2 className="w-4 h-4" /></button><button onClick={() => remove(item)} className="icon-btn text-red-300" title="Delete"><Trash2 className="w-4 h-4" /></button></div></div><div className="mt-4 flex items-center gap-2"><button onClick={() => showImpact(item.id)} className="btn-secondary text-[11px]">Measure savings</button>{impact[item.id]?.loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}{impact[item.id]?.measured && <span className="text-xs text-emerald-300">≈ {impact[item.id].metrics.estimatedLitresSavedPerDay} L/day saved ({impact[item.id].metrics.percentageReduction}%)</span>}{impact[item.id] && impact[item.id].measured === false && <span className="text-xs text-amber-300">Insufficient readings to measure yet.</span>}{impact[item.id]?.error && <span className="text-xs text-red-300">{impact[item.id].error}</span>}</div></div>)}</div>}
  </div>;
}
