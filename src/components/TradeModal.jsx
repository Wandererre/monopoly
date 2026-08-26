import React, { useState } from "react";
import { BOARD_TILES, COLOR_GROUPS, PLAYER_TOKENS } from "../../server/data/boardData.js";
import { X, ArrowRightLeft, DollarSign, Check, Shield } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function TradeModal({
  gameState,
  playerId,
  targetPlayer,
  onSendTrade,
  onClose
}) {
  const { players = [], properties = {} } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);
  const [selectedTargetId, setSelectedTargetId] = useState(() => targetPlayer?.id || "");
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [offerProps, setOfferProps] = useState([]);
  const [requestProps, setRequestProps] = useState([]);

  if (!myPlayer) return null;

  const otherPlayers = players.filter((p) => p.id !== playerId && !p.bankrupt);
  const currentTarget = players.find((p) => p.id === selectedTargetId) || otherPlayers[0];

  const myProperties = Object.keys(properties)
    .filter((tid) => properties[tid].owner === playerId && properties[tid].houses === 0)
    .map((tid) => BOARD_TILES[tid]);

  const targetProperties = currentTarget
    ? Object.keys(properties)
        .filter((tid) => properties[tid].owner === currentTarget.id && properties[tid].houses === 0)
        .map((tid) => BOARD_TILES[tid])
    : [];

  const toggleOfferProp = (tid) => {
    setOfferProps((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  const toggleRequestProp = (tid) => {
    setRequestProps((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentTarget) return;

    sounds.playBuy();
    onSendTrade({
      toPlayerId: currentTarget.id,
      offerCash: Number(offerCash),
      offerProperties: offerProps,
      requestCash: Number(requestCash),
      requestProperties: requestProps
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="max-w-3xl w-full max-h-[90vh] bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Trade Negotiation</h2>
              <p className="text-xs text-slate-400">Trade properties and cash with other business tycoons</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Player Selector */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase">Trading With:</span>
          <div className="flex gap-2 flex-wrap">
            {otherPlayers.map((p) => {
              const isSelected = p.id === currentTarget?.id;
              const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedTargetId(p.id);
                    setRequestProps([]);
                    setRequestCash(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <span>{tok.emoji}</span>
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trade Columns: You Give vs You Get */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left Column: Your Offer */}
          <div className="space-y-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">You Offer (Give)</span>
              <span className="text-xs text-slate-400">Balance: ₹{myPlayer.money.toLocaleString("en-IN")}</span>
            </div>

            {/* Cash Slider / Input */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cash Offer (M)</label>
              <input
                type="number"
                min="0"
                max={Math.max(0, myPlayer.money)}
                step="50"
                placeholder="0"
                value={offerCash === 0 ? "" : offerCash}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setOfferCash(val === "" ? 0 : Math.max(0, Math.min(Math.max(0, myPlayer.money), Number(val) || 0)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Properties to Offer */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Properties to Give</label>
              {myProperties.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No unimproved properties available to trade</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {myProperties.map((tile) => {
                    const isSelected = offerProps.includes(tile.id);
                    return (
                      <div
                        key={tile.id}
                        onClick={() => toggleOfferProp(tile.id)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tile.group ? COLOR_GROUPS[tile.group]?.color : "#64748B" }}
                          />
                          <span>{tile.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Requested from Target */}
          <div className="space-y-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">You Request (Receive)</span>
              <span className="text-xs text-slate-400">
                {currentTarget?.name}'s Balance: M{currentTarget?.money.toLocaleString("en-IN") || 0}
              </span>
            </div>

            {/* Cash Request */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Cash Requested (M)</label>
              <input
                type="number"
                min="0"
                max={currentTarget?.money || 0}
                step="50"
                placeholder="0"
                value={requestCash === 0 ? "" : requestCash}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setRequestCash(val === "" ? 0 : Math.max(0, Math.min(currentTarget?.money || 0, Number(val) || 0)));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Properties to Request */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">Select Properties to Receive</label>
              {targetProperties.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No unimproved properties available to request</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {targetProperties.map((tile) => {
                    const isSelected = requestProps.includes(tile.id);
                    return (
                      <div
                        key={tile.id}
                        onClick={() => toggleRequestProp(tile.id)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 text-amber-200"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tile.group ? COLOR_GROUPS[tile.group]?.color : "#64748B" }}
                          />
                          <span>{tile.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trade Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!currentTarget || (offerCash === 0 && offerProps.length === 0 && requestCash === 0 && requestProps.length === 0)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
          >
            Send Trade Proposal
          </button>
        </div>
      </div>
    </div>
  );
}
