import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BIKE_COLOR_PALETTES } from '../data/wordQuestions';
import { LevelDefinition, PlayerConfig, PlayerRaceState } from '../types/game';
import {
  BIOME_3D_CONFIGS,
  createAthleticsTrackTexture,
  createBonusItem3D,
  createCheckeredTexture,
  createContactShadowTexture,
  createEnvironmentScenery,
  createFinishArch3D,
  createHurdleBarTexture,
  createObstacle3D,
  createRunner3D,
  createSkyDome,
  createTerrainTexture,
  Obstacle3DRig,
  RunnerRig,
} from '../utils/threeTrackBuilders';

interface TrackCanvasProps {
  players: PlayerConfig[];
  raceStatesRef: React.MutableRefObject<PlayerRaceState[]>;
  levelDef: LevelDefinition;
  paused: boolean;
}

const WORLD_SCALE = 0.14;
const TRACK_WIDTH = 7.4;
const MAX_PARTICLES = 240;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _vec3 = new THREE.Vector3();
const _projVec = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function getRunnerZOffsets(count: number): number[] {
  if (count <= 1) return [0];
  if (count === 2) return [-1.25, 1.25];
  if (count === 3) return [-1.95, 0, 1.95];
  return [-2.3, -0.78, 0.78, 2.3];
}

interface RunnerOverlayRefs {
  badgeEl: HTMLDivElement | null;
  badgeCardEl: HTMLDivElement | null;
  rankLabelEl: HTMLSpanElement | null;
  toastEl: HTMLDivElement | null;
  miniMarkerEl: HTMLDivElement | null;
}

