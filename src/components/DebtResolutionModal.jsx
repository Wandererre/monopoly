import React from "react";
import { BOARD_TILES, COLOR_GROUPS } from "../../server/data/boardData.js";
import { AlertTriangle, Building2, Skull, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function DebtResolutionModal({
  gameState,
  playerId,
  onMortgage,
  onSellHouse,
  onDeclareBankruptcy
}) {
  const { properties = {}, players = [] } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);

  if (!myPlayer || myPlayer.money >= 0 || myPlayer.bankrupt) return null;

  const deficit = Math.abs(myPlayer.money);

  // Find all owned properties
  const myOwnedTileIds = Object.keys(properties).filter(
    (tid) => properties[tid].owner === playerId
  );

  // Properties with houses to sell
  const housesToSell = myOwnedTileIds
    .map((tid) => ({ tile: BOARD_TILES[tid], state: properties[tid] }))
    .filter((item) => item.state.houses > 0);

  // Properties with no houses that can be mortgaged
  const canMortgage = myOwnedTileIds
    .map((tid) => ({ tile: BOARD_TILES[tid], state: properties[tid] }))
    .filter((item) => !item.state.mortgaged && item.state.houses === 0);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in zoom-in-95 duration-200">
      <div className="max-w-xl w-full max-h-[90vh] bg-[#FAF8F5] text-slate-900 rounded-2xl border-4 border-red-600 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
            <div>
              <h2 className="text-xl font-black tracking-tight">YOU ARE IN DEBT!</h2>
              <p className="text-xs text-red-100">Raise cash by mortgaging properties or selling buildings</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-black text-white font-mono font-black text-sm rounded-lg">
            Deficit: -M{deficit}
          </div>
        </div>

        {/* Action Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50">
          <p className="text-xs text-slate-700 font-semibold leading-relaxed">
            You cannot end your turn or roll while in debt. Raise enough cash to bring your balance back to M0 or declare bankruptcy.
          </p>

          {/* Sell Houses Section */}
          {housesToSell.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                <ArrowDownCircle className="w-4 h-4 text-amber-600" /> Sell Houses / Hotels (50% Refund)
              </h4>
              <div className="space-y-1.5">
                {housesToSell.map(({ tile, state }) => {
                  const refund = Math.floor(tile.houseCost / 2);
                  return (
                    <div
                      key={tile.id}
                      className="p-2.5 rounded-xl bg-white border-2 border-black flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-black">{tile.name}</span>
                        <span className="text-slate-500 ml-1">
                          ({state.houses === 5 ? "Hotel" : `${state.houses} houses`})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          sounds.playCashGain();
                          onSellHouse(tile.id);
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-lg border border-black"
                      >
                        Sell (+M{refund})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mortgage Properties Section */}
          {canMortgage.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                <Building2 className="w-4 h-4 text-emerald-600" /> Mortgage Properties for Cash
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {canMortgage.map(({ tile }) => (
                  <div
                    key={tile.id}
                    className="p-2.5 rounded-xl bg-white border-2 border-black flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-black">{tile.name}</span>
                    <button
                      onClick={() => {
                        sounds.playCashGain();
                        onMortgage(tile.id);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg border border-black shadow-sm"
                    >
                      Mortgage (+M{tile.mortgage})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {housesToSell.length === 0 && canMortgage.length === 0 && (
            <div className="p-4 bg-red-100 border-2 border-red-400 rounded-xl text-center text-xs text-red-800 font-bold">
              You have no further properties to mortgage or buildings to sell. You must declare bankruptcy.
            </div>
          )}
        </div>

        {/* Bankruptcy Declaration Button */}
        <div className="p-3 bg-slate-200 border-t-2 border-black flex items-center justify-between gap-3">
          <span className="text-xs text-slate-600">No way out?</span>
          <button
            onClick={() => {
              sounds.playJail();
              onDeclareBankruptcy();
            }}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl border-2 border-black shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Skull className="w-4 h-4" /> Declare Bankruptcy & Surrender
          </button>
        </div>
      </div>
    </div>
  );
}
