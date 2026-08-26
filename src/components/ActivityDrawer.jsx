import React from "react";
import { X, ScrollText } from "lucide-react";

export default function ActivityDrawer({ isOpen, onClose, logs = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#1F2421] text-slate-100 border-l-2 border-black shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm text-white">Game Activity Log</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500 italic">
            Game actions will appear here...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs leading-relaxed"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                <span className="font-mono">{log.time}</span>
                <span className="uppercase font-bold text-amber-400">{log.type}</span>
              </div>
              <div className="text-slate-200">{log.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
