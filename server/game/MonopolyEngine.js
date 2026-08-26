import { BOARD_TILES, COLOR_GROUPS, CHANCE_CARDS, COMMUNITY_CARDS } from "../data/boardData.js";

export class MonopolyEngine {
  constructor(roomId, hostPlayer, settings = {}) {
    this.roomId = roomId;
    this.settings = {
      startingCash: settings.startingCash || 1500,
      turnTimerSeconds: settings.turnTimerSeconds || 60,
      maxHousesPerProperty: 5 // 5 = Hotel
    };

    this.players = [this.initPlayer(hostPlayer, true)];
    this.currentTurnIndex = 0;
    this.dice = [1, 1];
    this.lastDiceSum = 2;
    this.doublesCount = 0;
    this.phase = "LOBBY";
    this.pendingAction = null;
    this.pendingTrade = null;
    this.gameStarted = false;
    this.winner = null;

    this.properties = {};
    BOARD_TILES.forEach(tile => {
      if (["property", "railway", "utility"].includes(tile.type)) {
        this.properties[tile.id] = {
          owner: null,
          houses: 0,
          mortgaged: false
        };
      }
    });

    this.chanceDeck = this.shuffle([...CHANCE_CARDS]);
    this.communityDeck = this.shuffle([...COMMUNITY_CARDS]);
    this.logs = [];

    this.turnTimeRemaining = this.settings.turnTimerSeconds;
  }

  initPlayer(playerData, isHost = false) {
    return {
      id: playerData.id,
      name: playerData.name,
      token: playerData.token || "hat",
      money: this.settings.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      bankrupt: false,
      isHost: isHost,
      isConnected: true,
      socketId: playerData.socketId || null,
      color: playerData.color || "#EF4444"
    };
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  addLog(message, type = "info", metadata = {}) {
    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type,
      metadata
    };
    this.logs.unshift(logEntry);
    if (this.logs.length > 80) this.logs.pop();
  }

  addPlayer(playerData) {
    if (this.gameStarted) {
      const existing = this.players.find(p => p.id === playerData.id);
      if (existing) {
        existing.isConnected = true;
        existing.socketId = playerData.socketId;
        this.addLog(`${existing.name} reconnected.`, "info");
        return existing;
      }
      return null;
    }

    if (this.players.length >= 8) return null;

    const existingIndex = this.players.findIndex(p => p.id === playerData.id);
    if (existingIndex >= 0) {
      this.players[existingIndex].name = playerData.name;
      this.players[existingIndex].token = playerData.token;
      this.players[existingIndex].color = playerData.color;
      this.players[existingIndex].socketId = playerData.socketId;
      this.players[existingIndex].isConnected = true;
      return this.players[existingIndex];
    }

    const newPlayer = this.initPlayer(playerData, this.players.length === 0);
    this.players.push(newPlayer);
    this.addLog(`${newPlayer.name} joined.`, "info");
    return newPlayer;
  }

  removePlayer(playerId) {
    const p = this.players.find(pl => pl.id === playerId);
    if (!p) return;

    if (!this.gameStarted) {
      this.players = this.players.filter(pl => pl.id !== playerId);
      if (p.isHost && this.players.length > 0) {
        this.players[0].isHost = true;
      }
      this.addLog(`${p.name} left.`, "info");
    } else {
      p.isConnected = false;
      this.addLog(`${p.name} disconnected.`, "info");
    }
  }

