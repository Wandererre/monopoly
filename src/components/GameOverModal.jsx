import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Trophy, Crown, Sparkles, RefreshCw, Play, Pause, FastForward, LayoutGrid, Scroll } from "lucide-react";
import { PLAYER_TOKENS, BOARD_TILES } from "../../server/data/boardData.js";
import { sounds } from "../utils/audio.js";

export default function GameOverModal({ winner, players = [], gameState = {}, onPlayAgain }) {
  const [stage, setStage] = useState("intro"); // "intro" -> "logo" -> "crawl"
  const [isPaused, setIsPaused] = useState(false);
  const [crawlSpeed, setCrawlSpeed] = useState(1); // 1, 2, 4
  const [viewMode, setViewMode] = useState("crawl"); // "crawl" | "card"
  const crawlContainerRef = useRef(null);

  // Calculate detailed match stats
  const properties = gameState.properties || {};
  const logs = gameState.logs || [];
  
  // Sort players by net worth descending
  const sortedPlayers = [...players].sort((a, b) => {
    const nwA = a.netWorth !== undefined ? a.netWorth : a.money;
    const nwB = b.netWorth !== undefined ? b.netWorth : b.money;
    return nwB - nwA;
  });

  const totalDiceRolls = logs.filter(l => l.type === "dice").length;
  const totalRentEvents = logs.filter(l => l.type === "rent").length;
  const totalJailEvents = logs.filter(l => l.type === "jail").length;

  const winnerToken = winner ? PLAYER_TOKENS.find(t => t.id === winner.token) || PLAYER_TOKENS[0] : null;

  // Property counts per player
  const playerPropertyCounts = {};
  const playerHouseCounts = {};
  Object.keys(properties).forEach(tid => {
    const p = properties[tid];
    if (p.owner) {
      playerPropertyCounts[p.owner] = (playerPropertyCounts[p.owner] || 0) + 1;
      if (p.houses) {
        playerHouseCounts[p.owner] = (playerHouseCounts[p.owner] || 0) + p.houses;
      }
    }
  });

  useEffect(() => {
    sounds.playFanfare();

    // Trigger celebratory confetti
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Stage progression: Intro text -> Logo -> Crawl
    const introTimer = setTimeout(() => {
      setStage("logo");
    }, 2800);

    const crawlTimer = setTimeout(() => {
      setStage("crawl");
    }, 5600);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(crawlTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      {/* Background Starfield */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ffd700_1.5px,transparent_1.5px)] [background-size:48px_48px] animate-pulse" />
      </div>

      {/* STAGE 1: Iconic Intro Blue Text */}
      {stage === "intro" && (
        <div className="relative z-20 text-center px-6 animate-in fade-in zoom-in-95 duration-1000">
          <p className="text-xl sm:text-3xl font-bold text-[#4bd5ee] font-sans tracking-wide leading-relaxed drop-shadow-[0_0_15px_rgba(75,213,238,0.6)]">
            A short time ago in a boardroom<br />far, far away....
          </p>
        </div>
      )}

      {/* STAGE 2: Epic Logo Zoom Out */}
      {stage === "logo" && (
        <div className="relative z-20 flex flex-col items-center justify-center animate-starwars-logo">
          <div className="text-4xl sm:text-7xl md:text-8xl font-black text-[#FFE81F] tracking-widest uppercase text-center border-4 sm:border-8 border-[#FFE81F] px-6 sm:px-12 py-3 sm:py-6 shadow-[0_0_50px_rgba(255,232,31,0.5)]">
            MONOPOLY
          </div>
          <div className="text-xl sm:text-3xl font-black tracking-[0.4em] text-white mt-3 uppercase text-center">
            BHARAT EDITION
          </div>
        </div>
      )}

      {/* STAGE 3: 3D Star Wars Crawl */}
      {stage === "crawl" && viewMode === "crawl" && (
        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center overflow-hidden">
          {/* Top subtle fade gradient so crawl fades into deep space */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black via-black/80 to-transparent z-30 pointer-events-none" />

          {/* Perspective Container */}
          <div
            className="w-full max-w-2xl h-[85vh] flex justify-center"
            style={{
              perspective: "360px",
              perspectiveOrigin: "50% 100%"
            }}
          >
            <div
              ref={crawlContainerRef}
              className="text-[#FFE81F] text-center font-bold tracking-wider space-y-8 px-4"
              style={{
                transform: "rotateX(24deg) translateZ(0)",
                transformOrigin: "50% 100%",
                animation: `starwars-crawl ${48 / crawlSpeed}s linear infinite`,
                animationPlayState: isPaused ? "paused" : "running"
              }}
            >
              {/* Crawl Header */}
              <div className="space-y-2">
                <div className="text-lg sm:text-2xl font-black uppercase tracking-[0.25em] text-[#FFE81F]">
                  EPISODE {players.length}
                </div>
                <div className="text-2xl sm:text-4xl font-black uppercase tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                  {winner ? "THE SUPREME TYCOON" : "A GALAXY AT PEACE"}
                </div>
              </div>

              {/* Narrative Text */}
              <p className="text-base sm:text-xl leading-relaxed text-justify sm:text-center text-amber-200">
                {winner ? (
                  <>
                    The fierce battle for the economic destiny of Bharat has drawn to a glorious close.
                    Through ruthless property acquisitions, cunning trade negotiations, and sheer financial fortitude,
                    one visionary titan has conquered the board.
                  </>
                ) : (
                  <>
                    The boardroom has reached an honorable ceasefire. The great tycoons have agreed to conclude their contest of fortunes.
                  </>
                )}
              </p>

              {/* Winner Showcase */}
              {winner && winnerToken && (
                <div className="p-6 rounded-3xl bg-black/60 border-2 border-[#FFE81F] shadow-[0_0_30px_rgba(255,232,31,0.3)] my-6">
                  <div className="text-5xl sm:text-6xl mb-2">{winnerToken.emoji}</div>
                  <div className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-white">
                    👑 {winner.name}
                  </div>
                  <div className="text-lg sm:text-2xl font-extrabold text-[#4bd5ee] mt-2">
                    Net Worth: M{(winner.netWorth || winner.money).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 mt-1 uppercase tracking-widest">
                    Liquid Cash: M{winner.money.toLocaleString("en-IN")} • Deeds: {playerPropertyCounts[winner.id] || 0}
                  </div>
                </div>
              )}

              {/* Standings Section */}
              <div className="space-y-4 pt-4 border-t border-[#FFE81F]/40">
                <div className="text-xl sm:text-2xl font-black uppercase tracking-widest text-[#FFE81F]">
                  ⚔️ FINAL WEALTH LEADERBOARD
                </div>

                <div className="space-y-3">
                  {sortedPlayers.map((p, idx) => {
                    const tok = PLAYER_TOKENS.find(t => t.id === p.token) || PLAYER_TOKENS[0];
                    const rankEmoji = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-black/50 border border-amber-500/30 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black">{rankEmoji}</span>
                          <span className="text-xl">{tok.emoji}</span>
                          <div>
                            <div className="text-sm sm:text-base font-black text-white" style={{ color: p.color }}>
                              {p.name} {p.bankrupt ? "(Bankrupt)" : ""}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-400">
                              {playerPropertyCounts[p.id] || 0} properties • {playerHouseCounts[p.id] || 0} houses
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-mono font-black text-[#FFE81F]">
                            M{(p.netWorth || p.money).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-slate-400">Cash: M{p.money}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match Stats */}
              <div className="space-y-3 pt-6 border-t border-[#FFE81F]/40">
                <div className="text-lg sm:text-xl font-black uppercase tracking-widest text-[#FFE81F]">
                  📊 REALM COMBAT METRICS
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
                  <div className="p-3 bg-black/60 rounded-xl border border-amber-500/30">
                    <div className="text-xl sm:text-2xl font-black text-white">{totalDiceRolls}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Dice Rolls</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl border border-amber-500/30">
                    <div className="text-xl sm:text-2xl font-black text-white">{totalRentEvents}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Rent Payments</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl border border-amber-500/30">
                    <div className="text-xl sm:text-2xl font-black text-white">{totalJailEvents}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Jail Sentences</div>
                  </div>
                </div>
              </div>

              {/* Epilogue */}
              <p className="text-sm sm:text-base leading-relaxed text-slate-300 italic pt-6 pb-24">
                "And so, with the contracts signed, the deeds secured, and all debts settled in gold,
                peace and unprecedented prosperity reign supreme across the Indian subcontinent...."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3 ALTERNATIVE: Clean Card View */}
      {stage === "crawl" && viewMode === "card" && (
        <div className="relative z-20 w-full max-w-lg mx-auto p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-[#121614] border-2 border-amber-400 rounded-3xl p-6 text-slate-100 shadow-2xl shadow-amber-500/20 max-h-[78vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">{winnerToken ? winnerToken.emoji : "🏆"}</div>
              <h2 className="text-2xl font-black text-white tracking-wide">
                {winner ? `${winner.name} Wins!` : "Match Concluded"}
              </h2>
              <p className="text-xs text-amber-400 font-bold">Supreme Tycoon of Bharat</p>
            </div>

            <div className="space-y-2 mb-6">
              <div className="text-xs font-black uppercase text-slate-400 tracking-wider">Final Standings</div>
              {sortedPlayers.map((p, i) => {
                const tok = PLAYER_TOKENS.find(t => t.id === p.token) || PLAYER_TOKENS[0];
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                      <span>{tok.emoji}</span>
                      <span className="font-bold text-sm" style={{ color: p.color }}>{p.name}</span>
                    </div>
                    <span className="font-mono font-black text-amber-400 text-sm">M{(p.netWorth || p.money).toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onPlayAgain}
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" /> Return to Lobby / Play Again
            </button>
          </div>
        </div>
      )}

      {/* Floating Star Wars Controls Bar */}
      {stage === "crawl" && (
        <div className="fixed bottom-4 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 border-2 border-amber-500/40 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
            title={isPaused ? "Resume Crawl" : "Pause Crawl"}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setCrawlSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono font-bold text-xs transition cursor-pointer"
            title="Cycle Crawl Speed"
          >
            {crawlSpeed}x
          </button>

          <button
            onClick={() => setViewMode(m => (m === "crawl" ? "card" : "crawl"))}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
          >
            {viewMode === "crawl" ? <LayoutGrid className="w-3.5 h-3.5" /> : <Scroll className="w-3.5 h-3.5" />}
            <span>{viewMode === "crawl" ? "Card View" : "Star Wars Crawl"}</span>
          </button>

          <button
            onClick={onPlayAgain}
            className="px-3.5 py-1.5 rounded-xl bg-[#ED1B24] hover:bg-red-700 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md ml-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Play Again</span>
          </button>
        </div>
      )}

      {/* Star Wars Animations CSS */}
      <style>{`
        @keyframes starwars-logo {
          0% {
            transform: scale(2.2);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: scale(0.12);
            opacity: 0;
          }
        }

        @keyframes starwars-crawl {
          0% {
            top: 100%;
            transform: rotateX(24deg) translateY(75vh);
          }
          100% {
            top: 0%;
            transform: rotateX(24deg) translateY(-220%);
          }
        }
      `}</style>
    </div>
  );
}
