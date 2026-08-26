import React from "react";
import { PLAYER_TOKENS, COLOR_GROUPS, BOARD_TILES } from "../../server/data/boardData.js";
import { ShieldAlert, Crown, ArrowRightLeft, Building, WifiOff, Clock } from "lucide-react";

export default function PlayerDashboard({
  gameState,
  playerId,
  onOpenTrade,
  onOpenManage
}) {
  const { players = [], properties = {}, currentPlayerId, turnTimeRemaining } = gameState || {};

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
          Players & Assets
        </h3>
        {turnTimeRemaining !== undefined && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5" /> {turnTimeRemaining}s
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {players.map((p) => {
          const isYou = p.id === playerId;
          const isTurn = p.id === currentPlayerId;
          const tokenObj = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];

          // Find all properties owned by this player
          const ownedTileIds = Object.keys(properties).filter(
            (tid) => properties[tid].owner === p.id
          );

          return (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border transition-all duration-200 ${
                p.bankrupt
                  ? "bg-slate-950/40 border-slate-900 opacity-50"
                  : isTurn
                  ? "bg-slate-900 border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50"
                  : isYou
                  ? "bg-slate-900/90 border-blue-500/40"
                  : "bg-slate-900/60 border-slate-800"
              }`}
            >
              {/* Top Row: Avatar, Name, Badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10 shrink-0"
                    style={{ backgroundColor: `${p.color}30` }}
                  >
                    {tokenObj.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100 truncate">{p.name}</span>
                      {isYou && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1 rounded font-black">
                          YOU
                        </span>
                      )}
                      {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>{tokenObj.name}</span>
                      {!p.isConnected && (
                        <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                          <WifiOff className="w-3 h-3" /> Offline
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Turn or Status Badge */}
                <div>
                  {p.bankrupt ? (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                      BANKRUPT
                    </span>
                  ) : p.inJail ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> IN JAIL
                    </span>
                  ) : isTurn ? (
                    <span className="text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2 py-0.5 rounded-full font-black animate-pulse">
                      ACTIVE
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Financial Stats */}
              {!p.bankrupt && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 mb-2.5">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Cash</div>
                    <div className="text-sm font-black text-amber-400">
                      ₹{p.money.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Worth</div>
                    <div className="text-sm font-black text-emerald-400">
                      ₹{(p.netWorth || p.money).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              )}

              {/* Owned Properties Mini Swatches */}
              {!p.bankrupt && ownedTileIds.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Properties Owned ({ownedTileIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ownedTileIds.map((tid) => {
                      const tile = BOARD_TILES[tid];
                      const propState = properties[tid];
                      let badgeColor = "#475569";
                      if (tile.group && COLOR_GROUPS[tile.group]) {
                        badgeColor = COLOR_GROUPS[tile.group].color;
                      } else if (tile.type === "railway") badgeColor = "#64748B";
                      else if (tile.type === "utility") badgeColor = "#EAB308";

                      return (
                        <div
                          key={tid}
                          title={`${tile.name} ${propState.houses > 0 ? `(${propState.houses === 5 ? "Hotel" : `${propState.houses} houses`})` : ""}`}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-950 truncate max-w-[120px] flex items-center gap-1 shadow-sm"
                          style={{ backgroundColor: badgeColor }}
                        >
                          <span className="truncate">{tile.name}</span>
                          {propState.houses > 0 && (
                            <span className="text-[8px] bg-black/40 text-white px-1 rounded-sm">
                              {propState.houses === 5 ? "H" : propState.houses}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions (Trade with player / Manage your own) */}
              {!p.bankrupt && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                  {isYou ? (
                    <button
                      onClick={onOpenManage}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Building className="w-3 h-3 text-amber-400" /> Manage Properties
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenTrade(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <ArrowRightLeft className="w-3 h-3 text-blue-400" /> Propose Trade
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
