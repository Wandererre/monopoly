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

// Generate High-Res 2D Canvas Texture for Each 3D Tile
function createTileTexture(tile, isCorner) {
  const canvas = document.createElement("canvas");
  canvas.width = isCorner ? 512 : 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#FAF8F5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  const groupInfo = tile.group ? COLOR_GROUPS[tile.group] : null;

  if (tile.type === "property" && groupInfo) {
    // Top Color Bar
    ctx.fillStyle = groupInfo.color;
    ctx.fillRect(4, 4, canvas.width - 8, 120);
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, canvas.width - 8, 120);

    // City Name
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    const words = tile.name.split(" ");
    if (words.length === 1) {
      ctx.fillText(words[0], canvas.width / 2, 220);
    } else {
      ctx.fillText(words[0], canvas.width / 2, 200);
      ctx.fillText(words.slice(1).join(" "), canvas.width / 2, 235);
    }

    // Price
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#1E293B";
    ctx.fillText(`M${tile.price}`, canvas.width / 2, 450);
  } else if (tile.type === "railway") {
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RAILWAY", canvas.width / 2, 80);
    ctx.font = "60px sans-serif";
    ctx.fillText("🚆", canvas.width / 2, 240);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(tile.name.replace(" RAILWAY", ""), canvas.width / 2, 340);
    ctx.font = "bold 28px monospace";
    ctx.fillText(`M${tile.price}`, canvas.width / 2, 450);
  } else if (tile.type === "utility") {
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UTILITY", canvas.width / 2, 80);
    ctx.font = "60px sans-serif";
    ctx.fillText(tile.id === 12 ? "⚡" : "💧", canvas.width / 2, 240);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(tile.name, canvas.width / 2, 340);
    ctx.font = "bold 28px monospace";
    ctx.fillText(`M${tile.price}`, canvas.width / 2, 450);
  } else if (tile.type === "chance") {
    ctx.fillStyle = "#C2410C";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CHANCE", canvas.width / 2, 100);
    ctx.font = "90px sans-serif";
    ctx.fillText("❓", canvas.width / 2, 280);
  } else if (tile.type === "community_chest") {
    ctx.fillStyle = "#1D4ED8";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMMUNITY", canvas.width / 2, 80);
    ctx.fillText("CHEST", canvas.width / 2, 115);
    ctx.font = "90px sans-serif";
    ctx.fillText("📦", canvas.width / 2, 280);
  } else if (tile.type === "tax") {
    ctx.fillStyle = "#B91C1C";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tile.name, canvas.width / 2, 100);
    ctx.font = "70px sans-serif";
    ctx.fillText("💰", canvas.width / 2, 260);
    ctx.font = "bold 28px monospace";
    ctx.fillText(`PAY M${tile.amount}`, canvas.width / 2, 430);
  } else if (tile.id === 0) {
    // GO
    ctx.fillStyle = "#DC2626";
    ctx.font = "bold 80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO", canvas.width / 2, 220);
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#1E293B";
    ctx.fillText("COLLECT M200", canvas.width / 2, 330);
    ctx.fillText("AS YOU PASS", canvas.width / 2, 370);
    ctx.font = "60px sans-serif";
    ctx.fillText("⬅️", canvas.width / 2, 440);
  } else if (tile.id === 10) {
    // JAIL
    ctx.fillStyle = "#EA580C";
    ctx.font = "bold 60px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IN JAIL", canvas.width / 2, 240);
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText("JUST VISITING", canvas.width / 2, 380);
  } else if (tile.id === 20) {
    // FREE PARKING
    ctx.fillStyle = "#DC2626";
    ctx.font = "bold 50px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FREE", canvas.width / 2, 180);
    ctx.fillText("PARKING", canvas.width / 2, 250);
    ctx.font = "70px sans-serif";
    ctx.fillText("🚗", canvas.width / 2, 360);
  } else if (tile.id === 30) {
    // GO TO JAIL
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO TO", canvas.width / 2, 180);
    ctx.fillText("JAIL", canvas.width / 2, 240);
    ctx.font = "70px sans-serif";
    ctx.fillText("👮", canvas.width / 2, 360);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
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

// Generate Canvas Texture for Dice Face
function createDiceFaceTexture(number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  // Rounded Ivory Face
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);

  // Black Pips
  ctx.fillStyle = "#0F172A";
  const drawPip = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
  };

  if (number === 1) {
    ctx.fillStyle = "#DC2626"; // Red center pip for 1
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

  return new THREE.CanvasTexture(canvas);
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
  const [selectedTileId, setSelectedTileId] = useState(null);
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
  const animationStateRef = useRef({
    diceRolling: false,
    diceStart: 0,
    diceDuration: 1300,
    diceTargets: [1, 1],
    hoppingTokens: {}
  });

  // Default Isometric Camera Position
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(18, 22, 18);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // 1. Initialize Three.js WebGL Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#161A17");

    // Camera (Elevated Isometric View)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(18, 22, 18);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.15; // Prevent viewing underneath
    controls.minDistance = 12;
    controls.maxDistance = 45;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(14, 28, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.35);
    fillLight.position.set(-14, 12, -14);
    scene.add(fillLight);

    // 2. Build 3D Board Base (Mahogany Slab + Center Felt)
    const baseGeo = new THREE.BoxGeometry(BOARD_SIZE + 0.6, 0.7, BOARD_SIZE + 0.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: "#1E1815",
      roughness: 0.4,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Center Felt Mat
    const feltSize = BOARD_SIZE - 2 * CORNER_SIZE;
    const feltGeo = new THREE.PlaneGeometry(feltSize, feltSize);
    const feltMat = new THREE.MeshStandardMaterial({
      color: "#0F281E", // Rich luxury green felt
      roughness: 0.8
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.y = 0.41;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Center Logo Canvas
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = 512;
    logoCanvas.height = 512;
    const lctx = logoCanvas.getContext("2d");
    lctx.fillStyle = "#ED1B24";
    lctx.fillRect(64, 200, 384, 112);
    lctx.strokeStyle = "#000000";
    lctx.lineWidth = 10;
    lctx.strokeRect(64, 200, 384, 112);
    lctx.fillStyle = "#FFFFFF";
    lctx.font = "bold 64px sans-serif";
    lctx.textAlign = "center";
    lctx.fillText("MONOPOLY", 256, 280);
    lctx.fillStyle = "#F59E0B";
    lctx.font = "bold 28px sans-serif";
    lctx.fillText("★ INDIA EDITION ★", 256, 350);

    const logoTexture = new THREE.CanvasTexture(logoCanvas);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), logoMat);
    logoMesh.rotation.x = -Math.PI / 2;
    logoMesh.rotation.z = Math.PI / 4;
    logoMesh.position.y = 0.42;
    scene.add(logoMesh);

    // 3. Build 40 Tile Meshes with Dynamic Textures
    const tileGroup = new THREE.Group();
    tileGroup.name = "TILES_GROUP";
    BOARD_TILES.forEach((tile) => {
      const isCorner = [0, 10, 20, 30].includes(tile.id);
      const w = isCorner ? CORNER_SIZE : TILE_WIDTH;
      const d = CORNER_SIZE;
      const tileGeo = new THREE.BoxGeometry(w - 0.03, 0.1, d - 0.03);

      const texture = createTileTexture(tile, isCorner);
      const matTop = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3 });
      const matSide = new THREE.MeshStandardMaterial({ color: "#2B2623", roughness: 0.5 });
      const materials = [matSide, matSide, matTop, matSide, matSide, matSide];

      const mesh = new THREE.Mesh(tileGeo, materials);
      const pos = getTile3DPosition(tile.id);
      mesh.position.set(pos.x, 0.41, pos.z);

      // Rotate tiles according to edge
      if (tile.id >= 1 && tile.id <= 9) mesh.rotation.y = 0;
      else if (tile.id >= 11 && tile.id <= 19) mesh.rotation.y = Math.PI / 2;
      else if (tile.id >= 21 && tile.id <= 29) mesh.rotation.y = Math.PI;
      else if (tile.id >= 31 && tile.id <= 39) mesh.rotation.y = -Math.PI / 2;

      mesh.receiveShadow = true;
      mesh.userData = { tileId: tile.id };
      tileGroup.add(mesh);
    });
    scene.add(tileGroup);

    // 4. Build 3D Dice Pair
    const diceMaterials = [
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1), roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6), roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2), roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5), roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3), roughness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4), roughness: 0.2 })
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

    // 5. Raycaster for Tile Clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tileGroup.children);
      if (intersects.length > 0) {
        const clickedTileId = intersects[0].object.userData?.tileId;
        if (clickedTileId !== undefined) {
          setSelectedTileId(clickedTileId);
          if (onTileClick) onTileClick(clickedTileId);
        }
      }
    };

    mount.addEventListener("pointerdown", handlePointerDown);

    // 6. Main Animation Loop
    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      const now = performance.now();
      const anim = animationStateRef.current;

      // Tumbling Dice Animation
      if (anim.diceRolling && diceMeshesRef.current.length === 2) {
        const progress = Math.min(1, (now - anim.diceStart) / anim.diceDuration);

        diceMeshesRef.current.forEach((die, idx) => {
          const targetRot = getDiceTargetRotation(anim.diceTargets[idx] || 1);
          const spinMultiplier = (1 - progress) * 8 * Math.PI;

          // Parabolic Drop Arc
          const bounceHeight = Math.sin(progress * Math.PI) * 2.5 * (1 - progress * 0.7);
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

        // Linear (x, z) + Parabolic (y)
        tokenMesh.position.x = THREE.MathUtils.lerp(fromPos.x, toPos.x, p);
        tokenMesh.position.z = THREE.MathUtils.lerp(fromPos.z, toPos.z, p);
        tokenMesh.position.y = 0.5 + Math.sin(p * Math.PI) * 1.6; // Satisfying 3D arc

        if (p >= 1) {
          tokenMesh.position.copy(toPos);
          tokenMesh.position.y = 0.5;
          delete anim.hoppingTokens[pid];
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
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

  // 2. Synchronize 3D Player Pieces & Step Hopping
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    players.forEach((p) => {
      let tokenMesh = tokenMeshesRef.current[p.id];
      const tokData = PLAYER_TOKENS.find((t) => t.id === p.token) || PLAYER_TOKENS[0];

      // Create Token Mesh if doesn't exist
      if (!tokenMesh) {
        const group = new THREE.Group();

        // Stylized 3D Pawn Geometry (Beveled Pedestal + Sphere Head)
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.35, 24);
        const baseMat = new THREE.MeshStandardMaterial({
          color: p.color || tokData.color || "#3B82F6",
          metalness: 0.4,
          roughness: 0.3
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.17;
        base.castShadow = true;
        group.add(base);

        const bodyGeo = new THREE.ConeGeometry(0.3, 0.65, 24);
        const body = new THREE.Mesh(bodyGeo, baseMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.24, 24, 24);
        const head = new THREE.Mesh(headGeo, baseMat);
        head.position.y = 1.05;
        head.castShadow = true;
        group.add(head);

        // Emoji Sprite Floating Billboard
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.font = "80px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tokData.emoji, 64, 96);
        const spriteMat = new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          transparent: true
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 1.7;
        sprite.scale.set(0.9, 0.9, 0.9);
        group.add(sprite);

        const initialPos = getTile3DPosition(p.position || 0);
        group.position.set(initialPos.x, 0.5, initialPos.z);
        scene.add(group);
        tokenMeshesRef.current[p.id] = group;
        tokenMesh = group;
      }

      // Check for position change and start step-by-step 3D hop
      const currentPos = tokenMesh.userData?.lastPos !== undefined ? tokenMesh.userData.lastPos : p.position;
      const targetPos = p.position;

      if (currentPos !== targetPos) {
        tokenMesh.userData.lastPos = targetPos;

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

        // Slowed down step-by-step 3D hop at 280ms per step
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
              duration: 260
            };

            prevStep = nextStep;
            stepIdx++;
          } else {
            clearInterval(interval);
            if (onMovementComplete) onMovementComplete();
          }
        }, 280);
      }
    });
  }, [players]);

  // 3. Synchronize 3D Houses and Hotels
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clean old house meshes
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

  // 4. Trigger 3D Tumbling Dice Roll Animation
  const handleRollClick = () => {
    sounds.playDiceRoll();
    setIsRolling(true);

    animationStateRef.current = {
      ...animationStateRef.current,
      diceRolling: true,
      diceStart: performance.now(),
      diceDuration: 1300,
      diceTargets: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
    };

    setTimeout(() => {
      onRollDice();
    }, 1300);
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
    <div className="relative w-full h-[calc(100vh-175px)] max-w-7xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-black bg-[#161A17]">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Control Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700 shadow-xl">
        <button
          onClick={resetCamera}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
          title="Reset 3D View to Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset View</span>
        </button>

        <button
          onClick={() => onOpenCards && onOpenCards("chance")}
          className="px-2.5 py-1.5 rounded-xl bg-orange-950/80 hover:bg-orange-900 border border-orange-700/60 text-orange-200 transition text-xs font-bold cursor-pointer"
          title="View Chance Cards"
        >
          ❓ Chance
        </button>

        <button
          onClick={() => onOpenCards && onOpenCards("community")}
          className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-200 transition text-xs font-bold cursor-pointer"
          title="View Community Chest Cards"
        >
          📦 Chest
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
                {isMyTurn ? "Your Turn" : `${currentPlayer?.name || "Player"}'s Turn`}
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
