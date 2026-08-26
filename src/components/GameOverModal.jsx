import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Crown, Sparkles, RefreshCw } from "lucide-react";
import { PLAYER_TOKENS } from "../../server/data/boardData.js";
import { sounds } from "../utils/audio.js";

export default function GameOverModal({ winner, players = [], onPlayAgain }) {
  if (!winner) return null;

  useEffect(() => {
    sounds.playFanfare();
    // Fire confetti bursts
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winner]);

  const tokenObj = PLAYER_TOKENS.find((t) => t.id === winner.token) || PLAYER_TOKENS[0];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-300">
      <div className="max-w-md w-full bg-slate-900 rounded-3xl border-2 border-amber-400 shadow-2xl shadow-amber-500/30 overflow-hidden text-center p-6 text-slate-100 relative">
        <div className="inline-flex p-4 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4 animate-bounce">
          <Trophy className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">
          Victory Champion!
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Indian Monopoly Tycoon of Bharat
        </p>

        <div className="my-6 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner mb-2 border border-white/10"
            style={{ backgroundColor: `${winner.color}30` }}
          >
            {tokenObj.emoji}
          </div>
          <div className="text-xl font-black text-white flex items-center gap-1.5">
            <Crown className="w-5 h-5 text-amber-400" /> {winner.name}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Total Final Net Worth: <span className="font-extrabold text-emerald-400">₹{(winner.netWorth || winner.money).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" /> Return to Lobby / Play Again
        </button>
      </div>
    </div>
  );
}
