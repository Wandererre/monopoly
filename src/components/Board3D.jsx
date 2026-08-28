import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BOARD_TILES, COLOR_GROUPS, PLAYER_TOKENS } from "../../server/data/boardData.js";
import { sounds } from "../utils/audio.js";
import { RotateCcw, Dices, ArrowRight, ShoppingBag } from "lucide-react";

// Board 3D Dimensions
const BOARD_SIZE = 20;
const HALF_BOARD = BOARD_SIZE / 2;
const CORNER_SIZE = 3.2;
const TILE_WIDTH = (BOARD_SIZE - 2 * CORNER_SIZE) / 9; // ~1.511

// Compute 3D Coordinates for Tile 0..39
export function getTile3DPosition(id) {
  const y = 0.45;
  if (id === 0) return new THREE.Vector3(HALF_BOARD - CORNER_SIZE / 2, y, HALF_BOARD - CORNER_SIZE / 2);
  if (id >= 1 && id <= 9) {
    const offset = HALF_BOARD - CORNER_SIZE - (id - 0.5) * TILE_WIDTH;
    return new THREE.Vector3(offset, y, HALF_BOARD - CORNER_SIZE / 2);
  }
  if (id === 10) return new THREE.Vector3(-HALF_BOARD + CORNER_SIZE / 2, y, HALF_BOARD - CORNER_SIZE / 2);
  if (id >= 11 && id <= 19) {
    const idx = id - 10;
    const offset = HALF_BOARD - CORNER_SIZE - (idx - 0.5) * TILE_WIDTH;
    return new THREE.Vector3(-HALF_BOARD + CORNER_SIZE / 2, y, offset);
  }
  if (id === 20) return new THREE.Vector3(-HALF_BOARD + CORNER_SIZE / 2, y, -HALF_BOARD + CORNER_SIZE / 2);
  if (id >= 21 && id <= 29) {
    const idx = id - 20;
    const offset = -HALF_BOARD + CORNER_SIZE + (idx - 0.5) * TILE_WIDTH;
    return new THREE.Vector3(offset, y, -HALF_BOARD + CORNER_SIZE / 2);
  }
  if (id === 30) return new THREE.Vector3(HALF_BOARD - CORNER_SIZE / 2, y, -HALF_BOARD + CORNER_SIZE / 2);
  if (id >= 31 && id <= 39) {
    const idx = id - 30;
    const offset = -HALF_BOARD + CORNER_SIZE + (idx - 0.5) * TILE_WIDTH;
    return new THREE.Vector3(HALF_BOARD - CORNER_SIZE / 2, y, offset);
  }
  return new THREE.Vector3(0, y, 0);
}

