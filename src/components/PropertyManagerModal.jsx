import React from "react";
import { BOARD_TILES, COLOR_GROUPS } from "../../server/data/boardData.js";
import { X, Building2, Home, Shield, DollarSign, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function PropertyManagerModal({
  gameState,
  playerId,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
  onClose
}) {
  const { properties = {}, players = [] } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);
  if (!myPlayer) return null;

  // Find all properties owned by me
  const myOwnedTileIds = Object.keys(properties).filter(
    (tid) => properties[tid].owner === playerId
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full max-h-[85vh] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Property Management</h2>
              <p className="text-xs text-slate-400">
                Your Cash: <span className="text-amber-400 font-bold">₹{myPlayer.money.toLocaleString("en-IN")}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Owned Properties List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {myOwnedTileIds.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              You do not own any properties yet. Roll the dice and acquire Indian cities!
            </div>
          ) : (
            myOwnedTileIds.map((tid) => {
              const tile = BOARD_TILES[tid];
              const propState = properties[tid];
              const isProperty = tile.type === "property";
              const group = tile.group ? COLOR_GROUPS[tile.group] : null;

              // Check if player has complete monopoly in this group
              const ownsAllInGroup =
                group &&
                group.tileIds.every(
                  (id) => properties[id]?.owner === playerId && !properties[id]?.mortgaged
                );

              const unmortgageCost = Math.floor(tile.mortgage * 1.1);

              return (
                <div
                  key={tid}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-12 rounded-full shrink-0"
                      style={{
                        backgroundColor: group ? group.color : tile.type === "railway" ? "#64748B" : "#EAB308"
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{tile.name}</span>
                        {propState.mortgaged && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                            MORTGAGED
                          </span>
                        )}
                        {propState.houses === 5 ? (
                          <span className="text-[10px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded">
                            HOTEL
                          </span>
                        ) : propState.houses > 0 ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                            {propState.houses} Houses
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {group ? group.name : tile.subtitle} • House Cost: ₹{tile.houseCost || 0}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this property */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Build House */}
                    {isProperty && ownsAllInGroup && !propState.mortgaged && propState.houses < 5 && (
                      <button
                        onClick={() => {
                          sounds.playBuy();
                          onBuildHouse(tile.id);
                        }}
                        disabled={myPlayer.money < tile.houseCost}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        +Build (₹{tile.houseCost})
                      </button>
                    )}

                    {/* Sell House */}
                    {isProperty && propState.houses > 0 && (
                      <button
                        onClick={() => {
                          sounds.playMoney();
                          onSellHouse(tile.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
                        -Sell (+₹{Math.floor(tile.houseCost / 2)})
                      </button>
                    )}

                    {/* Mortgage or Unmortgage */}
                    {propState.mortgaged ? (
                      <button
                        onClick={() => {
                          sounds.playMoney();
                          onUnmortgage(tile.id);
                        }}
                        disabled={myPlayer.money < unmortgageCost}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                      >
                        Unmortgage (₹{unmortgageCost})
                      </button>
                    ) : (
                      propState.houses === 0 && (
                        <button
                          onClick={() => {
                            sounds.playMoney();
                            onMortgage(tile.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
                        >
                          Mortgage (+₹{tile.mortgage})
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
