import * as THREE from 'three';
import {
  BikeColorPalette,
  BonusItemType,
  LevelDefinition,
  ObstacleKind,
  PlayerConfig,
} from '../types/game';

export interface Biome3DConfig {
  skyZenith: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  trackBase: string;
  trackStripe: string;
  grassBase: string;
  grassAccent: string;
  curbA: string;
  curbB: string;
  isNight: boolean;
}

export const BIOME_3D_CONFIGS: Record<LevelDefinition['biome'], Biome3DConfig> = {
  meadow: {
    skyZenith: 0x0284c7,
    skyHorizon: 0xdbeafe,
    fogColor: 0xdbeafe,
    fogDensity: 0.0068,
    sunColor: 0xfff8e7,
    sunIntensity: 2.5,
    hemiSky: 0x93c5fd,
    hemiGround: 0x166534,
    hemiIntensity: 1.15,
    trackBase: '#c84b26',
    trackStripe: '#b03e1c',
    grassBase: '#16803c',
    grassAccent: '#146b32',
    curbA: '#f8fafc',
    curbB: '#ef4444',
    isNight: false,
  },
  canyon: {
    skyZenith: 0xb45309,
    skyHorizon: 0xfef3c7,
    fogColor: 0xfde68a,
    fogDensity: 0.0072,
    sunColor: 0xffe4a3,
    sunIntensity: 2.6,
    hemiSky: 0xfdba74,
    hemiGround: 0x92400e,
    hemiIntensity: 1.1,
    trackBase: '#c25427',
    trackStripe: '#9a3d18',
    grassBase: '#b45309',
    grassAccent: '#92400e',
    curbA: '#fef08a',
    curbB: '#1e293b',
    isNight: false,
  },
  golden: {
    skyZenith: 0x1d4ed8,
    skyHorizon: 0xfef9c3,
    fogColor: 0xfef08a,
    fogDensity: 0.0068,
    sunColor: 0xffebb3,
    sunIntensity: 2.5,
    hemiSky: 0xbfdbfe,
    hemiGround: 0x854d0e,
    hemiIntensity: 1.12,
    trackBase: '#b45309',
    trackStripe: '#92400e',
    grassBase: '#4d7c0f',
    grassAccent: '#3f6212',
    curbA: '#ffffff',
    curbB: '#2563eb',
    isNight: false,
  },
  stadium: {
    skyZenith: 0x0f172a,
    skyHorizon: 0x1e3a5f,
    fogColor: 0x172554,
    fogDensity: 0.0078,
    sunColor: 0xf0f9ff,
    sunIntensity: 2.35,
    hemiSky: 0x60a5fa,
    hemiGround: 0x1e293b,
    hemiIntensity: 1.25,
    trackBase: '#1d4ed8', // Iconic Olympic blue running track
    trackStripe: '#1e40af',
    grassBase: '#15803d',
    grassAccent: '#14532d',
    curbA: '#facc15',
    curbB: '#f8fafc',
    isNight: true,
  },
};

export interface RunnerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  speedTrails: THREE.Mesh[];
  shieldMesh: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface Obstacle3DRig {
  group: THREE.Group;
  beaconRing: THREE.Mesh;
}

const ATHLETE_SKIN_TONES = [0xf1c29b, 0xdca57a, 0x8d5524, 0xc68642];

// ==================== PROCEDURAL TEXTURES ====================

