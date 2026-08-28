import React from "react";
import { X, Mic, MicOff, Headphones, Volume2, VolumeX, StopCircle, Settings, Music2, LogOut } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  isMicMuted,
  onToggleMic,
  isDeafened,
  onToggleDeafen,
  voiceVolume = 100,
  onChangeVoiceVolume,
  soundboardVolume = 80,
  onChangeSoundboardVolume,
  isSoundMuted,
  onToggleSoundFX,
  isHost,
  onHostEndGame,
  onQuitGame
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-start p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#181C19] border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative">
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#131614] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">Audio & Controls</h3>
              <p className="text-[10px] font-bold text-slate-400">Volume, Mic & Settings</p>
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
        <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
          {/* 1. Mic Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isMicMuted ? "bg-red-600/20 text-red-400 border-red-500/30" : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"}`}>
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-black text-white">My Microphone</div>
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

          {/* 2. Voice Chat Volume & Deafen */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-white">Voice Chat Volume</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-blue-400">{isDeafened ? "0%" : `${voiceVolume}%`}</span>
                <button
                  onClick={onToggleDeafen}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                    isDeafened
                      ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {isDeafened ? "Undeafen" : "Deafen"}
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={isDeafened ? 0 : voiceVolume}
              disabled={isDeafened}
              onChange={(e) => onChangeVoiceVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* 3. Soundboard Volume */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">Soundboard Volume</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400">{soundboardVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={soundboardVolume}
              onChange={(e) => onChangeSoundboardVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* 4. Game SFX Mute */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${isSoundMuted ? "bg-red-600/20 text-red-400 border-red-500/30" : "bg-amber-600/20 text-amber-400 border-amber-500/30"}`}>
                {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-black text-white">Game SFX</div>
                <div className="text-[10px] text-slate-400">{isSoundMuted ? "Muted" : "Dice & Tile Sounds"}</div>
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

          {/* 5. Quit Game / Host End Game Actions */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {onQuitGame && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to leave this match? You will return to the main lobby.")) {
                    onClose();
                    onQuitGame();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-black text-xs border border-zinc-700 transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-zinc-400" />
                <span>Leave / Quit Match</span>
              </button>
            )}

            {isHost && onHostEndGame && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
