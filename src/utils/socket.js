import { io } from "socket.io-client";

// Connect to port 3000 if running from Vite dev port 5173, otherwise connect to origin
const socketUrl = (typeof window !== "undefined" && window.location.port === "5173")
  ? "http://localhost:3000"
  : undefined;

export const socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 30,
  reconnectionDelay: 500,
  transports: ["websocket", "polling"]
});

export const getStoredPlayer = () => {
  let id = localStorage.getItem("vyapar_player_id");
  if (!id) {
    id = "p_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("vyapar_player_id", id);
  }

  const name = localStorage.getItem("vyapar_player_name") || "";
  const token = localStorage.getItem("vyapar_player_token") || "hat";
  const lastRoom = localStorage.getItem("vyapar_last_room") || "";

  return { id, name, token, lastRoom };
};

export const savePlayerSession = (name, token, roomId) => {
  if (name) localStorage.setItem("vyapar_player_name", name);
  if (token) localStorage.setItem("vyapar_player_token", token);
  if (roomId) localStorage.setItem("vyapar_last_room", roomId.toUpperCase());
};

export const clearPlayerRoomSession = () => {
  localStorage.removeItem("vyapar_last_room");
};