export const TrackCanvas: React.FC<TrackCanvasProps> = ({
  players,
  raceStatesRef,
  levelDef,
  paused,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const webglMountRef = useRef<HTMLDivElement | null>(null);
  const overlayRefs = useRef<Record<number, RunnerOverlayRefs>>({});
  const crashVignetteRef = useRef<HTMLDivElement | null>(null);
  const pausedOverlayRef = useRef<HTMLDivElement | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const playersRef = useRef(players);
  playersRef.current = players;
  const levelDefRef = useRef(levelDef);
  levelDefRef.current = levelDef;

  const activePlayers = players.filter((p) => p.active);
  const activeKey = activePlayers
    .map(
      (p) =>
        `${p.id}:${p.name}:${p.bikeColor}:${p.bikeModel}:${p.helmetStyle}:${p.raceNumber}`
    )
    .join('|');
  const levelKey = `${levelDef.level}:${levelDef.biome}:${levelDef.trackLength}:${levelDef.obstacleCount}`;

  useEffect(() => {
    const mountEl = webglMountRef.current;
    const containerEl = containerRef.current;
    if (!mountEl || !containerEl) return;

    const currentPlayers = playersRef.current.filter((p) => p.active);
    const activeLevelDef = levelDefRef.current;
    const playerCount = Math.max(1, currentPlayers.length);
    const zOffsets = getRunnerZOffsets(playerCount);
    const biomeCfg = BIOME_3D_CONFIGS[activeLevelDef.biome];
    const isSoftwareGl = detectSoftwareWebGL();

    // 1. Single Panoramic WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountEl.appendChild(renderer.domElement);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

    // 2. Scene, Environment Reflections & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(biomeCfg.skyHorizon);
    scene.fog = new THREE.FogExp2(biomeCfg.fogColor, biomeCfg.fogDensity);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const skyDome = createSkyDome(biomeCfg.skyZenith, biomeCfg.skyHorizon);
    scene.add(skyDome);

    // 3. Bright Outdoor Stadium Lighting
    const hemiLight = new THREE.HemisphereLight(
      biomeCfg.hemiSky,
      biomeCfg.hemiGround,
      biomeCfg.hemiIntensity
    );
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(biomeCfg.sunColor, biomeCfg.sunIntensity);
    sunLight.position.set(16, 42, 26);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 150;
      const d = 32;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.6);
    rimLight.position.set(-18, 16, -24);
    scene.add(rimLight);

    // 4. Unified Wide Running Track (Running Right -> Left along -X)
    const trackLengthMeters = activeLevelDef.trackLength * WORLD_SCALE;
    const totalRoadLen = trackLengthMeters + 220;

    const terrainTex = createTerrainTexture(
      biomeCfg.grassBase,
      biomeCfg.grassAccent,
      maxAnisotropy
    );
    terrainTex.repeat.set(Math.max(20, Math.round(totalRoadLen / 10)), 24);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.9,
      metalness: 0.02,
    });
    const terrainMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(totalRoadLen + 260, 320),
      terrainMat
    );
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.set(-(totalRoadLen / 2) + 60, 0, 0);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    const trackTex = createAthleticsTrackTexture(
      biomeCfg.trackBase,
      biomeCfg.trackStripe,
      biomeCfg.curbA,
      biomeCfg.curbB,
      maxAnisotropy
    );
    trackTex.repeat.set(Math.max(18, Math.round(totalRoadLen / 7.5)), 1);
    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.78,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const unifiedTrackMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(totalRoadLen, TRACK_WIDTH),
      trackMat
    );
    unifiedTrackMesh.rotation.x = -Math.PI / 2;
    unifiedTrackMesh.position.set(-(totalRoadLen / 2) + 60, 0.02, 0);
    unifiedTrackMesh.receiveShadow = true;
    scene.add(unifiedTrackMesh);

    const hurdleTex = createHurdleBarTexture(maxAnisotropy);
    const checkTex = createCheckeredTexture(maxAnisotropy);
    const shadowTex = createContactShadowTexture();

    const finishArch = createFinishArch3D(TRACK_WIDTH, checkTex);
    finishArch.position.set(-trackLengthMeters, 0, 0);
    scene.add(finishArch);

    createEnvironmentScenery(scene, activeLevelDef.biome, TRACK_WIDTH, trackLengthMeters);

    // 5. Build Single Shared Stadium Camera & All 4 Runners on 1 Unified Track
    const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 520);
    camera.position.set(2.5, 4.6, 13.6);
    camera.lookAt(-1.5, 1.0, 0);

    const runnerRigs = new Map<number, RunnerRig>();
    const obstacleRigs = new Map<string, Obstacle3DRig>();
    const bonusMeshes = new Map<string, THREE.Group>();

    currentPlayers.forEach((player, idx) => {
      const lz = zOffsets[idx] ?? 0;
      const palette =
        BIKE_COLOR_PALETTES.find((c) => c.id === player.bikeColor) ?? BIKE_COLOR_PALETTES[0];

      const runnerRig = createRunner3D(player, palette, shadowTex, maxAnisotropy);
      // Rotate +90 deg around Y so runner faces -X (Right -> Left!)
      runnerRig.root.rotation.y = Math.PI / 2;
      runnerRig.root.position.set(0, 0, lz);
      scene.add(runnerRig.root);
      runnerRigs.set(player.id, runnerRig);

      const st = raceStatesRef.current.find((s) => s.playerId === player.id);
      if (st) {
        for (const obs of st.obstacles) {
          const rig = createObstacle3D(obs.kind, hurdleTex);
          // Rotate +90 deg so hurdle spans along Z perpendicular to X running path
          rig.group.rotation.y = Math.PI / 2;
          rig.group.scale.set(0.55, 0.9, 0.9);
          rig.group.position.set(0, 0, lz);
          rig.group.visible = false;
          scene.add(rig.group);
          obstacleRigs.set(obs.id, rig);
        }
        for (const bon of st.bonusItems) {
          const mesh = createBonusItem3D(bon.type);
          mesh.scale.setScalar(0.85);
          mesh.position.set(0, 0, lz);
          mesh.visible = false;
          scene.add(mesh);
          bonusMeshes.set(bon.id, mesh);
        }
      }
    });

    // 6. Pooled 3D Particle System
    const particleGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
    particleMesh.frustumCulled = false;
    particleMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 3),
      3
    );
    particleMesh.count = 0;
    scene.add(particleMesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let viewW = 1;
    let viewH = 1;
    const handleResize = () => {
      const w = containerEl.clientWidth || 1;
      const h = containerEl.clientHeight || 1;
      if (w !== viewW || h !== viewH) {
        viewW = w;
        viewH = h;
        camera.aspect = viewW / viewH;
        camera.updateProjectionMatrix();
        renderer.setSize(viewW, viewH, false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 7. Race Dynamics, Separation & Impact Shake Tracking
    const smoothBehindMap: Record<number, number> = {};
    const prevCrashMap: Record<number, number> = {};
    const prevJumpMap: Record<number, number> = {};
    const resolvedCache = new Map<string, string>();
    const stridePhaseMap: Record<number, number> = {};
    let cameraAnchorX = 0;
    let impactShake = 0;

    let frameId = 0;
    let disposed = false;
    let lastClockMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      handleResize();

      const nowMs = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastClockMs) / 1000));
      lastClockMs = nowMs;
      const timeSec = nowMs / 1000;

      const states = raceStatesRef.current;
      const sortedStates = [...states].sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished && (a.finishRank ?? 9) !== (b.finishRank ?? 9)) {
          return (a.finishRank ?? 9) - (b.finishRank ?? 9);
        }
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        if (a.wrongCount !== b.wrongCount) return a.wrongCount - b.wrongCount;
        if (b.score !== a.score) return b.score - a.score;
        return b.distance - a.distance;
      });
      const sortedIds = sortedStates.map((s) => s.playerId);
      const hasAnyScore = states.some(
        (s) => s.score > 0 || s.correctCount > 0 || s.wrongCount > 0
      );
      const maxDist = states.length > 0 ? Math.max(...states.map((s) => s.distance)) : 0;

      // Right-to-Left progress anchor: leader moves steadily toward -trackLengthMeters
      const targetAnchorX = -maxDist * WORLD_SCALE;
      cameraAnchorX = THREE.MathUtils.damp(cameraAnchorX, targetAnchorX, 7.0, dt);

      // Compute clear horizontal spacing between the 4 runners on the 1 unified track:
      // 0m = #1 TERDEPAN (furthest left toward Finish); up to +13.5m = trailing runner (furthest right)
      const totalQuestions = Math.max(1, activeLevelDef.obstacleCount);
      const refMaxScore = totalQuestions * 145;
      const maxBehindM = 13.5;
      const minStepM = Math.max(2.1, maxBehindM / Math.max(3, totalQuestions * 0.65));

      const targetBehindMap: Record<number, number> = {};
      if (!hasAnyScore) {
        for (const st of sortedStates) {
          targetBehindMap[st.playerId] = 0;
        }
      } else {
        for (const st of sortedStates) {
          const scoreRatio = Math.max(0, Math.min(1, st.score / refMaxScore));
          const qRatio = Math.max(0, Math.min(1, st.correctCount / totalQuestions));
          const wrongPenalty = (st.wrongCount / totalQuestions) * 0.16;
          const leadProgress = Math.max(
            0,
            Math.min(1, 0.1 + scoreRatio * 0.62 + qRatio * 0.28 - wrongPenalty)
          );
          targetBehindMap[st.playerId] = maxBehindM * (1 - leadProgress);
        }

        // Shift leader to 0m behind so #1 always holds the left lead position
        const minRaw = Math.min(...Object.values(targetBehindMap));
        for (const idStr of Object.keys(targetBehindMap)) {
          targetBehindMap[Number(idStr)] -= minRaw;
        }

        // Enforce strict visible separation between ranked runners
        for (let i = 1; i < sortedStates.length; i++) {
          const ahead = sortedStates[i - 1];
          const behind = sortedStates[i];
          const diff =
            ahead.score !== behind.score ||
            ahead.correctCount !== behind.correctCount ||
            ahead.wrongCount !== behind.wrongCount;
          if (diff) {
            const minNeeded = targetBehindMap[ahead.playerId] + minStepM;
            if (targetBehindMap[behind.playerId] < minNeeded) {
              targetBehindMap[behind.playerId] = minNeeded;
            }
          } else {
            targetBehindMap[behind.playerId] = targetBehindMap[ahead.playerId];
          }
        }

        const maxAssigned = Math.max(maxBehindM, ...Object.values(targetBehindMap));
        if (maxAssigned > maxBehindM) {
          const scaleDown = maxBehindM / maxAssigned;
          for (const idStr of Object.keys(targetBehindMap)) {
            targetBehindMap[Number(idStr)] *= scaleDown;
          }
        }
      }

      let particleCount = 0;
      const runnerPositionsX: Record<number, number> = {};

      currentPlayers.forEach((player, idx) => {
        const st = states.find((s) => s.playerId === player.id);
        if (!st) return;

        const lz = zOffsets[idx] ?? 0;
        const rank = Math.max(1, sortedIds.indexOf(player.id) + 1);

        const targetBehind = targetBehindMap[player.id] ?? 0;
        const prevBehind = smoothBehindMap[player.id] ?? targetBehind;
        const nextBehind = THREE.MathUtils.damp(prevBehind, targetBehind, 6.0, dt);
        smoothBehindMap[player.id] = nextBehind;

        const runnerX = cameraAnchorX + nextBehind;
        runnerPositionsX[player.id] = runnerX;

        // Detect collisions / crashes / shield impacts for shake effect
        const prevCrash = prevCrashMap[player.id] ?? 0;
        const prevJump = prevJumpMap[player.id] ?? 0;
        let newlyImpacted = prevCrash <= 0 && st.crashTimer > 0;
        let shieldImpact = false;

        for (const obs of st.obstacles) {
          const prevRes = resolvedCache.get(obs.id);
          if (prevRes !== undefined && prevRes !== obs.resolved) {
            if (obs.resolved === 'crashed') newlyImpacted = true;
            if (obs.resolved === 'shielded') shieldImpact = true;
          }
          resolvedCache.set(obs.id, obs.resolved);

          const obsRig = obstacleRigs.get(obs.id);
          if (obsRig) {
            const distDelta = obs.x - st.distance;
            const visibleInTrack = distDelta > -70 && distDelta < 520;
            obsRig.group.visible = visibleInTrack;
            if (visibleInTrack) {
              // Hurdle glides in from the left (-X) toward the runner
              obsRig.group.position.set(runnerX - distDelta * 0.055, 0, lz);
              const isActive =
                st.activeObstacleIndex !== null &&
                st.obstacles[st.activeObstacleIndex]?.id === obs.id;
              obsRig.beaconRing.visible = isActive && obs.resolved === 'pending';
              if (obsRig.beaconRing.visible) {
                const pulse = 1 + 0.14 * Math.sin(timeSec * 9);
                obsRig.beaconRing.scale.set(pulse, pulse, 1);
              }
              if (obs.resolved === 'crashed') {
                obsRig.group.rotation.z = 1.15;
                obsRig.group.position.y = 0.06;
              } else {
                obsRig.group.rotation.z = 0;
                obsRig.group.position.y = 0;
              }
            }
          }
        }

        for (const bon of st.bonusItems) {
          const bonMesh = bonusMeshes.get(bon.id);
          if (bonMesh) {
            const bonDelta = bon.x - st.distance;
            const visible = !bon.collected && bonDelta > -35 && bonDelta < 480;
            bonMesh.visible = visible;
            if (visible) {
              bonMesh.position.set(
                runnerX - bonDelta * 0.055,
                Math.sin(timeSec * 4 + bon.x) * 0.16,
                lz
              );
              bonMesh.rotation.y = timeSec * 2.6;
            }
          }
        }

        const heavyLanding = prevJump > 6 && st.jumpY <= 0.5;
        if (newlyImpacted) {
          impactShake = Math.max(impactShake, 1.0);
        } else if (shieldImpact) {
          impactShake = Math.max(impactShake, 0.52);
        } else if (heavyLanding) {
          impactShake = Math.max(impactShake, 0.2);
        }

        prevCrashMap[player.id] = st.crashTimer;
        prevJumpMap[player.id] = st.jumpY;

        // Animate 3D Runner (Facing -X: Right -> Left!)
        const rig = runnerRigs.get(player.id);
        if (rig) {
          const jumpM = st.jumpY * 0.025;
          const isCrashed = st.crashTimer > 0;
          const isNitro = st.nitroTimer > 0;
          const isJumping = st.jumpY > 2;

          if (!pausedRef.current && !isCrashed && st.speed > 5) {
            const cadence = (st.speed / 110) * (isNitro ? 13.5 : 10.5);
            stridePhaseMap[player.id] = (stridePhaseMap[player.id] ?? idx * 1.4) + cadence * dt;
          }
          const phase = stridePhaseMap[player.id] ?? 0;

          rig.root.position.set(runnerX, 0, lz);
          rig.contactShadow.scale.setScalar(Math.max(0.45, 1 - jumpM * 0.16));
          (rig.contactShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(
            0.16,
            0.58 - jumpM * 0.15
          );

          if (isCrashed) {
            rig.bodyPivot.position.y = 0.34;
            rig.bodyPivot.rotation.set(-1.28, 0.25 * Math.sin(timeSec * 12), 0.38);
            rig.torso.rotation.set(0.15, 0, 0);
            rig.leftArm.rotation.set(-0.9, 0, -0.45);
            rig.rightArm.rotation.set(-0.75, 0, 0.45);
            rig.leftForearm.rotation.x = 0.6;
            rig.rightForearm.rotation.x = 0.6;
            rig.leftLeg.rotation.x = 0.35;
            rig.rightLeg.rotation.x = -0.25;
            rig.leftKnee.rotation.x = -0.5;
            rig.rightKnee.rotation.x = -0.35;
          } else if (isJumping) {
            rig.bodyPivot.position.y = 0.96 + jumpM;
            rig.bodyPivot.rotation.set(-0.34, 0, 0);
            rig.torso.rotation.set(-0.12, 0, 0);
            rig.leftLeg.rotation.x = 1.25;
            rig.leftKnee.rotation.x = -0.45;
            rig.rightLeg.rotation.x = -0.75;
            rig.rightKnee.rotation.x = -1.45;
            rig.leftArm.rotation.x = -0.65;
            rig.rightArm.rotation.x = 1.15;
            rig.leftForearm.rotation.x = 1.1;
            rig.rightForearm.rotation.x = 1.2;
          } else if (st.finished) {
            rig.bodyPivot.position.y = 0.96 + Math.abs(Math.sin(timeSec * 6)) * 0.08;
            rig.bodyPivot.rotation.set(0, 0, 0);
            rig.torso.rotation.set(0, 0, 0);
            rig.leftArm.rotation.set(2.5, 0, -0.35);
            rig.rightArm.rotation.set(2.5, 0, 0.35);
            rig.leftForearm.rotation.x = 0.2;
            rig.rightForearm.rotation.x = 0.2;
            rig.leftLeg.rotation.x = 0.1;
            rig.rightLeg.rotation.x = -0.1;
            rig.leftKnee.rotation.x = 0;
            rig.rightKnee.rotation.x = 0;
          } else {
            const s = Math.sin(phase);
            const bounce = Math.abs(Math.cos(phase)) * 0.085;
            const lean = isNitro ? -0.34 : -0.22;

            rig.bodyPivot.position.y = 0.96 + bounce;
            rig.bodyPivot.rotation.set(lean, 0, s * 0.045);
            rig.torso.rotation.set(0, -s * 0.14, 0);

            rig.leftLeg.rotation.x = s * 0.98;
            rig.rightLeg.rotation.x = -s * 0.98;
            rig.leftKnee.rotation.x = -Math.max(0.15, (1 - s) * 0.85);
            rig.rightKnee.rotation.x = -Math.max(0.15, (1 + s) * 0.85);

            rig.leftArm.rotation.x = -s * 1.05;
            rig.rightArm.rotation.x = s * 1.05;
            rig.leftArm.rotation.z = -0.12;
            rig.rightArm.rotation.z = 0.12;
            rig.leftForearm.rotation.x = 1.45;
            rig.rightForearm.rotation.x = 1.45;
          }

          rig.shieldMesh.visible = st.shieldActive;
          if (st.shieldActive) {
            rig.shieldMesh.rotation.y = timeSec * 1.8;
          }
          for (const trail of rig.speedTrails) {
            trail.visible = isNitro && !isCrashed;
            if (trail.visible) {
              trail.scale.set(1, 0.8 + Math.random() * 0.45, 1);
            }
          }
        }

        // Collect 3D Particles behind runner (+X trailing side)
        for (const pt of st.particles) {
          if (particleCount >= MAX_PARTICLES) break;
          const trailOffset = Math.max(-0.5, (st.distance - pt.x) * 0.045);
          const py = Math.max(0.08, pt.y * 0.028);
          const pz = lz + ((pt.vy % 12) / 12 - 0.5) * 0.45;
          const lifeScale = Math.max(0.25, (pt.life / pt.maxLife) * (pt.radius * 0.42));

          _dummy.position.set(runnerX + trailOffset, py, pz);
          _dummy.scale.setScalar(lifeScale);
          _dummy.updateMatrix();
          particleMesh.setMatrixAt(particleCount, _dummy.matrix);
          _color.set(pt.color);
          particleMesh.setColorAt(particleCount, _color);
          particleCount += 1;
        }
      });

      particleMesh.count = particleCount;
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

      // Update Finish Arch position relative to leader so it glides in from the left near 100%
      const remainingToFinish = Math.max(-6, (activeLevelDef.trackLength - maxDist) * 0.055);
      finishArch.position.set(cameraAnchorX - remainingToFinish, 0, 0);

      // Update Shared Camera framing all 4 runners on 1 unified track + Collision Shake
      impactShake = impactShake * Math.exp(-7.0 * dt);
      if (impactShake < 0.006) impactShake = 0;

      const shakeX = impactShake > 0 ? Math.sin(timeSec * 66) * impactShake * 0.45 : 0;
      const shakeY = impactShake > 0 ? Math.cos(timeSec * 82) * impactShake * 0.32 : 0;

      const packCenterOffset = hasAnyScore ? maxBehindM * 0.42 : 0;
      const camTargetX = cameraAnchorX + packCenterOffset;
      camera.position.set(camTargetX + 2.8 + shakeX, 4.75 + shakeY, 13.8);
      _vec3.set(camTargetX - 1.2 + shakeX * 0.4, 1.05 + shakeY * 0.35, 0);
      camera.lookAt(_vec3);
      if (impactShake > 0) {
        camera.rotation.z += Math.sin(timeSec * 54) * impactShake * 0.035;
      }
      camera.updateMatrixWorld();

      skyDome.position.set(camTargetX, 0, 0);
      sunLight.position.set(camTargetX + 16, 42, 26);
      sunLight.target.position.set(camTargetX - 4, 0, 0);
      sunLight.target.updateMatrixWorld();

      // Apply physical shake animation on TrackCanvas container itself
      if (impactShake > 0) {
        const gx = Math.sin(timeSec * 68) * impactShake * 10;
        const gy = Math.cos(timeSec * 82) * impactShake * 7;
        const grot = Math.sin(timeSec * 52) * impactShake * 0.85;
        containerEl.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) rotate(${grot.toFixed(2)}deg)`;
      } else {
        containerEl.style.transform = 'translate3d(0px, 0px, 0)';
      }

      if (crashVignetteRef.current) {
        crashVignetteRef.current.style.opacity = String(Math.min(0.45, impactShake * 0.6));
      }
      if (pausedOverlayRef.current) {
        pausedOverlayRef.current.style.display = pausedRef.current ? 'flex' : 'none';
      }

      // Render unified 3D arena
      renderer.render(scene, camera);

      // Project 3D head coordinates -> Floating HUD badges & toasts over each runner
      currentPlayers.forEach((player, idx) => {
        const st = states.find((s) => s.playerId === player.id);
        const ov = overlayRefs.current[player.id];
        if (!st || !ov) return;

        const lz = zOffsets[idx] ?? 0;
        const rx = runnerPositionsX[player.id] ?? cameraAnchorX;
        const rank = Math.max(1, sortedIds.indexOf(player.id) + 1);
        const headWorldY = (st.crashTimer > 0 ? 1.1 : 2.15) + st.jumpY * 0.025;

        _projVec.set(rx, headWorldY, lz).project(camera);
        const sx = (_projVec.x * 0.5 + 0.5) * viewW;
        const sy = (-_projVec.y * 0.5 + 0.5) * viewH;

        if (ov.badgeEl) {
          ov.badgeEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
        }
        if (ov.badgeCardEl) {
          ov.badgeCardEl.style.borderColor =
            st.crashTimer > 0
              ? '#EF4444'
              : rank === 1 && hasAnyScore
              ? '#FACC15'
              : 'rgba(148, 163, 184, 0.5)';
        }
        if (ov.rankLabelEl) {
          if (st.crashTimer > 0) {
            ov.rankLabelEl.textContent = 'TERJATUH!';
            ov.rankLabelEl.style.color = '#FCA5A5';
          } else if (st.finished) {
            ov.rankLabelEl.textContent = `FINIS #${rank}`;
            ov.rankLabelEl.style.color = '#4ADE80';
          } else if (rank === 1 && hasAnyScore) {
            ov.rankLabelEl.textContent = '#1 TERDEPAN';
            ov.rankLabelEl.style.color = '#FACC15';
          } else {
            ov.rankLabelEl.textContent = `#${rank} · ${st.score}`;
            ov.rankLabelEl.style.color = '#E2E8F0';
          }
        }
        if (ov.toastEl) {
          const latestToast = st.toasts[st.toasts.length - 1];
          if (latestToast) {
            ov.toastEl.style.display = 'block';
            ov.toastEl.textContent = latestToast.text;
            ov.toastEl.style.color = latestToast.color;
            ov.toastEl.style.opacity = String(
              Math.max(0, Math.min(1, latestToast.life / (latestToast.maxLife * 0.45)))
            );
          } else {
            ov.toastEl.style.display = 'none';
          }
        }
        if (ov.miniMarkerEl) {
          // Right-to-Left progress strip: Start at right (100%), Finish at left (0%)
          const pctFromRight = Math.min(100, (st.distance / activeLevelDef.trackLength) * 100);
          const leftPct = Math.max(2, Math.min(98, 100 - pctFromRight));
          ov.miniMarkerEl.style.left = `${leftPct.toFixed(1)}%`;
        }
      });

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      containerEl.style.transform = 'translate3d(0px, 0px, 0)';

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      terrainTex.dispose();
      trackTex.dispose();
      hurdleTex.dispose();
      checkTex.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      mountEl.innerHTML = '';
    };
  }, [activeKey, levelKey, raceStatesRef]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      <div
        ref={containerRef}
        className="relative w-full h-full will-change-transform"
        aria-label="Arena lomba lari 1 lintasan 3D dari kanan ke kiri dengan efek getaran benturan"
      >
        <div ref={webglMountRef} className="absolute inset-0" />

        {/* Collision red flash overlay */}
        <div
          ref={crashVignetteRef}
          className="absolute inset-0 z-10 bg-red-600/60 opacity-0 pointer-events-none"
        />

        {/* Top Shared Race Progress Strip (Right START -> Left FINIS) */}
        <div className="absolute top-2 left-3 right-3 z-20 pointer-events-none">
          <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-display font-extrabold text-amber-400 tracking-wider whitespace-nowrap">
              ← FINIS
            </span>
            <div className="relative flex-1 h-3 bg-slate-800 rounded-full border border-slate-700">
              {activePlayers.map((player) => {
                const palette =
                  BIKE_COLOR_PALETTES.find((c) => c.id === player.bikeColor) ??
                  BIKE_COLOR_PALETTES[0];
                return (
                  <div
                    key={player.id}
                    ref={(el) => {
                      if (!overlayRefs.current[player.id]) {
                        overlayRefs.current[player.id] = {
                          badgeEl: null,
                          badgeCardEl: null,
                          rankLabelEl: null,
                          toastEl: null,
                          miniMarkerEl: null,
                        };
                      }
                      overlayRefs.current[player.id].miniMarkerEl = el;
                    }}
                    style={{ left: '98%', backgroundColor: palette.primary }}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-display font-extrabold text-white shadow"
                  >
                    P{player.id + 1}
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] font-display font-bold text-slate-300 tracking-wider whitespace-nowrap">
              MULAI
            </span>
          </div>
        </div>

        {/* 3D-Projected Runner Tags & Toasts */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {activePlayers.map((player) => {
            const palette =
              BIKE_COLOR_PALETTES.find((c) => c.id === player.bikeColor) ??
              BIKE_COLOR_PALETTES[0];
            const setOverlayRef =
              (key: keyof RunnerOverlayRefs) =>
              (el: HTMLDivElement | HTMLSpanElement | null) => {
                if (!overlayRefs.current[player.id]) {
                  overlayRefs.current[player.id] = {
                    badgeEl: null,
                    badgeCardEl: null,
                    rankLabelEl: null,
                    toastEl: null,
                    miniMarkerEl: null,
                  };
                }
                (overlayRefs.current[player.id][key] as unknown) = el;
              };

            return (
              <div
                key={player.id}
                ref={setOverlayRef('badgeEl')}
                style={{ transform: 'translate3d(-999px, -999px, 0)' }}
                className="absolute top-0 left-0 flex flex-col items-center gap-0.5"
              >
                <div
                  ref={setOverlayRef('toastEl')}
                  className="hidden font-display text-xs sm:text-sm font-extrabold drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] whitespace-nowrap"
                />
                <div
                  ref={setOverlayRef('badgeCardEl')}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-500/60 shadow-md whitespace-nowrap"
                >
                  <span
                    className="px-1 rounded text-[9px] font-display font-bold text-white"
                    style={{ backgroundColor: palette.primary }}
                  >
                    P{player.id + 1}
                  </span>
                  <span className="text-[10px] font-bold text-white max-w-[74px] truncate">
                    {player.name}
                  </span>
                  <span
                    ref={setOverlayRef('rankLabelEl')}
                    className="text-[10px] font-mono-num font-bold text-amber-300"
                  >
                    #1 · 0
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pause Overlay */}
        <div
          ref={pausedOverlayRef}
          className="hidden absolute inset-0 z-30 items-center justify-center bg-slate-950/65 pointer-events-none"
        >
          <span className="font-display text-4xl font-extrabold text-white tracking-wide">
            LOMBA DIJEDA
          </span>
        </div>
      </div>
    </div>
  );
};
