import React, { useState, useEffect, useRef } from "react";
import { socket, getStoredPlayer, savePlayerSession, clearPlayerRoomSession } from "./utils/socket.js";
import { sounds } from "./utils/audio.js";
import { voiceManager } from "./utils/webrtc.js";
import Lobby from "./components/Lobby.jsx";
import Board from "./components/Board.jsx";
import DeedsBrowserModal from "./components/DeedsBrowserModal.jsx";
import DebtResolutionModal from "./components/DebtResolutionModal.jsx";
import TileModal from "./components/TileModal.jsx";
import TradeModal from "./components/TradeModal.jsx";
import TradePromptModal from "./components/TradePromptModal.jsx";
import CardPopup from "./components/CardPopup.jsx";
import ChatDrawer from "./components/ChatDrawer.jsx";
import ActivityDrawer from "./components/ActivityDrawer.jsx";
import GameOverModal from "./components/GameOverModal.jsx";
import { PLAYER_TOKENS, BOARD_TILES } from "../server/data/boardData.js";
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Headphones,
  MessageSquare,
  ScrollText,
  Building2,
  ArrowRightLeft,
  ShieldAlert,
  Wifi,
  WifiOff,
  RotateCw,
  AlertTriangle,
  StopCircle,
  Radio
} from "lucide-react";

