import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { RoomManager } from "./game/RoomManager.js";
import { BOARD_TILES, COLOR_GROUPS, PLAYER_TOKENS } from "./data/boardData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager(io);

// Static frontend serving
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: roomManager.rooms.size });
});

app.get("/api/rooms", (req, res) => {
  res.json({ rooms: roomManager.getPublicRooms() });
});

app.get("/api/board", (req, res) => {
  res.json({ tiles: BOARD_TILES, colorGroups: COLOR_GROUPS, tokens: PLAYER_TOKENS });
});

app.get("/api/room-check/:code", (req, res) => {
  const code = (req.params.code || "").toUpperCase();
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ exists: false, error: "Room not found" });
  }
  return res.json({
    exists: true,
    code,
    playerCount: room.players.length,
    gameStarted: room.gameStarted
  });
});

// Socket.io Events
io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Send public rooms list on initial connection
  socket.emit("public-rooms-list", roomManager.getPublicRooms());

  socket.on("get-public-rooms", (callback) => {
    const list = roomManager.getPublicRooms();
    if (callback) callback(list);
    else socket.emit("public-rooms-list", list);
  });

  // 1. Create Room
  socket.on("create-room", ({ hostData, settings }, callback) => {
    try {
      const { roomId, engine } = roomManager.createRoom({
        ...hostData,
        socketId: socket.id
      }, settings);

      socket.join(roomId);
      roomManager.registerSocket(socket.id, roomId, hostData.id);

      if (callback) {
        callback({ success: true, roomId, state: engine.getGameState() });
      }
      roomManager.broadcastGameState(roomId);
    } catch (err) {
      console.error("Error creating room:", err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // 2. Join Room
  socket.on("join-room", ({ roomId, playerData }, callback) => {
    try {
      const result = roomManager.joinRoom(roomId, {
        ...playerData,
        socketId: socket.id
      });

      if (!result.success) {
        if (callback) callback({ success: false, error: result.error });
        return;
      }

      socket.join(result.roomId);
      roomManager.registerSocket(socket.id, result.roomId, playerData.id);

      if (callback) {
        callback({ success: true, roomId: result.roomId, state: result.engine.getGameState() });
      }
      roomManager.broadcastGameState(result.roomId);
    } catch (err) {
      console.error("Error joining room:", err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // 3. Reconnect Session
  socket.on("reconnect-player", ({ roomId, playerId }, callback) => {
    const cleanRoom = (roomId || "").toUpperCase();
    const engine = roomManager.getRoom(cleanRoom);
    if (!engine) {
      if (callback) callback({ success: false, error: "Room not found or expired." });
      return;
    }

    const player = engine.players.find(p => p.id === playerId);
    if (!player) {
      if (callback) callback({ success: false, error: "Player not found in this room." });
      return;
    }

    player.isConnected = true;
    player.socketId = socket.id;
    socket.join(cleanRoom);
    roomManager.registerSocket(socket.id, cleanRoom, playerId);

    if (callback) {
      callback({ success: true, roomId: cleanRoom, state: engine.getGameState() });
    }
    roomManager.broadcastGameState(cleanRoom);
  });

  // 4. Start Game
  socket.on("start-game", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.startGame(playerId);
    if (callback) callback(res);
    if (res.success) {
      roomManager.broadcastGameState(roomId);
      roomManager.broadcastPublicRooms();
    }
  });

  // 5. Roll Dice
  socket.on("roll-dice", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.rollDice(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 6. Buy Property
  socket.on("buy-property", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.buyProperty(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 7. Pass Property
  socket.on("pass-property", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.passProperty(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 8. Build House / Hotel
  socket.on("build-house", ({ roomId, playerId, tileId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.buildHouse(playerId, tileId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 9. Sell House / Hotel
  socket.on("sell-house", ({ roomId, playerId, tileId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.sellHouse(playerId, tileId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 10. Mortgage
  socket.on("mortgage-property", ({ roomId, playerId, tileId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.mortgageProperty(playerId, tileId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 11. Unmortgage
  socket.on("unmortgage-property", ({ roomId, playerId, tileId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.unmortgageProperty(playerId, tileId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 12. Pay Jail Fine
  socket.on("pay-jail-fine", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.payJailFine(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 13. Use Jail Card
  socket.on("use-jail-card", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.useJailCard(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 14. Propose Trade
  socket.on("propose-trade", ({ roomId, playerId, tradeData }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.proposeTrade(playerId, tradeData);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 15. Respond Trade
  socket.on("respond-trade", ({ roomId, playerId, accept }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.respondTrade(playerId, accept);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 16. Cancel Trade
  socket.on("cancel-trade", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.cancelTrade(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 17. End Turn
  socket.on("end-turn", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.endTurn(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 18. Declare Bankruptcy
  socket.on("declare-bankruptcy", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.declareBankruptcy(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 19. Host End Game Early
  socket.on("host-end-game", ({ roomId, playerId }, callback) => {
    const res = roomManager.endGameByHost(roomId, playerId);
    if (callback) callback(res);
  });

  // 20. Resolve Card Action
  socket.on("resolve-card-action", ({ roomId, playerId }, callback) => {
    const engine = roomManager.getRoom(roomId);
    if (!engine) return;
    const res = engine.resolveCardAction(playerId);
    if (callback) callback(res);
    roomManager.broadcastGameState(roomId);
  });

  // 19. Send In-Game Chat
  socket.on("send-chat", ({ roomId, senderName, message }) => {
    const cleanRoom = (roomId || "").toUpperCase();
    io.to(cleanRoom).emit("new-chat", {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      sender: senderName,
      message,
      time: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    });
  });

  // 20. Discord-Style Soundboard Broadcast
  socket.on("play-soundboard", ({ roomId, clipId, clipName, clipFile, senderName }) => {
    const cleanRoom = (roomId || "").toUpperCase();
    io.to(cleanRoom).emit("soundboard-triggered", {
      clipId,
      clipName,
      clipFile,
      senderName,
      timestamp: Date.now()
    });
  });

  // 20. WebRTC Voice Signaling
  socket.on("voice-join", ({ roomId, playerId }, callback) => {
    const cleanRoom = (roomId || "").toUpperCase();
    const voiceRoom = `voice:${cleanRoom}`;
    socket.join(voiceRoom);

    // Find other sockets in the voice room
    const clientsInVoice = io.sockets.adapter.rooms.get(voiceRoom) || new Set();
    const existingPeers = [];

    clientsInVoice.forEach((sId) => {
      if (sId !== socket.id) {
        const mapping = roomManager.socketToRoom.get(sId);
        existingPeers.push({
          socketId: sId,
          playerId: mapping ? mapping.playerId : null
        });
      }
    });

    // Notify others that this player joined voice
    socket.to(voiceRoom).emit("voice-peer-joined", {
      socketId: socket.id,
      playerId
    });

    if (callback) {
      callback({ success: true, existingPeers });
    }
  });

  socket.on("voice-offer", ({ targetSocketId, offer, callerPlayerId }) => {
    io.to(targetSocketId).emit("voice-offer", {
      callerSocketId: socket.id,
      callerPlayerId,
      offer
    });
  });

  socket.on("voice-answer", ({ targetSocketId, answer, answeringPlayerId }) => {
    io.to(targetSocketId).emit("voice-answer", {
      answeringSocketId: socket.id,
      answeringPlayerId,
      answer
    });
  });

  socket.on("voice-ice-candidate", ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit("voice-ice-candidate", {
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on("voice-state-update", ({ roomId, playerId, isMuted, isDeafened, isSpeaking }) => {
    const cleanRoom = (roomId || "").toUpperCase();
    io.to(cleanRoom).emit("voice-state-update", {
      socketId: socket.id,
      playerId,
      isMuted,
      isDeafened,
      isSpeaking
    });
  });

  socket.on("voice-leave", ({ roomId, playerId }) => {
    const cleanRoom = (roomId || "").toUpperCase();
    socket.leave(`voice:${cleanRoom}`);
    socket.to(`voice:${cleanRoom}`).emit("voice-peer-left", {
      socketId: socket.id,
      playerId
    });
  });

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    const mapping = roomManager.socketToRoom.get(socket.id);
    if (mapping) {
      io.to(`voice:${mapping.roomId}`).emit("voice-peer-left", {
        socketId: socket.id,
        playerId: mapping.playerId
      });
    }
    roomManager.handleDisconnect(socket.id);
  });
});

// Fallback for SPA routing in production
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🇮🇳 Indian Monopoly Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`=============================================`);
});
