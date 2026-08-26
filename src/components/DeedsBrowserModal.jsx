import React, { useState } from "react";
import { BOARD_TILES, COLOR_GROUPS, PLAYER_TOKENS } from "../../server/data/boardData.js";
import { X, Building2, ArrowRightLeft } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function DeedsBrowserModal({
  gameState,
  playerId,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
  onProposeTrade,
  onClose
}) {
  const { properties = {}, players = [] } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerId);

  const viewedPlayer = players.find((p) => p.id === selectedPlayerId) || myPlayer;
  const isViewingSelf = viewedPlayer?.id === playerId;

  const ownedTileIds = Object.keys(properties).filter(
    (tid) => properties[tid].owner === viewedPlayer?.id
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="max-w-5xl w-full max-h-[92vh] bg-[#FAF8F5] text-slate-900 rounded-3xl border-4 border-black shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#ED1B24] border-b-2 border-black text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black tracking-tight font-['Cinzel']">PROPERTY TITLE DEEDS</h2>
              <p className="text-xs text-white/90">View complete official rent tables, build houses & hotels, or inspect opponent deeds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Switcher Tabs */}
        <div className="flex gap-2 p-3 bg-slate-200 border-b border-black/20 overflow-x-auto">
          {players.map((p) => {
            const isSelected = p.id === viewedPlayer?.id;
            const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className={`px-3.5 py-2 rounded-xl border-2 text-xs font-black flex items-center gap-2 transition whitespace-nowrap ${
                  isSelected
                    ? "bg-black text-white border-black shadow-md"
                    : "bg-white text-slate-800 border-slate-400 hover:bg-slate-100"
                }`}
              >
                <span>{tok.emoji}</span>
                <span>{p.name} {p.id === playerId ? "(You)" : ""}</span>
                <span className="text-xs text-emerald-600 font-bold ml-1">ℳ{p.money}</span>
              </button>
            );
          })}
        </div>

        {/* Deeds Grid */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#F5F2EB]">
          {ownedTileIds.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-semibold text-sm">
              {isViewingSelf ? "You do not own any property deeds yet. Roll the dice to purchase properties!" : `${viewedPlayer?.name} does not own any property deeds yet.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedTileIds.map((tid) => {
                const tile = BOARD_TILES[tid];
                const propState = properties[tid];
                const group = tile.group ? COLOR_GROUPS[tile.group] : null;
                const isProperty = tile.type === "property";

                const ownsAllInGroup =
                  group &&
                  group.tileIds.every(
                    (id) => properties[id]?.owner === playerId && !properties[id]?.mortgaged
                  );

                const unmortgageCost = Math.floor(tile.mortgage * 1.1);

                return (
                  <div
                    key={tid}
                    className="bg-[#FAF8F5] rounded-2xl border-2 border-black shadow-lg overflow-hidden flex flex-col justify-between"
                  >
                    {/* Title Deed Colored Banner */}
                    <div
                      className="p-2.5 text-center text-black border-b-2 border-black font-black uppercase tracking-tight"
                      style={{
                        backgroundColor: group ? group.color : tile.type === "railway" ? "#231F20" : "#FFF9D2",
                        color: tile.type === "railway" ? "#FFF" : "#000"
                      }}
                    >
                      <div className="text-[8px] tracking-widest opacity-80">TITLE DEED</div>
                      <div className="text-base font-black leading-tight">{tile.name}</div>
                    </div>

                    {/* Complete Official Rent Matrix (All 1, 2, 3, 4 houses + Hotel) */}
                    <div className="p-3.5 text-xs space-y-1.5 flex-1 bg-white">
                      {isProperty && (
                        <div className="space-y-1 text-slate-800">
                          <div className="flex justify-between py-0.5 border-b border-slate-200 font-black text-black">
                            <span>RENT — Site only</span>
                            <span>ℳ{tile.rent[0]}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span>With 1 House</span>
                            <span className="font-bold">ℳ{tile.rent[1]}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span>With 2 Houses</span>
                            <span className="font-bold">ℳ{tile.rent[2]}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span>With 3 Houses</span>
                            <span className="font-bold">ℳ{tile.rent[3]}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span>With 4 Houses</span>
                            <span className="font-bold">ℳ{tile.rent[4]}</span>
                          </div>
                          <div className="flex justify-between py-1 border-t border-slate-200 text-red-600 font-black">
                            <span>With HOTEL</span>
                            <span>ℳ{tile.rent[5]}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 text-[10.5px] text-slate-600 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Mortgage Value:</span>
                              <strong className="text-black">ℳ{tile.mortgage}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Houses Cost:</span>
                              <strong className="text-black">ℳ{tile.houseCost} each</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {tile.type === "railway" && (
                        <div className="space-y-1 text-slate-800">
                          <div className="flex justify-between"><span>Rent:</span><span className="font-bold">ℳ25</span></div>
                          <div className="flex justify-between"><span>If 2 Stations:</span><span className="font-bold">ℳ50</span></div>
                          <div className="flex justify-between"><span>If 3 Stations:</span><span className="font-bold">ℳ100</span></div>
                          <div className="flex justify-between"><span>If 4 Stations:</span><span className="font-bold">ℳ200</span></div>
                          <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                            Mortgage: <strong className="text-black">ℳ{tile.mortgage}</strong>
                          </div>
                        </div>
                      )}

                      {tile.type === "utility" && (
                        <div className="space-y-1.5 text-slate-800 text-xs">
                          <div>If 1 Utility: <strong>4x Dice Roll</strong></div>
                          <div>If 2 Utilities: <strong>10x Dice Roll</strong></div>
                          <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                            Mortgage: <strong className="text-black">ℳ{tile.mortgage}</strong>
                          </div>
                        </div>
                      )}

                      {/* Current Status Badges */}
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        {propState.mortgaged && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-400 rounded text-[10px] font-black">
                            MORTGAGED
                          </span>
                        )}
                        {propState.houses > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-400 rounded text-[10px] font-black">
                            {propState.houses === 5 ? "HOTEL" : `${propState.houses} Houses Built`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions if viewing your own deeds */}
                    {isViewingSelf && (
                      <div className="p-2.5 bg-slate-100 border-t-2 border-black flex items-center justify-between gap-1 flex-wrap">
                        {isProperty && ownsAllInGroup && !propState.mortgaged && propState.houses < 5 && (
                          <button
                            onClick={() => {
                              sounds.playBuy();
                              onBuildHouse(tile.id);
                            }}
                            disabled={myPlayer.money < tile.houseCost}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            +Build House (ℳ{tile.houseCost})
                          </button>
                        )}

                        {isProperty && propState.houses > 0 && (
                          <button
                            onClick={() => {
                              sounds.playMoney();
                              onSellHouse(tile.id);
                            }}
                            className="px-2.5 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg text-xs font-bold transition"
                          >
                            -Sell House (+ℳ{Math.floor(tile.houseCost / 2)})
                          </button>
                        )}

                        {propState.mortgaged ? (
                          <button
                            onClick={() => {
                              sounds.playMoney();
                              onUnmortgage(tile.id);
                            }}
                            disabled={myPlayer.money < unmortgageCost}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            Unmortgage (ℳ{unmortgageCost})
                          </button>
                        ) : (
                          propState.houses === 0 && (
                            <button
                              onClick={() => {
                                sounds.playMoney();
                                onMortgage(tile.id);
                              }}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold border border-slate-400 transition"
                            >
                              Mortgage (+ℳ{tile.mortgage})
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-200 border-t-2 border-black flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Standard Hasbro Monopoly rent rules & multipliers apply.
          </div>
          {!isViewingSelf && (
            <button
              onClick={() => {
                onClose();
                onProposeTrade(viewedPlayer);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Trade with {viewedPlayer.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