  startGame(playerId) {
    const host = this.players.find(p => p.id === playerId && p.isHost);
    if (!host) return { success: false, error: "Only host can start the game." };
    if (this.players.length < 1) return { success: false, error: "No players in room." };

    this.gameStarted = true;
    this.phase = "ROLL";
    this.currentTurnIndex = 0;
    this.doublesCount = 0;
    this.turnTimeRemaining = this.settings.turnTimerSeconds;
    this.addLog(`Game started! ${this.getCurrentPlayer().name}'s turn.`, "info");
    return { success: true };
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  getActivePlayers() {
    return this.players.filter(p => !p.bankrupt);
  }

  rollDice(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { success: false, error: "Not your turn." };
    if (player.money < 0) return { success: false, error: "Must resolve debt before rolling." };
    if (this.phase !== "ROLL") return { success: false, error: "Cannot roll right now." };

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    this.dice = [die1, die2];
    this.lastDiceSum = die1 + die2;
    const isDoubles = die1 === die2;

    this.addLog(`${player.name} rolled ${die1} and ${die2}${isDoubles ? " (Doubles!)" : ""}`, "dice", { dice: [die1, die2] });

    if (player.inJail) {
      if (isDoubles) {
        player.inJail = false;
        player.jailTurns = 0;
        this.doublesCount = 0;
        this.addLog(`${player.name} rolled doubles and got out of Jail!`, "jail");
        this.movePlayer(player, die1 + die2);
        return { success: true, rolledDoubles: true, escapedJail: true, dice: [die1, die2] };
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          this.addLog(`${player.name} spent 3 turns in Jail and pays M50 fine.`, "jail");
          this.deductMoney(player, 50, null);
          player.inJail = false;
          player.jailTurns = 0;
          this.movePlayer(player, die1 + die2);
          return { success: true, forcedBail: true, dice: [die1, die2] };
        } else {
          this.addLog(`${player.name} remains in Jail (${player.jailTurns}/3).`, "jail");
          this.phase = "ACTION";
          return { success: true, stayedInJail: true, dice: [die1, die2] };
        }
      }
    }

    if (isDoubles) {
      this.doublesCount++;
      if (this.doublesCount === 3) {
        this.addLog(`${player.name} rolled 3 doubles and is sent to Jail!`, "jail");
        this.sendToJail(player);
        this.doublesCount = 0;
        this.phase = "ACTION";
        return { success: true, sentToJail: true, dice: [die1, die2] };
      }
    } else {
      this.doublesCount = 0;
    }

    const previousPosition = player.position;
    this.movePlayer(player, die1 + die2);
    return {
      success: true,
      dice: [die1, die2],
      isDoubles,
      fromPosition: previousPosition,
      toPosition: player.position,
      steps: die1 + die2
    };
  }

  movePlayer(player, steps, collectGo = true) {
    const oldPos = player.position;
    let newPos = (oldPos + steps) % 40;
    if (newPos < 0) newPos += 40;

    if (collectGo && steps > 0 && newPos < oldPos) {
      player.money += 200;
      this.addLog(`${player.name} passed GO and collected M200.`, "info");
    }

    player.position = newPos;
    const tile = BOARD_TILES[newPos];
    this.addLog(`${player.name} landed on ${tile.name}.`, "info", { tileId: newPos });

    this.handleTileLanding(player, tile);
  }

  handleTileLanding(player, tile) {
    this.phase = "ACTION";
    this.pendingAction = null;

    if (["property", "railway", "utility"].includes(tile.type)) {
      const propState = this.properties[tile.id];
      if (!propState.owner) {
        this.pendingAction = {
          type: "BUY_CHOICE",
          tileId: tile.id,
          name: tile.name,
          price: tile.price,
          playerId: player.id
        };
      } else if (propState.owner !== player.id) {
        if (propState.mortgaged) {
          this.addLog(`${tile.name} is mortgaged. No rent owed.`, "info");
        } else {
          this.chargeRent(player, tile, propState);
        }
      }
    } else if (tile.type === "tax") {
      this.addLog(`${player.name} owes M${tile.amount} for ${tile.name}.`, "tax");
      this.deductMoney(player, tile.amount, null);
      this.pendingAction = {
        type: "TAX_PAID",
        amount: tile.amount,
        name: tile.name
      };
    } else if (tile.type === "go_to_jail") {
      this.addLog(`${player.name} goes directly to Jail.`, "jail");
      this.sendToJail(player);
    } else if (tile.type === "chance") {
      this.drawChanceCard(player);
    } else if (tile.type === "community_chest") {
      this.drawCommunityCard(player);
    }
  }

