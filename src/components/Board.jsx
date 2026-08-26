import React, { useState, useEffect, useRef } from "react";
import { BOARD_TILES, COLOR_GROUPS, PLAYER_TOKENS } from "../../server/data/boardData.js";
import { sounds } from "../utils/audio.js";
import { ArrowRight, ShoppingBag } from "lucide-react";

export default function Board({
  gameState,
  onTileClick,
  onRollDice,
  onBuyProperty,
  onPassProperty,
  onPayJailFine,
  onUseJailCard,
  onEndTurn,
  playerId,
  isMyTurn,
  rotationAngle = 0,
  onMovementComplete,
  onOpenCards
}) {
  const { players = [], properties = {}, dice = [1, 1], phase, pendingAction } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);

  const [displayedPositions, setDisplayedPositions] = useState({});
  const [isAnimatingMovement, setIsAnimatingMovement] = useState(false);
  const [isRollingAnimation, setIsRollingAnimation] = useState(false);
  const [tempDice, setTempDice] = useState([1, 1]);
  const animationQueueRef = useRef({});

  // Sync token positions with smooth step-by-step hopping
  useEffect(() => {
    players.forEach((p) => {
      const currentDisplayed = displayedPositions[p.id];
      const targetPos = p.position;

      if (currentDisplayed === undefined) {
        setDisplayedPositions((prev) => ({ ...prev, [p.id]: targetPos }));
      } else if (currentDisplayed !== targetPos && !animationQueueRef.current[p.id]) {
        animationQueueRef.current[p.id] = true;
        setIsAnimatingMovement(true);

        let steps = [];
        let cur = currentDisplayed;
        while (cur !== targetPos) {
          cur = (cur + 1) % 40;
          steps.push(cur);
        }

        // For large teleport jumps (>6 steps, e.g. Go to Jail, Card Advance to Go):
        // Float directly to destination instead of slow step-by-step
        if (steps.length > 6) {
          sounds.playJail();
          setDisplayedPositions((prev) => ({ ...prev, [p.id]: targetPos }));
          setTimeout(() => {
            animationQueueRef.current[p.id] = false;
            setIsAnimatingMovement(false);
            if (onMovementComplete) {
              onMovementComplete();
            }
          }, 450);
          return;
        }

        let stepIndex = 0;
        const stepInterval = setInterval(() => {
          if (stepIndex < steps.length) {
            const nextPos = steps[stepIndex];
            sounds.playTokenStep();
            setDisplayedPositions((prev) => ({ ...prev, [p.id]: nextPos }));
            stepIndex++;
          } else {
            clearInterval(stepInterval);
            animationQueueRef.current[p.id] = false;
            setIsAnimatingMovement(false);
            if (onMovementComplete) {
              onMovementComplete();
            }
          }
        }, 220);
      }
    });
  }, [players]);

  const handleRollClick = () => {
    sounds.playDiceRoll();
    setIsRollingAnimation(true);

    let rolls = 0;
    const interval = setInterval(() => {
      setTempDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ]);
      rolls++;
      if (rolls >= 14) {
        clearInterval(interval);
        setIsRollingAnimation(false);
        onRollDice();
      }
    }, 85);
  };

  // Authentic Hasbro Dimensions: 160px deep edge tiles, 160x160 corners, 680x680 center
  const CORNER = 160;
  const TILE_W = (1000 - 2 * CORNER) / 9; // 75.5555px
  const COLOR_BAR_DEPTH = 32;

  const getTileBounds = (id) => {
    if (id === 0) return { x: 1000 - CORNER, y: 1000 - CORNER, w: CORNER, h: CORNER }; // GO
    if (id >= 1 && id <= 9) {
      // Bottom row (Guwahati to Vadodara, right to left)
      const x = 1000 - CORNER - id * TILE_W;
      return { x, y: 1000 - CORNER, w: TILE_W, h: CORNER };
    }
    if (id === 10) return { x: 0, y: 1000 - CORNER, w: CORNER, h: CORNER }; // JAIL
    if (id >= 11 && id <= 19) {
      // Left column (Ludhiana to Kochi, bottom to top)
      const idx = id - 10;
      const y = 1000 - CORNER - idx * TILE_W;
      return { x: 0, y, w: CORNER, h: TILE_W };
    }
    if (id === 20) return { x: 0, y: 0, w: CORNER, h: CORNER }; // FREE PARKING
    if (id >= 21 && id <= 29) {
      // Top row (Lucknow to Ahmedabad, left to right)
      const idx = id - 20;
      const x = CORNER + (idx - 1) * TILE_W;
      return { x, y: 0, w: TILE_W, h: CORNER };
    }
    if (id === 30) return { x: 1000 - CORNER, y: 0, w: CORNER, h: CORNER }; // GO TO JAIL
    if (id >= 31 && id <= 39) {
      // Right column (Kolkata to Mumbai, top to bottom)
      const idx = id - 30;
      const y = CORNER + (idx - 1) * TILE_W;
      return { x: 1000 - CORNER, y, w: CORNER, h: TILE_W };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  };

  const getTokenCenter = (id) => {
    const b = getTileBounds(id);
    return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  };

  // Helper to split text cleanly into 1 or 2 rows
  const formatNameLines = (name) => {
    if (name === "COMMUNITY CHEST") return ["COMMUNITY", "CHEST"];
    if (name === "CHENNAI CENTRAL") return ["CHENNAI", "CENTRAL"];
    if (name === "INCOME TAX") return ["INCOME", "TAX"];
    if (name === "HOWRAH STATION") return ["HOWRAH", "STATION"];
    if (name === "NEW DELHI STN") return ["NEW DELHI", "STN"];
    if (name === "ELECTRIC COMPANY") return ["ELECTRIC", "COMPANY"];
    if (name === "WATER WORKS") return ["WATER", "WORKS"];
    if (name === "C.S.T. MUMBAI") return ["C.S.T.", "MUMBAI"];
    if (name === "SUPER TAX") return ["SUPER", "TAX"];
    if (name === "PANAJI (GOA)") return ["PANAJI", "(GOA)"];
    if (name === "BHUBANESHWAR" || name === "BHUBANESWAR") return ["BHUBAN-", "ESHWAR"];
    if (name === "AHMEDABAD") return ["AHMED-", "ABAD"];
    if (name === "CHANDIGARH") return ["CHANDI-", "GARH"];
    return [name];
  };

  const displayedDice = isRollingAnimation ? tempDice : dice;
  const isActionReady = isMyTurn && !isAnimatingMovement && !isRollingAnimation;

  return (
    <div
      className="relative w-full max-w-[min(92vw,calc(100vh-185px))] aspect-square mx-auto bg-[#121614] rounded-2xl border-4 border-black shadow-2xl shadow-black select-none transition-transform duration-500 ease-in-out p-1 sm:p-2"
      style={{ transform: `rotate(${rotationAngle}deg)` }}
    >
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full rounded-lg font-sans select-none"
        style={{ backgroundColor: "#000" }}
      >
        {/* Board Background */}
        <rect x="0" y="0" width="1000" height="1000" fill="#FAF8F5" />
        {/* Compact Authentic 680x680 Mint Felt Center */}
        <rect x={CORNER} y={CORNER} width={1000 - 2 * CORNER} height={1000 - 2 * CORNER} fill="#CBE7D0" stroke="#000" strokeWidth="3" />

        {/* Center Decks Outlines - Clickable to View Cards */}
        <g
          transform={`translate(${CORNER + 50}, ${CORNER + 40}) rotate(-5)`}
          onClick={() => {
            sounds.playCardDraw();
            if (onOpenCards) onOpenCards("community");
          }}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <rect x="0" y="0" width="140" height="90" rx="10" fill="rgba(0, 114, 187, 0.12)" stroke="#0072BB" strokeWidth="2.5" strokeDasharray="6 4" />
          <text x="70" y="28" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0072BB">COMMUNITY CHEST</text>
          <text x="70" y="64" textAnchor="middle" fontSize="28">📦</text>
          <text x="70" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0072BB">CLICK TO VIEW</text>
        </g>

        <g
          transform={`translate(${1000 - CORNER - 190}, ${CORNER + 40}) rotate(5)`}
          onClick={() => {
            sounds.playCardDraw();
            if (onOpenCards) onOpenCards("chance");
          }}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <rect x="0" y="0" width="140" height="90" rx="10" fill="rgba(247, 147, 30, 0.12)" stroke="#F7931E" strokeWidth="2.5" strokeDasharray="6 4" />
          <text x="70" y="28" textAnchor="middle" fontSize="13" fontWeight="900" fill="#F7931E">CHANCE</text>
          <text x="70" y="64" textAnchor="middle" fontSize="36" fontWeight="900" fill="#F7931E">?</text>
          <text x="70" y="80" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#F7931E">CLICK TO VIEW</text>
        </g>

        {/* 40 Tiles */}
        {BOARD_TILES.map((tile) => {
          const b = getTileBounds(tile.id);
          const propState = properties[tile.id] || {};
          const ownerPlayer = players.find((p) => p.id === propState.owner);
          const groupColor = tile.group ? COLOR_GROUPS[tile.group]?.color : null;
          const nameLines = formatNameLines(tile.name);

          // 1. CORNER TILES (Exact 45° Diagonals)
          if (tile.id === 0) {
            // GO (Bottom-Right)
            return (
              <g key={tile.id} onClick={() => onTileClick(tile)} className="cursor-pointer">
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#CBE7D0" stroke="#000" strokeWidth="2.5" />
                <g transform={`translate(${b.x + CORNER / 2}, ${b.y + CORNER / 2}) rotate(-45)`}>
                  <text x="0" y="-38" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#000">COLLECT M200 SALARY</text>
                  <text x="0" y="-24" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#000">AS YOU PASS</text>
                  <text x="0" y="24" textAnchor="middle" fontSize="56" fontWeight="900" fill="#000" letterSpacing="-3">GO</text>
                  <path d="M -55 36 L 38 36 L 38 28 L 60 42 L 38 56 L 38 48 L -55 48 Z" fill="#ED1B24" stroke="#000" strokeWidth="1.5" />
                </g>
              </g>
            );
          }

          if (tile.id === 10) {
            // JAIL (Bottom-Left)
            return (
              <g key={tile.id} onClick={() => onTileClick(tile)} className="cursor-pointer">
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#CBE7D0" stroke="#000" strokeWidth="2.5" />
                <text x={b.x + 22} y={b.y + 80} transform={`rotate(-90, ${b.x + 22}, ${b.y + 80})`} textAnchor="middle" fontSize="15" fontWeight="900" fill="#000">JUST</text>
                <text x={b.x + 90} y={b.y + 145} textAnchor="middle" fontSize="15" fontWeight="900" fill="#000">VISITING</text>
                {/* In Jail Cell */}
                <rect x={b.x + 45} y={b.y} width="115" height="115" fill="#F7931E" stroke="#000" strokeWidth="2.5" />
                <g transform={`translate(${b.x + 102}, ${b.y + 58})`}>
                  <text x="0" y="-18" textAnchor="middle" fontSize="15" fontWeight="900" fill="#000">IN JAIL</text>
                  <line x1="-30" y1="-4" x2="-30" y2="42" stroke="#000" strokeWidth="4.5" />
                  <line x1="-10" y1="-4" x2="-10" y2="42" stroke="#000" strokeWidth="4.5" />
                  <line x1="10" y1="-4" x2="10" y2="42" stroke="#000" strokeWidth="4.5" />
                  <line x1="30" y1="-4" x2="30" y2="42" stroke="#000" strokeWidth="4.5" />
                  <line x1="-36" y1="5" x2="36" y2="5" stroke="#000" strokeWidth="3.5" />
                  <line x1="-36" y1="34" x2="36" y2="34" stroke="#000" strokeWidth="3.5" />
                </g>
              </g>
            );
          }

          if (tile.id === 20) {
            // FREE PARKING (Top-Left)
            return (
              <g key={tile.id} onClick={() => onTileClick(tile)} className="cursor-pointer">
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#CBE7D0" stroke="#000" strokeWidth="2.5" />
                <g transform={`translate(${b.x + CORNER / 2}, ${b.y + CORNER / 2}) rotate(135)`}>
                  <text x="0" y="-36" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ED1B24">FREE</text>
                  <text x="0" y="8" textAnchor="middle" fontSize="42">🚗</text>
                  <text x="0" y="44" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ED1B24">PARKING</text>
                </g>
              </g>
            );
          }

          if (tile.id === 30) {
            // GO TO JAIL (Top-Right)
            return (
              <g key={tile.id} onClick={() => onTileClick(tile)} className="cursor-pointer">
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#CBE7D0" stroke="#000" strokeWidth="2.5" />
                <g transform={`translate(${b.x + CORNER / 2}, ${b.y + CORNER / 2}) rotate(-135)`}>
                  <text x="0" y="-34" textAnchor="middle" fontSize="17" fontWeight="900" fill="#000">GO TO</text>
                  <text x="0" y="8" textAnchor="middle" fontSize="42">👮</text>
                  <text x="0" y="44" textAnchor="middle" fontSize="17" fontWeight="900" fill="#000">JAIL</text>
                </g>
              </g>
            );
          }

          // 2. EDGE TILES (Bottom, Left, Top, Right)
          const isBottom = tile.id >= 1 && tile.id <= 9;
          const isLeft = tile.id >= 11 && tile.id <= 19;
          const isTop = tile.id >= 21 && tile.id <= 29;
          const isRight = tile.id >= 31 && tile.id <= 39;

          return (
            <g key={tile.id} onClick={() => onTileClick(tile)} className="cursor-pointer">
              {/* Tile Background */}
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={propState.mortgaged ? "#E2E8F0" : "#FAF8F5"}
                stroke="#000"
                strokeWidth="1.5"
              />

              {/* Owner Strip Indicator */}
              {ownerPlayer && (
                <rect
                  x={isBottom ? b.x : isTop ? b.x : isLeft ? b.x : b.x + b.w - 7}
                  y={isBottom ? b.y + b.h - 7 : isTop ? b.y : isLeft ? b.y : b.y}
                  width={isBottom || isTop ? b.w : 7}
                  height={isBottom || isTop ? 7 : b.h}
                  fill={ownerPlayer.color}
                />
              )}

              {/* BOTTOM EDGE (Tiles 1-9): Color bar at TOP (y=b.y) */}
              {isBottom && (
                <g>
                  {groupColor && (
                    <g>
                      <rect x={b.x} y={b.y} width={b.w} height={COLOR_BAR_DEPTH} fill={groupColor} stroke="#000" strokeWidth="1.5" />
                      {propState.houses > 0 && (
                        <text x={b.x + b.w / 2} y={b.y + 22} textAnchor="middle" fontSize="15">
                          {propState.houses === 5 ? "🏨" : "🏠".repeat(propState.houses)}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Title Lines */}
                  <g transform={`translate(${b.x + b.w / 2}, ${b.y + (groupColor ? 54 : 34)})`}>
                    {nameLines.map((line, lIdx) => (
                      <text key={lIdx} x="0" y={lIdx * 13} textAnchor="middle" fontSize={nameLines.length > 1 ? "9.5" : "10"} fontWeight="900" fill="#000">
                        {line}
                      </text>
                    ))}
                  </g>

                  {/* Icons */}
                  {tile.type === "railway" && <text x={b.x + b.w / 2} y={b.y + 88} textAnchor="middle" fontSize="28">🚂</text>}
                  {tile.type === "tax" && <text x={b.x + b.w / 2} y={b.y + 88} textAnchor="middle" fontSize="28">🏛️</text>}
                  {tile.type === "chance" && <text x={b.x + b.w / 2} y={b.y + 92} textAnchor="middle" fontSize="36" fontWeight="900" fill="#F7931E">?</text>}
                  {tile.type === "community_chest" && <text x={b.x + b.w / 2} y={b.y + 88} textAnchor="middle" fontSize="28">📦</text>}

                  {/* Mortgaged Stamp */}
                  {propState.mortgaged && (
                    <g transform={`translate(${b.x + b.w / 2}, ${b.y + 85})`}>
                      <rect x="-35" y="-11" width="70" height="22" rx="4" fill="#DC2626" stroke="#FFF" strokeWidth="1.5" />
                      <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFF">MORTGAGED</text>
                    </g>
                  )}

                  {/* Price */}
                  {(tile.price || tile.amount) && (
                    <text x={b.x + b.w / 2} y={b.y + 145} textAnchor="middle" fontSize={propState.mortgaged ? "9" : "11"} fontWeight="900" fill={propState.mortgaged ? "#DC2626" : "#111"}>
                      {propState.mortgaged ? `MORTGAGE M${tile.mortgage || tile.price / 2}` : tile.price ? `M${tile.price}` : `PAY M${tile.amount}`}
                    </text>
                  )}
                </g>
              )}

              {/* TOP EDGE (Tiles 21-29): Color bar at BOTTOM (y = b.y + b.h - COLOR_BAR_DEPTH) */}
              {isTop && (
                <g>
                  {groupColor && (
                    <g>
                      <rect x={b.x} y={b.y + b.h - COLOR_BAR_DEPTH} width={b.w} height={COLOR_BAR_DEPTH} fill={groupColor} stroke="#000" strokeWidth="1.5" />
                      {propState.houses > 0 && (
                        <text x={b.x + b.w / 2} y={b.y + b.h - 10} textAnchor="middle" fontSize="15">
                          {propState.houses === 5 ? "🏨" : "🏠".repeat(propState.houses)}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Rotated 180° for authentic Hasbro top row view */}
                  <g transform={`translate(${b.x + b.w / 2}, ${b.y + b.h / 2}) rotate(180)`}>
                    <g transform={`translate(0, ${groupColor ? -26 : -46})`}>
                      {nameLines.map((line, lIdx) => (
                        <text key={lIdx} x="0" y={lIdx * 13} textAnchor="middle" fontSize={nameLines.length > 1 ? "9.5" : "10"} fontWeight="900" fill="#000">
                          {line}
                        </text>
                      ))}
                    </g>

                    {tile.type === "railway" && <text x="0" y="8" textAnchor="middle" fontSize="28">🚂</text>}
                    {tile.type === "utility" && <text x="0" y="8" textAnchor="middle" fontSize="28">💧</text>}
                    {tile.type === "chance" && <text x="0" y="12" textAnchor="middle" fontSize="36" fontWeight="900" fill="#F7931E">?</text>}

                    {/* Mortgaged Stamp */}
                    {propState.mortgaged && (
                      <g transform="translate(0, 8)">
                        <rect x="-35" y="-11" width="70" height="22" rx="4" fill="#DC2626" stroke="#FFF" strokeWidth="1.5" />
                        <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFF">MORTGAGED</text>
                      </g>
                    )}

                    {(tile.price || tile.amount) && (
                      <text x="0" y="65" textAnchor="middle" fontSize={propState.mortgaged ? "9" : "11"} fontWeight="900" fill={propState.mortgaged ? "#DC2626" : "#111"}>
                        {propState.mortgaged ? `MORTGAGE M${tile.mortgage || tile.price / 2}` : tile.price ? `M${tile.price}` : `PAY M${tile.amount}`}
                      </text>
                    )}
                  </g>
                </g>
              )}

              {/* LEFT EDGE (Tiles 11-19): Color bar on RIGHT (x = b.x + b.w - COLOR_BAR_DEPTH) */}
              {isLeft && (
                <g>
                  {groupColor && (
                    <g>
                      <rect x={b.x + b.w - COLOR_BAR_DEPTH} y={b.y} width={COLOR_BAR_DEPTH} height={b.h} fill={groupColor} stroke="#000" strokeWidth="1.5" />
                      {propState.houses > 0 && (
                        <text x={b.x + b.w - COLOR_BAR_DEPTH / 2} y={b.y + b.h / 2 + 5} textAnchor="middle" fontSize="15">
                          {propState.houses === 5 ? "🏨" : "🏠"}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Rotated 90° clockwise */}
                  <g transform={`translate(${b.x + b.w / 2}, ${b.y + b.h / 2}) rotate(90)`}>
                    <g transform={`translate(0, ${groupColor ? -26 : -46})`}>
                      {nameLines.map((line, lIdx) => (
                        <text key={lIdx} x="0" y={lIdx * 13} textAnchor="middle" fontSize={nameLines.length > 1 ? "9.5" : "10"} fontWeight="900" fill="#000">
                          {line}
                        </text>
                      ))}
                    </g>

                    {tile.type === "railway" && <text x="0" y="8" textAnchor="middle" fontSize="28">🚂</text>}
                    {tile.type === "utility" && <text x="0" y="8" textAnchor="middle" fontSize="28">⚡</text>}
                    {tile.type === "community_chest" && <text x="0" y="8" textAnchor="middle" fontSize="28">📦</text>}

                    {/* Mortgaged Stamp */}
                    {propState.mortgaged && (
                      <g transform="translate(0, 8)">
                        <rect x="-35" y="-11" width="70" height="22" rx="4" fill="#DC2626" stroke="#FFF" strokeWidth="1.5" />
                        <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFF">MORTGAGED</text>
                      </g>
                    )}

                    {tile.price && (
                      <text x="0" y="65" textAnchor="middle" fontSize={propState.mortgaged ? "9" : "11"} fontWeight="900" fill={propState.mortgaged ? "#DC2626" : "#111"}>
                        {propState.mortgaged ? `MORTGAGE M${tile.mortgage || tile.price / 2}` : `M${tile.price}`}
                      </text>
                    )}
                  </g>
                </g>
              )}

              {/* RIGHT EDGE (Tiles 31-39): Color bar on LEFT (x = b.x) */}
              {isRight && (
                <g>
                  {groupColor && (
                    <g>
                      <rect x={b.x} y={b.y} width={COLOR_BAR_DEPTH} height={b.h} fill={groupColor} stroke="#000" strokeWidth="1.5" />
                      {propState.houses > 0 && (
                        <text x={b.x + COLOR_BAR_DEPTH / 2} y={b.y + b.h / 2 + 5} textAnchor="middle" fontSize="15">
                          {propState.houses === 5 ? "🏨" : "🏠"}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Rotated -90° (270°) counter-clockwise */}
                  <g transform={`translate(${b.x + b.w / 2}, ${b.y + b.h / 2}) rotate(-90)`}>
                    <g transform={`translate(0, ${groupColor ? -26 : -46})`}>
                      {nameLines.map((line, lIdx) => (
                        <text key={lIdx} x="0" y={lIdx * 13} textAnchor="middle" fontSize={nameLines.length > 1 ? "9.5" : "10"} fontWeight="900" fill="#000">
                          {line}
                        </text>
                      ))}
                    </g>

                    {tile.type === "railway" && <text x="0" y="8" textAnchor="middle" fontSize="28">🚂</text>}
                    {tile.type === "tax" && <text x="0" y="8" textAnchor="middle" fontSize="28">💍</text>}
                    {tile.type === "chance" && <text x="0" y="12" textAnchor="middle" fontSize="36" fontWeight="900" fill="#F7931E">?</text>}
                    {tile.type === "community_chest" && <text x="0" y="8" textAnchor="middle" fontSize="28">📦</text>}

                    {/* Mortgaged Stamp */}
                    {propState.mortgaged && (
                      <g transform="translate(0, 8)">
                        <rect x="-35" y="-11" width="70" height="22" rx="4" fill="#DC2626" stroke="#FFF" strokeWidth="1.5" />
                        <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FFF">MORTGAGED</text>
                      </g>
                    )}

                    {(tile.price || tile.amount) && (
                      <text x="0" y="65" textAnchor="middle" fontSize={propState.mortgaged ? "9" : "11"} fontWeight="900" fill={propState.mortgaged ? "#DC2626" : "#111"}>
                        {propState.mortgaged ? `MORTGAGE M${tile.mortgage || tile.price / 2}` : tile.price ? `M${tile.price}` : `PAY M${tile.amount}`}
                      </text>
                    )}
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* Player Tokens */}
        {players.map((p) => {
          if (p.bankrupt) return null;
          const pos = displayedPositions[p.id] !== undefined ? displayedPositions[p.id] : p.position;
          const { cx, cy } = getTokenCenter(pos);
          const tok = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];

          const sameTilePlayers = players.filter((pl) => (displayedPositions[pl.id] !== undefined ? displayedPositions[pl.id] : pl.position) === pos);
          const pIndex = sameTilePlayers.findIndex((pl) => pl.id === p.id);
          const offsetAngle = (pIndex * (2 * Math.PI)) / (sameTilePlayers.length || 1);
          const r = sameTilePlayers.length > 1 ? 20 : 0;
          const tokenX = cx + r * Math.cos(offsetAngle);
          const tokenY = cy + r * Math.sin(offsetAngle);

          return (
            <g key={p.id} className="transition-all duration-200">
              <circle cx={tokenX} cy={tokenY} r="20" fill="#FFF" stroke={p.color} strokeWidth="4" filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.5))" />
              <text x={tokenX} y={tokenY + 7} textAnchor="middle" fontSize="20">
                {tok.emoji}
              </text>
            </g>
          );
        })}
      </svg>

      {/* HTML Center Overlay (Logo, 3D Dice, Actions) */}
      <div className="absolute inset-[17%] flex flex-col justify-between items-center text-center p-2 pointer-events-none">
        <div className="h-2" />

        <div className="flex flex-col items-center justify-center my-auto pointer-events-auto">
          <div className="bg-[#ED1B24] border-2 sm:border-3 border-black px-6 sm:px-10 py-1 sm:py-2 rounded-sm shadow-2xl transform -rotate-1">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-wider font-['Cinzel'] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              MONOPOLY
            </h1>
          </div>
          <div className="text-center mt-0.5 font-black text-xs sm:text-sm uppercase tracking-widest text-slate-900 drop-shadow">
            ★ INDIA EDITION ★
          </div>

          {/* 3D Dice */}
          <div className="flex items-center gap-3 sm:gap-4 my-2">
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-black text-black font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl transform ${
                isRollingAnimation ? "animate-spin" : "-rotate-3"
              }`}
            >
              {displayedDice[0]}
            </div>
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-black text-black font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl transform ${
                isRollingAnimation ? "animate-spin" : "rotate-3"
              }`}
            >
              {displayedDice[1]}
            </div>
          </div>

          {/* Turn Status & Live Countdown Timer */}
          {gameState.currentPlayerId && (
            <div className="flex items-center gap-2 mt-1">
              {isMyTurn ? (
                <span className="px-3 py-1 bg-amber-400 border-2 border-black rounded-full font-black text-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 animate-pulse">
                  <span>👉 YOUR TURN!</span>
                  {typeof gameState.turnTimeRemaining === "number" && (
                    <span className="bg-black text-white px-2 py-0.5 rounded-full font-mono text-xs">
                      ⏱️ {gameState.turnTimeRemaining}s
                    </span>
                  )}
                </span>
              ) : (
                <span className="px-3 py-1 bg-white/90 border border-black rounded-full text-xs font-bold text-slate-900 shadow-sm flex items-center gap-1.5">
                  <span>
                    Turn: <strong style={{ color: players.find((p) => p.id === gameState.currentPlayerId)?.color || "#000" }}>{players.find((p) => p.id === gameState.currentPlayerId)?.name}</strong>
                  </span>
                  {typeof gameState.turnTimeRemaining === "number" && (
                    <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black">
                      {gameState.turnTimeRemaining}s
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col items-center justify-center min-h-[52px] pointer-events-auto">
          {isActionReady ? (
            <div className="flex items-center gap-2 flex-wrap justify-center animate-in fade-in duration-200">
              {/* Roll Dice */}
              {phase === "ROLL" && !myPlayer?.inJail && (
                <button
                  onClick={handleRollClick}
                  disabled={isRollingAnimation}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#ED1B24] hover:bg-red-700 text-white font-black text-sm sm:text-base rounded-xl border-2 border-black shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-2"
                >
                  <span>🎲 ROLL DICE</span>
                  {typeof gameState.turnTimeRemaining === "number" && (
                    <span className="bg-black/30 px-2 py-0.5 rounded-lg text-xs font-mono">
                      {gameState.turnTimeRemaining}s
                    </span>
                  )}
                </button>
              )}

              {/* Jail Actions */}
              {phase === "ROLL" && myPlayer?.inJail && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRollClick}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs sm:text-sm rounded-lg border border-black shadow cursor-pointer"
                  >
                    🎲 Roll Doubles
                  </button>
                  <button
                    onClick={onPayJailFine}
                    disabled={myPlayer.money < 50}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-black font-bold text-xs sm:text-sm rounded-lg border border-black shadow disabled:opacity-50 cursor-pointer"
                  >
                    Pay M50 Fine
                  </button>
                  {myPlayer.jailCards > 0 && (
                    <button
                      onClick={onUseJailCard}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-lg border border-black shadow cursor-pointer"
                    >
                      Use Bail Card
                    </button>
                  )}
                </div>
              )}

              {/* Buy or Pass Choice */}
              {pendingAction && pendingAction.type === "BUY_CHOICE" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sounds.playMoneyGone();
                      onBuyProperty();
                    }}
                    disabled={myPlayer.money < pendingAction.price}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl border-2 border-black shadow-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    BUY {pendingAction.name} (M{pendingAction.price})
                  </button>
                  <button
                    onClick={onPassProperty}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-black font-bold text-xs sm:text-sm rounded-xl border-2 border-black shadow cursor-pointer"
                  >
                    PASS
                  </button>
                </div>
              )}

              {/* Informative Rent / Tax Banner + END TURN BUTTON */}
              {phase === "ACTION" && pendingAction && pendingAction.type !== "BUY_CHOICE" && (
                <div className="flex items-center gap-2">
                  {pendingAction.type === "RENT_PAID" && (
                    <span className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-slate-900 shadow-sm">
                      Paid M{pendingAction.amount} rent to {pendingAction.ownerName}
                    </span>
                  )}
                  {pendingAction.type === "TAX_PAID" && (
                    <span className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold text-slate-900 shadow-sm">
                      Paid M{pendingAction.amount} Tax
                    </span>
                  )}
                  <button
                    onClick={onEndTurn}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm rounded-xl border-2 border-black shadow-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    END TURN <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Standard End Turn Action */}
              {phase === "ACTION" && !pendingAction && (
                <button
                  onClick={onEndTurn}
                  className="px-6 sm:px-8 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs sm:text-sm rounded-xl border-2 border-black shadow-xl flex items-center gap-2 cursor-pointer"
                >
                  END TURN <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : isAnimatingMovement ? (
            <div className="text-xs font-black text-slate-800 animate-bounce">
              Moving token...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