export function createAthleticsTrackTexture(
  baseHex: string,
  stripeHex: string,
  curbA: string,
  curbB: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Fine synthetic tartan rubber granule texture
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : stripeHex;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Horizontal 4-lane white track lines running Right -> Left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (const ly of [136, 256, 376]) {
    ctx.fillRect(0, ly - 3, 512, 6);
  }

  // Distance tick markers along the shared track
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  for (let x = 32; x < 512; x += 128) {
    ctx.fillRect(x, 40, 5, 432);
  }

  // Top & bottom crisp white border lines + alternating stadium curbs
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 22, 512, 10);
  ctx.fillRect(0, 480, 512, 10);

  const curbH = 22;
  const segW = 64;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? curbA : curbB;
    ctx.fillRect(i * segW, 0, segW, curbH);
    ctx.fillRect(i * segW, 512 - curbH, segW, curbH);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTerrainTexture(
  baseHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Stadium mowed grass stripes
  ctx.fillStyle = accentHex;
  for (let y = 0; y < 256; y += 32) {
    ctx.fillRect(0, y, 256, 16);
  }
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCheckeredTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const cols = 12;
  const rows = 3;
  const cw = canvas.width / cols;
  const ch = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#f8fafc';
      ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createHurdleBarTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 64);

  // Crisp red/dark athletic hurdle stripes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 0, 32, 64);
  ctx.fillRect(200, 0, 32, 64);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(72, 0, 112, 64);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(108, 12, 40, 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createNumberPlateTexture(
  raceNumber: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(raceNumber || '01', 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
  grad.addColorStop(0, 'rgba(0,0,0,0.58)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createSkyDome(zenithHex: number, horizonHex: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(420, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(zenithHex) },
      bottomColor: { value: new THREE.Color(horizonHex) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = clamp(pow(max(h, 0.0), 0.55), 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

// ==================== 3D ARTICULATED RUNNER CHARACTER ====================

function buildLegAssembly(
  shortsMat: THREE.Material,
  skinMat: THREE.Material,
  shoeMat: THREE.Material,
  soleMat: THREE.Material
): { hipPivot: THREE.Group; kneePivot: THREE.Group } {
  const hipPivot = new THREE.Group();

  // Shorts leg sleeve + upper thigh
  const thighSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.11, 0.24, 12), shortsMat);
  thighSleeve.position.y = -0.12;
  thighSleeve.castShadow = true;
  hipPivot.add(thighSleeve);

  const lowerThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.22, 4, 10), skinMat);
  lowerThigh.position.y = -0.3;
  lowerThigh.castShadow = true;
  hipPivot.add(lowerThigh);

  // Knee Joint
  const kneePivot = new THREE.Group();
  kneePivot.position.y = -0.45;
  hipPivot.add(kneePivot);

  const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.28, 4, 10), skinMat);
  calf.position.y = -0.2;
  calf.castShadow = true;
  kneePivot.add(calf);

  // Athletic Ankle Sock
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.12, 10), soleMat);
  sock.position.y = -0.37;
  kneePivot.add(sock);

  // Running Sneaker (pointing forward along -Z)
  const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.34), shoeMat);
  shoeUpper.position.set(0, -0.44, -0.05);
  shoeUpper.castShadow = true;
  kneePivot.add(shoeUpper);

  const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.045, 0.36), soleMat);
  shoeSole.position.set(0, -0.49, -0.05);
  kneePivot.add(shoeSole);

  return { hipPivot, kneePivot };
}

function buildArmAssembly(
  skinMat: THREE.Material,
  bandMat: THREE.Material
): { shoulderPivot: THREE.Group; forearmPivot: THREE.Group } {
  const shoulderPivot = new THREE.Group();

  const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 4, 10), skinMat);
  upperArm.position.y = -0.15;
  upperArm.castShadow = true;
  shoulderPivot.add(upperArm);

  const forearmPivot = new THREE.Group();
  forearmPivot.position.y = -0.31;
  shoulderPivot.add(forearmPivot);

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.22, 4, 10), skinMat);
  forearm.position.y = -0.14;
  forearm.castShadow = true;
  forearmPivot.add(forearm);

  const wristband = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 10), bandMat);
  wristband.position.y = -0.23;
  forearmPivot.add(wristband);

  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
  fist.position.y = -0.3;
  forearmPivot.add(fist);

  return { shoulderPivot, forearmPivot };
}

