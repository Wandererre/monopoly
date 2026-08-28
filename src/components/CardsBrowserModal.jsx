import React, { useState } from "react";
import { CHANCE_CARDS, COMMUNITY_CARDS } from "../../server/data/boardData.js";
import { X, Sparkles, Package, HelpCircle } from "lucide-react";
import { sounds } from "../utils/audio.js";

export default function CardsBrowserModal({ isOpen, initialTab = "chance", onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const cards = activeTab === "chance" ? CHANCE_CARDS : COMMUNITY_CARDS;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="max-w-4xl w-full max-h-[90vh] bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${activeTab === "chance" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
              {activeTab === "chance" ? <HelpCircle className="w-6 h-6" /> : <Package className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                {activeTab === "chance" ? "Chance Cards Deck" : "Community Chest Deck"}
              </h3>
              <p className="text-xs text-slate-400">View all {cards.length} authentic game cards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playCardDraw();
              setActiveTab("chance");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border ${
              activeTab === "chance"
                ? "bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <span className="text-base font-black">?</span>
            <span>Chance Cards ({CHANCE_CARDS.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playCardDraw();
              setActiveTab("community");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border ${
              activeTab === "community"
                ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <span>📦</span>
            <span>Community Chest ({COMMUNITY_CARDS.length})</span>
          </button>
        </div>

        {/* Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-900/60">
          {cards.map((card, idx) => {
            const isChance = activeTab === "chance";
            return (
              <div
                key={card.id || idx}
                className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl relative min-h-[185px] ${
                  isChance
                    ? "bg-white text-slate-900 border-orange-500/70 hover:border-orange-500"
                    : "bg-white text-slate-900 border-blue-500/70 hover:border-blue-500"
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase ${
                      isChance ? "bg-orange-600 text-white" : "bg-blue-600 text-white"
                    }`}
                  >
                    {isChance ? "CHANCE" : "COMMUNITY CHEST"}
                  </span>
                  <span className="text-xl">{isChance ? "❓" : "📦"}</span>
                </div>

                {/* Card Content */}
                <div className="my-2 flex-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-950 leading-snug mb-1.5">
                    {card.title}
                  </h4>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Card Action / Value Badge */}
                <div className="pt-2.5 mt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-slate-500 capitalize">{card.action.replace(/_/g, " ")}</span>
                  {card.amount && (
                    <span className={card.action === "pay_money" || card.action === "pay_to_all" ? "text-red-600 font-black" : "text-emerald-600 font-black"}>
                      {card.action === "pay_money" || card.action === "pay_to_all" ? `-M${card.amount}` : `+M${card.amount}`}
                    </span>
                  )}
                  {card.action === "get_out_of_jail_card" && (
                    <span className="text-indigo-600 font-black">Free Pass</span>
                  )}
                  {card.action === "advance_tile" && (
                    <span className="text-blue-600 font-black">Advance</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Click outside or close to return to the board</span>
          <span className="font-mono font-bold text-slate-300">{cards.length} Total Cards</span>
        </div>
      </div>
    </div>
  );
}
