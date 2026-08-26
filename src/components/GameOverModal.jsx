import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Play, Pause, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { PLAYER_TOKENS } from "../../server/data/boardData.js";

export default function GameOverModal({ winner, players = [], gameState = {}, onPlayAgain }) {
  const [stage, setStage] = useState("logo"); // "logo" (0-4.5s) -> "crawl" (4.5s+)
  const [isPaused, setIsPaused] = useState(false);
  const [crawlSpeed, setCrawlSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const properties = gameState.properties || {};
  const logs = gameState.logs || [];

  // Sort players by net worth descending
  const sortedPlayers = [...players].sort((a, b) => {
    const nwA = a.netWorth !== undefined ? a.netWorth : a.money;
    const nwB = b.netWorth !== undefined ? b.netWorth : b.money;
    return nwB - nwA;
  });

  // Resilient winner resolution for any game over mode
  const effectiveWinner = winner || (sortedPlayers.length > 0 && !sortedPlayers[0].bankrupt ? sortedPlayers[0] : sortedPlayers[0] || null);
  const winnerToken = effectiveWinner ? PLAYER_TOKENS.find(t => t.id === effectiveWinner.token) || PLAYER_TOKENS[0] : null;

  // Property counts per player
  const playerPropertyCounts = {};
  Object.keys(properties).forEach(tid => {
    const p = properties[tid];
    if (p.owner) {
      playerPropertyCounts[p.owner] = (playerPropertyCounts[p.owner] || 0) + 1;
    }
  });

  const totalDiceRolls = logs.filter(l => l.type === "dice").length;
  const totalRentEvents = logs.filter(l => l.type === "rent").length;
  const totalJailEvents = logs.filter(l => l.type === "jail").length;

  useEffect(() => {
    // Play authentic 1977 Star Wars soundtrack
    try {
      const audio = new Audio("/sounds/star-wars-theme.mp4");
      audio.volume = 0.60;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch (e) {
      console.warn("Star Wars audio error", e);
    }

    // Celebratory victory confetti
    confetti({ particleCount: 40, spread: 65, origin: { y: 0.8 } });

    // Transition from Logo Zoom to Crawl at 4.5 seconds (exact 1977 musical sync)
    const timer = setTimeout(() => {
      setStage("crawl");
    }, 4500);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const toggleAudio = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden select-none font-sans">
      {/* 1977 Authentic Crisp Starfield Background */}
      <div className="absolute inset-0 bg-black">
        <div
          className="absolute inset-0 opacity-85"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 25px 35px, #ffffff, transparent),
              radial-gradient(1.5px 1.5px at 120px 80px, #ffffff, transparent),
              radial-gradient(1px 1px at 210px 160px, #e2e8f0, transparent),
              radial-gradient(2px 2px at 340px 90px, #ffffff, transparent),
              radial-gradient(1px 1px at 480px 240px, #cbd5e1, transparent),
              radial-gradient(1.5px 1.5px at 580px 110px, #ffffff, transparent),
              radial-gradient(1px 1px at 700px 300px, #ffffff, transparent),
              radial-gradient(2px 2px at 850px 180px, #ffffff, transparent),
              radial-gradient(1px 1px at 960px 70px, #e2e8f0, transparent)
            `,
            backgroundSize: "550px 350px"
          }}
        />
      </div>

      {/* STAGE 1: 1977 Title Logo Zoom Out (0s - 4.5s) */}
      {stage === "logo" && (
        <div className="relative z-20 flex flex-col items-center justify-center animate-starwars-1977-logo pointer-events-none">
          <h1
            className="text-6xl sm:text-8xl md:text-9xl font-black tracking-wider text-transparent uppercase text-center"
            style={{
              WebkitTextStroke: "4px #FFE81F",
              color: "transparent",
              fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif"
            }}
          >
            MONOPOLY
          </h1>
          <div
            className="text-2xl sm:text-4xl font-bold tracking-[0.35em] text-[#FFE81F] mt-4 uppercase text-center"
            style={{ fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif" }}
          >
            by Menace
          </div>
        </div>
      )}

      {/* STAGE 2: Authentic 1977 Crawl (4.5s+) */}
      {stage === "crawl" && (
        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center overflow-hidden">
          {/* Top subtle fade into infinite space */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black via-black/90 to-transparent z-30 pointer-events-none" />

          {/* Perspective Crawl Stage */}
          <div
            className="w-full max-w-2xl h-[90vh] flex justify-center"
            style={{
              perspective: "320px",
              perspectiveOrigin: "50% 100%"
            }}
          >
            <div
              className="w-full text-center space-y-12 px-6"
              style={{
                color: "#FFE81F",
                fontFamily: "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif",
                transform: "rotateX(25deg) translateZ(0)",
                transformOrigin: "50% 100%",
                animation: `starwars-1977-crawl ${45 / crawlSpeed}s linear infinite`,
                animationPlayState: isPaused ? "paused" : "running"
              }}
            >
              {/* Episode Header */}
              <div className="space-y-3">
                <div className="text-2xl sm:text-3xl font-black uppercase tracking-[0.3em]">
                  EPISODE {players.length || 1}
                </div>
                <div className="text-3xl sm:text-5xl font-black uppercase tracking-[0.25em]">
                  {effectiveWinner ? "THE SUPREME TYCOON" : "A REALM AT PEACE"}
                </div>
              </div>

              {/* Main Narrative Paragraphs */}
              <p className="text-lg sm:text-2xl leading-relaxed text-justify">
                {effectiveWinner ? (
                  <>
                    It is a period of financial triumph. {effectiveWinner.name}, supreme tycoon of the realm,
                    has outmaneuvered all rivals in a fierce contest of deeds, negotiations, and relentless fortune.
                  </>
                ) : (
                  <>
                    The boardroom has reached an honorable conclusion. The great tycoons of Bharat
                    have settled their accounts and concluded their epic trial of fortunes.
                  </>
                )}
              </p>

              {effectiveWinner && (
                <p className="text-lg sm:text-2xl leading-relaxed text-justify">
                  With an insurmountable net worth of M{(effectiveWinner.netWorth || effectiveWinner.money).toLocaleString("en-IN")} and
                  total control over {playerPropertyCounts[effectiveWinner.id] || 0} strategic properties,
                  the opposing empires could no longer sustain the mounting debts of the realm.
                </p>
              )}

              {/* Leaderboard Standings */}
              <div className="space-y-6 pt-4 text-center">
                <div className="text-2xl sm:text-3xl font-black uppercase tracking-[0.25em]">
                  FINAL STANDINGS
                </div>

                <div className="space-y-4 text-base sm:text-xl font-bold">
                  {sortedPlayers.map((p, idx) => {
                    const tok = PLAYER_TOKENS.find(t => t.id === p.token) || PLAYER_TOKENS[0];
                    return (
                      <div key={p.id} className="flex items-center justify-between border-b border-[#FFE81F]/30 pb-2">
                        <div className="flex items-center gap-3 text-left">
                          <span>{idx + 1}.</span>
                          <span>{tok.emoji}</span>
                          <span className="uppercase">{p.name} {p.bankrupt ? "(BANKRUPT)" : ""}</span>
                        </div>
                        <div className="font-mono font-black">
                          M{(p.netWorth || p.money).toLocaleString("en-IN")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match Statistics */}
              <div className="space-y-6 pt-6 text-center">
                <div className="text-xl sm:text-2xl font-black uppercase tracking-[0.25em]">
                  MATCH METRICS
                </div>
                <div className="text-base sm:text-lg font-bold space-y-2 text-left sm:text-center">
                  <div>TOTAL DICE ROLLS: {totalDiceRolls}</div>
                  <div>RENT TRANSACTIONS: {totalRentEvents}</div>
                  <div>JAIL SENTENCES SERVED: {totalJailEvents}</div>
                </div>
              </div>

              {/* Closing Epilogue */}
              <p className="text-base sm:text-xl leading-relaxed text-center italic pt-8 pb-36">
                May the fortunes be with you always....
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Minimalist 1977 Controls Bar */}
      <div className="fixed bottom-4 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/90 border border-[#FFE81F]/40 backdrop-blur-sm shadow-xl">
        <button
          onClick={() => {
            if (stage === "logo") setStage("crawl");
            else setIsPaused(!isPaused);
          }}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#FFE81F] border border-zinc-700 transition cursor-pointer"
          title={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setCrawlSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#FFE81F] font-mono font-bold text-xs border border-zinc-700 transition cursor-pointer"
          title="Speed"
        >
          {crawlSpeed}x
        </button>

        <button
          onClick={toggleAudio}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[#FFE81F] border border-zinc-700 transition cursor-pointer"
          title={isMuted ? "Unmute Music" : "Mute Music"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onPlayAgain}
          className="px-3 py-1 rounded-lg bg-[#FFE81F] hover:bg-yellow-400 text-black font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow ml-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Play Again</span>
        </button>
      </div>

      {/* 1977 Star Wars Keyframes */}
      <style>{`
        @keyframes starwars-1977-logo {
          0% {
            transform: scale(1.6);
            opacity: 1;
          }
          70% {
            transform: scale(0.35);
            opacity: 1;
          }
          100% {
            transform: scale(0.01);
            opacity: 0;
          }
        }

        @keyframes starwars-1977-crawl {
          0% {
            top: 100%;
            transform: rotateX(25deg) translateY(75vh);
          }
          100% {
            top: 0%;
            transform: rotateX(25deg) translateY(-240%);
          }
        }
      `}</style>
    </div>
  );
}