export function createRunner3D(
  player: PlayerConfig,
  palette: BikeColorPalette,
  shadowTex: THREE.Texture,
  maxAnisotropy: number
): RunnerRig {
  const root = new THREE.Group();

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.primary),
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.25,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.secondary),
    roughness: 0.65,
    metalness: 0.05,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accent),
    roughness: 0.35,
    metalness: 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: ATHLETE_SKIN_TONES[player.id % ATHLETE_SKIN_TONES.length],
    roughness: 0.68,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: player.id === 1 ? 0x3b2314 : 0x111827,
    roughness: 0.85,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  // Grounded contact shadow disc
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 1.45),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  // Body pivot centered at hip height (y = 0.96)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.96;
  root.add(bodyPivot);

  // Pelvis / athletic shorts waist
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.24), secondaryMat);
  pelvis.castShadow = true;
  bodyPivot.add(pelvis);

  // Torso group
  const torso = new THREE.Group();
  torso.position.y = 0.09;
  bodyPivot.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), primaryMat);
  chest.position.y = 0.28;
  chest.castShadow = true;
  torso.add(chest);

  // Side jersey stripes
  for (const sx of [-0.235, 0.235]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.52, 0.12), accentMat);
    stripe.position.set(sx, 0.28, 0);
    torso.add(stripe);
  }

  // Aero shoulder stripes / pro jacket trim based on costume model
  if (player.bikeModel === 'aero' || player.bikeModel === 'turbo') {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.1, 0.28), accentMat);
    collar.position.y = 0.52;
    torso.add(collar);
  }

  // Back & Front Race Bib Number
  const bibTex = createNumberPlateTexture(player.raceNumber, palette.primary, maxAnisotropy);
  const bibMat = new THREE.MeshStandardMaterial({ map: bibTex, roughness: 0.5 });
  const backBib = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.24), bibMat);
  backBib.position.set(0, 0.3, 0.135);
  torso.add(backBib);

  const frontBib = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), bibMat);
  frontBib.position.set(0, 0.3, -0.135);
  frontBib.rotation.y = Math.PI;
  torso.add(frontBib);

  // Neck + Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.63, -0.02);
  torso.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 10), skinMat);
  neck.position.y = -0.04;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 14), skinMat);
  head.position.y = 0.12;
  head.castShadow = true;
  headGroup.add(head);

  // Hair cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hair.position.set(0, 0.14, 0.02);
  hair.rotation.x = 0.22;
  headGroup.add(hair);

  // Head Accessory (`helmetStyle`: 'pro' | 'cyber' | 'eagle' | 'champ')
  if (player.helmetStyle === 'pro') {
    // Athletic sweat headband + fluttering ribbon tails at back
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.184, 0.184, 0.065, 16),
      primaryMat
    );
    headband.position.y = 0.16;
    headGroup.add(headband);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.22), accentMat);
    tail.position.set(0.03, 0.15, 0.24);
    tail.rotation.x = -0.25;
    headGroup.add(tail);
  } else if (player.helmetStyle === 'cyber') {
    // Sleek athletic visor sunglasses + sport band
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.075, 0.14),
      new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.85,
        clearcoat: 1.0,
      })
    );
    glasses.position.set(0, 0.14, -0.13);
    headGroup.add(glasses);
  } else if (player.helmetStyle === 'eagle') {
    // Peaked running cap
    const capCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      primaryMat
    );
    capCrown.position.y = 0.15;
    headGroup.add(capCrown);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.028, 0.2), accentMat);
    visor.position.set(0, 0.16, -0.21);
    headGroup.add(visor);
  } else if (player.helmetStyle === 'champ') {
    // Gold champion headband + laurel crest
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.18,
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.186, 0.186, 0.065, 16), goldMat);
    band.position.y = 0.16;
    headGroup.add(band);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.22), goldMat);
    crest.position.set(0, 0.27, 0.02);
    headGroup.add(crest);
  }

  // Arms attached to shoulders
  const leftArmRig = buildArmAssembly(skinMat, accentMat);
  leftArmRig.shoulderPivot.position.set(-0.29, 0.5, 0);
  torso.add(leftArmRig.shoulderPivot);

  const rightArmRig = buildArmAssembly(skinMat, accentMat);
  rightArmRig.shoulderPivot.position.set(0.29, 0.5, 0);
  torso.add(rightArmRig.shoulderPivot);

  // Legs attached to pelvis
  const leftLegRig = buildLegAssembly(secondaryMat, skinMat, primaryMat, whiteMat);
  leftLegRig.hipPivot.position.set(-0.13, -0.02, 0);
  bodyPivot.add(leftLegRig.hipPivot);

  const rightLegRig = buildLegAssembly(secondaryMat, skinMat, primaryMat, whiteMat);
  rightLegRig.hipPivot.position.set(0.13, -0.02, 0);
  bodyPivot.add(rightLegRig.hipPivot);

  // Sprint Turbo energy cones trailing behind shoes
  const speedTrails: THREE.Mesh[] = [];
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
  });
  for (const tx of [-0.18, 0.18]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 10), trailMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(tx, -0.55, 0.48);
    cone.visible = false;
    bodyPivot.add(cone);
    speedTrails.push(cone);
  }

  // Active Shield Bubble
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  shieldMesh.position.set(0, 1.02, 0);
  shieldMesh.visible = false;
  root.add(shieldMesh);

  return {
    root,
    bodyPivot,
    torso,
    headGroup,
    leftArm: leftArmRig.shoulderPivot,
    rightArm: rightArmRig.shoulderPivot,
    leftForearm: leftArmRig.forearmPivot,
    rightForearm: rightArmRig.forearmPivot,
    leftLeg: leftLegRig.hipPivot,
    rightLeg: rightLegRig.hipPivot,
    leftKnee: leftLegRig.kneePivot,
    rightKnee: rightLegRig.kneePivot,
    speedTrails,
    shieldMesh,
    contactShadow,
  };
}

// ==================== 3D ATHLETIC HURDLES & OBSTACLES ====================

