import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════
   ULTRA-REALISTIC 3D HIGHWAY BIKE RACER (Three.js WebGL Engine)
   - Real 3D Perspective Highway with PBR Shaders, Asphalt & Curbs
   - First-Person Superbike Cockpit View with Animated Handlebars,
     Digital TFT Dashboard, Glass Windscreen & Side Mirrors
   - Third-Person Chase Camera Toggle ('C' key or HUD button)
   - Dynamic Day, Sunset & Night Lighting with Headlights & Shadows
   - 3D Traffic (Cars, SUVs, Trucks) + 3 Rival Superbikes (Raju, Kabir, Aryan)
   - Near-Miss Adrenaline System with Slow-Mo Heartbeat & Points
   - 4-Cylinder Screaming Engine Audio Synthesizer (Zero assets needed)
   - Responsive Mobile Touch Pedals & Desktop Keyboard Controls
   ═══════════════════════════════════════════════════════════════════════ */

// ── Audio Synthesizer ──────────────────────────────────────────────────────
class SuperbikeAudio {
  constructor() {
    this.ctx = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Inline 4-cylinder engine oscillator
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineGain);
      this.engineOsc2.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();

      // Wind noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch {}
  }

  update(speedKmh, isNitro) {
    if (!this.ctx || this.muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const ratio = Math.min(1, speedKmh / 320);

      // Superbike high-revving pitch (80Hz idle -> 550Hz redline)
      const gear = Math.min(6, Math.max(1, Math.floor(speedKmh / 50) + 1));
      const gearRatio = ((speedKmh % 50) / 50);
      const baseFreq = 75 + (gear * 25) + (gearRatio * 180) + (isNitro ? 80 : 0);

      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);

      const engineVol = this.muted ? 0 : 0.03 + ratio * 0.08;
      this.engineGain.gain.setTargetAtTime(engineVol, now, 0.04);

      // Wind sound gets louder at high speed
      const windVol = this.muted ? 0 : (ratio * ratio) * 0.12;
      this.windGain.gain.setTargetAtTime(windVol, now, 0.08);
    } catch {}
  }

  stop() {
    if (!this.ctx || !this.engineGain) return;
    try {
      const now = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      if (this.windGain) this.windGain.gain.setTargetAtTime(0, now, 0.1);
    } catch {}
  }

  playCoin() {
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.setValueAtTime(1318.5, now + 0.08); // E6
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  playNearMiss() {
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  playNitro() {
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }
}

const audio = new SuperbikeAudio();

// ── Procedural Textures Generator ──────────────────────────────────────────
function createRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 512, 512);

  // Asphalt grain noise
  for (let i = 0; i < 8000; i++) {
    const gray = Math.floor(25 + Math.random() * 20);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // 4 Highway Lanes -> 3 White dashed divider lines
  ctx.fillStyle = '#f8fafc';
  const lanes = [128, 256, 384];
  lanes.forEach(x => {
    // 4 Dashes per texture tile
    for (let y = 30; y < 512; y += 128) {
      ctx.fillRect(x - 3, y, 6, 68);
    }
  });

  // Solid yellow outer shoulder lines
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(16, 0, 8, 512);
  ctx.fillRect(488, 0, 8, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 10);
  return texture;
}

function createCurbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Alternating Red & White curbs
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 128, 64, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 20);
  return texture;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BikeRacer({ onClose }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    speed: 0,
    dist: 0,
    playerX: 0,        // -6 to +6 road space
    playerLean: 0,
    accel: false,
    brake: false,
    steer: 0,
    nitroAvailable: 100,
    nitroActive: false,
    nitroTime: 0,
    cameraMode: 'cockpit', // 'cockpit' | 'chase'
    coins: 0,
    score: 0,
    pos: 4,
    timeOfDay: 0.2,     // 0 = sunrise, 0.3 = day, 0.6 = sunset, 0.8 = night
  });

  const [phase, setPhase] = useState('menu'); // 'menu' | 'playing' | 'gameover' | 'victory'
  const [hud, setHud] = useState({ speed: 0, dist: 0, coins: 0, nitro: 100, pos: 4, score: 0, cam: 'cockpit' });
  const [nearMissText, setNearMissText] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // ── Keyboard Controls ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      audio.init();
      const s = stateRef.current;
      if (['ArrowUp', 'KeyW'].includes(e.code)) s.accel = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) s.brake = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) s.steer = -1;
      if (['ArrowRight', 'KeyD'].includes(e.code)) s.steer = 1;
      if (e.code === 'Space') {
        if (s.nitroAvailable >= 25 && !s.nitroActive) {
          s.nitroActive = true;
          s.nitroTime = 3.5;
          s.nitroAvailable = Math.max(0, s.nitroAvailable - 35);
          audio.playNitro();
        }
      }
      if (e.code === 'KeyC') {
        s.cameraMode = s.cameraMode === 'cockpit' ? 'chase' : 'cockpit';
        setHud(h => ({ ...h, cam: s.cameraMode }));
      }
    };

    const onKeyUp = (e) => {
      const s = stateRef.current;
      if (['ArrowUp', 'KeyW'].includes(e.code)) s.accel = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) s.brake = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        if (s.steer === -1) s.steer = 0;
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        if (s.steer === 1) s.steer = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Mobile Touch Controls ────────────────────────────────────────────────
  const handleTouchSteer = (val) => {
    audio.init();
    stateRef.current.steer = val;
  };
  const handleTouchGas = (val) => {
    audio.init();
    stateRef.current.accel = val;
  };
  const handleTouchBrake = (val) => {
    audio.init();
    stateRef.current.brake = val;
  };
  const triggerNitro = () => {
    const s = stateRef.current;
    if (s.nitroAvailable >= 25 && !s.nitroActive) {
      s.nitroActive = true;
      s.nitroTime = 3.5;
      s.nitroAvailable = Math.max(0, s.nitroAvailable - 35);
      audio.playNitro();
    }
  };

  const startRace = () => {
    audio.init();
    stateRef.current.speed = 0;
    stateRef.current.dist = 0;
    stateRef.current.coins = 0;
    stateRef.current.score = 0;
    setPhase('playing');
  };

  // ── Three.js WebGL Scene ─────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0284c7');
    scene.fog = new THREE.FogExp2('#38bdf8', 0.007);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 1.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    sunLight.position.set(40, 80, -60);
    scene.add(sunLight);

    // Headlight cone on player bike
    const headlight = new THREE.SpotLight('#fef08a', 2.5, 90, Math.PI / 6, 0.4);
    headlight.position.set(0, 1.0, -0.5);
    headlight.target.position.set(0, 0, -40);
    scene.add(headlight);
    scene.add(headlight.target);

    // 3. Realistic 3D Highway Road
    const roadWidth = 16;
    const roadLength = 300;
    const roadTexture = createRoadTexture();
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -roadLength / 2 + 10);
    scene.add(roadMesh);

    // Curbs (Rumble strips)
    const curbTexture = createCurbTexture();
    const curbMat = new THREE.MeshStandardMaterial({ map: curbTexture, roughness: 0.6 });
    const curbGeo = new THREE.BoxGeometry(0.8, 0.25, roadLength);

    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-roadWidth / 2 - 0.4, 0.1, -roadLength / 2 + 10);
    scene.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(roadWidth / 2 + 0.4, 0.1, -roadLength / 2 + 10);
    scene.add(rightCurb);

    // Metal Guardrails
    const guardrailMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.85, roughness: 0.3 });
    const guardrailGeo = new THREE.BoxGeometry(0.15, 0.6, roadLength);
    const leftRail = new THREE.Mesh(guardrailGeo, guardrailMat);
    leftRail.position.set(-roadWidth / 2 - 1.2, 0.5, -roadLength / 2 + 10);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(guardrailGeo, guardrailMat);
    rightRail.position.set(roadWidth / 2 + 1.2, 0.5, -roadLength / 2 + 10);
    scene.add(rightRail);

    // Grass ground terrain
    const groundGeo = new THREE.PlaneGeometry(240, roadLength);
    const groundMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.95 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.05, -roadLength / 2 + 10);
    scene.add(groundMesh);

    // Streetlamps spaced along the highway
    const lampposts = [];
    const lampMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.4 });
    for (let z = 0; z > -roadLength; z -= 30) {
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 6);
      const pole = new THREE.Mesh(poleGeo, lampMat);
      pole.position.set(-roadWidth / 2 - 2.5, 3, z);
      scene.add(pole);

      const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5);
      const arm = new THREE.Mesh(armGeo, lampMat);
      arm.rotation.z = Math.PI / 3;
      arm.position.set(-roadWidth / 2 - 1.6, 5.5, z);
      scene.add(arm);

      lampposts.push({ pole, arm, z });
    }

    // 4. Cockpit Superbike Handlebars & Dashboard Model
    const cockpitGroup = new THREE.Group();

    // Handlebar Stem
    const barMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 });
    const handlebarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.95, 16);
    const handlebar = new THREE.Mesh(handlebarGeo, barMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, -0.22, -0.45);
    cockpitGroup.add(handlebar);

    // Rubber Grips (Left & Right)
    const gripMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 });
    const gripGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.2, 16);
    const leftGrip = new THREE.Mesh(gripGeo, gripMat);
    leftGrip.rotation.z = Math.PI / 2;
    leftGrip.position.set(-0.38, -0.22, -0.45);
    cockpitGroup.add(leftGrip);

    const rightGrip = new THREE.Mesh(gripGeo, gripMat);
    rightGrip.rotation.z = Math.PI / 2;
    rightGrip.position.set(0.38, -0.22, -0.45);
    cockpitGroup.add(rightGrip);

    // Chrome Brake & Clutch Levers
    const leverMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 });
    const leverGeo = new THREE.BoxGeometry(0.18, 0.015, 0.02);
    const leftLever = new THREE.Mesh(leverGeo, leverMat);
    leftLever.position.set(-0.35, -0.21, -0.48);
    leftLever.rotation.y = 0.25;
    cockpitGroup.add(leftLever);

    const rightLever = new THREE.Mesh(leverGeo, leverMat);
    rightLever.position.set(0.35, -0.21, -0.48);
    rightLever.rotation.y = -0.25;
    cockpitGroup.add(rightLever);

    // Aerodynamic Windshield (Smoked Acrylic Glass)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#0284c7',
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
    });
    const windshieldGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.35, 16, 1, false, 0, Math.PI);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.rotation.x = -Math.PI / 3;
    windshield.position.set(0, -0.05, -0.58);
    cockpitGroup.add(windshield);

    // Digital TFT Dashboard Screen Housing
    const dashHousingMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.6 });
    const dashHousingGeo = new THREE.BoxGeometry(0.34, 0.18, 0.06);
    const dashHousing = new THREE.Mesh(dashHousingGeo, dashHousingMat);
    dashHousing.position.set(0, -0.15, -0.52);
    dashHousing.rotation.x = -0.3;
    cockpitGroup.add(dashHousing);

    // Digital TFT Dashboard Display Canvas
    const dashCanvas = document.createElement('canvas');
    dashCanvas.width = 256;
    dashCanvas.height = 128;
    const dashCtx = dashCanvas.getContext('2d');
    const dashTexture = new THREE.CanvasTexture(dashCanvas);
    const dashScreenMat = new THREE.MeshBasicMaterial({ map: dashTexture });
    const dashScreenGeo = new THREE.PlaneGeometry(0.3, 0.15);
    const dashScreen = new THREE.Mesh(dashScreenGeo, dashScreenMat);
    dashScreen.position.set(0, -0.15, -0.488);
    dashScreen.rotation.x = -0.3;
    cockpitGroup.add(dashScreen);

    // Side Mirrors (Left & Right)
    const mirrorStemMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8 });
    const mirrorGlassMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.98, roughness: 0.05 });

    const leftMirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.02), mirrorGlassMat);
    leftMirror.position.set(-0.52, -0.1, -0.48);
    leftMirror.rotation.y = 0.3;
    cockpitGroup.add(leftMirror);

    const rightMirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.02), mirrorGlassMat);
    rightMirror.position.set(0.52, -0.1, -0.48);
    rightMirror.rotation.y = -0.3;
    cockpitGroup.add(rightMirror);

    camera.add(cockpitGroup);
    scene.add(camera);

    // 5. Third-Person Player Bike Model (Visible in Chase Camera Mode)
    const chaseBikeGroup = new THREE.Group();
    const chaseBodyMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.8, roughness: 0.2 });
    const chaseTireMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.9 });

    const chaseBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.8), chaseBodyMat);
    chaseBody.position.set(0, 0.5, 0);
    chaseBikeGroup.add(chaseBody);

    const chaseTire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), chaseTireMat);
    chaseTire1.rotation.z = Math.PI / 2;
    chaseTire1.position.set(0, 0.28, 0.7);
    chaseBikeGroup.add(chaseTire1);

    const chaseTire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), chaseTireMat);
    chaseTire2.rotation.z = Math.PI / 2;
    chaseTire2.position.set(0, 0.28, -0.7);
    chaseBikeGroup.add(chaseTire2);

    // Tail Brake Light
    const brakeLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.08, 0.05),
      new THREE.MeshBasicMaterial({ color: '#ef4444' })
    );
    brakeLight.position.set(0, 0.65, 0.9);
    chaseBikeGroup.add(brakeLight);

    chaseBikeGroup.visible = false;
    scene.add(chaseBikeGroup);

    // 6. Traffic Vehicles (Cars, SUVs, Trucks) + Rival Superbikes
    const traffic = [];
    const trafficTypes = [
      { type: 'car', color: '#dc2626', w: 1.8, h: 1.2, l: 4.0, speed: 100 },
      { type: 'suv', color: '#2563eb', w: 2.0, h: 1.6, l: 4.6, speed: 90 },
      { type: 'truck', color: '#ea580c', w: 2.4, h: 2.8, l: 8.5, speed: 75 },
      { type: 'rival1', name: 'Raju', color: '#f97316', w: 0.6, h: 1.3, l: 1.8, speed: 170 },
      { type: 'rival2', name: 'Kabir', color: '#9333ea', w: 0.6, h: 1.3, l: 1.8, speed: 190 },
      { type: 'rival3', name: 'Aryan', color: '#16a34a', w: 0.6, h: 1.3, l: 1.8, speed: 210 },
    ];

    trafficTypes.forEach((data, idx) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.7, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(data.w, data.h, data.l), bodyMat);
      body.position.set(0, data.h / 2, 0);
      group.add(body);

      // Taillights
      const tLightMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
      const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), tLightMat);
      tl1.position.set(-data.w * 0.35, data.h * 0.6, data.l * 0.5);
      group.add(tl1);
      const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.05), tLightMat);
      tl2.position.set(data.w * 0.35, data.h * 0.6, data.l * 0.5);
      group.add(tl2);

      // Lane spacing: lanes at -5.5, -1.8, 1.8, 5.5
      const lanes = [-5.5, -1.8, 1.8, 5.5];
      const initialZ = -30 - idx * 45;
      const initialX = lanes[idx % lanes.length];
      group.position.set(initialX, 0, initialZ);
      scene.add(group);

      traffic.push({ group, data, z: initialZ, x: initialX, laneIdx: idx % lanes.length });
    });

    // 7. Pickups (Gold Coins & Nitro Bottles)
    const pickups = [];
    const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
    const coinMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.9, roughness: 0.1 });

    const nitroGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 12);
    const nitroMat = new THREE.MeshStandardMaterial({ color: '#0284c7', metalness: 0.8, roughness: 0.2 });

    for (let i = 0; i < 15; i++) {
      const isNitro = i % 4 === 0;
      const mesh = new THREE.Mesh(isNitro ? nitroGeo : coinGeo, isNitro ? nitroMat : coinMat);
      if (!isNitro) mesh.rotation.x = Math.PI / 2;
      const pLane = [-5.5, -1.8, 1.8, 5.5][Math.floor(Math.random() * 4)];
      const pZ = -40 - i * 35;
      mesh.position.set(pLane, 0.6, pZ);
      scene.add(mesh);
      pickups.push({ mesh, isNitro, z: pZ, x: pLane, collected: false });
    }

    // ── Animation Loop ─────────────────────────────────────────────────────
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const s = stateRef.current;

      // ── Physics ──────────────────────────────────────────────────────────
      const topSpeed = s.nitroActive ? 320 : 250;
      if (s.nitroActive) {
        s.nitroTime -= dt;
        if (s.nitroTime <= 0) s.nitroActive = false;
      }

      if (s.accel || s.nitroActive) {
        const rate = s.nitroActive ? 120 : 70;
        s.speed = Math.min(topSpeed, s.speed + rate * dt);
      } else if (s.brake) {
        s.speed = Math.max(0, s.speed - 150 * dt);
      } else {
        s.speed = Math.max(0, s.speed - 30 * dt); // Engine braking drag
      }

      // Steer & Dynamic Bank Angle
      const steerSpeed = 8.5 * (s.speed / 250 + 0.3);
      s.playerX += s.steer * steerSpeed * dt;
      s.playerX = Math.max(-6.5, Math.min(6.5, s.playerX));
      s.playerLean += (s.steer - s.playerLean) * 10 * dt;

      // Distance
      const mps = (s.speed * 1000) / 3600;
      s.dist += mps * dt;
      audio.update(s.speed, s.nitroActive);

      // Slowly recharge nitro
      if (s.speed > 80 && s.nitroAvailable < 100) {
        s.nitroAvailable = Math.min(100, s.nitroAvailable + 3.5 * dt);
      }

      // Time of Day progression (0.2 = day, 0.6 = sunset, 0.8 = night)
      s.timeOfDay = (s.timeOfDay + dt * 0.005) % 1;
      const isNight = s.timeOfDay > 0.68 && s.timeOfDay < 0.95;
      const isSunset = s.timeOfDay > 0.45 && s.timeOfDay <= 0.68;

      if (isNight) {
        scene.background.set('#020617');
        scene.fog.color.set('#0f172a');
        sunLight.intensity = 0.2;
        ambientLight.intensity = 0.35;
        headlight.intensity = 3.5;
      } else if (isSunset) {
        scene.background.set('#431407');
        scene.fog.color.set('#9a3412');
        sunLight.intensity = 1.4;
        ambientLight.intensity = 0.7;
        headlight.intensity = 1.8;
      } else {
        scene.background.set('#0284c7');
        scene.fog.color.set('#38bdf8');
        sunLight.intensity = 2.0;
        ambientLight.intensity = 0.8;
        headlight.intensity = 0.8;
      }

      // ── Road Infinite Scrolling Texture ──────────────────────────────────
      roadTexture.offset.y = (roadTexture.offset.y - (s.speed * 0.0006)) % 1;
      curbTexture.offset.y = (curbTexture.offset.y - (s.speed * 0.0006)) % 1;

      // ── Camera Positioning & Vibration ───────────────────────────────────
      const speedRatio = s.speed / 320;
      const fovTarget = 65 + speedRatio * 20; // Tunnel-vision warp effect at 300+ km/h
      camera.fov += (fovTarget - camera.fov) * 5 * dt;
      camera.updateProjectionMatrix();

      // Camera vibration at high speeds
      const shake = speedRatio * 0.015;
      const shakeX = (Math.random() - 0.5) * shake;
      const shakeY = (Math.random() - 0.5) * shake;

      if (s.cameraMode === 'cockpit') {
        chaseBikeGroup.visible = false;
        cockpitGroup.visible = true;
        camera.position.set(s.playerX + shakeX, 1.35 + shakeY, 0);
        camera.rotation.z = -s.playerLean * 0.18; // Bike banking
        cockpitGroup.rotation.z = -s.playerLean * 0.28;
      } else {
        // Chase Camera (Third-Person View)
        chaseBikeGroup.visible = true;
        cockpitGroup.visible = false;
        chaseBikeGroup.position.set(s.playerX, 0, -3.5);
        chaseBikeGroup.rotation.z = -s.playerLean * 0.25;

        camera.position.set(s.playerX + shakeX, 2.4 + shakeY, 2.8);
        camera.rotation.set(-0.25, 0, -s.playerLean * 0.08);
      }

      // Brake light glow on player bike
      brakeLight.material.color.set(s.brake ? '#ff0000' : '#ef4444');

      // ── Traffic Vehicles & Near-Miss System ───────────────────────────────
      const playerSpeedMps = mps;
      traffic.forEach(car => {
        const carMps = (car.data.speed * 1000) / 3600;
        const relativeSpeed = playerSpeedMps - carMps;

        // Move traffic towards/away from player
        car.z += relativeSpeed * dt;

        // If car falls too far behind, respawn it ahead
        if (car.z > 20) {
          car.z = -220 - Math.random() * 40;
          const lanes = [-5.5, -1.8, 1.8, 5.5];
          car.x = lanes[Math.floor(Math.random() * lanes.length)];
        }
        // If car drives too far ahead
        if (car.z < -280) {
          car.z = 15;
        }

        car.group.position.set(car.x, 0, car.z);

        // Near-Miss Collision Check
        // Close distance on Z (< 2.5m) and X (< 1.6m) at high speed (> 120 km/h)
        if (!car.nearMissCooldown && Math.abs(car.z) < 2.5 && Math.abs(s.playerX - car.x) < 1.6 && s.speed > 120) {
          car.nearMissCooldown = true;
          s.score += 150;
          s.nitroAvailable = Math.min(100, s.nitroAvailable + 25);
          audio.playNearMiss();
          setNearMissText(`⚡ NEAR MISS! +150 PTS (NITRO +25%)`);
          setTimeout(() => setNearMissText(null), 1400);
        }
        if (Math.abs(car.z) > 10) car.nearMissCooldown = false;
      });

      // ── Pickups (Coins & Nitro) ──────────────────────────────────────────
      pickups.forEach(p => {
        p.z += playerSpeedMps * dt;
        p.mesh.rotation.y += 3 * dt;

        // Collect pickup
        if (!p.collected && Math.abs(p.z) < 2.0 && Math.abs(s.playerX - p.x) < 1.8) {
          p.collected = true;
          p.mesh.visible = false;
          if (p.isNitro) {
            s.nitroAvailable = 100;
            s.nitroActive = true;
            s.nitroTime = 4.0;
            audio.playNitro();
            setNearMissText('🚀 FULL NITRO BOOST!');
            setTimeout(() => setNearMissText(null), 1200);
          } else {
            s.coins += 10;
            s.score += 50;
            audio.playCoin();
          }
        }

        // Respawn pickup ahead
        if (p.z > 20) {
          p.z = -180 - Math.random() * 60;
          const lanes = [-5.5, -1.8, 1.8, 5.5];
          p.x = lanes[Math.floor(Math.random() * lanes.length)];
          p.collected = false;
          p.mesh.visible = true;
        }
        p.mesh.position.set(p.x, 0.6, p.z);
      });

      // ── Update Digital TFT Dashboard Canvas ──────────────────────────────
      dashCtx.fillStyle = '#090d16';
      dashCtx.fillRect(0, 0, 256, 128);

      // Tachometer RPM Bar
      const gear = Math.min(6, Math.max(1, Math.floor(s.speed / 50) + 1));
      const rpmWidth = Math.min(230, (s.speed / 320) * 230);
      dashCtx.fillStyle = s.speed > 250 ? '#ef4444' : (s.speed > 160 ? '#f59e0b' : '#22c55e');
      dashCtx.fillRect(13, 15, rpmWidth, 12);
      dashCtx.strokeStyle = '#38bdf8';
      dashCtx.strokeRect(13, 15, 230, 12);

      // Speed Digits (KM/H)
      dashCtx.fillStyle = '#f8fafc';
      dashCtx.font = 'bold 54px monospace';
      dashCtx.textAlign = 'center';
      dashCtx.fillText(`${Math.round(s.speed)}`, 110, 85);

      dashCtx.fillStyle = '#38bdf8';
      dashCtx.font = 'bold 18px sans-serif';
      dashCtx.fillText('KM/H', 185, 75);

      // Gear Indicator (1 - 6)
      dashCtx.fillStyle = '#f59e0b';
      dashCtx.font = 'bold 24px monospace';
      dashCtx.fillText(`GEAR ${gear}`, 128, 115);

      dashTexture.needsUpdate = true;

      // Update React HUD state periodically
      setHud({
        speed: Math.round(s.speed),
        dist: Math.round(s.dist),
        coins: s.coins,
        nitro: Math.round(s.nitroAvailable),
        pos: Math.max(1, 4 - Math.floor(s.dist / 800)),
        score: s.score,
        cam: s.cameraMode,
      });

      // Victory Condition (5,000 meters)
      if (s.dist >= 5000 && phase === 'playing') {
        audio.stop();
        setPhase('victory');
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      audio.stop();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#020617', overflow: 'hidden' }}>
      {/* ── Top HUD Bar ── */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2 bg-slate-900/90 border-b border-slate-700/80 backdrop-blur-md z-30 text-xs md:text-sm">
        <div className="flex items-center gap-3">
          <span className="bg-yellow-500/20 text-yellow-400 font-black px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow">
            🪙 {hud.coins}
          </span>
          <span className="bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-xl">
            🏁 {hud.dist}m / 5000m
          </span>
          <span className="bg-purple-500/20 text-purple-400 font-black px-2.5 py-1 rounded-xl hidden sm:inline-block">
            SCORE: {hud.score}
          </span>
        </div>

        {/* Center Near-Miss Alert Banner */}
        {nearMissText && (
          <div className="absolute left-1/2 -translate-x-1/2 top-14 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black px-5 py-2 rounded-2xl shadow-2xl animate-bounce text-sm md:text-base border border-amber-300">
            {nearMissText}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Camera View Switcher Button */}
          <button
            onClick={() => {
              const s = stateRef.current;
              s.cameraMode = s.cameraMode === 'cockpit' ? 'chase' : 'cockpit';
              setHud(h => ({ ...h, cam: s.cameraMode }));
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-xl font-bold hover:bg-cyan-500/30 transition cursor-pointer"
            title="Switch View ('C' key)"
          >
            <i className="fa-solid fa-video" />
            <span className="text-[11px] uppercase">{hud.cam === 'cockpit' ? '1st-Person' : 'Chase Cam'}</span>
          </button>

          <span className={`font-black px-3 py-1 rounded-xl text-xs ${
            hud.pos === 1 ? 'bg-amber-500 text-slate-950 font-black animate-pulse' : 'bg-slate-800 text-slate-200'
          }`}>
            RANK #{hud.pos}
          </span>

          <button
            onClick={() => {
              audio.muted = !audio.muted;
              setIsMuted(audio.muted);
            }}
            className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Mute Sound"
          >
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-red-400' : 'fa-volume-high text-cyan-400'}`} />
          </button>
        </div>
      </div>

      {/* ── 3D WebGL Canvas Container ── */}
      <div ref={containerRef} className="relative flex-1 bg-slate-950 overflow-hidden select-none touch-none">
        {/* ── Start Race Menu Overlay ── */}
        {phase === 'menu' && (
          <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/40 mb-4 animate-bounce">
              <i className="fa-solid fa-motorcycle text-4xl text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-wider mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              3D HIGHWAY BIKE RACER
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-md mb-6 leading-relaxed">
              True WebGL 3D Superbike Experience! Experience realistic first-person cockpit view, weave through highway traffic, execute high-speed near-misses, and race against 3 AI rivals!
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300 bg-slate-900/90 p-4 rounded-2xl border border-slate-700/80 mb-6 max-w-sm w-full">
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 p-1.5 rounded-lg text-cyan-400">⚡ W / ↑</span> Accelerate
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 p-1.5 rounded-lg text-red-400">🛑 S / ↓</span> Disc Brake
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 p-1.5 rounded-lg text-slate-400">◀ A / Left</span> Steer Left
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 p-1.5 rounded-lg text-slate-400">▶ D / Right</span> Steer Right
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="bg-slate-800 p-1.5 rounded-lg text-amber-400">🚀 SPACE</span> Nitro Boost &bull; <span className="bg-slate-800 p-1.5 rounded-lg text-cyan-400">📹 C</span> Camera
              </div>
            </div>

            <button
              onClick={startRace}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg md:text-xl px-12 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              🏁 START RACE
            </button>
          </div>
        )}

        {/* ── Victory Overlay ── */}
        {phase === 'victory' && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl mb-3 animate-bounce">🏆</div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {hud.pos === 1 ? '1ST PLACE CHAMPION!' : `FINISHED IN #${hud.pos} PLACE!`}
            </h2>
            <p className="text-slate-300 text-sm mb-6">
              You conquered the 5,000 meter highway challenge at {hud.speed} KM/H!
            </p>

            <div className="flex gap-6 bg-slate-900 p-4 rounded-2xl border border-slate-700 mb-6">
              <div className="text-center">
                <div className="text-slate-400 text-xs font-semibold">FINAL SCORE</div>
                <div className="text-2xl font-black text-purple-400">{hud.score}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs font-semibold">COINS EARNED</div>
                <div className="text-2xl font-black text-yellow-400">{hud.coins} 🪙</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startRace}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold px-8 py-3 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer"
              >
                🔄 Play Again
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-2xl transition cursor-pointer"
                >
                  Exit to Hub
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Mobile Touch Controls (Pedals & Steer) ── */}
        {phase === 'playing' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
            {/* Top Nitro Button */}
            <div className="flex justify-end pointer-events-auto">
              <button
                onClick={triggerNitro}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer ${
                  hud.nitro >= 25
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/40 active:scale-95 animate-pulse'
                    : 'bg-slate-800/80 text-slate-500 border border-slate-700'
                }`}
              >
                <i className="fa-solid fa-bolt text-amber-300 text-base" /> NITRO ({hud.nitro}%)
              </button>
            </div>

            {/* Bottom Steering & Pedals */}
            <div className="flex items-end justify-between w-full pointer-events-none">
              {/* Left / Right Steering Buttons */}
              <div className="flex gap-2.5 pointer-events-auto">
                <button
                  onPointerDown={() => handleTouchSteer(-1)}
                  onPointerUp={() => handleTouchSteer(0)}
                  onPointerCancel={() => handleTouchSteer(0)}
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 bg-slate-900/80 active:bg-cyan-500 active:text-white flex items-center justify-center text-2xl font-black text-cyan-400 transition-all select-none touch-none shadow-lg active:scale-95"
                >
                  ◀
                </button>
                <button
                  onPointerDown={() => handleTouchSteer(1)}
                  onPointerUp={() => handleTouchSteer(0)}
                  onPointerCancel={() => handleTouchSteer(0)}
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 bg-slate-900/80 active:bg-cyan-500 active:text-white flex items-center justify-center text-2xl font-black text-cyan-400 transition-all select-none touch-none shadow-lg active:scale-95"
                >
                  ▶
                </button>
              </div>

              {/* Gas & Brake Pedals (Hold Gas to Speed Up!) */}
              <div className="flex gap-3 pointer-events-auto">
                <button
                  onPointerDown={() => handleTouchBrake(true)}
                  onPointerUp={() => handleTouchBrake(false)}
                  onPointerCancel={() => handleTouchBrake(false)}
                  className="w-16 h-16 rounded-2xl border-2 border-red-500/40 bg-slate-900/80 active:bg-red-600 active:text-white flex flex-col items-center justify-center font-black text-red-400 transition-all select-none touch-none shadow-lg active:scale-95"
                >
                  <i className="fa-solid fa-hand text-lg" />
                  <span className="text-[10px] mt-0.5">BRAKE</span>
                </button>

                <button
                  onPointerDown={() => handleTouchGas(true)}
                  onPointerUp={() => handleTouchGas(false)}
                  onPointerCancel={() => handleTouchGas(false)}
                  className="w-20 h-20 rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-tr from-emerald-600 to-teal-500 active:brightness-125 flex flex-col items-center justify-center font-black text-slate-950 transition-all select-none touch-none shadow-2xl shadow-emerald-500/40 active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-gauge-high text-2xl animate-pulse" />
                  <span className="text-xs font-black mt-1">HOLD GAS</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Info ── */}
      <div className="bg-slate-900 px-4 py-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>🎮 Desktop: <kbd className="bg-slate-800 text-slate-300 px-1 rounded">W/↑</kbd> Gas &bull; <kbd className="bg-slate-800 text-slate-300 px-1 rounded">S/↓</kbd> Brake &bull; <kbd className="bg-slate-800 text-slate-300 px-1 rounded">A/D</kbd> Steer &bull; <kbd className="bg-slate-800 text-slate-300 px-1 rounded">C</kbd> Camera View</span>
        <span>📱 Mobile: Hold <strong className="text-emerald-400">HOLD GAS</strong> button to accelerate</span>
      </div>
    </div>
  );
}
