import React from "react";
import { BOARD_TILES, COLOR_GROUPS } from "../../server/data/boardData.js";
import { ArrowRightLeft, Check, X, ShieldAlert } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function TradePromptModal({
  pendingTrade,
  playerId,
  onRespondTrade
}) {
  if (!pendingTrade || pendingTrade.toPlayerId !== playerId) return null;

  const {
    fromPlayerName,
    offerCash = 0,
    offerProperties = [],
    requestCash = 0,
    requestProperties = []
  } = pendingTrade;

  const offeredTiles = offerProperties.map((tid) => BOARD_TILES[tid]);
  const requestedTiles = requestProperties.map((tid) => BOARD_TILES[tid]);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
      <div className="max-w-xl w-full bg-slate-900 rounded-3xl border-2 border-amber-500/50 shadow-2xl shadow-amber-950/60 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-2">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            Incoming Trade Deal!
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            <span className="font-bold text-amber-400">{fromPlayerName}</span> has sent you a trade proposal:
          </p>
        </div>

        {/* Trade Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* You will receive */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30">
              <div className="text-xs font-bold uppercase text-emerald-400 mb-2">
                You Will Receive:
              </div>
              {offerCash > 0 && (
                <div className="text-base font-black text-white mb-2">
                  + ₹{offerCash.toLocaleString("en-IN")} Cash
                </div>
              )}
              {offeredTiles.length > 0 ? (
                <div className="space-y-1">
                  {offeredTiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tile.group ? COLOR_GROUPS[tile.group]?.color : "#64748B" }}
                      />
                      <span>{tile.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                offerCash === 0 && <span className="text-xs text-slate-500 italic">Nothing</span>
              )}
            </div>

            {/* You will give */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30">
              <div className="text-xs font-bold uppercase text-rose-400 mb-2">
                You Will Give:
              </div>
              {requestCash > 0 && (
                <div className="text-base font-black text-white mb-2">
                  - ₹{requestCash.toLocaleString("en-IN")} Cash
                </div>
              )}
              {requestedTiles.length > 0 ? (
                <div className="space-y-1">
                  {requestedTiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tile.group ? COLOR_GROUPS[tile.group]?.color : "#64748B" }}
                      />
                      <span>{tile.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                requestCash === 0 && <span className="text-xs text-slate-500 italic">Nothing</span>
              )}
            </div>
          </div>
        </div>

        {/* Accept / Decline Buttons */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              sounds.playJail();
              onRespondTrade(false);
            }}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <X className="w-4 h-4 text-rose-400" /> Decline Deal
          </button>

          <button
            onClick={() => {
              sounds.playMoney();
              onRespondTrade(true);
            }}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25"
          >
            <Check className="w-4 h-4" /> Accept Trade Deal
          </button>
        </div>
      </div>
    </div>
  );
}
