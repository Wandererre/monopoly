import React from "react";
import { COLOR_GROUPS } from "../../server/data/boardData.js";
import { X, ShieldCheck } from "lucide-react";

export default function TileModal({ tile, propertyState, ownerPlayer, onClose }) {
  if (!tile) return null;

  const isProperty = tile.type === "property";
  const isRailway = tile.type === "railway";
  const isUtility = tile.type === "utility";
  const color = tile.group ? COLOR_GROUPS[tile.group]?.color : "#231F20";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      {/* Physical Monopoly Title Deed Card Cardboard Styling */}
      <div className="max-w-sm w-full bg-[#FAF8F5] text-black rounded-2xl border-4 border-black shadow-2xl overflow-hidden relative font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title Deed Header Block */}
        {isProperty && (
          <div
            className="p-4 text-center border-b-2 border-black"
            style={{ backgroundColor: color }}
          >
            <div className="text-[9px] font-black uppercase tracking-widest text-black/80">
              TITLE DEED
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black mt-0.5">
              {tile.name}
            </h2>
          </div>
        )}

        {isRailway && (
          <div className="p-4 bg-[#231F20] text-white text-center border-b-2 border-black">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">
              INDIAN RAILWAYS
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
              {tile.name}
            </h2>
          </div>
        )}

        {isUtility && (
          <div className="p-4 bg-[#FFF9D2] text-black text-center border-b-2 border-black">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-700">
              PUBLIC UTILITY
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black mt-0.5">
              {tile.name}
            </h2>
          </div>
        )}

        {!isProperty && !isRailway && !isUtility && (
          <div className="p-4 bg-[#CBE7D0] text-black text-center border-b-2 border-black">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-700">
              SPECIAL TILE
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black mt-0.5">
              {tile.name}
            </h2>
          </div>
        )}

        {/* Complete Hasbro Deed Details Table */}
        <div className="p-4 space-y-3 text-xs">
          {/* Owner Status */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-200/80 border border-slate-300 text-xs">
            <span className="font-bold text-slate-700">Ownership:</span>
            {ownerPlayer ? (
              <span className="font-black flex items-center gap-1" style={{ color: ownerPlayer.color }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Owned by {ownerPlayer.name}
              </span>
            ) : (
              <span className="text-emerald-700 font-black">Available for ℳ{tile.price || tile.amount}</span>
            )}
          </div>

          {/* Full Property Rent Table (All 1-4 Houses + Hotel) */}
          {isProperty && (
            <div className="space-y-1.5 font-semibold text-slate-800">
              <div className="flex justify-between py-0.5 border-b border-slate-300 text-sm font-black text-black">
                <span>RENT — Site only</span>
                <span>ℳ{tile.rent[0]}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>With 1 House</span>
                <span>ℳ{tile.rent[1]}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>With 2 Houses</span>
                <span>ℳ{tile.rent[2]}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>With 3 Houses</span>
                <span>ℳ{tile.rent[3]}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>With 4 Houses</span>
                <span>ℳ{tile.rent[4]}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-300 text-red-600 font-black text-sm">
                <span>With HOTEL</span>
                <span>ℳ{tile.rent[5]}</span>
              </div>

              {/* Financial & Building Costs */}
              <div className="pt-2 border-t border-slate-300 text-[11px] text-slate-600 space-y-1 text-center">
                <div>Mortgage Value: <strong className="text-black font-bold">ℳ{tile.mortgage}</strong></div>
                <div>Houses cost <strong className="text-black font-bold">ℳ{tile.houseCost}</strong> each</div>
                <div>Hotels, <strong className="text-black font-bold">ℳ{tile.houseCost}</strong> plus 4 houses</div>
                <div className="pt-1 text-[10px] text-slate-500 leading-tight italic">
                  If a player owns ALL the Sites of any Colour-Group, the rent is Doubled on Unimproved Sites in that group.
                </div>
              </div>
            </div>
          )}

          {/* Railway Station Breakdown */}
          {isRailway && (
            <div className="space-y-1.5 font-semibold text-slate-800">
              <div className="flex justify-between py-0.5 border-b border-slate-300">
                <span>Rent</span>
                <span className="font-bold">ℳ25</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>If 2 Stations are owned</span>
                <span className="font-bold">ℳ50</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>If 3 Stations are owned</span>
                <span className="font-bold">ℳ100</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>If 4 Stations are owned</span>
                <span className="font-bold">ℳ200</span>
              </div>
              <div className="pt-2 border-t border-slate-300 text-[11px] text-center text-slate-600">
                Mortgage Value: <strong className="text-black font-bold">ℳ{tile.mortgage}</strong>
              </div>
            </div>
          )}

          {/* Utility Breakdown */}
          {isUtility && (
            <div className="space-y-2 text-slate-800 text-xs">
              <div className="p-2 bg-slate-100 rounded border border-slate-300 leading-relaxed">
                If 1 Utility is owned, rent is <strong>4 times</strong> the amount shown on dice.
              </div>
              <div className="p-2 bg-slate-100 rounded border border-slate-300 leading-relaxed">
                If both Utilities are owned, rent is <strong>10 times</strong> the amount shown on dice.
              </div>
              <div className="pt-2 border-t border-slate-300 text-[11px] text-center text-slate-600">
                Mortgage Value: <strong className="text-black font-bold">ℳ{tile.mortgage}</strong>
              </div>
            </div>
          )}

          {/* Special Tiles */}
          {!isProperty && !isRailway && !isUtility && (
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 text-center text-slate-700">
              <p className="font-medium">{tile.description || tile.subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
