import React, { useEffect } from "react";
import { sounds } from "../utils/audio.js";

export default function CardPopup({ cardData, onClose }) {
  if (!cardData || !cardData.card) return null;

  const { deckName, card } = cardData;
  const isChance = (deckName || "").toLowerCase().includes("chance");

  useEffect(() => {
    sounds.playCardDraw();
  }, [cardData]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in zoom-in-95 duration-200">
      {/* Authentic Physical Monopoly Card Container */}
      <div className="max-w-md w-full bg-[#FAF8F5] text-black rounded-xl border-4 border-black p-2 sm:p-3 shadow-2xl relative font-sans">
        {/* Outer and Inner Double Black Border */}
        <div className="border-2 border-black p-4 sm:p-5 flex flex-col justify-between min-h-[220px] sm:min-h-[260px] bg-white rounded">
          {/* Top Card Header */}
          <div className="text-center pb-2 border-b border-black/30">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-black">
              {isChance ? "CHANCE" : "COMMUNITY CHEST"}
            </h3>
          </div>

          {/* Card Body: Classic Pennybags Illustration + Action Instructions */}
          <div className="flex items-center gap-4 py-3 sm:py-4">
            {/* Left: Classic Pennybags / Character Art */}
            <div className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full border-2 border-black flex items-center justify-center shadow-inner overflow-hidden relative">
                {/* SVG Pennybags Mascot Illustration */}
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Top Hat */}
                  <rect x="25" y="10" width="50" height="35" rx="2" fill="#222" />
                  <ellipse cx="50" cy="45" rx="35" ry="6" fill="#111" />
                  <rect x="25" y="38" width="50" height="5" fill="#ED1B24" />
                  {/* Face */}
                  <circle cx="50" cy="62" r="22" fill="#FDE0D2" />
                  {/* Eyes */}
                  <circle cx="43" cy="58" r="2.5" fill="#111" />
                  <circle cx="57" cy="58" r="2.5" fill="#111" />
                  {/* White Mustache */}
                  <path d="M 32 68 Q 50 62 50 68 Q 50 62 68 68 Q 50 78 32 68 Z" fill="#FFF" stroke="#222" strokeWidth="1" />
                  {/* Bowtie */}
                  <polygon points="40,82 50,86 40,90" fill="#ED1B24" />
                  <polygon points="60,82 50,86 60,90" fill="#ED1B24" />
                  <circle cx="50" cy="86" r="3" fill="#FFF" />
                </svg>
              </div>
            </div>

            {/* Right: Card Title & Text */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-black text-black uppercase leading-tight mb-1">
                {card.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
                {card.description}
              </p>
            </div>
          </div>

          {/* Bottom Card Footer: Copyright & Action Button */}
          <div className="pt-2 border-t border-black/20 flex items-center justify-between gap-2">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono">
              © 1936, 2024 HASBRO. INDIA
            </span>

            <button
              onClick={() => {
                sounds.playCashPaid();
                onClose();
              }}
              className="px-5 py-1.5 bg-black hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-lg border border-black shadow transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
