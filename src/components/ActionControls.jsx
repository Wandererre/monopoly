import React, { useState } from "react";
import { Sparkles, ShoppingBag, X, Check, ArrowRight, ShieldAlert, Key, Building2, Skull } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function ActionControls({
  gameState,
  playerId,
  isMyTurn,
  onRollDice,
  onBuyProperty,
  onPassProperty,
  onPayJailFine,
  onUseJailCard,
  onEndTurn,
  onOpenManage,
  onDeclareBankruptcy
}) {
  const [showBankruptcyConfirm, setShowBankruptcyConfirm] = useState(false);
  const { phase, pendingAction, players = [] } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);

  if (!myPlayer || myPlayer.bankrupt) return null;

  return (
    <div className="luxury-card rounded-2xl p-4 border border-amber-500/20 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Your Action Controls
        </span>
        {isMyTurn && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Your Turn Now
          </span>
        )}
      </div>

      {/* Main Context-Aware Action Buttons */}
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* In Jail Actions */}
        {isMyTurn && myPlayer.inJail && phase === "ROLL" && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                sounds.playDiceRoll();
                onRollDice();
              }}
              className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Roll for Doubles
            </button>

            <button
              onClick={() => {
                sounds.playMoney();
                onPayJailFine();
              }}
              disabled={myPlayer.money < 500}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition border border-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Pay ₹500 Bail
            </button>

            {myPlayer.jailCards > 0 && (
              <button
                onClick={() => {
                  sounds.playCard();
                  onUseJailCard();
                }}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4" /> Use Bail Card ({myPlayer.jailCards})
              </button>
            )}
          </div>
        )}

        {/* Normal Roll Button */}
        {isMyTurn && !myPlayer.inJail && phase === "ROLL" && (
          <button
            onClick={() => {
              sounds.playDiceRoll();
              onRollDice();
            }}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer turn-pulse"
          >
            <Sparkles className="w-5 h-5" /> Roll Dice
          </button>
        )}

        {/* Buy or Pass Choice */}
        {isMyTurn && pendingAction && pendingAction.type === "BUY_CHOICE" && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                sounds.playBuy();
                onBuyProperty();
              }}
              disabled={myPlayer.money < pendingAction.price}
              className="py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              Buy {pendingAction.name} (₹{pendingAction.price.toLocaleString("en-IN")})
            </button>

            <button
              onClick={onPassProperty}
              className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" /> Pass Property
            </button>
          </div>
        )}

        {/* End Turn Button */}
        {isMyTurn && phase === "ACTION" && !pendingAction && (
          <button
            onClick={() => {
              sounds.playCard();
              onEndTurn();
            }}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            End Turn <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {/* Secondary Manage Properties Button */}
        <button
          onClick={onOpenManage}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
        >
          <Building2 className="w-4 h-4 text-amber-400" /> Manage Properties
        </button>

        {/* Bankruptcy Option */}
        {!showBankruptcyConfirm ? (
          <button
            onClick={() => setShowBankruptcyConfirm(true)}
            className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 text-xs font-semibold transition border border-slate-800 flex items-center gap-1"
          >
            <Skull className="w-3.5 h-3.5" /> Give Up
          </button>
        ) : (
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-rose-950/50 border border-rose-800 text-xs">
            <span className="text-rose-300 font-bold">Surrender?</span>
            <button
              onClick={() => {
                setShowBankruptcyConfirm(false);
                onDeclareBankruptcy();
              }}
              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold"
            >
              Yes
            </button>
            <button
              onClick={() => setShowBankruptcyConfirm(false)}
              className="px-2 py-1 bg-slate-800 text-slate-300 rounded"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
