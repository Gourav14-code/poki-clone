import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Play, RotateCcw, Volume2, VolumeX, Music, Pause, ArrowLeft, Trophy, Heart, Sparkles, Image as ImageIcon, X } from 'lucide-react';
import coverArtImg from '../assets/super_puppy_bros.jpg';
import ElephantRunner from './ElephantRunner';

export default function MarioGame() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGame = searchParams.get('game') === 'elephant' ? 'elephant' : 'puppy';

  const setActiveGame = (game) => {
    if (game === 'elephant') {
      setSearchParams({ game: 'elephant' });
    } else {
      setSearchParams({});
    }
  };

  const canvasRef = useRef(null);
  
  // Game UI States
  const [score, setScore] = useState(0);
  const [bones, setBones] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(382);
  const [gameState, setGameState] = useState('PLAYING'); // 'PLAYING', 'GAMEOVER', 'VICTORY', 'PAUSED'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [showCoverArt, setShowCoverArt] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('puppy_high_score') || '0', 10);
  });

  // Audio Context Ref
  const audioCtxRef = useRef(null);
  const bgMusicIntervalRef = useRef(null);

  // Input states tracked by ref for 60fps loop
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    sprint: false
  });

  // Sound Synthesizer via Web Audio API (Reliable 8-Bit Chiptune)
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'jump') {
        // Puppy energetic jump yip!
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'bark') {
        // Cute 8-bit puppy bark
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.setValueAtTime(320, now + 0.04);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'bone') {
        // Cheerful high-pitched bone chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, now); // C6
        gain1.gain.setValueAtTime(0.16, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1567.98, now + 0.07); // G6
        gain2.gain.setValueAtTime(0.18, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.35);
      } else if (type === 'mouseBop') {
        // Mouse bopped squeak
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'bump') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'superSteak') {
        const notes = [349, 440, 523, 659, 784, 1046];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.15, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.06);
        });
      } else if (type === 'die') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'win') {
        const fanfare = [
          { f: 392, d: 0.1 }, { f: 523, d: 0.1 }, { f: 659, d: 0.1 },
          { f: 784, d: 0.15 }, { f: 1046, d: 0.3 }
        ];
        let offset = 0;
        fanfare.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.f, now + offset);
          gain.gain.setValueAtTime(0.18, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + note.d);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + note.d);
          offset += note.d;
        });
      }
    } catch {
      // Audio fallback
    }
  };

  // 8-Bit Retro Chiptune Loop
  useEffect(() => {
    if (!musicEnabled || gameState !== 'PLAYING') {
      if (bgMusicIntervalRef.current) {
        clearInterval(bgMusicIntervalRef.current);
        bgMusicIntervalRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;

      const melody = [
        523, 659, 784, 1046, 784, 659, 523, 0,
        587, 698, 880, 1174, 880, 698, 587, 0,
        659, 784, 987, 1318, 987, 784, 659, 0,
        784, 987, 1174, 1567, 1174, 987, 784, 0
      ];
      let step = 0;

      bgMusicIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') ctx.resume();
        const freq = melody[step % melody.length];
        step++;
        if (freq > 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.12);
        }
      }, 150);
    } catch {
      // Audio fallback
    }

    return () => {
      if (bgMusicIntervalRef.current) {
        clearInterval(bgMusicIntervalRef.current);
        bgMusicIntervalRef.current = null;
      }
    };
  }, [musicEnabled, gameState]);

  // Main 60fps Game Loop & Physics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 440;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const LEVEL_WIDTH = 3400;

    // Golden Retriever Puppy State
    let puppy = {
      x: 80,
      y: 300,
      width: 32,
      height: 30,
      vx: 0,
      vy: 0,
      isGrounded: false,
      isJumping: false,
      facing: 'right',
      animFrame: 0,
      tailWag: 0,
      isSuper: false, // Super Puppy with heroic cape
      invulnerable: 0,
      isDead: false,
      deathTimer: 0
    };

    let cameraX = 0;
    let blocks = [];
    let mice = []; // Brown mouse enemies
    let floatingBones = []; // World bone collectibles
    let jumpingBones = []; // Fountain of jumping dog bones popping out of blocks!
    let steaks = []; // Super steaks (power-ups)
    let particles = [];

    // Doghouse and Flagpole at end of level
    const flagpole = { x: 2950, y: 100, h: 280, flagY: 110, reached: false };
    const doghouse = { x: 3050, y: 240, w: 150, h: 140 };

    // Level Builder
    const initLevel = () => {
      blocks = [];
      jumpingBones = [];
      steaks = [];
      particles = [];

      // Brick ground with subtle paw print details
      for (let x = 0; x < LEVEL_WIDTH; x += 32) {
        if ((x >= 850 && x <= 950) || (x >= 1700 && x <= 1820) || (x >= 2350 && x <= 2480)) {
          continue;
        }
        blocks.push({ x, y: 380, w: 32, h: 60, type: 'ground', bumpOffset: 0, bumpVy: 0 });
      }

      // Red Fire Hydrants (Acting as the obstacles/pipes!)
      const hydrants = [
        { x: 340, y: 316, h: 64 },
        { x: 620, y: 284, h: 96 },
        { x: 1200, y: 316, h: 64 },
        { x: 1450, y: 268, h: 112 },
        { x: 2150, y: 300, h: 80 },
        { x: 2750, y: 316, h: 64 }
      ];
      hydrants.forEach(h => {
        blocks.push({ x: h.x, y: h.y, w: 44, h: h.h, type: 'hydrant', bumpOffset: 0, bumpVy: 0 });
      });

      // Bone Blocks & Bricks
      const specials = [
        // Intro section - Bone block that pops out multiple jumping bones!
        { x: 220, y: 260, type: 'boneBlock', item: 'bones' },
        { x: 270, y: 260, type: 'brick' },
        { x: 302, y: 260, type: 'boneBlock', item: 'steak' },
        { x: 334, y: 260, type: 'brick' },
        { x: 366, y: 260, type: 'boneBlock', item: 'bones' },

        // Mid section row
        { x: 740, y: 260, type: 'brick' },
        { x: 772, y: 260, type: 'boneBlock', item: 'bones' },
        { x: 804, y: 260, type: 'brick' },
        { x: 772, y: 150, type: 'boneBlock', item: 'bones' },

        // Double tier platforms
        { x: 1020, y: 260, type: 'brick' },
        { x: 1052, y: 260, type: 'brick' },
        { x: 1084, y: 260, type: 'boneBlock', item: 'bones' },
        { x: 1116, y: 260, type: 'brick' },
        { x: 1052, y: 150, type: 'boneBlock', item: 'steak' },
        { x: 1084, y: 150, type: 'brick' },

        // Challenge bridge
        { x: 1550, y: 250, type: 'brick' },
        { x: 1582, y: 250, type: 'brick' },
        { x: 1614, y: 250, type: 'boneBlock', item: 'bones' },
        { x: 1646, y: 250, type: 'brick' },

        // High stairs before doghouse
        { x: 2520, y: 348, type: 'brick' },
        { x: 2552, y: 316, type: 'brick' },
        { x: 2552, y: 348, type: 'brick' },
        { x: 2584, y: 284, type: 'brick' },
        { x: 2584, y: 316, type: 'brick' },
        { x: 2584, y: 348, type: 'brick' },
        { x: 2616, y: 252, type: 'brick' },
        { x: 2616, y: 284, type: 'brick' },
        { x: 2616, y: 316, type: 'brick' },
        { x: 2616, y: 348, type: 'brick' }
      ];

      specials.forEach(s => {
        blocks.push({
          x: s.x,
          y: s.y,
          w: 32,
          h: 32,
          type: s.type,
          item: s.item || null,
          bumpOffset: 0,
          bumpVy: 0
        });
      });

      // Floating Delicious Bones in Arches
      floatingBones = [
        { x: 480, y: 310, collected: false },
        { x: 510, y: 280, collected: false },
        { x: 540, y: 310, collected: false },
        { x: 880, y: 220, collected: false },
        { x: 910, y: 190, collected: false },
        { x: 940, y: 220, collected: false },
        { x: 1730, y: 220, collected: false },
        { x: 1760, y: 180, collected: false },
        { x: 1790, y: 220, collected: false },
        { x: 2380, y: 230, collected: false },
        { x: 2420, y: 210, collected: false },
        { x: 2460, y: 230, collected: false }
      ];

      // Pixelated Brown Mice Enemies
      mice = [
        { x: 450, y: 356, vx: -1.2, alive: true, squashedTimer: 0 },
        { x: 700, y: 356, vx: -1.2, alive: true, squashedTimer: 0 },
        { x: 990, y: 356, vx: -1.2, alive: true, squashedTimer: 0 },
        { x: 1320, y: 356, vx: -1.4, alive: true, squashedTimer: 0 },
        { x: 1370, y: 356, vx: -1.4, alive: true, squashedTimer: 0 },
        { x: 1950, y: 356, vx: -1.3, alive: true, squashedTimer: 0 },
        { x: 2020, y: 356, vx: -1.3, alive: true, squashedTimer: 0 },
        { x: 2260, y: 356, vx: -1.5, alive: true, squashedTimer: 0 }
      ];
    };

    initLevel();

    let animationFrameId;
    let lastTime = performance.now();
    let secondAccumulator = 0;

    // Trigger Multiple Pixel Dog Bones Erupting Out of Block!
    const spawnEruptingBones = (originX, originY, count = 4) => {
      playSound('bone');
      setBones(b => b + count);
      setScore(s => s + count * 50);

      // Launch multiple bones with a spread
      for (let i = 0; i < count; i++) {
        const spreadVx = (i - (count - 1) / 2) * 1.6 + (Math.random() - 0.5) * 0.8;
        const jumpVy = -8.5 - Math.random() * 2.5;
        jumpingBones.push({
          x: originX + 8,
          y: originY - 10,
          vx: spreadVx,
          vy: jumpVy,
          rotation: Math.random() * Math.PI,
          spinSpeed: 0.25 + Math.random() * 0.25,
          life: 0.75 + Math.random() * 0.2
        });
      }
    };

    // Drawing Helpers (Retro Pixel Art)
    const drawSkyAndScenery = (camX) => {
      // Classic NES Sky Blue
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Fluffy Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      const cloudPositions = [
        { x: 100, y: 55, s: 1 }, { x: 350, y: 85, s: 0.8 }, { x: 600, y: 45, s: 1.2 },
        { x: 900, y: 65, s: 1 }, { x: 1200, y: 75, s: 0.9 }, { x: 1600, y: 50, s: 1.1 },
        { x: 2000, y: 60, s: 0.85 }, { x: 2500, y: 70, s: 1 }
      ];
      cloudPositions.forEach(c => {
        const cx = c.x - camX * 0.2;
        if (cx > -120 && cx < CANVAS_WIDTH + 120) {
          ctx.beginPath();
          ctx.arc(cx, c.y, 22 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 18 * c.s, c.y - 10 * c.s, 24 * c.s, 0, Math.PI * 2);
          ctx.arc(cx + 42 * c.s, c.y, 20 * c.s, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Rolling Green Hills
      ctx.fillStyle = '#10b981';
      const hills = [
        { x: 80, y: 380, r: 85 },
        { x: 450, y: 380, r: 95 },
        { x: 950, y: 380, r: 85 },
        { x: 1500, y: 380, r: 100 },
        { x: 2100, y: 380, r: 90 }
      ];
      hills.forEach(h => {
        const hx = h.x - camX * 0.4;
        if (hx > -150 && hx < CANVAS_WIDTH + 150) {
          ctx.beginPath();
          ctx.arc(hx, h.y, h.r, Math.PI, 0);
          ctx.fill();
        }
      });

      // Bushes
      ctx.fillStyle = '#059669';
      const bushes = [
        { x: 160, y: 380, w: 60 },
        { x: 550, y: 380, w: 80 },
        { x: 1100, y: 380, w: 65 },
        { x: 1850, y: 380, w: 90 },
        { x: 2400, y: 380, w: 70 }
      ];
      bushes.forEach(b => {
        const bx = b.x - camX * 0.7;
        if (bx > -100 && bx < CANVAS_WIDTH + 100) {
          ctx.beginPath();
          ctx.arc(bx, b.y, 16, Math.PI, 0);
          ctx.arc(bx + 18, b.y, 22, Math.PI, 0);
          ctx.arc(bx + 38, b.y, 16, Math.PI, 0);
          ctx.fill();
        }
      });
    };

    // Draw Cute Golden Retriever Puppy
    const drawPuppy = (p, camX) => {
      const screenX = p.x - camX;
      const screenY = p.y;

      if (p.invulnerable > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
        return;
      }

      ctx.save();
      ctx.translate(screenX + p.width / 2, screenY + p.height / 2);
      if (p.facing === 'left') {
        ctx.scale(-1, 1);
      }

      // Golden Retriever Colors
      const goldFur = '#f59e0b';
      const darkGold = '#d97706';
      const lightGold = '#fbbf24';

      if (p.isDead) {
        // Puppy tumble pose
        ctx.fillStyle = goldFur;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('x x', -7, 3);
      } else {
        // Red Hero Cape if Super Puppy!
        if (p.isSuper) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-10, -4);
          ctx.lineTo(-24, 6 + Math.sin(Date.now() / 80) * 3);
          ctx.lineTo(-8, 8);
          ctx.closePath();
          ctx.fill();
        }

        // Wagging Tail
        const wag = Math.sin(p.tailWag) * 6;
        ctx.fillStyle = darkGold;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.quadraticCurveTo(-20, -10 + wag, -18, -16 + wag);
        ctx.lineWidth = 4;
        ctx.strokeStyle = goldFur;
        ctx.stroke();

        // Puppy Golden Body
        ctx.fillStyle = goldFur;
        ctx.beginPath();
        ctx.roundRect(-12, -6, 24, 18, 8);
        ctx.fill();

        // Cute Red Collar with Gold Tag
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(4, -8, 4, 12);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(6, 6, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Puppy Head
        ctx.fillStyle = goldFur;
        ctx.beginPath();
        ctx.arc(9, -8, 11, 0, Math.PI * 2);
        ctx.fill();

        // Floppy Golden Ear
        ctx.fillStyle = darkGold;
        ctx.beginPath();
        if (p.isJumping) {
          // Ear blown back in the wind!
          ctx.moveTo(3, -14);
          ctx.quadraticCurveTo(-4, -18, -8, -10);
          ctx.quadraticCurveTo(0, -8, 5, -8);
        } else {
          // Floppy ear
          ctx.moveTo(4, -14);
          ctx.quadraticCurveTo(-1, -8, 2, -2);
          ctx.quadraticCurveTo(8, -6, 8, -12);
        }
        ctx.closePath();
        ctx.fill();

        // Muzzle & Black Nose
        ctx.fillStyle = lightGold;
        ctx.beginPath();
        ctx.arc(15, -6, 6, 0, Math.PI * 2);
        ctx.fill();

        // Black Wet Nose
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(19, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Sparkling Puppy Eye
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(12, -10, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(11.5, -11, 1, 0, Math.PI * 2);
        ctx.fill();

        // 4 Paws / Trotting Legs
        ctx.fillStyle = darkGold;
        if (p.isJumping) {
          // Front paws stretched forward, back paws back
          ctx.fillRect(-12, 10, 6, 6);
          ctx.fillRect(10, 8, 6, 6);
        } else if (Math.abs(p.vx) > 0.2) {
          // Running trot
          const trot = Math.sin(p.animFrame * 0.5) * 5;
          ctx.fillRect(-10 + trot, 10, 5, 6);
          ctx.fillRect(-2 - trot, 10, 5, 6);
          ctx.fillRect(4 + trot, 10, 5, 6);
          ctx.fillRect(10 - trot, 10, 5, 6);
        } else {
          // Standing
          ctx.fillRect(-10, 10, 5, 6);
          ctx.fillRect(-2, 10, 5, 6);
          ctx.fillRect(6, 10, 5, 6);
          ctx.fillRect(12, 10, 5, 6);
        }
      }

      ctx.restore();
    };

    // Draw Pixelated Brown Mouse Enemy
    const drawMouse = (m, camX) => {
      const mx = m.x - camX;
      const my = m.y;

      if (!m.alive) {
        // Defeated tumbling mouse
        ctx.fillStyle = '#78350f';
        ctx.fillRect(mx + 4, my + 14, 20, 8);
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(mx, my + 12, 6, 6);
        return;
      }

      // Brown Mouse Body
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(mx + 14, my + 14, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mouse Head & Snout
      ctx.beginPath();
      ctx.moveTo(mx + 4, my + 14);
      ctx.lineTo(mx + 2, my + 10);
      ctx.lineTo(mx + 10, my + 8);
      ctx.closePath();
      ctx.fill();

      // Pink Round Ear
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(mx + 8, my + 7, 4, 0, Math.PI * 2);
      ctx.fill();

      // Black Beady Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(mx + 5, my + 10, 2, 2);

      // Pink Nose Tip
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(mx + 1, my + 13, 2, 2);

      // Long Pink Mouse Tail
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx + 26, my + 14);
      const tailWiggle = Math.sin(Date.now() / 100) * 4;
      ctx.quadraticCurveTo(mx + 34, my + 10 + tailWiggle, mx + 38, my + 6 + tailWiggle);
      ctx.stroke();

      // Little Scurrying Feet
      const step = Math.floor(Date.now() / 100) % 2;
      ctx.fillStyle = '#f472b6';
      if (step === 0) {
        ctx.fillRect(mx + 6, my + 20, 4, 3);
        ctx.fillRect(mx + 18, my + 20, 4, 3);
      } else {
        ctx.fillRect(mx + 9, my + 20, 4, 3);
        ctx.fillRect(mx + 15, my + 20, 4, 3);
      }
    };

    // Draw Pixel Dog Bone (Helper)
    const drawBoneShape = (x, y, scale = 1, rotation = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);

      // Clean White Dog Bone with shading
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;

      // Center bridge
      ctx.fillRect(-7, -2.5, 14, 5);

      // Left knobs
      ctx.beginPath();
      ctx.arc(-7, -4, 3, 0, Math.PI * 2);
      ctx.arc(-7, 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Right knobs
      ctx.beginPath();
      ctx.arc(7, -4, 3, 0, Math.PI * 2);
      ctx.arc(7, 4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw Blocks with Subtle Paw Print Brick Details
    const drawBlock = (b, camX) => {
      const bx = b.x - camX;
      const by = b.y - (b.bumpOffset || 0);

      if (bx < -64 || bx > CANVAS_WIDTH + 64) return;

      if (b.type === 'ground') {
        // Brown Brick Ground
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx, by, b.w, b.h);
        // Green grass rim
        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx, by, b.w, 6);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(bx, by + 1, b.w, 2);

        // Brick grout lines
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, b.w, b.h);

        // Subtle Paw Print Detail Stamped on the Brick Face!
        ctx.fillStyle = '#78350f';
        // Main pad
        ctx.beginPath();
        ctx.ellipse(bx + 16, by + 28, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // 3 toe dots
        ctx.beginPath();
        ctx.arc(bx + 11, by + 22, 1.6, 0, Math.PI * 2);
        ctx.arc(bx + 16, by + 20, 1.8, 0, Math.PI * 2);
        ctx.arc(bx + 21, by + 22, 1.6, 0, Math.PI * 2);
        ctx.fill();

      } else if (b.type === 'brick') {
        // Red Terracotta Brick
        ctx.fillStyle = '#b84400';
        ctx.fillRect(bx, by, b.w, b.h);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(bx + 1, by + 1, b.w - 2, 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, b.w, b.h);

        ctx.fillStyle = '#000';
        ctx.fillRect(bx, by + 10, b.w, 2);
        ctx.fillRect(bx, by + 21, b.w, 2);
        ctx.fillRect(bx + 16, by, 2, 10);
        ctx.fillRect(bx + 8, by + 11, 2, 10);
        ctx.fillRect(bx + 24, by + 11, 2, 10);
        ctx.fillRect(bx + 16, by + 22, 2, 10);

      } else if (b.type === 'boneBlock') {
        // Golden Bone Item Block (with embossed Bone icon 🦴)
        const shimmer = Math.sin(Date.now() / 160) * 12;
        ctx.fillStyle = `rgb(${245 + shimmer}, ${175 + shimmer}, 25)`;
        ctx.fillRect(bx, by, b.w, b.h);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, b.w, b.h);

        // Corner rivets
        ctx.fillStyle = '#78350f';
        ctx.fillRect(bx + 3, by + 3, 2, 2);
        ctx.fillRect(bx + b.w - 5, by + 3, 2, 2);
        ctx.fillRect(bx + 3, by + b.h - 5, 2, 2);
        ctx.fillRect(bx + b.w - 5, by + b.h - 5, 2, 2);

        // Embossed Bone Icon on the Block
        drawBoneShape(bx + b.w / 2, by + b.h / 2, 0.9, -Math.PI / 6);

      } else if (b.type === 'empty') {
        // Spent Brown Metal Block
        ctx.fillStyle = '#9e6038';
        ctx.fillRect(bx, by, b.w, b.h);
        ctx.strokeStyle = '#4a2500';
        ctx.strokeRect(bx, by, b.w, b.h);
        ctx.fillStyle = '#000';
        ctx.fillRect(bx + 3, by + 3, 2, 2);
        ctx.fillRect(bx + b.w - 5, by + 3, 2, 2);
        ctx.fillRect(bx + 3, by + b.h - 5, 2, 2);
        ctx.fillRect(bx + b.w - 5, by + b.h - 5, 2, 2);

      } else if (b.type === 'hydrant') {
        // Red Fire Hydrant Obstacle
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx + 4, by + 12, b.w - 8, b.h - 12);
        // Hydrant Highlight
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(bx + 8, by + 12, 5, b.h - 12);
        // Dome Top
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx + b.w / 2, by + 12, (b.w - 8) / 2, Math.PI, 0);
        ctx.fill();
        // Top Nut
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx + b.w / 2 - 3, by - 3, 6, 6);
        // Side Nozzles
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(bx - 2, by + 24, 6, 10);
        ctx.fillRect(bx + b.w - 4, by + 24, 6, 10);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + 4, by + 12, b.w - 8, b.h - 12);
      }
    };

    // Draw Cozy Doghouse & Flagpole
    const drawDoghouseAndFlag = (camX) => {
      // Flagpole
      const fx = flagpole.x - camX;
      if (fx > -50 && fx < CANVAS_WIDTH + 50) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(fx - 10, 350, 24, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx, flagpole.y, 4, flagpole.h);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(fx + 2, flagpole.y, 7, 0, Math.PI * 2);
        ctx.fill();

        // Bone Flag
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(fx + 4, flagpole.flagY);
        ctx.lineTo(fx + 36, flagpole.flagY + 12);
        ctx.lineTo(fx + 4, flagpole.flagY + 24);
        ctx.closePath();
        ctx.fill();
        drawBoneShape(fx + 18, flagpole.flagY + 12, 0.6, 0);
      }

      // Cozy Wooden Doghouse
      const dx = doghouse.x - camX;
      if (dx > -200 && dx < CANVAS_WIDTH + 200) {
        // Red Doghouse Walls
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(dx, doghouse.y + 30, doghouse.w, doghouse.h - 30);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx, doghouse.y + 30, doghouse.w, doghouse.h - 30);

        // Slanted Wooden Roof
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(dx - 10, doghouse.y + 30);
        ctx.lineTo(dx + doghouse.w / 2, doghouse.y - 15);
        ctx.lineTo(dx + doghouse.w + 10, doghouse.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.stroke();

        // Round Doghouse Door
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(dx + doghouse.w / 2, doghouse.y + doghouse.h - 35, 26, Math.PI, 0);
        ctx.rect(dx + doghouse.w / 2 - 26, doghouse.y + doghouse.h - 35, 52, 35);
        ctx.fill();

        // Nameplate: "PUPPY HOME"
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(dx + doghouse.w / 2 - 34, doghouse.y + 24, 68, 14);
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PUPPY HOME', dx + doghouse.w / 2, doghouse.y + 34);
      }
    };

    // AABB Collision Detection
    const checkCollision = (r1, r2) => {
      return (
        r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y
      );
    };

    // Main 60fps Game Frame Loop
    const gameLoop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Countdown Timer
      secondAccumulator += dt;
      if (secondAccumulator >= 1 && gameState === 'PLAYING') {
        secondAccumulator = 0;
        setTimeLeft(prev => {
          if (prev <= 1) {
            puppy.isDead = true;
            puppy.vy = -10;
            playSound('die');
            return 0;
          }
          return prev - 1;
        });
      }

      if (gameState === 'PLAYING') {
        const keys = keysRef.current;

        // Death Handling
        if (puppy.isDead) {
          puppy.y += puppy.vy;
          puppy.vy += 0.5;
          puppy.deathTimer += dt;
          if (puppy.deathTimer > 2.5) {
            setLives(prev => {
              const nextLives = prev - 1;
              if (nextLives <= 0) {
                setGameState('GAMEOVER');
              } else {
                puppy.x = Math.max(cameraX + 50, 80);
                puppy.y = 200;
                puppy.vx = 0;
                puppy.vy = 0;
                puppy.isDead = false;
                puppy.deathTimer = 0;
                puppy.invulnerable = 2.0;
              }
              return nextLives;
            });
          }
        } else {
          // Puppy Physics (Trotting, Wagging & Momentum)
          const maxSpeed = keys.sprint ? 5.4 : 3.8;
          const accel = 0.44;
          const friction = 0.86;

          if (keys.left) {
            puppy.vx = Math.max(puppy.vx - accel, -maxSpeed);
            puppy.facing = 'left';
            puppy.animFrame++;
            puppy.tailWag += 0.4;
          } else if (keys.right) {
            puppy.vx = Math.min(puppy.vx + accel, maxSpeed);
            puppy.facing = 'right';
            puppy.animFrame++;
            puppy.tailWag += 0.4;
          } else {
            puppy.vx *= friction;
            if (Math.abs(puppy.vx) < 0.1) puppy.vx = 0;
            puppy.tailWag += 0.1;
          }

          // Smooth Variable Jump Height: Tap for short hop, hold for high leap!
          if (keys.up && puppy.isGrounded && !puppy.isJumping) {
            puppy.vy = keys.sprint ? -12.4 : -11.2;
            puppy.isGrounded = false;
            puppy.isJumping = true;
            playSound('jump');
          } else if (!keys.up && puppy.vy < -3.5) {
            puppy.vy *= 0.65;
          }

          // Gravity
          puppy.vy += 0.55;
          if (puppy.vy > 12) puppy.vy = 12;

          if (puppy.invulnerable > 0) {
            puppy.invulnerable -= dt;
          }

          // Horizontal Movement & Collisions
          puppy.x += puppy.vx;
          if (puppy.x < cameraX) puppy.x = cameraX;

          const puppyBoxH = { x: puppy.x, y: puppy.y, w: puppy.width, h: puppy.height };
          for (let b of blocks) {
            if (checkCollision(puppyBoxH, b)) {
              if (puppy.vx > 0) {
                puppy.x = b.x - puppy.width;
              } else if (puppy.vx < 0) {
                puppy.x = b.x + b.w;
              }
              puppy.vx = 0;
            }
          }

          // Vertical Movement & Head Bumping Blocks
          puppy.y += puppy.vy;
          puppy.isGrounded = false;

          const puppyBoxV = { x: puppy.x, y: puppy.y, w: puppy.width, h: puppy.height };
          for (let b of blocks) {
            if (checkCollision(puppyBoxV, b)) {
              if (puppy.vy > 0) {
                // Landing on block top
                puppy.y = b.y - puppy.height;
                puppy.vy = 0;
                puppy.isGrounded = true;
                puppy.isJumping = false;
              } else if (puppy.vy < 0) {
                // Head bumping block from underneath
                puppy.y = b.y + b.h;
                puppy.vy = 0;
                playSound('bump');

                // Block spring bounce
                b.bumpVy = -7;

                if (b.type === 'boneBlock') {
                  b.type = 'empty';
                  if (b.item === 'steak') {
                    playSound('superSteak');
                    steaks.push({ x: b.x + 3, y: b.y - 28, vx: 1.5, vy: -3, w: 26, h: 26 });
                  } else {
                    // MULTIPLE DOG BONES POPPING OUT INTO THE AIR!
                    spawnEruptingBones(b.x + b.w / 2, b.y - 12, 4);
                  }
                } else if (b.type === 'brick') {
                  setScore(s => s + 50);
                }
              }
            }
          }

          // Fall into Pit
          if (puppy.y > CANVAS_HEIGHT + 30) {
            puppy.isDead = true;
            puppy.vy = -8;
            playSound('die');
          }

          // Camera smoothly follows puppy
          const targetCamX = puppy.x - CANVAS_WIDTH * 0.35;
          if (targetCamX > cameraX) {
            cameraX = Math.min(targetCamX, LEVEL_WIDTH - CANVAS_WIDTH);
          }

          // Floating World Bones Collection
          floatingBones.forEach(bone => {
            if (!bone.collected) {
              const dist = Math.hypot(puppy.x + puppy.width/2 - bone.x, puppy.y + puppy.height/2 - bone.y);
              if (dist < 26) {
                bone.collected = true;
                // Pop with jump bone effect!
                spawnEruptingBones(bone.x, bone.y, 1);
              }
            }
          });

          // Super Steak Power-up Collection
          steaks.forEach((stk, idx) => {
            stk.x += stk.vx;
            stk.y += stk.vy;
            stk.vy += 0.5;
            if (stk.y > 354) {
              stk.y = 354;
              stk.vy = 0;
            }
            if (checkCollision({ x: puppy.x, y: puppy.y, w: puppy.width, h: puppy.height }, stk)) {
              steaks.splice(idx, 1);
              playSound('superSteak');
              setScore(s => s + 1000);
              puppy.isSuper = true;
              particles.push({
                x: puppy.x,
                y: puppy.y - 20,
                vy: -5,
                text: 'SUPER PUPPY! +1000',
                type: 'score',
                life: 1.4
              });
            }
          });

          // Block Spring Bounce Restoration
          blocks.forEach(b => {
            if (b.bumpVy !== 0 || b.bumpOffset !== 0) {
              b.bumpOffset -= b.bumpVy;
              b.bumpVy += 1.2;
              if (b.bumpOffset <= 0) {
                b.bumpOffset = 0;
                b.bumpVy = 0;
              }
            }
          });

          // Mouse Enemies AI and Pounce Bop
          mice.forEach(m => {
            if (!m.alive) {
              m.squashedTimer += dt;
              return;
            }

            m.x += m.vx;

            // Turn around at obstacle or bounds
            for (let b of blocks) {
              if (b.type === 'hydrant' || b.type === 'brick') {
                if (checkCollision({ x: m.x, y: m.y, w: 26, h: 22 }, b)) {
                  m.vx *= -1;
                  m.x += m.vx * 2;
                }
              }
            }

            const puppyBox = { x: puppy.x, y: puppy.y, w: puppy.width, h: puppy.height };
            const mouseBox = { x: m.x, y: m.y, w: 26, h: 22 };

            if (checkCollision(puppyBox, mouseBox)) {
              // Pounce on mouse from above
              if (puppy.vy > 0 && puppy.y + puppy.height - puppy.vy <= m.y + 12) {
                m.alive = false;
                puppy.vy = -8.5; // bounce leap!
                playSound('mouseBop');
                setScore(s => s + 100);
                particles.push({
                  x: m.x + 8,
                  y: m.y - 12,
                  vy: -4,
                  text: '+100',
                  type: 'score',
                  life: 0.8
                });
              } else if (puppy.invulnerable <= 0) {
                // Hurt Puppy
                if (puppy.isSuper) {
                  puppy.isSuper = false;
                  puppy.invulnerable = 1.8;
                  playSound('bump');
                } else {
                  puppy.isDead = true;
                  puppy.vy = -10;
                  playSound('die');
                }
              }
            }
          });

          // Flagpole / Victory Trigger
          if (!flagpole.reached && puppy.x >= flagpole.x - 10) {
            flagpole.reached = true;
            puppy.vx = 0;
            puppy.x = flagpole.x - 14;
            playSound('win');
            setGameState('VICTORY');
            setScore(s => s + timeLeft * 50 + 2000);
          }
        }
      }

      // Victory Flag Animation
      if (flagpole.reached && flagpole.flagY < 330) {
        flagpole.flagY += 4;
        puppy.y = Math.min(350, flagpole.flagY + 10);
      }

      // Render Scene
      drawSkyAndScenery(cameraX);

      // Render Blocks
      blocks.forEach(b => drawBlock(b, cameraX));

      // Render Doghouse & Flagpole
      drawDoghouseAndFlag(cameraX);

      // Render Floating World Bones
      floatingBones.forEach(bone => {
        if (!bone.collected) {
          const bx = bone.x - cameraX;
          if (bx > -20 && bx < CANVAS_WIDTH + 20) {
            const bob = Math.sin(Date.now() / 200) * 3;
            drawBoneShape(bx, bone.y + bob, 1, Math.sin(Date.now() / 300) * 0.2);
          }
        }
      });

      // Render Jumping Erupting Bones (The Classic Pop-out Bones!)
      jumpingBones.forEach((jb, idx) => {
        jb.x += jb.vx;
        jb.y += jb.vy;
        jb.vy += 0.45; // gravity pulling bone down
        jb.rotation += jb.spinSpeed;
        jb.life -= dt;

        const screenX = jb.x - cameraX;
        if (screenX > -30 && screenX < CANVAS_WIDTH + 30) {
          drawBoneShape(screenX, jb.y, 1.15, jb.rotation);
        }

        if (jb.life <= 0) {
          particles.push({
            x: jb.x,
            y: jb.y - 10,
            vy: -2,
            text: '+50',
            type: 'score',
            life: 0.5
          });
          jumpingBones.splice(idx, 1);
        }
      });

      // Render Steaks
      steaks.forEach(stk => {
        const sx = stk.x - cameraX;
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(sx + 13, stk.y + 12, 13, 8, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sx + 8, stk.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Mice
      mice.forEach(m => {
        if (m.alive || m.squashedTimer < 0.6) {
          drawMouse(m, cameraX);
        }
      });

      // Render Golden Retriever Puppy
      drawPuppy(puppy, cameraX);

      // Render Floating Text & Scores
      particles.forEach((p, idx) => {
        p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(idx, 1);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px "Fira Code", monospace';
          ctx.fillText(p.text, p.x - cameraX, p.y);
        }
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Keyboard Event Handlers
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        keysRef.current.left = true;
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        keysRef.current.right = true;
      }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
        keysRef.current.up = true;
      }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        keysRef.current.down = true;
      }
      if (e.shiftKey || e.key.toLowerCase() === 'x') {
        keysRef.current.sprint = true;
      }
      if (e.key.toLowerCase() === 'b') {
        playSound('bark');
      }
      if (e.key.toLowerCase() === 'p') {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : 'PLAYING');
      }
      if (e.key.toLowerCase() === 'r') {
        resetGame();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        keysRef.current.left = false;
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        keysRef.current.right = false;
      }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
        keysRef.current.up = false;
      }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        keysRef.current.down = false;
      }
      if (!e.shiftKey && e.key.toLowerCase() !== 'x') {
        keysRef.current.sprint = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // High score tracking
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('puppy_high_score', score.toString());
    }
  }, [score, highScore]);

  // Restart / Reset
  const resetGame = () => {
    setScore(0);
    setBones(0);
    setLives(3);
    setTimeLeft(382);
    setGameState('PLAYING');
  };

  // Virtual arcade button press handlers
  const handleButtonDown = (action) => {
    if (action === 'left') keysRef.current.left = true;
    if (action === 'right') keysRef.current.right = true;
    if (action === 'jump') keysRef.current.up = true;
    if (action === 'sprint') keysRef.current.sprint = true;
    if (action === 'bark') playSound('bark');
  };

  const handleButtonUp = (action) => {
    if (action === 'left') keysRef.current.left = false;
    if (action === 'right') keysRef.current.right = false;
    if (action === 'jump') keysRef.current.up = false;
    if (action === 'sprint') keysRef.current.sprint = false;
  };

  if (activeGame === 'elephant') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8" data-testid="arcade-hub">
        {/* Arcade Game Switcher Tabs */}
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-6 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-fit">
          <button
            type="button"
            onClick={() => setActiveGame('puppy')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white"
          >
            <span>🐶</span>
            <span>Super Puppy Bros. (NES)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('elephant')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25"
          >
            <span>🐘</span>
            <span>Elephanta Temple Run (3D)</span>
            <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full uppercase">NEW</span>
          </button>
        </div>

        <ElephantRunner />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="mario-page">
      {/* Arcade Game Switcher Tabs */}
      <div className="flex items-center justify-center sm:justify-start gap-2 mb-6 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveGame('puppy')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25"
        >
          <span>🐶</span>
          <span>Super Puppy Bros. (NES)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveGame('elephant')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-slate-400 hover:text-white"
        >
          <span>🐘</span>
          <span>Elephanta Temple Run (3D)</span>
          <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full uppercase">NEW</span>
        </button>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 transition cursor-pointer"
            title="Return to Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🐶</span>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-amber-400 font-extrabold drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">SUPER</span>
                <span className="text-orange-400 font-extrabold drop-shadow-[0_0_12px_rgba(251,146,60,0.6)]">PUPPY</span>
                <span className="text-yellow-400 font-extrabold drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">BROS.</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest font-mono">
                  NES Retro Arcade
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Classic 8-Bit Golden Retriever Adventure • Erupting Bones • Paw-Print Ground • Automatable
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="btn-view-art"
            onClick={() => setShowCoverArt(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            title="View Classic 1988 NES Title Screen Artwork"
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>NES Artwork</span>
          </button>

          <button
            type="button"
            data-testid="btn-toggle-sound"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.15)]'
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>SFX</span>
          </button>

          <button
            type="button"
            data-testid="btn-toggle-music"
            onClick={() => setMusicEnabled(!musicEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              musicEnabled
                ? 'bg-slate-900 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Music {musicEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            data-testid="btn-pause"
            onClick={() => setGameState(g => g === 'PLAYING' ? 'PAUSED' : 'PLAYING')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            {gameState === 'PAUSED' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
            <span>{gameState === 'PAUSED' ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            data-testid="btn-restart"
            onClick={resetGame}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-600/25 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Main Retro Arcade Frame */}
      <div className="relative rounded-2xl overflow-hidden border-4 border-amber-950/80 bg-slate-950 shadow-2xl shadow-amber-950/40">
        
        {/* Retro Wooden Arcade Heading Banner */}
        <div className="bg-gradient-to-r from-[#78350f] via-[#92400e] to-[#78350f] px-6 py-2 border-b-2 border-[#b45309] flex items-center justify-between text-xs font-mono shadow-inner select-none">
          <div className="flex items-center gap-2">
            <span className="text-base">🐕</span>
            <span className="text-amber-200 font-black tracking-widest text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              SUPER PUPPY BROS.
            </span>
            <span className="text-[10px] text-amber-300/80 font-mono hidden sm:inline">
              © 1988 NINTENDOGS CO., LTD.
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-100 flex items-center gap-2">
            <span>HIGH SCORE:</span>
            <span className="text-yellow-300 font-black tracking-wider">{highScore.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* Retro White-Pixel Font HUD Bar (Matches NES Scene!) */}
        <div className="bg-black px-6 py-2.5 border-b border-stone-800 flex items-center justify-between text-xs font-mono select-none">
          <div className="text-center">
            <div className="text-stone-400 font-bold tracking-wider">PUPPY</div>
            <div data-testid="mario-score" className="text-white text-base font-black tracking-widest font-mono">
              {score.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-amber-400 font-bold flex items-center justify-center gap-1">
              <span>🦴</span> BONES
            </div>
            <div data-testid="mario-coins" className="text-yellow-300 text-base font-black font-mono">
              x{bones.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-cyan-400 font-bold">WORLD</div>
            <div data-testid="mario-world" className="text-white text-base font-black font-mono">
              1-1
            </div>
          </div>

          <div className="text-center">
            <div className="text-emerald-400 font-bold">TIME</div>
            <div data-testid="mario-time" className={`text-base font-black font-mono ${timeLeft < 50 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
              {timeLeft.toString().padStart(3, '0')}
            </div>
          </div>

          <div className="text-center">
            <div className="text-pink-400 font-bold flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" /> LIVES
            </div>
            <div data-testid="mario-lives" className="text-pink-300 text-base font-black font-mono">
              x{lives}
            </div>
          </div>
        </div>

        {/* Canvas Game Screen */}
        <div className="relative flex justify-center bg-[#5c94fc]" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            data-testid="game-canvas"
            className="w-full max-w-[800px] h-auto block select-none focus:outline-none"
            style={{ imageRendering: 'pixelated' }}
            tabIndex={0}
          />

          {/* Pause Overlay */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4">
                <Pause className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 font-mono">GAME PAUSED</h2>
              <p className="text-sm text-slate-300 mb-6 font-mono">Press 'P' or click below to resume playing with Puppy</p>
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                Resume Game
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
                <span className="text-3xl">🦴</span>
              </div>
              <h2 className="text-4xl font-black text-rose-500 mb-2 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] font-mono">
                GAME OVER
              </h2>
              <p className="text-sm text-slate-300 font-mono mb-4">
                Puppy's Final Score: <span className="text-yellow-400 font-bold">{score}</span> • Bones: <span className="text-amber-300 font-bold">{bones}</span>
              </p>
              <button
                type="button"
                data-testid="gameover-restart-btn"
                onClick={resetGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition cursor-pointer font-mono"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Victory Overlay */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 animate-bounce">
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-4xl font-black text-yellow-400 mb-2 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] font-mono">
                STAGE CLEAR!
              </h2>
              <p className="text-sm text-slate-200 font-mono mb-2">
                Good boy! Puppy reached the Cozy Doghouse! 🐶🏡
              </p>
              <p className="text-base font-bold text-white font-mono mb-6">
                Total Score: <span className="text-amber-400">{score}</span> • Bones: <span className="text-yellow-300">{bones}</span>
              </p>
              <button
                type="button"
                data-testid="victory-play-again-btn"
                onClick={resetGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-600 text-white font-bold text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition cursor-pointer font-mono"
              >
                Play Stage 1-1 Again
              </button>
            </div>
          )}
        </div>

        {/* On-Screen Touch / Click Gamepad */}
        <div className="bg-slate-900 border-t border-slate-800 p-4" style={{ touchAction: 'none', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-2 sm:gap-4">
            {/* D-Pad Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="gamepad-left"
                onMouseDown={() => handleButtonDown('left')}
                onMouseUp={() => handleButtonUp('left')}
                onTouchStart={() => handleButtonDown('left')}
                onTouchEnd={() => handleButtonUp('left')}
                className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 border border-slate-700 text-white font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer select-none"
              >
                ◀
              </button>
              <button
                type="button"
                data-testid="gamepad-right"
                onMouseDown={() => handleButtonDown('right')}
                onMouseUp={() => handleButtonUp('right')}
                onTouchStart={() => handleButtonDown('right')}
                onTouchEnd={() => handleButtonUp('right')}
                className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-600 border border-slate-700 text-white font-black text-xl flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer select-none"
              >
                ▶
              </button>
            </div>

            {/* Instruction Tip */}
            <div className="hidden sm:block text-center font-mono text-xs text-slate-400">
              <span className="text-amber-400 font-semibold">Puppy Controls:</span> [◀ / ▶ / A / D] Trot • [Space / ▲ / W] Jump & Hit Bone Blocks • [B] Bark! • [Shift / X] Sprint
            </div>

            {/* Action Buttons (A & B & Bark) */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="gamepad-bark"
                onClick={() => playSound('bark')}
                className="w-12 h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-xs flex flex-col items-center justify-center shadow-lg shadow-amber-600/30 active:scale-95 transition cursor-pointer select-none"
                title="Bark!"
              >
                <span>🐶</span>
                <span className="text-[8px] font-sans text-amber-200">BARK</span>
              </button>

              <button
                type="button"
                data-testid="gamepad-sprint"
                onMouseDown={() => handleButtonDown('sprint')}
                onMouseUp={() => handleButtonUp('sprint')}
                onTouchStart={() => handleButtonDown('sprint')}
                onTouchEnd={() => handleButtonUp('sprint')}
                className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-sm flex flex-col items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition cursor-pointer select-none"
              >
                <span>B</span>
                <span className="text-[9px] font-sans text-rose-200">RUN</span>
              </button>

              <button
                type="button"
                data-testid="gamepad-jump"
                onMouseDown={() => handleButtonDown('jump')}
                onMouseUp={() => handleButtonUp('jump')}
                onTouchStart={() => handleButtonDown('jump')}
                onTouchEnd={() => handleButtonUp('jump')}
                className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm flex flex-col items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer select-none"
              >
                <span>A</span>
                <span className="text-[9px] font-sans text-emerald-200">JUMP</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Classic NES Title Art Modal */}
      {showCoverArt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-3.5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐕</span>
                <h3 className="font-bold text-white text-sm font-mono">SUPER PUPPY BROS. — 1988 NES Edition</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverArt(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex justify-center">
              <img
                src={coverArtImg}
                alt="Super Puppy Bros 1988 NES Title Scene"
                className="max-h-[460px] w-auto rounded-xl border border-slate-800 shadow-xl"
              />
            </div>
            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 text-xs font-mono text-slate-400 text-center">
              A 2D pixel art 8-bit platformer • Golden Retriever Puppy jumping to hit bone blocks with erupting bones
            </div>
          </div>
        </div>
      )}

      {/* Automation Testing Locators Card */}
      <div className="mt-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Automation Testing Snippets for Super Puppy Bros</h3>
          </div>
          <div className="text-xs font-mono text-slate-400">
            High Score: <span className="text-yellow-400 font-bold">{highScore}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
            <div className="text-amber-400 font-bold mb-2">// Playwright - Jump into Bone Block & Spawn Bones</div>
            <pre className="text-slate-400 overflow-x-auto">
{`await page.goto('http://localhost:5173/play');
// Trot Puppy Right
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1200);

// Leap up to hit Bone Block and erupt bones!
await page.keyboard.press('Space');
await page.waitForTimeout(1000);

// Release movement key
await page.keyboard.up('ArrowRight');`}
            </pre>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
            <div className="text-orange-400 font-bold mb-2">// Playwright - Virtual Gamepad Pounce on Mouse</div>
            <pre className="text-slate-400 overflow-x-auto">
{`// Hold Virtual Right Button
await page.getByTestId('gamepad-right').dispatchEvent('mousedown');
await page.waitForTimeout(800);

// Press Virtual Jump Button to pounce on mouse
await page.getByTestId('gamepad-jump').click();

// Release
await page.getByTestId('gamepad-right').dispatchEvent('mouseup');`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
