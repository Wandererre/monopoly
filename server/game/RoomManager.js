import { MonopolyEngine } from "./MonopolyEngine.js";

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> MonopolyEngine
    this.socketToRoom = new Map(); // socketId -> { roomId, playerId }
    this.playerToRoom = new Map(); // playerId -> roomId

    this.timerLoop = setInterval(() => {
      this.tick();
    }, 1000);
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  createRoom(hostData, settings = {}) {
    const roomId = this.generateRoomCode();
    const engine = new MonopolyEngine(roomId, hostData, settings);
    this.rooms.set(roomId, engine);
    this.playerToRoom.set(hostData.id, roomId);
    this.broadcastPublicRooms();
    return { roomId, engine };
  }

  joinRoom(roomId, playerData) {
    const cleanCode = (roomId || "").trim().toUpperCase();
    const engine = this.rooms.get(cleanCode);
    if (!engine) {
      return { success: false, error: "Room not found. Please check your room code." };
    }

    const player = engine.addPlayer(playerData);
    if (!player) {
      return { success: false, error: "Cannot join this room." };
    }

    this.playerToRoom.set(playerData.id, cleanCode);
    this.broadcastPublicRooms();
    return { success: true, roomId: cleanCode, engine, player };
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase());
  }

  getPublicRooms() {
    const list = [];
    this.rooms.forEach((engine, roomId) => {
      if (engine.phase === "GAME_OVER") return;
      const host = engine.players.find(p => p.isHost) || engine.players[0];
      list.push({
        roomId,
        hostName: host ? host.name : "Host",
        playerCount: engine.players.length,
        maxPlayers: 8,
        gameStarted: engine.gameStarted
      });
    });
    return list;
  }

  broadcastPublicRooms() {
    this.io.emit("public-rooms-list", this.getPublicRooms());
  }

  endGameByHost(roomId, playerId) {
    const engine = this.getRoom(roomId);
    if (!engine) return { success: false, error: "Room not found." };
    const res = engine.endGameByHost(playerId);
    if (res.success) {
      this.broadcastGameState(roomId);
      this.broadcastPublicRooms();
    }
    return res;
  }

  handleDisconnect(socketId) {
    const mapping = this.socketToRoom.get(socketId);
    if (!mapping) return;

    const { roomId, playerId } = mapping;
    const engine = this.rooms.get(roomId);
    if (engine) {
      engine.removePlayer(playerId);

      // If all players in the room are now disconnected, close the room
      const anyConnected = engine.players.some((p) => p.isConnected);
      if (!anyConnected) {
        console.log(`[Room Closed] All players disconnected from room ${roomId}. Room deleted.`);
        this.rooms.delete(roomId);
        this.broadcastPublicRooms();
        this.socketToRoom.delete(socketId);
        return;
      }

      this.broadcastGameState(roomId);
      this.broadcastPublicRooms();

      if (engine.gameStarted && engine.getCurrentPlayer()?.id === playerId) {
        setTimeout(() => {
          engine.autoPlayTurn();
          this.broadcastGameState(roomId);
        }, 1200);
      }
    }
    this.socketToRoom.delete(socketId);
  }

  registerSocket(socketId, roomId, playerId) {
    this.socketToRoom.set(socketId, { roomId: roomId.toUpperCase(), playerId });
  }

  broadcastGameState(roomId) {
    const engine = this.getRoom(roomId);
    if (!engine) return;
    this.io.to(roomId.toUpperCase()).emit("game-state", engine.getGameState());
  }

  tick() {
    this.rooms.forEach((engine, roomId) => {
      // Auto-cleanup orphaned rooms where no one is connected
      const anyConnected = engine.players.some((p) => p.isConnected);
      if (!anyConnected) {
        this.rooms.delete(roomId);
        this.broadcastPublicRooms();
        return;
      }

      if (!engine.gameStarted || engine.phase === "GAME_OVER") return;

      const current = engine.getCurrentPlayer();
      if (current && !current.isConnected && !current.bankrupt) {
        engine.autoPlayTurn();
        this.broadcastGameState(roomId);
        return;
      }

      if (engine.turnTimeRemaining > 0) {
        engine.turnTimeRemaining--;
        if (engine.turnTimeRemaining === 0) {
          engine.autoPlayTurn();
          this.broadcastGameState(roomId);
        } else if (engine.turnTimeRemaining % 5 === 0 || engine.turnTimeRemaining <= 5) {
          this.io.to(roomId).emit("timer-tick", { timeRemaining: engine.turnTimeRemaining });
        }
      }
    });
  }
}