// Generate Crisp, Rich, Non-Washed-Out 2D Canvas Texture for Each 3D Tile
function createTileTexture(tile, isCorner) {
  const canvas = document.createElement("canvas");
  canvas.width = isCorner ? 512 : 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Rich cream paper background with high contrast
  ctx.fillStyle = "#FFFDF9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bold black border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;

  if (tile.type === "property" && groupInfo) {
    // Rich saturated color bar
    ctx.fillStyle = groupInfo.color;
    ctx.fillRect(5, 5, canvas.width - 10, 130);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, canvas.width - 10, 130);

    // City Name in high-contrast bold font
    ctx.fillStyle = "#000000";
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    const words = tile.name.split(" ");
    if (words.length === 1) {
      ctx.fillText(words[0], canvas.width / 2, 230);
    } else {
      ctx.fillText(words[0], canvas.width / 2, 205);
      ctx.fillText(words.slice(1).join(" "), canvas.width / 2, 245);
    }

    // Price tag
    ctx.font = "900 32px monospace";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("M" + tile.price, canvas.width / 2, 450);
  } else if (tile.type === "railway") {
    ctx.fillStyle = "#000000";
    ctx.font = "900 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RAILWAY", canvas.width / 2, 85);
    ctx.font = "70px sans-serif";
    ctx.fillText("🚆", canvas.width / 2, 240);
    ctx.font = "900 24px sans-serif";
    ctx.fillText(tile.name.replace(" RAILWAY", ""), canvas.width / 2, 345);
    ctx.font = "900 32px monospace";
    ctx.fillText("M" + tile.price, canvas.width / 2, 450);
  } else if (tile.type === "utility") {
    ctx.fillStyle = "#000000";
    ctx.font = "900 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UTILITY", canvas.width / 2, 85);
    ctx.font = "70px sans-serif";
    ctx.fillText(tile.id === 12 ? "⚡" : "💧", canvas.width / 2, 240);
    ctx.font = "900 24px sans-serif";
    ctx.fillText(tile.name, canvas.width / 2, 345);
    ctx.font = "900 32px monospace";
    ctx.fillText("M" + tile.price, canvas.width / 2, 450);
  } else if (tile.type === "chance") {
    ctx.fillStyle = "#EA580C"; // Vibrant rich orange
    ctx.font = "900 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CHANCE", canvas.width / 2, 100);
    ctx.font = "110px sans-serif";
    ctx.fillText("❓", canvas.width / 2, 290);
  } else if (tile.type === "community_chest") {
    ctx.fillStyle = "#1E40AF"; // Deep royal blue
    ctx.font = "900 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMMUNITY", canvas.width / 2, 85);
    ctx.fillText("CHEST", canvas.width / 2, 125);
    ctx.font = "110px sans-serif";
    ctx.fillText("📦", canvas.width / 2, 295);
  } else if (tile.type === "tax") {
    ctx.fillStyle = "#DC2626";
    ctx.font = "900 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tile.name, canvas.width / 2, 100);
    ctx.font = "80px sans-serif";
    ctx.fillText("💰", canvas.width / 2, 270);
    ctx.font = "900 30px monospace";
    ctx.fillText("PAY M" + tile.amount, canvas.width / 2, 435);
  } else if (tile.id === 0) {
    // GO
    ctx.fillStyle = "#DC2626";
    ctx.font = "900 96px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO", canvas.width / 2, 220);
    ctx.font = "900 30px sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText("COLLECT M200", canvas.width / 2, 330);
    ctx.fillText("AS YOU PASS", canvas.width / 2, 375);
    ctx.font = "70px sans-serif";
    ctx.fillText("⬅️", canvas.width / 2, 450);
  } else if (tile.id === 10) {
    // JAIL
    ctx.fillStyle = "#EA580C";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IN JAIL", canvas.width / 2, 230);
    ctx.font = "900 28px sans-serif";
    ctx.fillStyle = "#1E293B";
    ctx.fillText("JUST VISITING", canvas.width / 2, 390);
  } else if (tile.id === 20) {
    // FREE PARKING
    ctx.fillStyle = "#DC2626";
    ctx.font = "900 54px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FREE", canvas.width / 2, 180);
    ctx.fillText("PARKING", canvas.width / 2, 250);
    ctx.font = "80px sans-serif";
    ctx.fillText("🚗", canvas.width / 2, 370);
  } else if (tile.id === 30) {
    // GO TO JAIL
    ctx.fillStyle = "#000000";
    ctx.font = "900 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO TO", canvas.width / 2, 180);
    ctx.fillText("JAIL", canvas.width / 2, 245);
    ctx.font = "80px sans-serif";
    ctx.fillText("👮", canvas.width / 2, 370);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Generate Canvas Texture for Dice Face