export default function App() {
  const [storedUser] = useState(() => getStoredPlayer());
  const [playerId] = useState(storedUser.id);
  const [playerName, setPlayerName] = useState(storedUser.name);
  const [playerToken, setPlayerToken] = useState(storedUser.token);
  const [roomId, setRoomId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [chats, setChats] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const [boardRotation, setBoardRotation] = useState(0);

  // Voice Chat State
  const [voiceStates, setVoiceStates] = useState(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Modals & Drawers
  const [deedsModalOpen, setDeedsModalOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [inspectedTile, setInspectedTile] = useState(null);
  const [tradeTarget, setTradeTarget] = useState(null);
  const [cardPopupData, setCardPopupData] = useState(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Multi-Transaction Array State: playerId -> Array of { id, delta }
  const [transactions, setTransactions] = useState({});
  const prevMoneyRef = useRef({});
  const prevPositionsRef = useRef({});
  const pendingTxRef = useRef(null);

  // Auto-connect WebRTC voice chat upon entering room
  useEffect(() => {
    if (roomId && socket.connected) {
      voiceManager.joinVoice(socket, roomId, playerId, (newStates) => {
        setVoiceStates(new Map(newStates));
      });
    }
    return () => {
      voiceManager.leaveVoice();
    };
  }, [roomId, playerId]);

  // Synchronized Multi-Transaction & Audio Handling
  useEffect(() => {
    if (gameState?.players) {
      const myPlayerObj = gameState.players.find((p) => p.id === playerId);
      const myPrevMoney = prevMoneyRef.current[playerId];
      const myDelta = myPlayerObj && myPrevMoney !== undefined ? myPlayerObj.money - myPrevMoney : 0;

      let someoneElseGained = false;
      const deltas = {};

      let hasMoneyChange = false;
      let hasPositionChange = false;

      gameState.players.forEach((p) => {
        const prevM = prevMoneyRef.current[p.id];
        const prevPos = prevPositionsRef.current[p.id];

        if (prevM !== undefined && prevM !== p.money) {
          hasMoneyChange = true;
          const d = p.money - prevM;
          deltas[p.id] = d;
          if (p.id !== playerId && d > 0) {
            someoneElseGained = true;
          }
        }

        if (prevPos !== undefined && prevPos !== p.position) {
          hasPositionChange = true;
        }

        prevMoneyRef.current[p.id] = p.money;
        prevPositionsRef.current[p.id] = p.position;
      });

      if (hasMoneyChange) {
        const txPayload = { deltas, myDelta, someoneElseGained };
        if (hasPositionChange) {
          pendingTxRef.current = txPayload;
        } else {
          triggerTransactions(txPayload);
        }
      }
    }
  }, [gameState?.players, playerId]);

  const triggerTransactions = ({ deltas, myDelta, someoneElseGained }) => {
    Object.keys(deltas).forEach((pid) => {
      const delta = deltas[pid];
      const txItem = { id: Date.now() + Math.random(), delta };

      // Append to list of active transactions for this player
      setTransactions((prev) => {
        const list = prev[pid] ? [...prev[pid], txItem] : [txItem];
        return { ...prev, [pid]: list };
      });

      setTimeout(() => {
        setTransactions((prev) => {
          if (!prev[pid]) return prev;
          const updated = prev[pid].filter((item) => item.id !== txItem.id);
          return { ...prev, [pid]: updated };
        });
      }, 2800);
    });

    if (myDelta < 0) {
      sounds.playMoneyGone();
    } else if (myDelta > 0) {
      sounds.playCashRegister();
    } else if (someoneElseGained) {
      sounds.playCashRegister();
    }
  };

  const handleMovementComplete = () => {
    if (pendingTxRef.current) {
      triggerTransactions(pendingTxRef.current);
      pendingTxRef.current = null;
    }
  };

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      const currentParams = new URLSearchParams(window.location.search);
      const urlRoom = currentParams.get("room");
      const targetRoom = urlRoom || localStorage.getItem("vyapar_last_room");

      if (targetRoom && playerId) {
        socket.emit("reconnect-player", { roomId: targetRoom, playerId }, (res) => {
          if (res && res.success) {
            setRoomId(res.roomId);
            setGameState(res.state);
            savePlayerSession(playerName, playerToken, res.roomId);
          }
        });
      }
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onGameState(state) {
      setGameState(state);
      if (state.pendingAction?.type === "CARD_DRAWN") {
        setCardPopupData(state.pendingAction);
      }
    }

    function onNewChat(chat) {
      setChats((prev) => [...prev, chat]);
      if (!chatDrawerOpen) {
        setHasUnreadChat(true);
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("game-state", onGameState);
    socket.on("new-chat", onNewChat);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("game-state", onGameState);
      socket.off("new-chat", onNewChat);
    };
  }, [playerId, playerName, playerToken, chatDrawerOpen]);

  const handleCreateRoom = (name, token, color, settings) => {
    setPlayerName(name);
    setPlayerToken(token);
    socket.emit("create-room", { hostData: { id: playerId, name, token, color }, settings }, (res) => {
      if (res && res.success) {
        setRoomId(res.roomId);
        setGameState(res.state);
        savePlayerSession(name, token, res.roomId);
      } else {
        alert(res?.error || "Failed to create room");
      }
    });
  };

  const handleJoinRoom = (code, name, token, color) => {
    setPlayerName(name);
    setPlayerToken(token);
    socket.emit("join-room", { roomId: code, playerData: { id: playerId, name, token, color } }, (res) => {
      if (res && res.success) {
        setRoomId(res.roomId);
        setGameState(res.state);
        savePlayerSession(name, token, res.roomId);
      } else {
        alert(res?.error || "Failed to join room");
      }
    });
  };

  const handleStartGame = () => {
    socket.emit("start-game", { roomId, playerId }, (res) => {
      if (res && !res.success) alert(res.error);
    });
  };

  const handleRollDice = () => {
    socket.emit("roll-dice", { roomId, playerId });
  };

  const handleBuyProperty = () => {
    socket.emit("buy-property", { roomId, playerId });
  };

  const handlePassProperty = () => {
    socket.emit("pass-property", { roomId, playerId });
  };

  const handlePayJailFine = () => {
    socket.emit("pay-jail-fine", { roomId, playerId });
  };

  const handleUseJailCard = () => {
    socket.emit("use-jail-card", { roomId, playerId });
  };

  const handleEndTurn = () => {
    socket.emit("end-turn", { roomId, playerId }, (res) => {
      if (res && !res.success) alert(res.error);
    });
  };

  const handleBuildHouse = (tileId) => {
    socket.emit("build-house", { roomId, playerId, tileId });
  };

  const handleSellHouse = (tileId) => {
    socket.emit("sell-house", { roomId, playerId, tileId });
  };

  const handleMortgage = (tileId) => {
    socket.emit("mortgage-property", { roomId, playerId, tileId });
  };

  const handleUnmortgage = (tileId) => {
    socket.emit("unmortgage-property", { roomId, playerId, tileId });
  };

  const handleSendTrade = (tradeData) => {
    socket.emit("propose-trade", { roomId, playerId, tradeData }, (res) => {
      if (res && !res.success) alert(res.error);
    });
  };

  const handleRespondTrade = (accept) => {
    socket.emit("respond-trade", { roomId, playerId, accept });
  };

  const handleDeclareBankruptcy = () => {
    socket.emit("declare-bankruptcy", { roomId, playerId });
  };

  const handleRotateBoard = () => {
    sounds.playTokenStep();
    setBoardRotation((prev) => (prev + 90) % 360);
  };

  const handleSendChat = (message) => {
    socket.emit("send-chat", { roomId, senderName: playerName, message });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    sounds.playCardDraw();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleSoundFX = () => {
    const next = sounds.toggleMute();
    setIsSoundMuted(next);
  };

  const handleToggleMic = () => {
    const muted = voiceManager.toggleMic();
    setIsMicMuted(muted);
  };

  const handleToggleDeafen = () => {
    const deafened = voiceManager.toggleDeafen();
    setIsDeafened(deafened);
    if (deafened) {
      setIsMicMuted(true);
    }
  };

  const handleHostEndGame = () => {
    if (window.confirm("End the game now? The richest player by Net Worth will be crowned winner (or a draw if equal).")) {
      socket.emit("host-end-game", { roomId, playerId }, (res) => {
        if (res && !res.success) alert(res.error);
      });
    }
  };

  const handlePlayAgain = () => {
    clearPlayerRoomSession();
    voiceManager.leaveVoice();
    setRoomId("");
    setGameState(null);
    window.location.href = window.location.origin;
  };

  const isMyTurn = gameState?.currentPlayerId === playerId;
  const isHost = gameState?.players?.find((p) => p.id === playerId)?.isHost;
  const myPlayer = gameState?.players?.find((p) => p.id === playerId);
  const isPendingBuy = gameState?.pendingAction?.type === "BUY_CHOICE";

  // Dynamic Live Match Status Text
  const getLiveStatusText = () => {
    if (!gameState) return "";
    const curr = gameState.players?.find((p) => p.id === gameState.currentPlayerId);
    if (!curr) return "";

    if (gameState.pendingTrade) {
      if (gameState.pendingTrade.status === "DECLINED") {
        return `❌ Trade offer declined by ${gameState.pendingTrade.declinedByName || "player"}`;
      }
      return `🤝 Trade offered: ${gameState.pendingTrade.fromPlayerName} ➔ ${gameState.pendingTrade.toPlayerName}`;
    }

    if (gameState.phase === "ROLL") {
      return curr.id === playerId
        ? "🎲 It's your turn! Roll the dice."
        : `🎲 ${curr.name}'s turn • Rolling dice... (${gameState.turnTimeRemaining}s)`;
    }

    if (gameState.pendingAction?.type === "BUY_CHOICE") {
      const t = BOARD_TILES[gameState.pendingAction.tileId];
      return curr.id === playerId
        ? `🏠 You landed on ${t?.name || "Property"}. Buy for M${t?.price} or Pass?`
        : `🏠 ${curr.name} is deciding to Buy/Pass ${t?.name || "Property"}...`;
    }

    if (gameState.pendingAction?.type === "CARD_DRAWN") {
      return `🃏 ${curr.name} drew a ${gameState.pendingAction.deckName || "Card"}!`;
    }

    if (curr.inJail) {
      return `🔒 ${curr.name} is in Jail`;
    }

    if (gameState.logs && gameState.logs.length > 0) {
      return gameState.logs[0].message;
    }

    return `Playing Turn: ${curr.name}`;
  };

  if (!gameState || !gameState.gameStarted) {
    return (
      <Lobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onStartGame={handleStartGame}
        roomId={roomId}
        gameState={gameState}
        playerId={playerId}
        isHost={isHost}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2421] text-slate-100 flex flex-col justify-between select-none relative overflow-hidden">
      {/* Top Seamless Bar */}
      <header className="px-4 pt-3 pb-8 z-30 flex items-center justify-between gap-4 overflow-visible">
        {/* Left: Monopoly Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-[#ED1B24] text-white font-black px-3 py-1 rounded-sm border-2 border-black text-sm font-['Cinzel'] tracking-wider shadow-md">
            MONOPOLY
          </div>
          <span className="text-[11px] uppercase font-black tracking-widest text-slate-300 hidden md:inline">
            INDIA
          </span>
        </div>

        {/* Center: Wider Player Chips with Glowing Speaking Rings & Stacked Floating Delta Badges */}
        <div className="flex items-center gap-4 py-1 px-2 overflow-visible">
          {gameState.players?.map((p) => {
            const isTurn = p.id === gameState.currentPlayerId;
            const isYou = p.id === playerId;
            const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];
            const pTxList = transactions[p.id] || [];
            const vState = voiceStates.get(p.id);
            const isSpeaking = vState?.isSpeaking;
            const isMuted = vState?.isMuted;

            return (
              <div key={p.id} className="relative flex flex-col items-center overflow-visible">
                <button
                  onClick={() => setDeedsModalOpen(true)}
                  title={`Click to view ${p.name}'s deeds`}
                  className={`relative flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all duration-200 whitespace-nowrap shadow-xl cursor-pointer ${
                    p.bankrupt
                      ? "bg-slate-900 border-slate-800 opacity-40"
                      : isSpeaking
                      ? "bg-emerald-300 text-black border-black font-black ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.9)] scale-105"
                      : isTurn
                      ? "bg-amber-400 text-black border-black font-black ring-4 ring-amber-300/60 scale-105"
                      : isYou
                      ? "bg-[#CBE7D0] text-black border-black font-bold"
                      : "bg-white text-slate-900 border-black font-bold"
                  }`}
                >
                  <span className="text-xl">{tok.emoji}</span>
                  <div className="flex items-center gap-1.5 max-w-[130px]">
                    <span className="text-sm font-black truncate">{p.name}</span>
                    {isSpeaking && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                    )}
                    {isMuted && <MicOff className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                  </div>

                  <span className={`text-sm font-mono font-black px-2 py-0.5 rounded-lg ${p.money < 0 ? "bg-red-600 text-white animate-pulse" : "text-emerald-900 bg-black/10"}`}>
                    M{p.money}
                  </span>

                  {p.inJail && <ShieldAlert className="w-4 h-4 text-red-600 ml-0.5" />}
                  {p.money < 0 && <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />}
                </button>

                {/* Multiple Floating Transaction Deltas */}
                {pTxList.length > 0 && (
                  <div className="absolute -bottom-8 flex flex-col items-center gap-1 pointer-events-none z-50">
                    {pTxList.map((tx) => (
                      <div
                        key={tx.id}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-2xl border-2 whitespace-nowrap ${
                          tx.delta > 0
                            ? "bg-emerald-600 text-white border-white animate-float-up-fade shadow-emerald-600/60"
                            : "bg-red-600 text-white border-white animate-float-down-fade shadow-red-600/60"
                        }`}
                      >
                        {tx.delta > 0 ? `+M ${tx.delta}` : `-M ${Math.abs(tx.delta)}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Controls: Voice Chat (Mic + Deafen), SFX, Host End Game, Invite */}
        <div className="flex items-center gap-2">
          {/* 1. Voice Chat Mic Button */}
          <button
            onClick={handleToggleMic}
            title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
              isMicMuted
                ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                : "bg-emerald-600/20 border-emerald-500 text-emerald-400 hover:bg-emerald-600/30 shadow-emerald-500/20 shadow"
            }`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 2. Voice Chat Speaker / Deafen Button */}
          <button
            onClick={handleToggleDeafen}
            title={isDeafened ? "Undeafen Audio" : "Deafen Voice Chat"}
            className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
              isDeafened
                ? "bg-red-600/20 border-red-500 text-red-400 hover:bg-red-600/30"
                : "bg-black/40 hover:bg-black/60 text-slate-200 border-slate-700"
            }`}
          >
            <Headphones className={`w-4 h-4 ${isDeafened ? "text-red-400 line-through opacity-70" : "text-emerald-400"}`} />
          </button>

          {/* 3. Game SFX Mute */}
          <button
            onClick={handleToggleSoundFX}
            title={isSoundMuted ? "Unmute Game SFX" : "Mute Game SFX"}
            className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* 4. Host Only: End Game */}
          {isHost && gameState.gameStarted && gameState.phase !== "GAME_OVER" && (
            <button
              onClick={handleHostEndGame}
              className="px-3 py-1.5 rounded-xl bg-red-950/90 hover:bg-red-800 text-red-200 hover:text-white font-bold text-xs border border-red-600 transition flex items-center gap-1 shadow cursor-pointer"
              title="Host Only: End Game & Crown Winner by Net Worth"
            >
              <StopCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">End Game</span>
            </button>
          )}

          {/* 5. Invite Share Link */}
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-[#ED1B24] hover:bg-red-700 text-white font-black text-xs border-2 border-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Invite"}</span>
          </button>

          {/* Connection Status Indicator */}
          <div
            className={`p-2 rounded-xl border flex items-center justify-center ${
              connected ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
            }`}
            title={connected ? "Connected" : "Disconnected"}
          >
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        </div>
      </header>

      {/* Main Focus: Physical Board + Left Rotate Control */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto relative">
        {/* Left Side: Smooth Board Rotation Button */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden sm:block">
          <button
            onClick={handleRotateBoard}
            className="p-3 bg-black/80 hover:bg-black text-white rounded-2xl border-2 border-slate-700 shadow-2xl transition flex flex-col items-center gap-1 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
            title="Rotate Board 90°"
          >
            <RotateCw className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-black uppercase text-slate-300">Rotate</span>
          </button>
        </div>

        <Board
          gameState={gameState}
          onTileClick={(tile) => setInspectedTile(tile)}
          onRollDice={handleRollDice}
          onBuyProperty={handleBuyProperty}
          onPassProperty={handlePassProperty}
          onPayJailFine={handlePayJailFine}
          onUseJailCard={handleUseJailCard}
          onEndTurn={handleEndTurn}
          playerId={playerId}
          isMyTurn={isMyTurn}
          rotationAngle={boardRotation}
          onMovementComplete={handleMovementComplete}
        />
      </main>

      {/* Bottom Left Floating Bar: Live Match Status Ticker + Chat & Log Buttons */}
      <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 max-w-sm sm:max-w-md">
        {/* Live Match Update Text Ticker */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/85 border border-slate-700 shadow-2xl backdrop-blur-md text-xs font-bold text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="truncate">{getLiveStatusText()}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setChatDrawerOpen(true);
              setHasUnreadChat(false);
            }}
            className="relative px-3.5 py-2 rounded-2xl bg-black/80 hover:bg-black text-white font-bold text-xs border-2 border-slate-700 shadow-xl transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Chat</span>
            {hasUnreadChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActivityDrawerOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-black/80 hover:bg-black text-white font-bold text-xs border-2 border-slate-700 shadow-xl transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
          >
            <ScrollText className="w-4 h-4 text-amber-400" />
            <span>Log</span>
          </button>
        </div>
      </div>

      {/* Bottom Right Floating Buttons: Deeds & Trade */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setDeedsModalOpen(true)}
          className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-black font-black text-xs border-2 border-black shadow-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <Building2 className="w-4 h-4" />
          <span>Deeds</span>
        </button>

        <button
          onClick={() => {
            if (isPendingBuy) {
              alert("You must decide to Buy or Pass the property first!");
              return;
            }
            setTradeTarget(gameState.players.find((p) => p.id !== playerId && !p.bankrupt));
          }}
          disabled={isPendingBuy}
          title={isPendingBuy ? "Decide Buy/Pass on current property first" : "Propose Trade"}
          className={`px-4 py-2 rounded-2xl font-black text-xs border-2 transition flex items-center gap-1.5 shadow-xl ${
            isPendingBuy
              ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60"
              : "bg-blue-600 hover:bg-blue-700 text-white border-black cursor-pointer"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Trade</span>
        </button>
      </div>

      {/* Debt Resolution Modal */}
      {myPlayer && myPlayer.money < 0 && (
        <DebtResolutionModal
          gameState={gameState}
          playerId={playerId}
          onMortgage={handleMortgage}
          onSellHouse={handleSellHouse}
          onDeclareBankruptcy={handleDeclareBankruptcy}
        />
      )}

      {/* Modals */}
      {deedsModalOpen && (
        <DeedsBrowserModal
          gameState={gameState}
          playerId={playerId}
          onBuildHouse={handleBuildHouse}
          onSellHouse={handleSellHouse}
          onMortgage={handleMortgage}
          onUnmortgage={handleUnmortgage}
          onProposeTrade={(target) => {
            setDeedsModalOpen(false);
            setTradeTarget(target);
          }}
          onClose={() => setDeedsModalOpen(false)}
        />
      )}

      {inspectedTile && (
        <TileModal
          tile={inspectedTile}
          propertyState={gameState.properties?.[inspectedTile.id]}
          ownerPlayer={gameState.players?.find(
            (p) => p.id === gameState.properties?.[inspectedTile.id]?.owner
          )}
          onClose={() => setInspectedTile(null)}
        />
      )}

      {tradeTarget && (
        <TradeModal
          gameState={gameState}
          playerId={playerId}
          targetPlayer={tradeTarget}
          onSendTrade={handleSendTrade}
          onClose={() => setTradeTarget(null)}
        />
      )}

      {gameState.pendingTrade && (
        <TradePromptModal
          pendingTrade={gameState.pendingTrade}
          playerId={playerId}
          onRespondTrade={handleRespondTrade}
        />
      )}

      {cardPopupData && (
        <CardPopup
          cardData={cardPopupData}
          onClose={() => {
            socket.emit("resolve-card-action", { roomId, playerId });
            setCardPopupData(null);
          }}
        />
      )}

      {gameState.phase === "GAME_OVER" && (
        <GameOverModal
          winner={gameState.winner}
          players={gameState.players}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Drawers */}
      <ChatDrawer
        isOpen={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
        chats={chats}
        onSendChat={handleSendChat}
        playerName={playerName}
      />

      <ActivityDrawer
        isOpen={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        logs={gameState.logs}
      />
    </div>
  );
}
