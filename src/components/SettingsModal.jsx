import React from "react";
import { X, Mic, MicOff, Headphones, Volume2, VolumeX, StopCircle, Settings } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  isMicMuted,
  onToggleMic,
  isDeafened,
  onToggleDeafen,
  isSoundMuted,
  onToggleSoundFX,
  isHost,
  onHostEndGame
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-start p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#181C19] border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative">
        {/* Header */}
        <div className="px-4 py-3 bg-[#131614] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">Game Settings</h3>
              <p className="text-[10px] font-bold text-slate-400">Audio, Voice & Controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-4 space-y-3">
          {/* 1. Mic Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isMicMuted ? "bg-red-600/20 text-red-400 border-red-500/30" : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"}`}>
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-black text-white">Microphone</div>
                <div className="text-[10px] text-slate-400">{isMicMuted ? "Muted" : "Active / Transmitting"}</div>
              </div>
            </div>
            <button
              onClick={onToggleMic}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                isMicMuted
                  ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                  : "bg-emerald-600/20 border-emerald-500 text-emerald-400 hover:bg-emerald-600/30"
              }`}
            >
              {isMicMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          {/* 2. Deafen Voice Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isDeafened ? "bg-red-600/20 text-red-400 border-red-500/30" : "bg-blue-600/20 text-blue-400 border-blue-500/30"}`}>
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white">Voice Speaker</div>
                <div className="text-[10px] text-slate-400">{isDeafened ? "Deafened (Silent)" : "Hearing Players"}</div>
              </div>
            </div>
            <button
              onClick={onToggleDeafen}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                isDeafened
                  ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isDeafened ? "Undeafen" : "Deafen"}
            </button>
          </div>

          {/* 3. Game SFX Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isSoundMuted ? "bg-red-600/20 text-red-400 border-red-500/30" : "bg-amber-600/20 text-amber-400 border-amber-500/30"}`}>
                {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-black text-white">Game SFX</div>
                <div className="text-[10px] text-slate-400">{isSoundMuted ? "Sound Effects Off" : "Sound Effects On"}</div>
              </div>
            </div>
            <button
              onClick={onToggleSoundFX}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                isSoundMuted
                  ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isSoundMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          {/* 4. Host Only: End Game */}
          {isHost && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onClose();
                  onHostEndGame();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-red-950/90 hover:bg-red-800 text-red-200 hover:text-white font-black text-xs border border-red-600 transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span>Host: End Game & Crown Winner</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