  chargeRent(player, tile, propState) {
    const owner = this.players.find(p => p.id === propState.owner);
    if (!owner) return;

    let rent = 0;
    if (tile.type === "property") {
      if (propState.houses === 0) {
        rent = tile.rent[0];
        const groupInfo = COLOR_GROUPS[tile.group];
        const ownsAll = groupInfo.tileIds.every(tid => this.properties[tid].owner === owner.id);
        if (ownsAll) rent *= 2;
      } else {
        rent = tile.rent[propState.houses];
      }
    } else if (tile.type === "railway") {
      const ownedRailways = COLOR_GROUPS.railway.tileIds.filter(tid => this.properties[tid].owner === owner.id).length;
      rent = tile.rent[Math.max(0, Math.min(3, ownedRailways - 1))];
    } else if (tile.type === "utility") {
      const ownedUtilities = COLOR_GROUPS.utility.tileIds.filter(tid => this.properties[tid].owner === owner.id).length;
      const mult = ownedUtilities === 2 ? 10 : 4;
      rent = mult * this.lastDiceSum;
    }

    this.addLog(`${player.name} owes M${rent} rent to ${owner.name} for ${tile.name}.`, "rent", { amount: rent, owner: owner.name });
    this.deductMoney(player, rent, owner);
    this.pendingAction = {
      type: "RENT_PAID",
      amount: rent,
      ownerName: owner.name,
      tileName: tile.name
    };
  }

  buyProperty(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { success: false, error: "Not your turn." };
    if (!this.pendingAction || this.pendingAction.type !== "BUY_CHOICE") {
      return { success: false, error: "No property available to buy." };
    }

    const tileId = this.pendingAction.tileId;
    const tile = BOARD_TILES[tileId];
    if (player.money < tile.price) {
      return { success: false, error: "Not enough money to buy this property." };
    }

    player.money -= tile.price;
    this.properties[tileId].owner = player.id;
    this.addLog(`${player.name} bought ${tile.name} for M${tile.price}.`, "buy", { tileId, price: tile.price });
    this.pendingAction = null;
    return { success: true };
  }

  passProperty(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { success: false, error: "Not your turn." };
    if (!this.pendingAction || this.pendingAction.type !== "BUY_CHOICE") {
      return { success: false, error: "No property purchase to pass." };
    }

    const tile = BOARD_TILES[this.pendingAction.tileId];
    this.addLog(`${player.name} passed on ${tile.name}.`, "info");
    this.pendingAction = null;
    return { success: true };
  }

