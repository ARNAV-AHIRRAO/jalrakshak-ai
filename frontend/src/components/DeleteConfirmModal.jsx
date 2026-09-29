import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, deleting, itemLocation }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6">
        <div className="flex items-center gap-4 text-red-400">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Are you sure you want to delete the water reading entry for{' '}
          <span className="font-semibold text-white">"{itemLocation}"</span>?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Deleting...
              </>
            ) : (
              'Delete Entry'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
