# 🇮🇳 Indian Monopoly (Multiplayer Online Board Game)

A real-time, authentic multiplayer Monopoly board game built with **React**, **Tailwind CSS**, **Node.js**, **Express**, and **Socket.io**.

## ✨ Features
- 🎲 **Authentic Hasbro Board Layout**: True 45° diagonal corners, 160px deep edge property tiles, inward-facing color bars, and compact felt center.
- 🌐 **Live Public Rooms & 1-Click Join**: Browse all active rooms directly from the homepage with real-time player counts and status.
- 🔊 **Authentic Audio**: Vintage mechanical cash register chime recording, tactile pawn step sounds, and 3D rolling dice rumble.
- 💸 **Multi-Transaction Floating Badges**: Animated fading `+M 200` (upward) and `-M 50` (downward) balance indicators.
- 🏢 **Complete Game Mechanics**:
  - Full property trading & custom negotiations
  - Houses & Hotels upgrades (up to 4 houses + 1 hotel)
  - Mortgaging & unmortgaging
  - Jail bail, fines, and "Get Out of Jail Free" cards
  - Emergency Debt Settlement & Bankruptcy liquidation modal
  - Auto-play turn management for disconnected players

## 🚀 Quick Start Locally

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
npm start
```
Visit `http://localhost:3000` in your browser.

## ☁️ 1-Click Free Cloud Deployment (Render / Railway / Fly.io)

### Deploy on Render:
1. Go to [https://render.com](https://render.com) and click **New Web Service**.
2. Connect your GitHub repository: `https://github.com/Wandererre/monopoly.git`.
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npm start`
5. Click **Deploy Web Service** — Render gives you a free permanent universal link (e.g. `https://monopoly-xxxx.onrender.com`)!
