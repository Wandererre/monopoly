import React, { useState, useEffect, useRef } from "react";
import { socket, getStoredPlayer, savePlayerSession, clearPlayerRoomSession } from "./utils/socket.js";
import { sounds } from "./utils/audio.js";
import { voiceManager } from "./utils/webrtc.js";
import Lobby from "./components/Lobby.jsx";
import Board from "./components/Board.jsx";
import Board3D from "./components/Board3D.jsx";
import DeedsBrowserModal from "./components/DeedsBrowserModal.jsx";
import DebtResolutionModal from "./components/DebtResolutionModal.jsx";
import TileModal from "./components/TileModal.jsx";
import TradeModal from "./components/TradeModal.jsx";
import TradePromptModal from "./components/TradePromptModal.jsx";
import CardPopup from "./components/CardPopup.jsx";
import ChatDrawer from "./components/ChatDrawer.jsx";
import ActivityDrawer from "./components/ActivityDrawer.jsx";
import GameOverModal from "./components/GameOverModal.jsx";
import SoundboardModal from "./components/SoundboardModal.jsx";
import CardsBrowserModal from "./components/CardsBrowserModal.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
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
  Radio,
  Music2,
  Settings,
  Unplug,
  Box
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
  const [lastActiveRoom, setLastActiveRoom] = useState(() => localStorage.getItem("vyapar_last_room") || "");
  const [boardRotation, setBoardRotation] = useState(0);
  const [is3DView, setIs3DView] = useState(true);

  // Voice Chat State
  const [voiceStates, setVoiceStates] = useState(new Map());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(100);

  // Soundboard State
  const [soundboardVolume, setSoundboardVolume] = useState(60);
  const [soundboardModalOpen, setSoundboardModalOpen] = useState(false);
  const [soundboardCooldown, setSoundboardCooldown] = useState(0);
  const [soundboardToast, setSoundboardToast] = useState(null);
  const [isRoomAudioBusy, setIsRoomAudioBusy] = useState(false);
  const [busySenderName, setBusySenderName] = useState("");
  const activeAudioRef = useRef(null);

  // Modals & Drawers
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [deedsModalOpen, setDeedsModalOpen] = useState(false);
  const [cardsModalOpen, setCardsModalOpen] = useState(null); // null | "chance" | "community"
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [inspectedTile, setInspectedTile] = useState(null);
  const [tradeTarget, setTradeTarget] = useState(null);
  const [cardPopupData, setCardPopupData] = useState(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [incomingTradeModalOpen, setIncomingTradeModalOpen] = useState(false);

  // Multi-Transaction Array State: playerId -> Array of { id, delta }
  const [transactions, setTransactions] = useState({});
  const prevMoneyRef = useRef({});
  const prevPositionsRef = useRef({});
  const pendingTxRef = useRef(null);
  const pendingCardRef = useRef(null);

  // Soundboard 10s cooldown ticker
  useEffect(() => {
    if (soundboardCooldown > 0) {
      const timer = setInterval(() => {
        setSoundboardCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [soundboardCooldown]);

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
    if (!gameState || !gameState.gameStarted || !gameState.players) {
      if (gameState?.players) {
        gameState.players.forEach((p) => {
          prevMoneyRef.current[p.id] = p.money;
          prevPositionsRef.current[p.id] = p.position;
        });
      }
      return;
    }

    const myPlayerObj = gameState.players.find((p) => p.id === playerId);
    const myPrevMoney = prevMoneyRef.current[playerId];
    const myDelta = myPlayerObj && myPrevMoney !== undefined ? myPlayerObj.money - myPrevMoney : 0;

    const deltas = {};
    let hasMoneyChange = false;
    let hasPositionChange = false;

    gameState.players.forEach((p) => {
      const prevM = prevMoneyRef.current[p.id];
      const prevPos = prevPositionsRef.current[p.id];

      if (prevM !== undefined && prevM !== p.money) {
        hasMoneyChange = true;
        deltas[p.id] = p.money - prevM;
      }

      if (prevPos !== undefined && prevPos !== p.position) {
        hasPositionChange = true;
      }

      prevMoneyRef.current[p.id] = p.money;
      prevPositionsRef.current[p.id] = p.position;
    });

    if (hasMoneyChange && Object.keys(deltas).length > 0) {
      const txPayload = { deltas, myDelta };
      if (hasPositionChange) {
        pendingTxRef.current = txPayload;
      } else {
        triggerTransactions(txPayload);
      }
    }
  }, [gameState?.players, gameState?.gameStarted, playerId]);

  const triggerTransactions = ({ deltas }) => {
    const deltaKeys = Object.keys(deltas);
    if (deltaKeys.length === 0) return;

    deltaKeys.forEach((pid) => {
      const delta = deltas[pid];
      if (delta === 0) return;
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

    // Play 1 single crisp Ka-Ching sound exclusively when money is transacted
    sounds.playCashRegister();
  };

  const handleMovementComplete = () => {
    if (pendingTxRef.current) {
      triggerTransactions(pendingTxRef.current);
      pendingTxRef.current = null;
    }

    if (pendingCardRef.current) {
      setCardPopupData(pendingCardRef.current);
      pendingCardRef.current = null;
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
        pendingCardRef.current = state.pendingAction;
      }
    }

    function onNewChat(chat) {
      setChats((prev) => [...prev, chat]);
      if (!chatDrawerOpen) {
        setHasUnreadChat(true);
      }
    }

    function onSoundboardTriggered(data) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      }

      try {
        const audio = new Audio(data.clipFile);
        audio.volume = isSoundMuted ? 0 : Math.max(0, Math.min(1.0, (soundboardVolume / 100) * 0.40));
        activeAudioRef.current = audio;
        setIsRoomAudioBusy(true);
        setBusySenderName(data.senderName);

        audio.onended = () => {
          setIsRoomAudioBusy(false);
          setBusySenderName("");
        };
        audio.onerror = () => {
          setIsRoomAudioBusy(false);
          setBusySenderName("");
        };
        audio.play().catch(() => {
          setIsRoomAudioBusy(false);
        });
      } catch (e) {
        console.warn("Soundboard audio error", e);
        setIsRoomAudioBusy(false);
      }

      setSoundboardToast(data);
      setTimeout(() => {
        setSoundboardToast(null);
      }, 3500);

      setTimeout(() => {
        setIsRoomAudioBusy(false);
        setBusySenderName("");
      }, data.lockDurationMs || 6000);
    }

    function onTimerTick(data) {
      if (data && typeof data.timeRemaining === "number") {
        setGameState((prev) => (prev ? { ...prev, turnTimeRemaining: data.timeRemaining } : prev));
      }
    }

    function onRoomClosed(data) {
      alert(data?.message || "The room has been closed by the host.");
      clearPlayerRoomSession();
      setLastActiveRoom("");
      voiceManager.leaveVoice();
      setRoomId("");
      setGameState(null);
      if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("game-state", onGameState);
    socket.on("timer-tick", onTimerTick);
    socket.on("new-chat", onNewChat);
    socket.on("soundboard-triggered", onSoundboardTriggered);
    socket.on("room-closed", onRoomClosed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("game-state", onGameState);
      socket.off("timer-tick", onTimerTick);
      socket.off("new-chat", onNewChat);
      socket.off("soundboard-triggered", onSoundboardTriggered);
      socket.off("room-closed", onRoomClosed);
    };
  }, [playerId, playerName, playerToken, chatDrawerOpen]);

  // Smooth live 1s local countdown tick for turn timer
  useEffect(() => {
    if (!gameState || !gameState.gameStarted || gameState.phase === "GAME_OVER") return;
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (!prev || !prev.gameStarted || prev.phase === "GAME_OVER") return prev;
        if (prev.turnTimeRemaining && prev.turnTimeRemaining > 0) {
          return { ...prev, turnTimeRemaining: prev.turnTimeRemaining - 1 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.gameStarted, gameState?.currentPlayerId, gameState?.phase]);

  const handleCreateRoom = (name, token, color, settings) => {
    setPlayerName(name);
    setPlayerToken(token);

    const payload = {
      hostData: { id: playerId, name, token, color },
      settings: settings || { startingCash: 1500, rollTimerSeconds: 30, turnTimerSeconds: 40 }
    };

    let handled = false;
    let fallbackTimeout = null;

    const onResult = (res) => {
      if (handled) return;
      if (res && res.success) {
        handled = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setRoomId(res.roomId);
        setGameState(res.state);
        savePlayerSession(name, token, res.roomId);
        setLastActiveRoom(res.roomId);
        if (!socket.connected) socket.connect();
        socket.emit("reconnect-player", { roomId: res.roomId, playerId });
      }
    };

    // 1. Instant WebSocket emit
    if (socket.connected) {
      socket.emit("create-room", payload, onResult);
    } else {
      socket.connect();
      socket.once("connect", () => {
        if (!handled) socket.emit("create-room", payload, onResult);
      });
    }

    // 2. HTTP REST Fallback only if socket takes > 1200ms
    fallbackTimeout = setTimeout(() => {
      if (!handled) {
        fetch("/api/create-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then((r) => r.json())
          .then(onResult)
          .catch(() => {});
      }
    }, 1200);
  };

  const handleJoinRoom = (code, name, token, color) => {
    setPlayerName(name);
    setPlayerToken(token);
    const cleanCode = (code || "").trim().toUpperCase();

    const payload = {
      roomId: cleanCode,
      playerData: { id: playerId, name, token, color }
    };

    let handled = false;
    let fallbackTimeout = null;

    const onResult = (res) => {
      if (handled) return;
      if (res && res.success) {
        handled = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setRoomId(res.roomId);
        setGameState(res.state);
        savePlayerSession(name, token, res.roomId);
        setLastActiveRoom(res.roomId);
        if (!socket.connected) socket.connect();
        socket.emit("reconnect-player", { roomId: res.roomId, playerId });
      } else if (res && !res.success) {
        handled = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        alert(res.error || "Failed to join room");
      }
    };

    // 1. Instant WebSocket emit
    if (socket.connected) {
      socket.emit("join-room", payload, onResult);
    } else {
      socket.connect();
      socket.once("connect", () => {
        if (!handled) socket.emit("join-room", payload, onResult);
      });
    }

    // 2. HTTP REST Fallback only if socket takes > 1200ms
    fallbackTimeout = setTimeout(() => {
      if (!handled) {
        fetch("/api/join-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then((r) => r.json())
          .then(onResult)
          .catch(() => {});
      }
    }, 1200);
  };

  const handleStartGame = () => {
    if (!roomId) return;
    const payload = { roomId, playerId };

    let handled = false;
    let fallbackTimeout = null;

    const onStartResult = (res) => {
      if (handled) return;
      if (res && res.success && res.state) {
        handled = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setGameState(res.state);
      } else if (res && !res.success && res.error) {
        handled = true;
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        alert(res.error);
      }
    };

    if (socket.connected) {
      socket.emit("start-game", payload, onStartResult);
    }

    fallbackTimeout = setTimeout(() => {
      if (!handled) {
        fetch("/api/start-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then((r) => r.json())
          .then(onStartResult)
          .catch(() => {});
      }
    }, 1200);
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

  const handlePlaySoundboardClip = (clip) => {
    if (soundboardCooldown > 0 || isRoomAudioBusy) return;
    setSoundboardCooldown(10);
    socket.emit("play-soundboard", {
      roomId,
      clipId: clip.id,
      clipName: clip.name,
      clipFile: clip.file,
      senderName: playerName
    });
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

  const handleLeaveRoom = () => {
    const targetRoom = roomId || lastActiveRoom;
    if (targetRoom && playerId) {
      socket.emit("leave-room", { roomId: targetRoom, playerId });
      fetch("/api/leave-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: targetRoom, playerId })
      }).catch(() => {});
    }
    clearPlayerRoomSession();
    setLastActiveRoom("");
    voiceManager.leaveVoice();
    setRoomId("");
    setGameState(null);
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleRejoinRoom = (code) => {
    const targetCode = (code || lastActiveRoom).toUpperCase();
    if (!targetCode) return;
    if (!socket.connected) socket.connect();
    socket.emit("reconnect-player", { roomId: targetCode, playerId }, (res) => {
      if (res && res.success) {
        setRoomId(res.roomId);
        setGameState(res.state);
        savePlayerSession(playerName, playerToken, res.roomId);
        setLastActiveRoom(res.roomId);
      } else {
        alert(res?.error || "Room is no longer active or match concluded.");
        clearPlayerRoomSession();
        setLastActiveRoom("");
      }
    });
  };

  const handleDismissRejoin = () => {
    clearPlayerRoomSession();
    setLastActiveRoom("");
    if (window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handlePlayAgain = () => {
    handleLeaveRoom();
  };

  const isMyTurn = gameState?.currentPlayerId === playerId;
  const isHost = gameState?.players?.find((p) => p.id === playerId)?.isHost;
  const myPlayer = gameState?.players?.find((p) => p.id === playerId);
  const isPendingBuy = gameState?.pendingAction?.type === "BUY_CHOICE";

  // Simple, 3rd-Person Uniform Live Match Status Text (Identical for everyone)
  const getLiveStatusText = () => {
    if (!gameState) return "";
    const curr = gameState.players?.find((p) => p.id === gameState.currentPlayerId);
    if (!curr) return "";

    if (gameState.pendingTrade) {
      if (gameState.pendingTrade.status === "DECLINED") {
        return `Trade declined by ${gameState.pendingTrade.declinedByName || "player"}`;
      }
      return `${gameState.pendingTrade.fromPlayerName} is proposing a trade to ${gameState.pendingTrade.toPlayerName}`;
    }

    if (deedsModalOpen) {
      return `${playerName} is viewing deeds`;
    }

    if (gameState.phase === "ROLL") {
      return `${curr.name}'s turn • rolling dice... (${gameState.turnTimeRemaining}s)`;
    }

    if (gameState.pendingAction?.type === "BUY_CHOICE") {
      const t = BOARD_TILES[gameState.pendingAction.tileId];
      return `${curr.name} is deciding on ${t?.name || "property"}`;
    }

    if (gameState.pendingAction?.type === "CARD_DRAWN") {
      return `${curr.name} drew a ${gameState.pendingAction.deckName || "card"}`;
    }

    if (curr.inJail) {
      return `${curr.name} is in Jail`;
    }

    if (gameState.logs && gameState.logs.length > 0) {
      return gameState.logs[0].message;
    }

    return `${curr.name}'s turn`;
  };

  const isMoreThanFourPlayers = (gameState?.players?.length || 0) > 4;

  const canProposeTrade =
    ((isMyTurn && gameState?.phase !== "ROLL" && !isPendingBuy) || (myPlayer && myPlayer.money < 0)) &&
    (gameState?.players?.filter((p) => p.id !== playerId && !p.bankrupt).length || 0) > 0;

  const getTradeDisabledReason = () => {
    if (myPlayer && myPlayer.money < 0) return "";
    if (!isMyTurn) return "You can only propose trades during your turn";
    if (gameState?.phase === "ROLL") return "You must roll the dice first";
    if (isPendingBuy) return "You must decide to Buy or Pass the property first";
    return "";
  };

  if (!gameState || !gameState.gameStarted) {
    return (
      <>
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          lastActiveRoom={lastActiveRoom}
          onRejoinRoom={handleRejoinRoom}
          onDismissRejoin={handleDismissRejoin}
          roomId={roomId}
          gameState={gameState}
          playerId={playerId}
          isHost={isHost}
          voiceStates={voiceStates}
          isMicMuted={isMicMuted}
          onToggleMic={handleToggleMic}
          isDeafened={isDeafened}
          onToggleDeafen={handleToggleDeafen}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />

        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          isMicMuted={isMicMuted}
          onToggleMic={handleToggleMic}
          isDeafened={isDeafened}
          onToggleDeafen={handleToggleDeafen}
          voiceVolume={voiceVolume}
          onChangeVoiceVolume={(vol) => {
            setVoiceVolume(vol);
            voiceManager.setVoiceVolume(vol);
          }}
          soundboardVolume={soundboardVolume}
          onChangeSoundboardVolume={(vol) => {
            setSoundboardVolume(vol);
            if (activeAudioRef.current) {
              activeAudioRef.current.volume = isSoundMuted ? 0 : Math.max(0, Math.min(1.0, (vol / 100) * 0.65));
            }
          }}
          isSoundMuted={isSoundMuted}
          onToggleSoundFX={handleToggleSoundFX}
          isHost={isHost}
          onHostEndGame={handleHostEndGame}
          onQuitGame={handleLeaveRoom}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2421] text-slate-100 flex flex-col justify-between select-none relative overflow-hidden">
      {/* Top Seamless Bar - Pinned Left/Right Controls with Responsive Center Player Chips */}
      <header className="px-3 pt-2 pb-6 z-30 flex items-center justify-between gap-2 overflow-x-hidden w-full max-w-7xl mx-auto">
        {/* Left: Monopoly Logo */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 z-30">
          <div className="bg-[#ED1B24] text-white font-black px-2.5 py-1 rounded-sm border-2 border-black text-xs sm:text-sm font-['Cinzel'] tracking-wider shadow-md">
            MONOPOLY
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-300 hidden lg:inline">
            INDIA
          </span>
        </div>

        {/* Center: Responsive Player Chips (Scrolls smoothly if >4 players, never pushes controls off-screen) */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-1 overflow-x-auto no-scrollbar py-1">
          {gameState.players?.map((p) => {
            const isTurn = p.id === gameState.currentPlayerId;
            const isYou = p.id === playerId;
            const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];
            const pTxList = transactions[p.id] || [];
            const vState = voiceStates.get(p.id);
            const isSpeaking = vState?.isSpeaking;
            const isMuted = vState?.isMuted;

            return (
              <div key={p.id} className="relative flex flex-col items-center shrink-0">
                <button
                  onClick={() => setDeedsModalOpen(true)}
                  title={`Click to view ${p.name}'s deeds`}
                  className={`relative flex items-center rounded-2xl border-2 transition-all duration-200 whitespace-nowrap shadow-md cursor-pointer ${
                    isMoreThanFourPlayers
                      ? "px-2.5 py-1 text-xs gap-1.5"
                      : "px-3.5 py-1.5 text-xs sm:text-sm gap-2"
                  } ${
                    p.bankrupt
                      ? "bg-slate-900 border-slate-800 opacity-40"
                      : !p.isConnected
                      ? "bg-slate-800/80 text-slate-400 border-red-500/50"
                      : isSpeaking
                      ? "bg-emerald-300 text-black border-black font-black ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.9)] scale-105"
                      : isTurn
                      ? "bg-amber-400 text-black border-black font-black ring-4 ring-amber-300/60 scale-105"
                      : isYou
                      ? "bg-[#CBE7D0] text-black border-black font-bold"
                      : "bg-white text-slate-900 border-black font-bold"
                  }`}
                >
                  <span className={isMoreThanFourPlayers ? "text-base" : "text-lg"}>{tok.emoji}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`font-black truncate drop-shadow-sm ${isMoreThanFourPlayers ? "max-w-[55px] sm:max-w-[80px]" : "max-w-[75px] sm:max-w-[110px]"}`}
                      style={{ color: p.color || "#000" }}
                    >
                      {p.name}
                    </span>
                    {isSpeaking && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                    )}
                    {isMuted && <MicOff className="w-3 h-3 text-red-600 shrink-0" />}
                    {!p.isConnected && (
                      <Unplug className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" title="Player Disconnected" />
                    )}
                  </div>

                  <span className={`font-mono font-black px-1.5 py-0.5 rounded-md ${
                    isMoreThanFourPlayers ? "text-[11px]" : "text-xs"
                  } ${p.money < 0 ? "bg-red-600 text-white animate-pulse" : "text-emerald-900 bg-black/10"}`}>
                    M{p.money}
                  </span>

                  {p.inJail && <ShieldAlert className="w-3.5 h-3.5 text-red-600 ml-0.5" />}
                  {p.money < 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />}
                </button>

                {/* Multiple Floating Transaction Deltas */}
                {pTxList.length > 0 && (
                  <div className="absolute -bottom-8 flex flex-col items-center gap-1 pointer-events-none z-50">
                    {pTxList.map((tx) => (
                      <div
                        key={tx.id}
                        className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black font-mono shadow-2xl border-2 whitespace-nowrap ${
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

        {/* Right Controls: Invite + Settings + Connection Status */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 z-30">
          {/* Invite Share Link */}
          <button
            onClick={handleCopyLink}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#ED1B24] hover:bg-red-700 text-white font-black text-xs border-2 border-black transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Invite"}</span>
          </button>

          {/* Settings Icon-Only Button */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-black/50 hover:bg-black/80 text-slate-200 border-2 border-slate-700 hover:border-slate-500 transition cursor-pointer shadow-md"
            title="Game Settings (Audio, Voice & Controls)"
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          {/* Connection Status Indicator */}
          <div
            className={`p-1.5 sm:p-2 rounded-xl border flex items-center justify-center ${
              connected ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
            }`}
            title={connected ? "Connected" : "Disconnected"}
          >
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        </div>
      </header>

      {/* Main Focus: Physical 3D / 2D Board + Left 2D/3D & Rotate Controls */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 my-auto relative overflow-hidden">
        {/* Left Side: 2D/3D Mode Switcher & 2D Rotate Button */}
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col gap-2">
          {/* Toggle between 3D and 2D */}
          <button
            onClick={() => setIs3DView((prev) => !prev)}
            className="p-2.5 sm:p-3 bg-black/80 hover:bg-black text-white rounded-2xl border-2 border-slate-700 shadow-2xl transition flex flex-col items-center gap-1 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95"
            title={is3DView ? "Switch to 2D Classic View" : "Switch to 3D Interactive View"}
          >
            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="text-[9px] font-black uppercase text-slate-300">
              {is3DView ? "2D" : "3D"}
            </span>
          </button>

          {/* 2D Mode Rotate Button */}
          {!is3DView && (
            <button
              onClick={handleRotateBoard}
              className="p-2.5 sm:p-3 bg-black/80 hover:bg-black text-white rounded-2xl border-2 border-slate-700 shadow-2xl transition flex flex-col items-center gap-1 backdrop-blur-md cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Rotate Board 90°"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="text-[9px] font-black uppercase text-slate-300">Rotate</span>
            </button>
          )}
        </div>

        {is3DView ? (
          <Board3D
            gameState={gameState}
            onTileClick={(tileId) => {
              const tile = BOARD_TILES[tileId];
              if (tile) setInspectedTile(tile);
            }}
            onRollDice={handleRollDice}
            onBuyProperty={handleBuyProperty}
            onPassProperty={handlePassProperty}
            onPayJailFine={handlePayJailFine}
            onUseJailCard={handleUseJailCard}
            onEndTurn={handleEndTurn}
            playerId={playerId}
            isMyTurn={isMyTurn}
            onMovementComplete={handleMovementComplete}
            onOpenCards={(tab) => setCardsModalOpen(tab)}
          />
        ) : (
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
            onOpenCards={(tab) => setCardsModalOpen(tab)}
          />
        )}
      </main>

      {/* Floating Soundboard Activity Notification */}
      {soundboardToast && (
        <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-left-4 fade-in duration-200">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 text-white font-bold text-xs shadow-2xl shadow-emerald-500/30 backdrop-blur-md">
            <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>
              <strong className="text-emerald-300">{soundboardToast.senderName}</strong> played <span className="font-black underline capitalize">{soundboardToast.clipName}</span>
            </span>
          </div>
        </div>
      )}

      {/* Structured Non-Overlapping Bottom Bar */}
      <footer className="w-full max-w-7xl mx-auto px-2 sm:px-4 pb-2 sm:pb-3 pt-1 z-30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left Side: Live Ticker + Clean Icon-Only Tools */}
        <div className="flex items-center gap-2">
          {/* Live Match Update Text Ticker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/85 border border-slate-700 shadow-md backdrop-blur-md text-[11px] sm:text-xs font-bold text-slate-200">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate max-w-[140px] sm:max-w-xs">{getLiveStatusText()}</span>
          </div>

          {/* Soundboard Icon-Only Button */}
          <button
            onClick={() => setSoundboardModalOpen(true)}
            title="Soundboard Meme Clips"
            className="relative p-2 sm:p-2.5 rounded-2xl bg-black/80 hover:bg-black text-white border-2 border-slate-700 hover:border-emerald-500/60 shadow-md transition flex items-center justify-center backdrop-blur-md cursor-pointer"
          >
            <Music2 className={`w-4 h-4 ${isRoomAudioBusy ? "text-blue-400 animate-spin" : "text-emerald-400"}`} />
            {isRoomAudioBusy ? (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-md bg-blue-500 text-white font-mono font-black text-[8px] animate-pulse">
                playing
              </span>
            ) : soundboardCooldown > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-md bg-amber-500 text-black font-mono font-black text-[8px] animate-pulse">
                {soundboardCooldown}s
              </span>
            ) : null}
          </button>

          {/* Chat Icon-Only Button */}
          <button
            onClick={() => {
              setChatDrawerOpen(true);
              setHasUnreadChat(false);
            }}
            title="Live Chat"
            className="relative p-2 sm:p-2.5 rounded-2xl bg-black/80 hover:bg-black text-white border-2 border-slate-700 shadow-md transition flex items-center justify-center backdrop-blur-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            {hasUnreadChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          {/* Activity Log Icon-Only Button */}
          <button
            onClick={() => setActivityDrawerOpen(true)}
            title="Game Activity Log"
            className="p-2 sm:p-2.5 rounded-2xl bg-black/80 hover:bg-black text-white border-2 border-slate-700 shadow-md transition flex items-center justify-center backdrop-blur-md cursor-pointer"
          >
            <ScrollText className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Right Side: Deeds & Trade Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setDeedsModalOpen(true)}
            className="px-3.5 py-1 sm:py-1.5 rounded-2xl bg-white hover:bg-slate-100 text-black font-black text-xs border-2 border-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Deeds</span>
          </button>

          <button
            onClick={() => {
              const reason = getTradeDisabledReason();
              if (reason) {
                alert(reason);
                return;
              }
              const target = gameState.players.find((p) => p.id !== playerId && !p.bankrupt);
              if (target) setTradeTarget(target);
            }}
            disabled={!canProposeTrade}
            title={getTradeDisabledReason() || "Propose Trade"}
            className={`px-3.5 py-1 sm:py-1.5 rounded-2xl font-black text-xs border-2 transition flex items-center gap-1.5 shadow-md ${
              !canProposeTrade
                ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-700 text-white border-black cursor-pointer shadow-blue-600/30"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Trade</span>
          </button>
        </div>
      </footer>

      {/* Debt Resolution Modal */}
      {myPlayer && myPlayer.money < 0 && (
        <DebtResolutionModal
          gameState={gameState}
          playerId={playerId}
          onMortgage={handleMortgage}
          onSellHouse={handleSellHouse}
          onDeclareBankruptcy={handleDeclareBankruptcy}
          onProposeTrade={(target) => setTradeTarget(target)}
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
          gameState={gameState}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Discord Style Soundboard Modal */}
      <SoundboardModal
        isOpen={soundboardModalOpen}
        onClose={() => setSoundboardModalOpen(false)}
        onPlaySound={handlePlaySoundboardClip}
        cooldownRemaining={soundboardCooldown}
        isRoomAudioBusy={isRoomAudioBusy}
        busySenderName={busySenderName}
      />

      {/* Chance & Community Chest Cards Browser Modal */}
      <CardsBrowserModal
        isOpen={Boolean(cardsModalOpen)}
        initialTab={cardsModalOpen || "chance"}
        onClose={() => setCardsModalOpen(null)}
      />

      {/* Settings Modal (Audio, Voice, SFX, Host End Game) */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        isMicMuted={isMicMuted}
        onToggleMic={handleToggleMic}
        isDeafened={isDeafened}
        onToggleDeafen={handleToggleDeafen}
        voiceVolume={voiceVolume}
        onChangeVoiceVolume={(vol) => {
          setVoiceVolume(vol);
          voiceManager.setVoiceVolume(vol);
        }}
        soundboardVolume={soundboardVolume}
        onChangeSoundboardVolume={(vol) => {
          setSoundboardVolume(vol);
          if (activeAudioRef.current) {
            activeAudioRef.current.volume = isSoundMuted ? 0 : Math.max(0, Math.min(1.0, (vol / 100) * 0.65));
          }
        }}
        isSoundMuted={isSoundMuted}
        onToggleSoundFX={handleToggleSoundFX}
        isHost={isHost}
        onHostEndGame={handleHostEndGame}
        onQuitGame={handleLeaveRoom}
      />

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
