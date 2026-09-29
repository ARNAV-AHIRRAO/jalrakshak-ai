import React, { useState, useEffect } from 'react';
import { X, Droplets, AlertCircle, Loader2, Save } from 'lucide-react';

export default function ReadingFormModal({ isOpen, onClose, onSave, readingToEdit, saving }) {
  const [locationName, setLocationName] = useState('');
  const [flowRateLps, setFlowRateLps] = useState('');
  const [phLevel, setPhLevel] = useState('');
  const [turbidityNtu, setTurbidityNtu] = useState('');
  const [dissolvedOxygenMgL, setDissolvedOxygenMgL] = useState('');
  const [temperatureCelsius, setTemperatureCelsius] = useState('');
  const [contaminantPpm, setContaminantPpm] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (readingToEdit) {
      setLocationName(readingToEdit.location_name || '');
      setFlowRateLps(readingToEdit.flow_rate_lps !== null ? String(readingToEdit.flow_rate_lps) : '');
      setPhLevel(readingToEdit.ph_level !== null ? String(readingToEdit.ph_level) : '');
      setTurbidityNtu(readingToEdit.turbidity_ntu !== null ? String(readingToEdit.turbidity_ntu) : '');
      setDissolvedOxygenMgL(readingToEdit.dissolved_oxygen_mg_l !== null ? String(readingToEdit.dissolved_oxygen_mg_l) : '');
      setTemperatureCelsius(readingToEdit.temperature_celsius !== null ? String(readingToEdit.temperature_celsius) : '');
      setContaminantPpm(readingToEdit.contaminant_ppm !== null ? String(readingToEdit.contaminant_ppm) : '');
      setRecordedAt(
        readingToEdit.recorded_at ? new Date(readingToEdit.recorded_at).toISOString().slice(0, 16) : ''
      );
    } else {
      setLocationName('');
      setFlowRateLps('');
      setPhLevel('');
      setTurbidityNtu('');
      setDissolvedOxygenMgL('');
      setTemperatureCelsius('');
      setContaminantPpm('');
      setRecordedAt(new Date().toISOString().slice(0, 16));
    }
    setValidationError('');
  }, [readingToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!locationName.trim()) {
      setValidationError('Location name is required.');
      return;
    }

    const parsedPh = phLevel !== '' ? parseFloat(phLevel) : undefined;
    if (parsedPh !== undefined && (isNaN(parsedPh) || parsedPh < 0 || parsedPh > 14)) {
      setValidationError('pH level must be a number between 0 and 14.');
      return;
    }

    const parsedFlow = flowRateLps !== '' ? parseFloat(flowRateLps) : undefined;
    if (parsedFlow !== undefined && (isNaN(parsedFlow) || parsedFlow < 0)) {
      setValidationError('Flow rate (LPS) must be a positive number.');
      return;
    }

    const payload = {
      location_name: locationName.trim(),
      flow_rate_lps: parsedFlow,
      ph_level: parsedPh,
      turbidity_ntu: turbidityNtu !== '' ? parseFloat(turbidityNtu) : undefined,
      dissolved_oxygen_mg_l: dissolvedOxygenMgL !== '' ? parseFloat(dissolvedOxygenMgL) : undefined,
      temperature_celsius: temperatureCelsius !== '' ? parseFloat(temperatureCelsius) : undefined,
      contaminant_ppm: contaminantPpm !== '' ? parseFloat(contaminantPpm) : undefined,
      recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-xl w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {readingToEdit ? 'Edit Water Reading' : 'Add New Water Reading'}
              </h3>
              <p className="text-xs text-slate-400">
                {readingToEdit ? 'Update environmental parameters' : 'Record hydrological telemetry data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Location Name *
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Kaveri Station - Sector 4"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Flow Rate (Litres/Sec)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={flowRateLps}
                onChange={(e) => setFlowRateLps(e.target.value)}
                placeholder="150.00"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                pH Level (0.00 - 14.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="14"
                value={phLevel}
                onChange={(e) => setPhLevel(e.target.value)}
                placeholder="7.20"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Turbidity (NTU)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={turbidityNtu}
                onChange={(e) => setTurbidityNtu(e.target.value)}
                placeholder="3.50"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dissolvedOxygenMgL}
                onChange={(e) => setDissolvedOxygenMgL(e.target.value)}
                placeholder="6.80"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temperatureCelsius}
                onChange={(e) => setTemperatureCelsius(e.target.value)}
                placeholder="24.5"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Contaminants (PPM)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={contaminantPpm}
                onChange={(e) => setContaminantPpm(e.target.value)}
                placeholder="12.00"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Recorded Date & Time
              </label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {readingToEdit ? 'Save Changes' : 'Create Entry'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
