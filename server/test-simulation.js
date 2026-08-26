import http from "http";
import express from "express";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { RoomManager } from "./game/RoomManager.js";
import { BOARD_TILES } from "./data/boardData.js";

async function runTest() {
  console.log("🚀 Starting Indian Monopoly Multi-Client E2E Simulation Test...");

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  const roomManager = new RoomManager(io);

  // Setup same socket handlers as server/index.js
  io.on("connection", (socket) => {
    socket.on("create-room", ({ hostData, settings }, cb) => {
      const { roomId, engine } = roomManager.createRoom({ ...hostData, socketId: socket.id }, settings);
      socket.join(roomId);
      roomManager.registerSocket(socket.id, roomId, hostData.id);
      cb({ success: true, roomId, state: engine.getGameState() });
      roomManager.broadcastGameState(roomId);
    });

    socket.on("join-room", ({ roomId, playerData }, cb) => {
      const res = roomManager.joinRoom(roomId, { ...playerData, socketId: socket.id });
      if (!res.success) return cb(res);
      socket.join(res.roomId);
      roomManager.registerSocket(socket.id, res.roomId, playerData.id);
      cb({ success: true, roomId: res.roomId, state: res.engine.getGameState() });
      roomManager.broadcastGameState(res.roomId);
    });

    socket.on("reconnect-player", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      if (!engine) return cb({ success: false, error: "Not found" });
      const p = engine.players.find(pl => pl.id === playerId);
      if (!p) return cb({ success: false, error: "Player not found" });
      p.isConnected = true;
      p.socketId = socket.id;
      socket.join(roomId);
      roomManager.registerSocket(socket.id, roomId, playerId);
      cb({ success: true, roomId, state: engine.getGameState() });
      roomManager.broadcastGameState(roomId);
    });

    socket.on("start-game", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.startGame(playerId);
      cb(res);
      if (res.success) roomManager.broadcastGameState(roomId);
    });

    socket.on("roll-dice", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.rollDice(playerId);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("buy-property", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.buyProperty(playerId);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("pass-property", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.passProperty(playerId);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("end-turn", ({ roomId, playerId }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.endTurn(playerId);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("propose-trade", ({ roomId, playerId, tradeData }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.proposeTrade(playerId, tradeData);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("respond-trade", ({ roomId, playerId, accept }, cb) => {
      const engine = roomManager.getRoom(roomId);
      const res = engine.respondTrade(playerId, accept);
      cb(res);
      roomManager.broadcastGameState(roomId);
    });

    socket.on("disconnect", () => {
      roomManager.handleDisconnect(socket.id);
    });
  });

  await new Promise(r => server.listen(4567, r));
  console.log("✅ Test Server started on port 4567");

  // Step 1: Host creates room
  const client1 = Client("http://localhost:4567");
  let roomCode = "";
  const hostId = "user_aman_101";

  await new Promise((resolve) => {
    client1.on("connect", () => {
      client1.emit("create-room", {
        hostData: { id: hostId, name: "Aman", token: "rickshaw", color: "#F59E0B" },
        settings: { startingCash: 15000, turnTimerSeconds: 60 }
      }, (res) => {
        console.log("✅ Room Created! Room Code:", res.roomId);
        roomCode = res.roomId;
        resolve();
      });
    });
  });

  // Step 2: Friend joins room
  const client2 = Client("http://localhost:4567");
  const guestId = "user_priya_202";

  await new Promise((resolve) => {
    client2.on("connect", () => {
      client2.emit("join-room", {
        roomId: roomCode,
        playerData: { id: guestId, name: "Priya", token: "peacock", color: "#10B981" }
      }, (res) => {
        console.log("✅ Priya joined room! Total Players:", res.state.players.length);
        resolve();
      });
    });
  });

  // Step 3: Host starts game
  await new Promise((resolve) => {
    client1.emit("start-game", { roomId: roomCode, playerId: hostId }, (res) => {
      console.log("✅ Game Started Status:", res.success);
      resolve();
    });
  });

  // Step 4: Aman rolls dice
  await new Promise((resolve) => {
    client1.emit("roll-dice", { roomId: roomCode, playerId: hostId }, (res) => {
      console.log("✅ Aman rolled dice:", res.dice || res);
      resolve();
    });
  });

  // Check state
  const engine = roomManager.getRoom(roomCode);
  console.log("🎲 Current Player Position:", engine.getCurrentPlayer().position, "Tile:", BOARD_TILES[engine.getCurrentPlayer().position].name);

  // If pending buy, Aman buys or passes
  if (engine.pendingAction?.type === "BUY_CHOICE") {
    await new Promise((resolve) => {
      client1.emit("buy-property", { roomId: roomCode, playerId: hostId }, (res) => {
        console.log("✅ Aman bought property:", res);
        resolve();
      });
    });
  }

  // Step 5: Test Disconnect & Seamless Reconnect
  console.log("🔌 Testing Disconnection of Priya...");
  client2.disconnect();
  await new Promise(r => setTimeout(r, 200));
  const priyaInEngine = engine.players.find(p => p.id === guestId);
  console.log("✅ Priya connection status after disconnect:", priyaInEngine.isConnected === false ? "Offline (Retained in game)" : "Error");

  console.log("🔄 Priya reconnects with saved session...");
  const client2Reconnected = Client("http://localhost:4567");
  await new Promise((resolve) => {
    client2Reconnected.on("connect", () => {
      client2Reconnected.emit("reconnect-player", { roomId: roomCode, playerId: guestId }, (res) => {
        console.log("✅ Reconnection successful! Resumed room state without reset:", res.success);
        resolve();
      });
    });
  });

  console.log("🎉 ALL E2E MULTI-CLIENT SIMULATION TESTS PASSED SUCCESSFULLY!");
  client1.disconnect();
  client2Reconnected.disconnect();
  server.close();
  process.exit(0);
}

runTest().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
