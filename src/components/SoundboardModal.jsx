import React from "react";
import { SOUNDBOARD_CLIPS } from "../data/soundboardData.js";
import { Volume2, X, Clock } from "lucide-react";

export default function SoundboardModal({ isOpen, onClose, onPlaySound, cooldownRemaining }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-start p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-sm sm:max-w-md bg-[#181C19] border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative shadow-emerald-500/10">
        {/* Header */}
        <div className="px-4 py-3 bg-[#131614] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">Soundboard</h3>
              <p className="text-[10px] font-bold text-slate-400">10s cooldown per play</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cooldown Status Banner */}
        {cooldownRemaining > 0 && (
          <div className="px-4 py-1.5 bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-bold animate-pulse">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Cooldown Active</span>
            </div>
            <span className="font-mono font-black text-amber-400">{cooldownRemaining}s</span>
          </div>
        )}

        {/* Sound Buttons Grid (Discord Style) */}
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto custom-scrollbar">
          {SOUNDBOARD_CLIPS.map((clip) => {
            const isDisabled = cooldownRemaining > 0;
            return (
              <button
                key={clip.id}
                onClick={() => {
                  if (!isDisabled) {
                    onPlaySound(clip);
                  }
                }}
                disabled={isDisabled}
                className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center text-center gap-1 select-none relative group ${
                  isDisabled
                    ? "bg-slate-900/50 border-slate-800 opacity-40 cursor-not-allowed"
                    : "bg-slate-900/90 hover:bg-emerald-950/60 text-slate-200 hover:text-white border-slate-700 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 cursor-pointer"
                }`}
              >
                <span className="text-xs font-black tracking-wide capitalize truncate w-full">
                  {clip.name}
                </span>
                <span className="text-[9px] font-mono text-slate-500 group-hover:text-emerald-400 transition">
                  play
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#131614] border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Plays sound for everyone in room</span>
          <span className="font-mono">{SOUNDBOARD_CLIPS.length} clips</span>
        </div>
      </div>
    </div>
  );
}
