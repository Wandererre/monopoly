import React, { useState, useEffect } from "react";
import { Copy, Check, Users, Play, Sparkles, AlertCircle, RefreshCw, Globe, ArrowRight, ArrowLeft, Mic, MicOff, Headphones, Settings, LogOut } from "lucide-react";
import { PLAYER_TOKENS } from "../../server/data/boardData.js";
import { sounds } from "../utils/audio.js";
import { socket } from "../utils/socket.js";

export default function Lobby({
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
  lastActiveRoom,
  onRejoinRoom,
  onDismissRejoin,
  roomId,
  gameState,
  playerId,
  isHost,
  voiceStates = new Map(),
  isMicMuted = false,
  onToggleMic,
  isDeafened = false,
  onToggleDeafen,
  onOpenSettings
}) {
  const [name, setName] = useState(() => localStorage.getItem("vyapar_player_name") || "");
  const [selectedToken, setSelectedToken] = useState(() => {
    const rand = PLAYER_TOKENS[Math.floor(Math.random() * PLAYER_TOKENS.length)];
    return rand ? rand.id : "hat";
  });
  const [startingCash, setStartingCash] = useState(1500);
  const [joinCode, setJoinCode] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
    }

    // Fetch public rooms
    fetchRooms();

    function onRoomsList(rooms) {
      setPublicRooms(rooms || []);
      setIsLoadingRooms(false);
    }

    socket.on("public-rooms-list", onRoomsList);
    return () => {
      socket.off("public-rooms-list", onRoomsList);
    };
  }, []);

  const fetchRooms = () => {
    setIsLoadingRooms(true);
    socket.emit("get-public-rooms", (rooms) => {
      if (rooms) setPublicRooms(rooms);
      setIsLoadingRooms(false);
    });
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.rooms) setPublicRooms(data.rooms);
        setIsLoadingRooms(false);
      })
      .catch(() => setIsLoadingRooms(false));
  };

  const handleCreate = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try { sounds.playCardDraw(); } catch (err) {}

    let finalName = name.trim();
    if (!finalName) {
      finalName = `Player_${Math.floor(100 + Math.random() * 900)}`;
      setName(finalName);
    }

    const randToken = PLAYER_TOKENS[Math.floor(Math.random() * PLAYER_TOKENS.length)];
    onCreateRoom(finalName, randToken.id, randToken.color, {
      startingCash: Number(startingCash) || 1500,
      turnTimerSeconds: 15
    });
  };

  const handleJoin = (targetCode) => {
    const codeToJoin = (targetCode || joinCode).trim().toUpperCase();
    if (!codeToJoin) return;

    try { sounds.playCardDraw(); } catch (err) {}
    let finalName = name.trim();
    if (!finalName) {
      finalName = `Player_${Math.floor(100 + Math.random() * 900)}`;
      setName(finalName);
    }

    const randToken = PLAYER_TOKENS[Math.floor(Math.random() * PLAYER_TOKENS.length)];
    onJoinRoom(codeToJoin, finalName, randToken.id, randToken.color);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    try { sounds.playCardDraw(); } catch (err) {}
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    try { sounds.playCardDraw(); } catch (err) {}
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // In-Lobby Room View
  if (roomId && gameState && !gameState.gameStarted) {
    const players = gameState.players || [];
    const canStart = isHost && players.length >= 1;

    return (
      <div className="min-h-screen bg-[#1F2421] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#FAF8F5] text-slate-900 rounded-3xl border-4 border-black p-6 sm:p-8 shadow-2xl shadow-black relative">
          {/* Header Banner with Leave Room button */}
          <div className="relative text-center mb-6">
            {onLeaveRoom && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="absolute left-0 top-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-xl border-2 border-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Leave this room and return to main menu"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            )}
            <div className="inline-block bg-[#ED1B24] text-white font-black px-6 py-2 rounded-sm border-2 border-black shadow-md transform -rotate-1 mb-2">
              <h1 className="text-3xl font-black font-['Cinzel'] tracking-wider">MONOPOLY</h1>
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-800">
              INDIA EDITION
            </div>
          </div>

          {/* Room Code & Invite Link Box */}
          <div className="bg-[#CBE7D0] rounded-2xl p-4 border-2 border-black mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-700">Room Code</div>
                <div className="text-3xl font-black font-mono tracking-widest text-slate-950">{roomId}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border-2 border-black rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {copiedCode ? "Copied!" : "Copy Code"}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-[#ED1B24] hover:bg-red-700 text-white border-2 border-black rounded-xl text-xs font-black transition shadow-md cursor-pointer"
                >
                  {copiedLink ? "Link Copied!" : "Share Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Live Voice Chat & Audio Controls Bar */}
          <div className="bg-slate-900 rounded-2xl p-3.5 border-2 border-black text-white mb-6 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-blue-400 border border-slate-700">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Voice Chat Active</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Mic & speaker active in room</div>
              </div>
            </div>

            {/* Quick Toggle Buttons */}
            <div className="flex items-center gap-2">
              {/* Mic Toggle Button */}
              {onToggleMic && (
                <button
                  type="button"
                  onClick={onToggleMic}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isMicMuted
                      ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                      : "bg-emerald-600/20 border-emerald-500 text-emerald-400 hover:bg-emerald-600/30"
                  }`}
                  title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isMicMuted ? "Muted" : "Mic On"}</span>
                </button>
              )}

              {/* Speaker / Deafen Toggle Button */}
              {onToggleDeafen && (
                <button
                  type="button"
                  onClick={onToggleDeafen}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isDeafened
                      ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                  title={isDeafened ? "Undeafen Voice Speaker" : "Deafen Voice Speaker"}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{isDeafened ? "Deafened" : "Deafen"}</span>
                </button>
              )}

              {/* Settings Button */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Audio & Game Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Joined Players */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 text-xs font-black uppercase text-slate-800">
              <span>Players in Lobby ({players.length}/8)</span>
              {players.length === 1 ? (
                <span className="text-amber-700 font-bold">Solo / Testing mode ready</span>
              ) : (
                <span className="text-emerald-700 font-bold">{players.length} Players joined</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map((p) => {
                const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];
                const isYou = p.id === playerId;
                const vState = voiceStates?.get(p.id);
                const isSpeaking = vState?.isSpeaking;
                const isPlayerMuted = vState?.isMuted;
                const isPlayerDeafened = vState?.isDeafened;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                      isSpeaking
                        ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400 shadow-md scale-[1.02]"
                        : isYou
                        ? "bg-amber-100 border-amber-500"
                        : "bg-white border-black"
                    }`}
                  >
                    <div className="text-2xl">{tok.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-slate-900 truncate flex items-center gap-1.5">
                        <span style={{ color: p.color || "#000" }}>{p.name}</span>
                        {isYou && <span className="text-[10px] text-slate-500 font-bold">(You)</span>}
                        {isSpeaking && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                        )}
                        {isPlayerMuted && <MicOff className="w-3 h-3 text-red-500 shrink-0" title="Muted" />}
                        {isPlayerDeafened && <Headphones className="w-3 h-3 text-red-500 shrink-0" title="Deafened" />}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>{tok.name}</span>
                        {isSpeaking && <span className="text-[10px] text-emerald-700 font-black">Speaking...</span>}
                      </div>
                    </div>
                    {p.isHost && (
                      <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded">
                        HOST
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start Game Action */}
          {isHost ? (
            <button
              onClick={() => {
                sounds.playFanfare();
                onStartGame();
              }}
              disabled={!canStart}
              className={`w-full py-3.5 rounded-xl font-black text-base border-2 border-black shadow-xl transition cursor-pointer ${
                canStart
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed"
              }`}
            >
              {players.length >= 2 ? "Start Monopoly Game" : "Start Game (Solo / Testing)"}
            </button>
          ) : (
            <div className="text-center p-3 bg-white rounded-xl border-2 border-black text-xs font-bold text-slate-700">
              Waiting for the host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Landing / Join Screen with Live Rooms Browser
  return (
    <div className="min-h-screen bg-[#1F2421] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#FAF8F5] text-slate-900 rounded-3xl border-4 border-black p-6 sm:p-8 shadow-2xl shadow-black relative space-y-6">
        {/* Title Header */}
        <div className="text-center">
          <div className="inline-block bg-[#ED1B24] text-white font-black px-8 py-2.5 rounded-sm border-3 border-black shadow-lg transform -rotate-1 mb-2">
            <h1 className="text-4xl sm:text-5xl font-black font-['Cinzel'] tracking-wider">MONOPOLY</h1>
          </div>
          <div className="text-sm font-black uppercase tracking-widest text-slate-800">
            INDIA EDITION
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Multiplayer Online Monopoly. Create a room or click an open room below to join!
          </p>
        </div>

        {/* Reconnect Banner for Ongoing Match (If user refreshed or navigated back) */}
        {lastActiveRoom && onRejoinRoom && (
          <div className="bg-amber-100 border-2 border-amber-500 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎲</span>
              <div>
                <div className="text-xs font-black text-amber-950 uppercase tracking-wide">Ongoing Match Found</div>
                <div className="text-[11px] text-amber-900">
                  You are registered in Room <strong className="font-mono text-xs">#{lastActiveRoom}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRejoinRoom(lastActiveRoom)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border-2 border-black shadow transition cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>Rejoin Match</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {onDismissRejoin && (
                <button
                  type="button"
                  onClick={onDismissRejoin}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border-2 border-slate-400 transition cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* Player Profile Inputs */}
        <div className="bg-white p-4 rounded-2xl border-2 border-black shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
              Your Nickname
            </label>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              🎲 Random piece assigned automatically
            </span>
          </div>
          <input
            type="text"
            placeholder="e.g. Rahul, Aman, Priya..."
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-black"
          />
        </div>

        {/* Starting Cash Option */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-black">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Starting Cash
            </span>
            <span className="text-xs font-black text-emerald-800 font-mono">
              M{startingCash} per player
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "M1,000", value: 1000, desc: "Fast" },
              { label: "M1,500", value: 1500, desc: "Classic" },
              { label: "M2,000", value: 2000, desc: "Rich" },
              { label: "M3,000", value: 3000, desc: "Tycoon" }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStartingCash(opt.value);
                  sounds.playTokenStep();
                }}
                className={`py-1.5 px-2 rounded-xl border-2 font-black text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                  startingCash === opt.value
                    ? "bg-[#CBE7D0] border-black ring-2 ring-black scale-105"
                    : "bg-slate-50 border-slate-300 hover:border-black text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[9px] font-normal text-slate-500">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action: Create Room or Enter Private Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCreate}
            className="w-full py-3.5 bg-[#ED1B24] hover:bg-red-700 active:scale-95 text-white font-black text-sm rounded-xl border-2 border-black shadow transition cursor-pointer hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create New Room</span>
          </button>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="ROOM CODE"
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-center font-mono font-bold text-sm uppercase focus:outline-none"
            />
            <button
              onClick={() => handleJoin(joinCode)}
              disabled={!joinCode.trim()}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl border-2 border-black disabled:opacity-50 cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>

        {/* Live Available Rooms Browser */}
        <div className="bg-[#CBE7D0] p-4 rounded-2xl border-2 border-black">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-slate-900">
              <Globe className="w-4 h-4 text-emerald-800" />
              <span>Available Live Rooms ({publicRooms.length})</span>
            </div>
            <button
              onClick={fetchRooms}
              className="text-[11px] font-bold flex items-center gap-1 text-slate-800 hover:text-black cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRooms ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="text-center py-6 bg-white/70 rounded-xl border border-dashed border-slate-500 text-xs font-bold text-slate-700">
              No public rooms active right now. Click <strong>"Create New Room"</strong> above to host one!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {publicRooms.map((r) => (
                <div
                  key={r.roomId}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-black shadow-sm hover:shadow transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                        #{r.roomId}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        Host: {r.hostName}
                      </span>
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-800 flex items-center gap-2 mt-0.5">
                      <span>👥 {r.playerCount}/{r.maxPlayers} Players</span>
                      <span>•</span>
                      <span>{r.gameStarted ? "🎮 In Progress" : "⏳ Waiting in Lobby"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(r.roomId)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border border-black transition shadow-sm flex items-center gap-1 cursor-pointer hover:scale-105"
                  >
                    <span>Enter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