export function createObstacle3D(
  kind: ObstacleKind,
  hurdleTex: THREE.Texture
): Obstacle3DRig {
  const group = new THREE.Group();

  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.9, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.04;
  beaconRing.visible = false;
  group.add(beaconRing);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.78,
    roughness: 0.24,
  });
  const barMat = new THREE.MeshStandardMaterial({
    map: hurdleTex,
    roughness: 0.4,
    metalness: 0.08,
  });

  switch (kind) {
    case 'tires':
    case 'ramp': {
      // Authentic Olympic Track Hurdle (Gawang Lari)
      const hurdleH = kind === 'ramp' ? 1.05 : 0.92;
      for (const sx of [-1.45, 1.45]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.85), steelMat);
        foot.position.set(sx, 0.04, 0.22);
        foot.castShadow = true;
        group.add(foot);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, hurdleH, 10), steelMat);
        post.position.set(sx, hurdleH / 2, 0);
        post.castShadow = true;
        group.add(post);
      }
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 0.09), barMat);
      crossbar.position.set(0, hurdleH, 0);
      crossbar.castShadow = true;
      group.add(crossbar);
      break;
    }
    case 'logs': {
      // Steeplechase heavy timber barrier
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.34, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.82 })
      );
      beam.position.set(0, 0.84, 0);
      beam.castShadow = true;
      group.add(beam);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.14, 0.32), barMat);
      stripe.position.set(0, 0.96, 0);
      group.add(stripe);

      for (const sx of [-1.5, 1.5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.55), steelMat);
        leg.position.set(sx, 0.45, 0);
        leg.castShadow = true;
        group.add(leg);
      }
      break;
    }
    case 'mud': {
      // Steeplechase Water Jump Pit with glowing blue water + cones
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 0.1, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      border.position.y = 0.05;
      group.add(border);

      const water = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.12, 1.9),
        new THREE.MeshPhysicalMaterial({
          color: 0x0284c7,
          roughness: 0.1,
          metalness: 0.15,
          clearcoat: 1.0,
        })
      );
      water.position.y = 0.06;
      group.add(water);

      const coneGeo = new THREE.ConeGeometry(0.2, 0.52, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
      for (const sx of [-1.85, 1.85]) {
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.set(sx, 0.28, 0.85);
        cone.castShadow = true;
        group.add(cone);
      }
      break;
    }
    case 'hill': {
      // Agility Plyo-Step Hurdle Box
      const stepMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 1.3), stepMat);
      base.position.y = 0.225;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.38, 0.85), barMat);
      top.position.y = 0.64;
      top.castShadow = true;
      group.add(top);
      break;
    }
  }

  return { group, beaconRing };
}

export function createBonusItem3D(type: BonusItemType): THREE.Group {
  const group = new THREE.Group();

  const colorMap: Record<BonusItemType, number> = {
    NITRO: 0x38bdf8,
    SHIELD: 0x10b981,
    DOUBLE_SCORE: 0xa855f7,
    BONUS_POINTS: 0xfacc15,
  };
  const col = colorMap[type];

  const coreMat = new THREE.MeshPhysicalMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 0.65,
    roughness: 0.15,
    metalness: 0.75,
    clearcoat: 1.0,
  });

  const coreGeo =
    type === 'NITRO'
      ? new THREE.CylinderGeometry(0.26, 0.26, 0.82, 12)
      : type === 'SHIELD'
      ? new THREE.OctahedronGeometry(0.44, 0)
      : type === 'DOUBLE_SCORE'
      ? new THREE.IcosahedronGeometry(0.4, 0)
      : new THREE.CylinderGeometry(0.44, 0.44, 0.14, 16);

  const core = new THREE.Mesh(coreGeo, coreMat);
  if (type === 'BONUS_POINTS') core.rotation.x = Math.PI / 2;
  core.position.y = 1.05;
  core.castShadow = true;
  group.add(core);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.045, 8, 24),
    new THREE.MeshBasicMaterial({ color: col })
  );
  halo.position.y = 1.05;
  group.add(halo);

  return group;
}

