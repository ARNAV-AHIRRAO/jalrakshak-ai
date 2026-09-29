import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import ReadingFormModal from './ReadingFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import {
  Droplets,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Activity,
  Brain,
  Gauge,
  Thermometer,
} from 'lucide-react';

export default function WaterReadings() {
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [locationFilter, setLocationFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingReading, setDeletingReading] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);

  const fetchReadings = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: String(pageNum),
          limit: String(pagination.limit),
        });

        if (locationFilter.trim()) {
          queryParams.append('location_name', locationFilter.trim());
        }
        if (startDateFilter) {
          queryParams.append('start_date', startDateFilter);
        }
        if (endDateFilter) {
          queryParams.append('end_date', endDateFilter);
        }

        const res = await apiFetch(`/water-readings?${queryParams.toString()}`);
        setReadings(res.data || []);
        setPagination(res.pagination || { page: pageNum, limit: 10, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to fetch water readings');
      } finally {
        setLoading(false);
      }
    },
    [locationFilter, startDateFilter, endDateFilter, pagination.limit]
  );

  useEffect(() => {
    fetchReadings(1);
  }, [fetchReadings]);

  const handleCreateNew = () => {
    setEditingReading(null);
    setIsFormOpen(true);
  };

  const handleEdit = (reading) => {
    setEditingReading(reading);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (reading) => {
    setDeletingReading(reading);
    setIsDeleteOpen(true);
  };

  const handleSaveReading = async (payload) => {
    setSaving(true);
    try {
      if (editingReading) {
        await apiFetch(`/water-readings/${editingReading.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/water-readings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsFormOpen(false);
      fetchReadings(pagination.page);
    } catch (err) {
      alert(`Failed to save reading: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingReading) return;
    setDeleting(true);
    try {
      await apiFetch(`/water-readings/${deletingReading.id}`, {
        method: 'DELETE',
      });
      setIsDeleteOpen(false);
      setDeletingReading(null);
      fetchReadings(pagination.page);
    } catch (err) {
      alert(`Failed to delete reading: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleAnalyze = async (reading) => {
    setAnalyzingId(reading.id);
    try {
      const result = await apiFetch('/anomalies/analyze', {
        method: 'POST',
        body: JSON.stringify({ reading_id: reading.id }),
      });
      alert(result.anomalyDetected ? 'Anomaly detected. Open Anomalies & AI to review it.' : (result.message || 'Reading is within the current baseline.'));
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Droplets className="w-7 h-7 text-cyan-400" />
            Water Telemetry Readings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of flow rates, pH levels, turbidity, and chemical metrics
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <Plus className="w-4 h-4" />
          Add New Reading
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-cyan-400" /> Filter Telemetry Logs
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Search location..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReadings(1)}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" /> Apply
            </button>
            {(locationFilter || startDateFilter || endDateFilter) && (
              <button
                onClick={handleClearFilters}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl border border-slate-800 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <h3 className="text-base font-semibold text-white">Error Loading Readings</h3>
          <p className="text-xs text-red-300 max-w-md">{error}</p>
          <button
            onClick={() => fetchReadings(1)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Retry Request
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-900/40 border border-slate-800/60 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs font-medium text-slate-400">Fetching water telemetry data...</p>
        </div>
      ) : readings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center gap-3">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-500">
            <Droplets className="w-10 h-10" />
          </div>
          <h3 className="text-base font-semibold text-white">No Water Readings Found</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {locationFilter || startDateFilter || endDateFilter
              ? 'No readings match your search filters. Try adjusting your query parameters.'
              : 'You have not added any water readings yet. Click "Add New Reading" to create your first entry.'}
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" /> Add Reading Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-4">Location</th>
                  <th className="p-4">Recorded At</th>
                  <th className="p-4 text-right">Flow Rate (LPS)</th>
                  <th className="p-4 text-right">pH Level</th>
                  <th className="p-4 text-right">Turbidity</th>
                  <th className="p-4 text-right">Dissolved O₂</th>
                  <th className="p-4 text-right">Temp (°C)</th>
                  <th className="p-4 text-right">Contaminant</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {readings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {item.location_name}
                    </td>
                    <td className="p-4 text-slate-400 whitespace-nowrap">{formatDate(item.recorded_at)}</td>
                    <td className="p-4 text-right font-medium text-cyan-300">
                      {item.flow_rate_lps !== null ? `${item.flow_rate_lps} LPS` : '—'}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-300">
                      {item.ph_level !== null ? item.ph_level : '—'}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {item.turbidity_ntu !== null ? `${item.turbidity_ntu} NTU` : '—'}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {item.dissolved_oxygen_mg_l !== null ? `${item.dissolved_oxygen_mg_l} mg/L` : '—'}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {item.temperature_celsius !== null ? `${item.temperature_celsius} °C` : '—'}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {item.contaminant_ppm !== null ? `${item.contaminant_ppm} PPM` : '—'}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAnalyze(item)}
                          disabled={analyzingId === item.id}
                          className="p-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 hover:text-indigo-100 transition-colors disabled:opacity-50"
                          title="Analyze for anomaly"
                        >
                          <Brain className={`w-3.5 h-3.5 ${analyzingId === item.id ? 'animate-pulse' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit reading"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors"
                          title="Delete reading"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3">
              <p className="text-xs text-slate-400">
                Showing page <span className="font-semibold text-white">{pagination.page}</span> of{' '}
                <span className="font-semibold text-white">{pagination.totalPages}</span> ({pagination.total} total readings)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReadings(pagination.page - 1)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchReadings(pagination.page + 1)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ReadingFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveReading}
        readingToEdit={editingReading}
        saving={saving}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        itemLocation={deletingReading?.location_name || ''}
      />
    </div>
  );
}