  sendToJail(player) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.doublesCount = 0;
    this.pendingAction = null;
  }

  payJailFine(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) return { success: false, error: "Not in jail." };
    if (player.money < 50) return { success: false, error: "Not enough money for bail (M50)." };

    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.name} paid M50 fine and is out of Jail.`, "jail");
    return { success: true };
  }

  useJailCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) return { success: false, error: "Not in jail." };
    if (player.jailCards <= 0) return { success: false, error: "No Get Out of Jail Free cards." };

    player.jailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.name} used a Get Out of Jail Free card.`, "jail");
    return { success: true };
  }

  drawChanceCard(player) {
    if (this.chanceDeck.length === 0) this.chanceDeck = this.shuffle([...CHANCE_CARDS]);
    const card = this.chanceDeck.shift();
    this.executeCardAction(player, card, "Chance");
  }

  drawCommunityCard(player) {
    if (this.communityDeck.length === 0) this.communityDeck = this.shuffle([...COMMUNITY_CARDS]);
    const card = this.communityDeck.shift();
    this.executeCardAction(player, card, "Community Chest");
  }

  executeCardAction(player, card, deckName) {
    this.addLog(`${player.name} drew ${deckName}: "${card.title}"`, "card", { card });
    this.pendingAction = {
      type: "CARD_DRAWN",
      deckName,
      card
    };

    switch (card.action) {
      case "advance_tile":
        if (card.targetTile !== undefined) {
          const oldPos = player.position;
          player.position = card.targetTile;
          if (card.collectGo && card.targetTile < oldPos) {
            player.money += 200;
            this.addLog(`${player.name} passed GO and collected M200.`, "info");
          }
          const landedTile = BOARD_TILES[card.targetTile];
          this.handleTileLanding(player, landedTile);
        }
        break;
      case "receive_money":
        player.money += card.amount;
        break;
      case "pay_money":
        this.deductMoney(player, card.amount, null);
        break;
      case "collect_from_all":
        this.getActivePlayers().forEach(other => {
          if (other.id !== player.id) {
            this.deductMoney(other, card.amount, player);
          }
        });
        break;
      case "pay_to_all":
        this.getActivePlayers().forEach(other => {
          if (other.id !== player.id) {
            this.deductMoney(player, card.amount, other);
          }
        });
        break;
      case "property_repairs":
        let totalRepair = 0;
        Object.keys(this.properties).forEach(tid => {
          const p = this.properties[tid];
          if (p.owner === player.id) {
            if (p.houses === 5) totalRepair += card.hotelCost;
            else if (p.houses > 0) totalRepair += p.houses * card.houseCost;
          }
        });
        if (totalRepair > 0) {
          this.deductMoney(player, totalRepair, null);
        }
        break;
      case "get_out_of_jail_card":
        player.jailCards++;
        break;
      case "go_to_jail":
        this.sendToJail(player);
        break;
      case "move_relative":
        this.movePlayer(player, card.steps, false);
        break;
    }
  }

  deductMoney(payer, amount, recipient = null) {
    payer.money -= amount;
    if (recipient) recipient.money += amount;
  }

  buildHouse(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found." };
    const tile = BOARD_TILES[tileId];
    if (!tile || tile.type !== "property") return { success: false, error: "Not a buildable property." };

    const prop = this.properties[tileId];
    if (prop.owner !== playerId) return { success: false, error: "You don't own this property." };
    if (prop.mortgaged) return { success: false, error: "Cannot build on mortgaged property." };

    const group = COLOR_GROUPS[tile.group];
    const ownsAll = group.tileIds.every(tid => this.properties[tid].owner === playerId && !this.properties[tid].mortgaged);
    if (!ownsAll) return { success: false, error: "Must own all properties in this color group." };

    if (prop.houses >= 5) return { success: false, error: "Maximum buildings reached (Hotel)." };
    if (player.money < tile.houseCost) return { success: false, error: "Not enough money to build." };

    const currentHouses = prop.houses;
    const minHousesInGroup = Math.min(...group.tileIds.map(tid => this.properties[tid].houses));
    if (currentHouses > minHousesInGroup) {
      return { success: false, error: "Must build evenly across the group." };
    }

    player.money -= tile.houseCost;
    prop.houses++;
    const typeLabel = prop.houses === 5 ? "Hotel" : `House #${prop.houses}`;
    this.addLog(`${player.name} built a ${typeLabel} on ${tile.name}.`, "buy");
    return { success: true, houses: prop.houses };
  }

  sellHouse(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found." };
    const tile = BOARD_TILES[tileId];
    const prop = this.properties[tileId];
    if (!prop || prop.owner !== playerId || prop.houses <= 0) return { success: false, error: "No buildings to sell." };

    const group = COLOR_GROUPS[tile.group];
    const maxHousesInGroup = Math.max(...group.tileIds.map(tid => this.properties[tid].houses));
    if (prop.houses < maxHousesInGroup) {
      return { success: false, error: "Must sell evenly across the group." };
    }

    const refund = Math.floor(tile.houseCost / 2);
    prop.houses--;
    player.money += refund;
    this.addLog(`${player.name} sold a building on ${tile.name} for M${refund}.`, "info");
    return { success: true, houses: prop.houses };
  }

  mortgageProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found." };
    const tile = BOARD_TILES[tileId];
    const prop = this.properties[tileId];
    if (!prop || prop.owner !== playerId) return { success: false, error: "You don't own this property." };
    if (prop.mortgaged) return { success: false, error: "Already mortgaged." };

    if (tile.type === "property") {
      const group = COLOR_GROUPS[tile.group];
      const hasHouses = group.tileIds.some(tid => this.properties[tid].houses > 0);
      if (hasHouses) return { success: false, error: "Must sell all houses before mortgaging." };
    }

    prop.mortgaged = true;
    player.money += tile.mortgage;
    this.addLog(`${player.name} mortgaged ${tile.name} for M${tile.mortgage}.`, "info");
    return { success: true };
  }

  unmortgageProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found." };
    const tile = BOARD_TILES[tileId];
    const prop = this.properties[tileId];
    if (!prop || prop.owner !== playerId || !prop.mortgaged) return { success: false, error: "Not mortgaged." };

    const cost = Math.floor(tile.mortgage * 1.10);
    if (player.money < cost) return { success: false, error: `Need M${cost} to unmortgage.` };

    player.money -= cost;
    prop.mortgaged = false;
    this.addLog(`${player.name} unmortgaged ${tile.name}.`, "info");
    return { success: true };
  }

  proposeTrade(fromPlayerId, tradeData) {
    // MECHANICS ENFORCEMENT: No trading if current player landed on unowned property and hasn't decided yet
    if (this.pendingAction && this.pendingAction.type === "BUY_CHOICE") {
      return { success: false, error: "Must decide to Buy or Pass the property first before trading." };
    }

    const fromPlayer = this.players.find(p => p.id === fromPlayerId);
    const toPlayer = this.players.find(p => p.id === tradeData.toPlayerId);
    if (!fromPlayer || !toPlayer || fromPlayer.bankrupt || toPlayer.bankrupt) {
      return { success: false, error: "Invalid trade participants." };
    }

    const { offerCash = 0, offerProperties = [], requestCash = 0, requestProperties = [] } = tradeData;

    if (fromPlayer.money < offerCash) return { success: false, error: "Insufficient cash for offer." };
    if (toPlayer.money < requestCash) return { success: false, error: "Target player has insufficient cash." };

    for (const tid of offerProperties) {
      if (this.properties[tid]?.owner !== fromPlayerId) return { success: false, error: "You don't own all offered properties." };
    }
    for (const tid of requestProperties) {
      if (this.properties[tid]?.owner !== toPlayer.id) return { success: false, error: "Target player doesn't own requested properties." };
    }

    this.pendingTrade = {
      fromPlayerId,
      toPlayerId: toPlayer.id,
      fromPlayerName: fromPlayer.name,
      toPlayerName: toPlayer.name,
      offerCash,
      offerProperties,
      requestCash,
      requestProperties
    };

    this.addLog(`${fromPlayer.name} offered a trade deal to ${toPlayer.name}.`, "trade");
    return { success: true };
  }

  respondTrade(toPlayerId, accept) {
    if (!this.pendingTrade || this.pendingTrade.toPlayerId !== toPlayerId) {
      return { success: false, error: "No trade awaiting your response." };
    }

    const trade = this.pendingTrade;
    const fromPlayer = this.players.find(p => p.id === trade.fromPlayerId);
    const toPlayer = this.players.find(p => p.id === trade.toPlayerId);

    if (!accept) {
      this.addLog(`${toPlayer.name} declined the trade offer.`, "trade");
      this.pendingTrade = null;
      return { success: true, accepted: false };
    }

    if (!fromPlayer || !toPlayer || fromPlayer.money < trade.offerCash || toPlayer.money < trade.requestCash) {
      this.pendingTrade = null;
      return { success: false, error: "Trade terms no longer valid." };
    }

    fromPlayer.money = fromPlayer.money - trade.offerCash + trade.requestCash;
    toPlayer.money = toPlayer.money - trade.requestCash + trade.offerCash;

    trade.offerProperties.forEach(tid => {
      if (this.properties[tid]) this.properties[tid].owner = toPlayer.id;
    });
    trade.requestProperties.forEach(tid => {
      if (this.properties[tid]) this.properties[tid].owner = fromPlayer.id;
    });

    this.addLog(`Trade completed between ${fromPlayer.name} and ${toPlayer.name}.`, "trade");
    this.pendingTrade = null;
    return { success: true, accepted: true };
  }

  cancelTrade(playerId) {
    if (this.pendingTrade && (this.pendingTrade.fromPlayerId === playerId || this.pendingTrade.toPlayerId === playerId)) {
      this.pendingTrade = null;
      return { success: true };
    }
    return { success: false, error: "No trade to cancel." };
  }

  declareBankruptcy(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.bankrupt) return { success: false, error: "Player already bankrupt." };

    player.bankrupt = true;
    player.money = 0;

    Object.keys(this.properties).forEach(tid => {
      if (this.properties[tid].owner === playerId) {
        this.properties[tid].owner = null;
        this.properties[tid].houses = 0;
        this.properties[tid].mortgaged = false;
      }
    });

    this.addLog(`💥 ${player.name} declared bankruptcy and is eliminated!`, "info");
    this.checkWinner();

    if (this.getCurrentPlayer()?.id === playerId) {
      this.endTurn(playerId, true); // force turn pass
    }
    return { success: true };
  }

  checkWinner() {
    const active = this.getActivePlayers();
    if (active.length === 1 && this.gameStarted) {
      this.winner = active[0];
      this.phase = "GAME_OVER";
      this.addLog(`🏆 ${this.winner.name} is the last tycoon standing and WINS THE GAME!`, "win");
    }
  }

  endTurn(playerId, force = false) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { success: false, error: "Not your turn." };

    // CANNOT END TURN IF IN DEBT (unless declaring bankruptcy)
    if (!force && player.money < 0) {
      return {
        success: false,
        error: `Cannot end turn with negative balance (Deficit: M${Math.abs(player.money)}). You must mortgage properties, sell houses, or declare bankruptcy.`
      };
    }

    // CANNOT END TURN IF PENDING BUY_CHOICE
    if (!force && this.pendingAction && this.pendingAction.type === "BUY_CHOICE") {
      return { success: false, error: "You must choose to Buy or Pass the property first." };
    }

    if (!force && this.doublesCount > 0 && !player.inJail && !player.bankrupt) {
      this.phase = "ROLL";
      this.pendingAction = null;
      this.turnTimeRemaining = this.settings.turnTimerSeconds;
      this.addLog(`${player.name} rolled doubles and gets another turn!`, "dice");
      return { success: true, extraTurn: true };
    }

    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.checkWinner();
      return { success: true };
    }

    let nextIdx = (this.currentTurnIndex + 1) % this.players.length;
    while (this.players[nextIdx].bankrupt) {
      nextIdx = (nextIdx + 1) % this.players.length;
    }

    this.currentTurnIndex = nextIdx;
    this.doublesCount = 0;
    this.phase = "ROLL";
    this.pendingAction = null;
    this.turnTimeRemaining = this.settings.turnTimerSeconds;

    const nextPlayer = this.getCurrentPlayer();
    this.addLog(`It is now ${nextPlayer.name}'s turn.`, "info");
    return { success: true, nextPlayer: nextPlayer.name };
  }

  autoPlayTurn() {
    if (this.phase === "GAME_OVER" || !this.gameStarted) return;
    const player = this.getCurrentPlayer();
    if (!player || player.bankrupt) return;

    // If player is in debt during auto-play, try mortgaging/selling, or declare bankruptcy
    if (player.money < 0) {
      // Try mortgaging unmortgaged properties
      for (const tid of Object.keys(this.properties)) {
        if (player.money >= 0) break;
        const prop = this.properties[tid];
        if (prop.owner === player.id && !prop.mortgaged && prop.houses === 0) {
          this.mortgageProperty(player.id, tid);
        }
      }
      // If still negative, declare bankruptcy
      if (player.money < 0) {
        this.declareBankruptcy(player.id);
        return;
      }
    }

    if (this.phase === "ROLL") {
      if (player.inJail && player.money >= 100) {
        this.payJailFine(player.id);
      }
      this.rollDice(player.id);
    } else if (this.phase === "ACTION") {
      if (this.pendingAction && this.pendingAction.type === "BUY_CHOICE") {
        const tile = BOARD_TILES[this.pendingAction.tileId];
        if (player.money > tile.price * 2.5) {
          this.buyProperty(player.id);
        } else {
          this.passProperty(player.id);
        }
      }
      this.endTurn(player.id);
    }
  }

  getGameState() {
    return {
      roomId: this.roomId,
      gameStarted: this.gameStarted,
      phase: this.phase,
      currentTurnIndex: this.currentTurnIndex,
      currentPlayerId: this.getCurrentPlayer()?.id,
      dice: this.dice,
      doublesCount: this.doublesCount,
      pendingAction: this.pendingAction,
      pendingTrade: this.pendingTrade,
      turnTimeRemaining: this.turnTimeRemaining,
      winner: this.winner,
      players: this.players.map(p => ({
        ...p,
        netWorth: this.calculateNetWorth(p)
      })),
      properties: this.properties,
      logs: this.logs.slice(0, 40)
    };
  }

  calculateNetWorth(player) {
    if (player.bankrupt) return 0;
    let total = player.money;
    Object.keys(this.properties).forEach(tid => {
      const prop = this.properties[tid];
      if (prop.owner === player.id) {
        const tile = BOARD_TILES[tid];
        total += prop.mortgaged ? tile.mortgage : tile.price;
        total += (prop.houses || 0) * (tile.houseCost || 0);
      }
    });
    return total;
  }
}