export function createFinishArch3D(trackWidth: number, checkTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.55,
    roughness: 0.25,
  });
  const half = trackWidth / 2 + 0.35;

  // Span along Z across the unified Right-to-Left track
  for (const pz of [-half, half]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.6, 12), pillarMat);
    pillar.position.set(0, 2.3, pz);
    pillar.castShadow = true;
    group.add(pillar);
  }

  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 1.05, trackWidth + 1.0),
    new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.35 })
  );
  banner.position.set(0, 4.05, 0);
  banner.castShadow = true;
  group.add(banner);

  // Ground checkered finish tape strip across the unified track
  const tape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, trackWidth),
    new THREE.MeshStandardMaterial({
      map: checkTex,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  tape.rotation.x = -Math.PI / 2;
  tape.position.y = 0.04;
  group.add(tape);

  return group;
}

export function createEnvironmentScenery(
  scene: THREE.Scene,
  biome: LevelDefinition['biome'],
  trackWidth: number,
  trackLengthMeters: number
) {
  const farSideZ = -(trackWidth / 2 + 3.2);
  const dummy = new THREE.Object3D();

  // Stadium perimeter bleachers / ad boards along the far side (-Z) of the shared track
  const standMat = new THREE.MeshStandardMaterial({
    color: biome === 'stadium' ? 0x1e293b : 0x334155,
    roughness: 0.8,
  });
  const standTrimMat = new THREE.MeshStandardMaterial({
    color: biome === 'canyon' ? 0xf59e0b : 0x38bdf8,
    roughness: 0.45,
  });

  const bleacherLen = trackLengthMeters + 180;
  const centerX = -(trackLengthMeters / 2) + 20;

  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(bleacherLen, 2.2, 4.5), standMat);
  tier1.position.set(centerX, 1.1, farSideZ - 4.0);
  tier1.receiveShadow = true;
  scene.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(bleacherLen, 3.6, 4.0), standMat);
  tier2.position.set(centerX, 1.8, farSideZ - 8.2);
  scene.add(tier2);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(bleacherLen, 0.65, 0.25), standTrimMat);
  rail.position.set(centerX, 0.6, farSideZ - 1.5);
  scene.add(rail);

  // Far-side stadium lights or trees running along X
  const positions: Array<{ x: number; z: number; scale: number; rotY: number }> = [];
  for (let x = 25; x > -(trackLengthMeters + 70); x -= 15) {
    positions.push({
      x,
      z: farSideZ - 0.8,
      scale: 0.92 + Math.abs(Math.sin(x * 0.6)) * 0.25,
      rotY: (x * 0.4) % (Math.PI * 2),
    });
  }

  if (biome === 'stadium') {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.28 });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.8,
    });
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.16, 0.22, 9.5, 8),
      poleMat,
      positions.length
    );
    const heads = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.2, 0.7, 0.45),
      headMat,
      positions.length
    );
    positions.forEach((p, idx) => {
      dummy.position.set(p.x, 4.75, p.z - 2.2);
      dummy.rotation.set(0.25, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poles.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, 9.5, p.z - 2.2);
      dummy.updateMatrix();
      heads.setMatrixAt(idx, dummy.matrix);
    });
    poles.computeBoundingSphere();
    heads.computeBoundingSphere();
    scene.add(poles, heads);
  } else {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const leafColor =
      biome === 'canyon' ? 0xb45309 : biome === 'golden' ? 0x65a30d : 0x16a34a;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.82, flatShading: true });

    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.2, 0.28, 2.2, 7),
      trunkMat,
      positions.length
    );
    const crowns = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1.45, 0),
      leafMat,
      positions.length
    );

    positions.forEach((p, idx) => {
      dummy.position.set(p.x, 1.1 * p.scale, p.z);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(p.x, 3.0 * p.scale, p.z);
      dummy.updateMatrix();
      crowns.setMatrixAt(idx, dummy.matrix);
    });
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    scene.add(trunks, crowns);
  }

  // Distant horizon skyline hills along the background (-Z)
  const hillColor =
    biome === 'canyon'
      ? 0x9a3412
      : biome === 'golden'
      ? 0xa16207
      : biome === 'stadium'
      ? 0x1e293b
      : 0x15803d;
  const hillMat = new THREE.MeshStandardMaterial({
    color: hillColor,
    roughness: 0.95,
    flatShading: true,
  });
  const mtnCount = 24;
  const mtns = new THREE.InstancedMesh(new THREE.ConeGeometry(34, 40, 6), hillMat, mtnCount);
  for (let i = 0; i < mtnCount; i++) {
    const mx = 60 - i * ((trackLengthMeters + 160) / mtnCount);
    const mz = -110 - (i % 3) * 35;
    dummy.position.set(mx, 14 + (i % 2) * 7, mz);
    dummy.rotation.set(0, i * 0.6, 0);
    dummy.scale.set(1.2, 0.75 + (i % 3) * 0.25, 1.2);
    dummy.updateMatrix();
    mtns.setMatrixAt(i, dummy.matrix);
  }
  mtns.computeBoundingSphere();
  scene.add(mtns);
}