function createDiceFaceTexture(number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // Solid ivory face
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 120);

  // Black Pips
  ctx.fillStyle = "#0F172A";
  const drawPip = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
  };

  if (number === 1) {
    ctx.fillStyle = "#DC2626";
    drawPip(64, 64);
  } else if (number === 2) {
    drawPip(36, 36); drawPip(92, 92);
  } else if (number === 3) {
    drawPip(36, 36); drawPip(64, 64); drawPip(92, 92);
  } else if (number === 4) {
    drawPip(36, 36); drawPip(92, 36);
    drawPip(36, 92); drawPip(92, 92);
  } else if (number === 5) {
    drawPip(36, 36); drawPip(92, 36);
    drawPip(64, 64);
    drawPip(36, 92); drawPip(92, 92);
  } else if (number === 6) {
    drawPip(36, 30); drawPip(92, 30);
    drawPip(36, 64); drawPip(92, 64);
    drawPip(36, 98); drawPip(92, 98);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Map dice face values to 3D Euler rotations
function getDiceTargetRotation(value) {
  switch (value) {
    case 1: return { x: 0, y: 0, z: 0 };
    case 6: return { x: Math.PI, y: 0, z: 0 };
    case 2: return { x: -Math.PI / 2, y: 0, z: 0 };
    case 5: return { x: Math.PI / 2, y: 0, z: 0 };
    case 3: return { x: 0, y: 0, z: Math.PI / 2 };
    case 4: return { x: 0, y: 0, z: -Math.PI / 2 };
    default: return { x: 0, y: 0, z: 0 };
  }
}

export default function Board3D({
  gameState = {},
  onTileClick,
  onRollDice,
  onBuyProperty,
  onPassProperty,
  onPayJailFine,
  onUseJailCard,
  onEndTurn,
  playerId,
  isMyTurn,
  onMovementComplete,
  onOpenCards
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const [isRolling, setIsRolling] = useState(false);

  const { players = [], properties = {}, dice = [1, 1], phase, pendingAction } = gameState || {};
  const myPlayer = players.find((p) => p.id === playerId);
  const currentPlayer = players.find((p) => p.id === gameState?.currentPlayerId);
  const isPendingBuy = pendingAction?.type === "BUY_CHOICE";
  const pendingBuyTile = isPendingBuy ? BOARD_TILES[pendingAction.tileId] : null;

  // Scene object refs
  const sceneRef = useRef(null);
  const diceMeshesRef = useRef([]);
  const tokenMeshesRef = useRef({});
  const houseMeshesRef = useRef({});
  const prevPositionsRef = useRef({});

  // Camera & Tracking Controller
  const cameraStateRef = useRef({
    defaultPos: new THREE.Vector3(18, 22, 18),
    defaultTarget: new THREE.Vector3(0, 0, 0),
    isTracking: false,
    trackTargetPos: new THREE.Vector3(0, 0, 0),
    trackCameraPos: new THREE.Vector3(18, 22, 18)
  });

  const animationStateRef = useRef({
    diceRolling: false,
    diceStart: 0,
    diceDuration: 1500,
    diceTargets: [1, 1],
    hoppingTokens: {}
  });

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraStateRef.current.isTracking = false;
      cameraRef.current.position.copy(cameraStateRef.current.defaultPos);
      controlsRef.current.target.copy(cameraStateRef.current.defaultTarget);
      controlsRef.current.update();
    }
  };

  // 1. Initialize Three.js WebGL Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#111512");

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.copy(cameraStateRef.current.defaultPos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.target.copy(cameraStateRef.current.defaultTarget);

    // Warm, Rich Lighting without Specular Glare Washout
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1);
    dirLight.position.set(15, 30, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    fillLight.position.set(-15, 15, -15);
    scene.add(fillLight);

    // 2. Build 3D Board Base (Deep Dark Mahogany Base + Rich Luxury Green Center Felt)
    const baseGeo = new THREE.BoxGeometry(BOARD_SIZE + 0.6, 0.7, BOARD_SIZE + 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: "#181412",
      roughness: 0.7,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Center Felt Mat (Deep Rich Forest Green)
    const feltSize = BOARD_SIZE - 2 * CORNER_SIZE;
    const feltGeo = new THREE.PlaneGeometry(feltSize, feltSize);
    const feltMat = new THREE.MeshStandardMaterial({
      color: "#0B2B1B",
      roughness: 0.9
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = 0.41;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Center Monopoly India Crest Logo
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = 512;
    logoCanvas.height = 512;
    const lctx = logoCanvas.getContext("2d");
    lctx.fillStyle = "#ED1B24";
    lctx.fillRect(40, 190, 432, 130);
    lctx.strokeStyle = "#000000";
    lctx.lineWidth = 12;
    lctx.strokeRect(40, 190, 432, 130);
    lctx.fillStyle = "#FFFFFF";
    lctx.font = "900 70px sans-serif";
    lctx.textAlign = "center";
    lctx.fillText("MONOPOLY", 256, 280);
    lctx.fillStyle = "#FBBF24";
    lctx.font = "900 30px sans-serif";
    lctx.fillText("★ INDIA EDITION ★", 256, 360);

    const logoTexture = new THREE.CanvasTexture(logoCanvas);
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), logoMat);
    logoMesh.rotation.x = -Math.PI / 2;
    logoMesh.rotation.z = Math.PI / 4;
    logoMesh.position.y = 0.42;
    scene.add(logoMesh);

    // 3. Interactive Center 3D Card Decks (CHANCE & COMMUNITY CHEST)
    const cardGroup = new THREE.Group();
    cardGroup.name = "CARD_DECKS_GROUP";

    // Chance Deck (Orange)
    const chanceCanvas = document.createElement("canvas");
    chanceCanvas.width = 256; chanceCanvas.height = 384;
    const cctx = chanceCanvas.getContext("2d");
    cctx.fillStyle = "#EA580C"; cctx.fillRect(0, 0, 256, 384);
    cctx.strokeStyle = "#FFFFFF"; cctx.lineWidth = 12; cctx.strokeRect(10, 10, 236, 364);
    cctx.fillStyle = "#FFFFFF"; cctx.font = "900 36px sans-serif"; cctx.textAlign = "center";
    cctx.fillText("CHANCE", 128, 90);
    cctx.font = "110px sans-serif"; cctx.fillText("❓", 128, 240);
    const chanceTex = new THREE.CanvasTexture(chanceCanvas);
    chanceTex.colorSpace = THREE.SRGBColorSpace;
    const chanceDeck = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 3.2),
      [
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ map: chanceTex }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" })
      ]
    );
    chanceDeck.position.set(-3.2, 0.58, -3.2);
    chanceDeck.rotation.y = Math.PI / 4;
    chanceDeck.userData = { cardType: "chance" };
    cardGroup.add(chanceDeck);

    // Community Chest Deck (Blue)
    const chestCanvas = document.createElement("canvas");
    chestCanvas.width = 256; chestCanvas.height = 384;
    const chctx = chestCanvas.getContext("2d");
    chctx.fillStyle = "#1E40AF"; chctx.fillRect(0, 0, 256, 384);
    chctx.strokeStyle = "#FFFFFF"; chctx.lineWidth = 12; chctx.strokeRect(10, 10, 236, 364);
    chctx.fillStyle = "#FFFFFF"; chctx.font = "900 32px sans-serif"; chctx.textAlign = "center";
    chctx.fillText("COMMUNITY", 128, 70);
    chctx.fillText("CHEST", 128, 110);
    chctx.font = "110px sans-serif"; chctx.fillText("📦", 128, 250);
    const chestTex = new THREE.CanvasTexture(chestCanvas);
    chestTex.colorSpace = THREE.SRGBColorSpace;
    const chestDeck = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 3.2),
      [
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ map: chestTex }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" }),
        new THREE.MeshStandardMaterial({ color: "#FFFFFF" })
      ]
    );
    chestDeck.position.set(3.2, 0.58, 3.2);
    chestDeck.rotation.y = Math.PI / 4;
    chestDeck.userData = { cardType: "community" };
    cardGroup.add(chestDeck);

    scene.add(cardGroup);

    // 4. Build 40 Tile Meshes with Perfect Inward Rotation & Crisp Colors
    const tileGroup = new THREE.Group();
    tileGroup.name = "TILES_GROUP";
    BOARD_TILES.forEach((tile) => {
      const isCorner = [0, 10, 20, 30].includes(tile.id);
      const w = isCorner ? CORNER_SIZE : TILE_WIDTH;
      const d = CORNER_SIZE;
      const tileGeo = new THREE.BoxGeometry(w - 0.03, 0.1, d - 0.03);

      const texture = createTileTexture(tile, isCorner);
      const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
      const matSide = new THREE.MeshStandardMaterial({ color: "#2B2623", roughness: 0.6 });
      const materials = [matSide, matSide, matTop, matSide, matSide, matSide];

      const mesh = new THREE.Mesh(tileGeo, materials);
      const pos = getTile3DPosition(tile.id);
      mesh.position.set(pos.x, 0.41, pos.z);

      if (tile.id >= 1 && tile.id <= 9) mesh.rotation.y = 0;
      else if (tile.id >= 11 && tile.id <= 19) mesh.rotation.y = Math.PI / 2;
      else if (tile.id >= 21 && tile.id <= 29) mesh.rotation.y = Math.PI;
      else if (tile.id >= 31 && tile.id <= 39) mesh.rotation.y = -Math.PI / 2;

      mesh.receiveShadow = true;
      mesh.userData = { tileId: tile.id, tileType: tile.type };
      tileGroup.add(mesh);
    });
    scene.add(tileGroup);

    // 5. Build 3D Tumbling Dice Pair
    const diceMaterials = [
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4), roughness: 0.5 })
    ];
    const diceGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);

    const die1 = new THREE.Mesh(diceGeo, diceMaterials);
    die1.position.set(-0.8, 0.86, 0);
    die1.castShadow = true;
    scene.add(die1);

    const die2 = new THREE.Mesh(diceGeo, diceMaterials);
    die2.position.set(0.8, 0.86, 0);
    die2.castShadow = true;
    scene.add(die2);

    diceMeshesRef.current = [die1, die2];

    // 6. Raycaster for Tile Clicks & Card Decks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check card decks click
      const cardIntersects = raycaster.intersectObjects(cardGroup.children);
      if (cardIntersects.length > 0) {
        const cardType = cardIntersects[0].object.userData?.cardType;
        if (cardType && onOpenCards) {
          onOpenCards(cardType);
          return;
        }
      }

      // Check tile click
      const tileIntersects = raycaster.intersectObjects(tileGroup.children);
      if (tileIntersects.length > 0) {
        const clickedTileId = tileIntersects[0].object.userData?.tileId;
        const tileType = tileIntersects[0].object.userData?.tileType;

        if (tileType === "chance" && onOpenCards) {
          onOpenCards("chance");
        } else if (tileType === "community_chest" && onOpenCards) {
          onOpenCards("community");
        } else if (clickedTileId !== undefined && onTileClick) {
          onTileClick(clickedTileId);
        }
      }
    };

    mount.addEventListener("pointerdown", handlePointerDown);

    // 7. Main WebGL Animation Loop with Dynamic Smooth Camera Tracking
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const now = performance.now();
      const anim = animationStateRef.current;
      const camState = cameraStateRef.current;

      // Tumbling Dice Animation (~1.5s total time)
      if (anim.diceRolling && diceMeshesRef.current.length === 2) {
        const progress = Math.min(1, (now - anim.diceStart) / anim.diceDuration);

        diceMeshesRef.current.forEach((die, idx) => {
          const targetRot = getDiceTargetRotation(anim.diceTargets[idx] || 1);
          const spinMultiplier = (1 - progress) * 10 * Math.PI;

          // Parabolic Drop Arc
          const bounceHeight = Math.sin(progress * Math.PI) * 2.8 * (1 - progress * 0.7);
          die.position.y = 0.86 + bounceHeight;
          die.position.x = (idx === 0 ? -1.1 : 1.1) + Math.sin(progress * Math.PI * 2) * 0.4;
          die.position.z = Math.cos(progress * Math.PI * 2) * 0.3;

          die.rotation.x = targetRot.x + spinMultiplier;
          die.rotation.y = targetRot.y + spinMultiplier * 0.7;
          die.rotation.z = targetRot.z + spinMultiplier * 1.2;
        });

        if (progress >= 1) {
          anim.diceRolling = false;
          setIsRolling(false);
        }
      }

      // Parabolic Step Hopping Tokens
      Object.keys(anim.hoppingTokens).forEach((pid) => {
        const hop = anim.hoppingTokens[pid];
        const tokenMesh = tokenMeshesRef.current[pid];
        if (!tokenMesh || !hop) return;

        const p = Math.min(1, (now - hop.startTime) / hop.duration);
        const fromPos = getTile3DPosition(hop.fromPos);
        const toPos = getTile3DPosition(hop.toPos);

        // Smooth (x, z) interpolation + authentic 3D parabolic hop arc (y)
        tokenMesh.position.x = THREE.MathUtils.lerp(fromPos.x, toPos.x, p);
        tokenMesh.position.z = THREE.MathUtils.lerp(fromPos.z, toPos.z, p);
        tokenMesh.position.y = 0.5 + Math.sin(p * Math.PI) * 1.6;

        // Update close-up dynamic camera target
        camState.trackTargetPos.copy(tokenMesh.position);
        camState.trackCameraPos.set(tokenMesh.position.x + 6, 8.5, tokenMesh.position.z + 6);

        if (p >= 1) {
          tokenMesh.position.copy(toPos);
          tokenMesh.position.y = 0.5;
          delete anim.hoppingTokens[pid];
        }
      });

      // Smooth Dynamic Camera Close-Up Swoop
      if (camState.isTracking) {
        camera.position.lerp(camState.trackCameraPos, 0.08);
        controls.target.lerp(camState.trackTargetPos, 0.08);
      } else {
        camera.position.lerp(camState.defaultPos, 0.05);
        controls.target.lerp(camState.defaultTarget, 0.05);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("pointerdown", handlePointerDown);
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 2. Synchronize 3D Player Tokens & Step-by-Step Hopping with Camera Follow
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    players.forEach((p) => {
      let tokenMesh = tokenMeshesRef.current[p.id];
      const tokData = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];

      // Create Token Mesh if doesn't exist
      if (!tokenMesh) {
        const group = new THREE.Group();

        // Stylized 3D Pawn Geometry (Pedestal + Cone + Sphere)
        const baseGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.35, 24);
        const baseMat = new THREE.MeshStandardMaterial({
          color: p.color || tokData.color || "#3B82F6",
          metalness: 0.3,
          roughness: 0.4
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.17;
        base.castShadow = true;
        group.add(base);

        const bodyGeo = new THREE.ConeGeometry(0.32, 0.7, 24);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.68;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.25, 24, 24);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.y = 1.1;
        head.castShadow = true;
        group.add(head);

        // Emoji Sprite Floating Billboard
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.font = "84px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tokData.emoji, 64, 98);
        const spriteTex = new THREE.CanvasTexture(canvas);
        spriteTex.colorSpace = THREE.SRGBColorSpace;
        const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 1.8;
        sprite.scale.set(1.0, 1.0, 1.0);
        group.add(sprite);

        const initialPos = getTile3DPosition(p.position || 0);
        group.position.set(initialPos.x, 0.5, initialPos.z);
        scene.add(group);
        tokenMeshesRef.current[p.id] = group;
        tokenMesh = group;
        prevPositionsRef.current[p.id] = p.position || 0;
      }

      // Check for position change and start step-by-step 3D hop with Camera Follow
      const currentPos = prevPositionsRef.current[p.id] !== undefined ? prevPositionsRef.current[p.id] : p.position;
      const targetPos = p.position;

      if (currentPos !== targetPos) {
        prevPositionsRef.current[p.id] = targetPos;

        let steps = [];
        let cur = currentPos;
        while (cur !== targetPos) {
          cur = (cur + 1) % 40;
          steps.push(cur);
        }

        // Teleport (e.g. Go to Jail)
        if (steps.length > 12 || (currentPos === 30 && targetPos === 10)) {
          sounds.playJail();
          const dest = getTile3DPosition(targetPos);
          tokenMesh.position.set(dest.x, 0.5, dest.z);
          if (onMovementComplete) onMovementComplete();
          return;
        }

        // Enable Dynamic Close-Up Camera Tracking
        cameraStateRef.current.isTracking = true;

        // Slowed down step-by-step 3D hop at 320ms per step
        let stepIdx = 0;
        let prevStep = currentPos;

        const interval = setInterval(() => {
          if (stepIdx < steps.length) {
            const nextStep = steps[stepIdx];
            sounds.playTokenStep();

            animationStateRef.current.hoppingTokens[p.id] = {
              fromPos: prevStep,
              toPos: nextStep,
              startTime: performance.now(),
              duration: 300
            };

            prevStep = nextStep;
            stepIdx++;
          } else {
            clearInterval(interval);
            // Hold close-up view for 600ms then smoothly return to isometric overview
            setTimeout(() => {
              cameraStateRef.current.isTracking = false;
            }, 600);
            if (onMovementComplete) onMovementComplete();
          }
        }, 320);
      }
    });
  }, [players]);

  // 3. Synchronize 3D Houses and Hotels
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    Object.values(houseMeshesRef.current).forEach((m) => scene.remove(m));
    houseMeshesRef.current = {};

    Object.keys(properties).forEach((tileIdStr) => {
      const tileId = Number(tileIdStr);
      const prop = properties[tileId];
      if (!prop || prop.houses === 0) return;

      const tilePos = getTile3DPosition(tileId);
      const isHotel = prop.houses >= 5;

      const group = new THREE.Group();

      if (isHotel) {
        // Red Hotel 3D Mesh
        const hotelMat = new THREE.MeshStandardMaterial({ color: "#DC2626", roughness: 0.3 });
        const hotel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.45), hotelMat);
        hotel.position.set(0, 0.22, 0);
        hotel.castShadow = true;
        group.add(hotel);
      } else {
        // Green House 3D Meshes (1-4)
        const houseMat = new THREE.MeshStandardMaterial({ color: "#16A34A", roughness: 0.3 });
        for (let i = 0; i < prop.houses; i++) {
          const house = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), houseMat);
          house.position.set((i - (prop.houses - 1) / 2) * 0.3, 0.13, 0);
          house.castShadow = true;
          group.add(house);
        }
      }

      group.position.set(tilePos.x, 0.46, tilePos.z);
      scene.add(group);
      houseMeshesRef.current[tileId] = group;
    });
  }, [properties]);

  // 4. Trigger 3D Tumbling Dice Roll Animation (~1.5s duration)
  const handleRollClick = () => {
    sounds.playDiceRoll();
    setIsRolling(true);

    animationStateRef.current = {
      ...animationStateRef.current,
      diceRolling: true,
      diceStart: performance.now(),
      diceDuration: 1500,
      diceTargets: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
    };

    setTimeout(() => {
      onRollDice();
    }, 1500);
  };

  // Sync Final Dice Faces when Server Dice Updates
  useEffect(() => {
    if (dice && dice.length === 2) {
      animationStateRef.current.diceTargets = dice;
      diceMeshesRef.current.forEach((die, idx) => {
        const rot = getDiceTargetRotation(dice[idx] || 1);
        die.rotation.set(rot.x, rot.y, rot.z);
        die.position.y = 0.86;
      });
    }
  }, [dice]);

  return (
    <div className="relative w-full h-[calc(100vh-175px)] max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-black bg-[#111512]">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Camera Reset Button */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700 shadow-xl">
        <button
          onClick={resetCamera}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          title="Reset 3D View to Center Overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset View</span>
        </button>
      </div>

      {/* Floating Center Turn & Action Panel */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border-2 border-black rounded-3xl p-4 shadow-2xl pointer-events-auto text-slate-100 flex flex-col items-center gap-3">
          {/* Turn Banner */}
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2 text-xs font-black">
            <div className="flex items-center gap-2">
              <span className="text-base">🎲</span>
              <span style={{ color: currentPlayer?.color || "#F59E0B" }}>
                {isMyTurn ? "Your Turn" : (currentPlayer?.name ? currentPlayer.name + "'s Turn" : "Player's Turn")}
              </span>
            </div>

            {/* Turn Timer */}
            {gameState.turnTimeRemaining !== undefined && (
              <div className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-400">
                ⏳ {gameState.turnTimeRemaining}s
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full flex items-center justify-center gap-2">
            {isMyTurn && phase === "ROLL" && (
              <button
                onClick={handleRollClick}
                disabled={isRolling}
                className="w-full py-3 bg-[#ED1B24] hover:bg-red-700 text-white font-black text-sm rounded-xl border-2 border-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Dices className="w-4 h-4" />
                <span>{isRolling ? "Rolling 3D Dice..." : "Roll Dice"}</span>
              </button>
            )}

            {isMyTurn && isPendingBuy && pendingBuyTile && (
              <div className="w-full flex gap-2">
                <button
                  onClick={onBuyProperty}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl border-2 border-black shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Buy {pendingBuyTile.name} (M{pendingBuyTile.price})</span>
                </button>
                <button
                  onClick={onPassProperty}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600 transition cursor-pointer"
                >
                  Pass
                </button>
              </div>
            )}

            {isMyTurn && phase === "ACTION" && !isPendingBuy && (
              <button
                onClick={onEndTurn}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-black text-xs rounded-xl border-2 border-black shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>End My Turn</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!isMyTurn && (
              <div className="text-xs text-slate-400 font-bold py-1">
                Waiting for {currentPlayer?.name || "current player"} to play...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
