import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, Volume2, VolumeX, Pause, ArrowLeft, Trophy, Shield, Magnet } from 'lucide-react';

/**
 * Elephanta Temple Run: The Giant & The Ant
 * High-performance 3D-Perspective Endless Runner
 * 
 * Verified Camera & Projection Geometry:
 * - Horizon: Y = 160 (Upper third)
 * - Ground Level: Y = 460 (Lower portion, perfectly grounded)
 * - Obstacles spawn at horizon (Z = 1000) and rush smoothly down towards player (Z = 0)
 * - Elephanta is prominently centered, running with full body, flapping ears, and swinging trunk
 * - Anty the Ant runs right behind Elephanta's heels, tracked with live proximity radar
 * - Mobile Touch Swipes + Responsive On-Screen Controls + Desktop Keyboard Controls
 */
export default function ElephantRunner() {
  const canvasRef = useRef(null);

  // Game UI States
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [peanuts, setPeanuts] = useState(0);
  const [antDistance, setAntDistance] = useState(18); // meters behind
  const [gameState, setGameState] = useState('PLAYING'); // 'PLAYING', 'GAMEOVER', 'PAUSED'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('elephanta_high_score') || '0', 10);
  });
  const [activePowerup, setActivePowerup] = useState(null); // 'SHIELD', 'MAGNET'
  const [powerupTimeLeft, setPowerupTimeLeft] = useState(0);

  // Audio Context Ref
  const audioCtxRef = useRef(null);

  // Input states tracked by ref for 60fps loop
  const inputRef = useRef({
    leftPressed: false,
    rightPressed: false,
    jumpPressed: false,
    slidePressed: false
  });

  // Touch Tracking Ref for Mobile Swipes
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Synthesized Sound Effects (Web Audio API)
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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.16);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.18);
      } else if (type === 'slide') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.22);
      } else if (type === 'lane') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.08);
      } else if (type === 'peanut') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        const f = freqs[Math.floor(Math.random() * freqs.length)];
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.4, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.08);
      } else if (type === 'powerup') {
        [440, 554, 659, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.12);
        });
      } else if (type === 'stumble') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.25);
      } else if (type === 'trumpet') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(320, now);
        osc1.frequency.linearRampToValueAtTime(580, now + 0.15);
        osc1.frequency.linearRampToValueAtTime(480, now + 0.35);
        osc2.frequency.setValueAtTime(324, now);
        osc2.frequency.linearRampToValueAtTime(586, now + 0.15);
        osc2.frequency.linearRampToValueAtTime(484, now + 0.35);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
      }
    } catch {
      // Audio fallback
    }
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        inputRef.current.leftPressed = true;
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        inputRef.current.rightPressed = true;
      }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
        inputRef.current.jumpPressed = true;
      }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        inputRef.current.slidePressed = true;
      }
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (dt < 300 && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) { // faster touch detection
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) triggerMoveLeft();
        else triggerMoveRight();
      } else {
        if (dy < 0) triggerJump();
        else triggerSlide();
      }
    }
  };

  const triggerMoveLeft = () => { inputRef.current.leftPressed = true; };
  const triggerMoveRight = () => { inputRef.current.rightPressed = true; };
  const triggerJump = () => { inputRef.current.jumpPressed = true; };
  const triggerSlide = () => { inputRef.current.slidePressed = true; };

  // Main 3D Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = 800;
    const H = 520;
    canvas.width = W;
    canvas.height = H;

    // Horizon and Ground Coordinates
    const horizonY = 160;
    const groundY = 460;
    const centerX = W / 2;

    // Game State
    const game = {
      playerLane: 1, // 0: Left, 1: Center, 2: Right
      currentLaneX: 0, // Animated between -1.0, 0.0, 1.0
      targetLaneX: 0,
      jumpY: 0, // Pixels above ground
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      stumbleTimer: 0,
      speed: 12,
      maxSpeed: 24,
      distance: 0,
      peanutsCount: 0,
      score: 0,
      antDistance: 18, // meters behind
      antSpeed: 0,
      screenShake: 0,
      powerup: null,
      powerupTimer: 0,
      runCycle: 0,
      roadOffset: 0,
      obstacles: [],
      items: [],
      particles: [],
      gameOver: false,
      lastSpawnDistance: 0
    };

    let animId;
    let lastTime = performance.now();

    // Perspective Projection Helper
    // laneOffset: -1.0 (Left), 0.0 (Center), 1.0 (Right)
    // heightAboveGround: 0 (ground) to 150 (jump)
    // z: 0 (at player) to 1000 (horizon)
    const project = (laneOffset, heightAboveGround, z) => {
      const clampedZ = Math.max(-80, Math.min(1050, z));
      // Normalized depth: 0 at player (z=0), 1 at horizon (z=1000)
      const depth = Math.max(0, clampedZ / 1000);
      const t = Math.pow(depth, 1.4); // Perspective foreshortening curve (adjusted for smoother scaling)

      // Screen Y travels from groundY (460) down to horizonY (160)
      const screenY = groundY - (groundY - horizonY) * t;

      // Scale travels from 1.05 at player to 0.12 at horizon
      const scale = 1.05 - 0.92 * t;

      // Road half-width narrows from 270px at player to 45px at horizon
      const roadHalfW = 270 * (1 - t) + 45 * t;
      const screenX = centerX + laneOffset * (roadHalfW * 0.65);

      const finalY = screenY - heightAboveGround * scale;

      return {
        x: screenX,
        y: finalY,
        scale: Math.max(0.08, scale),
        visible: z >= -100 && z <= 1050
      };
    };

    // Spawn Obstacles & Items
    const spawnPattern = () => {
      const zSpawn = 1000;
      const lane = Math.floor(Math.random() * 3);
      const rand = Math.random();

      if (rand < 0.38) {
        // Ground Log (Requires Jump)
        game.obstacles.push({
          type: 'LOG',
          lane: lane,
          z: zSpawn,
          passed: false
        });
      } else if (rand < 0.7) {
        // High Arch / Laser (Requires Slide)
        game.obstacles.push({
          type: 'ARCH',
          lane: lane,
          z: zSpawn,
          passed: false
        });
      } else if (rand < 0.9) {
        // Solid Pillar (Must Switch Lane)
        game.obstacles.push({
          type: 'PILLAR',
          lane: lane,
          z: zSpawn,
          passed: false
        });
      } else {
        // Double Obstacle
        const freeLane = Math.floor(Math.random() * 3);
        for (let l = 0; l < 3; l++) {
          if (l !== freeLane) {
            game.obstacles.push({
              type: Math.random() > 0.5 ? 'LOG' : 'PILLAR',
              lane: l,
              z: zSpawn,
              passed: false
            });
          }
        }
      }

      // Spawn Collectibles in adjacent lanes
      if (Math.random() < 0.8) {
        const itemLane = Math.floor(Math.random() * 3);
        const randItem = Math.random();
        const type = randItem < 0.7 ? 'PEANUT' : randItem < 0.88 ? 'WATERMELON' : randItem < 0.94 ? 'SHIELD' : 'MAGNET';
        game.items.push({
          type: type,
          lane: itemLane,
          z: zSpawn + 100,
          collected: false
        });
      }
    };

    // Update Loop
    const update = (dt) => {
      if (game.gameOver) return;

      // Handle Inputs
      if (inputRef.current.leftPressed) {
        if (game.playerLane > 0) {
          game.playerLane--;
          playSound('lane');
        }
        inputRef.current.leftPressed = false;
      }
      if (inputRef.current.rightPressed) {
        if (game.playerLane < 2) {
          game.playerLane++;
          playSound('lane');
        }
        inputRef.current.rightPressed = false;
      }
      if (inputRef.current.jumpPressed) {
        if (!game.isJumping && !game.isSliding) {
          game.isJumping = true;
          game.vy = 13.5;
          playSound('jump');
        }
        inputRef.current.jumpPressed = false;
      }
      if (inputRef.current.slidePressed) {
        if (!game.isJumping && !game.isSliding) {
          game.isSliding = true;
          game.slideTimer = 34;
          playSound('slide');
        }
        inputRef.current.slidePressed = false;
      }

      // Smooth horizontal lane transition
      // Lane: 0 -> -1.0, 1 -> 0.0, 2 -> 1.0
      game.targetLaneX = game.playerLane - 1;
      game.currentLaneX += (game.targetLaneX - game.currentLaneX) * 0.35; // increased factor for snappier lane shifts

      // Jump Physics
      if (game.isJumping) {
        game.jumpY += game.vy;
        game.vy -= 0.82;
        if (game.jumpY <= 0) {
          game.jumpY = 0;
          game.vy = 0;
          game.isJumping = false;
        }
      }

      // Slide Timer
      if (game.isSliding) {
        game.slideTimer--;
        if (game.slideTimer <= 0) {
          game.isSliding = false;
        }
      }

      // Power-up Timer
      if (game.powerup) {
        game.powerupTimer -= dt;
        setPowerupTimeLeft(Math.ceil(game.powerupTimer));
        if (game.powerupTimer <= 0) {
          game.powerup = null;
          setActivePowerup(null);
        }
      }

      // Running Progression
      game.speed = Math.min(game.maxSpeed, 12 + game.distance * 0.007);
      game.distance += game.speed * 0.055;
      game.roadOffset = (game.roadOffset + game.speed) % 80;
      game.runCycle += 0.28;

      // Ant Proximity
      if (game.stumbleTimer > 0) {
        game.stumbleTimer--;
      } else {
        game.antDistance = Math.min(22, game.antDistance + 0.007);
      }

      // Screen Shake Decay
      if (game.screenShake > 0) game.screenShake *= 0.88;

      // Spawn Obstacles
      if (game.distance - game.lastSpawnDistance > 90 - Math.min(45, game.speed * 1.4)) {
        spawnPattern();
        game.lastSpawnDistance = game.distance;
      }

      // Update Obstacles
      for (let i = game.obstacles.length - 1; i >= 0; i--) {
        const obs = game.obstacles[i];
        obs.z -= game.speed;

        // Collision Check (z ~ 0 to 40)
        if (obs.z <= 40 && obs.z >= -30 && !obs.passed) {
          if (obs.lane === game.playerLane) {
            let collided = false;

            if (obs.type === 'LOG') {
              if (game.jumpY < 35) collided = true;
            } else if (obs.type === 'ARCH') {
              if (!game.isSliding) collided = true;
            } else if (obs.type === 'PILLAR') {
              collided = true;
            }

            if (collided) {
              if (game.powerup === 'SHIELD') {
                playSound('stumble');
                obs.passed = true;
                game.screenShake = 12;
                for (let p = 0; p < 10; p++) {
                  game.particles.push({
                    x: game.currentLaneX,
                    y: 40,
                    z: obs.z,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: Math.random() * 8 + 3,
                    life: 20,
                    color: '#00f3ff'
                  });
                }
              } else {
                playSound('stumble');
                obs.passed = true;
                game.screenShake = 20;
                game.stumbleTimer = 45;
                game.antDistance -= 8;

                if (game.antDistance <= 0) {
                  triggerGameOver();
                  return;
                }
              }
            }
          }

          if (obs.z < -30) obs.passed = true;
        }

        if (obs.z < -100) game.obstacles.splice(i, 1);
      }

      // Update Collectibles
      for (let i = game.items.length - 1; i >= 0; i--) {
        const item = game.items[i];
        item.z -= game.speed;

        // Magnet Pull
        if (game.powerup === 'MAGNET' && item.type === 'PEANUT' && item.z < 500 && item.z > 0) {
          const itemLaneFactor = item.lane - 1;
          if (itemLaneFactor < game.currentLaneX) item.lane += 0.08;
          if (itemLaneFactor > game.currentLaneX) item.lane -= 0.08;
        }

        // Collection Check
        if (item.z <= 50 && item.z >= -30 && !item.collected) {
          if (Math.round(item.lane) === game.playerLane) {
            item.collected = true;

            if (item.type === 'PEANUT') {
              game.peanutsCount++;
              game.score += 10;
              playSound('peanut');
            } else if (item.type === 'WATERMELON') {
              game.score += 50;
              game.antDistance = Math.min(26, game.antDistance + 10);
              playSound('powerup');
            } else if (item.type === 'SHIELD') {
              game.powerup = 'SHIELD';
              game.powerupTimer = 10;
              setActivePowerup('SHIELD');
              playSound('powerup');
            } else if (item.type === 'MAGNET') {
              game.powerup = 'MAGNET';
              game.powerupTimer = 8;
              setActivePowerup('MAGNET');
              playSound('powerup');
            }
          }
        }

        if (item.z < -100) game.items.splice(i, 1);
      }

      // Update Particles
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.5;
        p.life--;
        if (p.life <= 0) game.particles.splice(i, 1);
      }

      // Update React HUD
      game.score = Math.floor(game.distance * 2 + game.peanutsCount * 10);
      setScore(game.score);
      setDistance(Math.floor(game.distance));
      setPeanuts(game.peanutsCount);
      setAntDistance(Math.max(0, Math.floor(game.antDistance)));
    };

    const triggerGameOver = () => {
      game.gameOver = true;
      setGameState('GAMEOVER');
      playSound('trumpet');

      setHighScore(prev => {
        const newHigh = Math.max(prev, game.score);
        localStorage.setItem('elephanta_high_score', newHigh.toString());
        return newHigh;
      });
    };

    // Render Canvas
    const draw = () => {
      ctx.save();

      // Screen Shake
      if (game.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * game.screenShake,
          (Math.random() - 0.5) * game.screenShake
        );
      }

      // 1. Sky & Ancient Temple Sunset
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.5, '#1e1b4b');
      skyGrad.addColorStop(1, '#431407');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, horizonY);

      // Glowing Sun on Horizon
      const sunGrad = ctx.createRadialGradient(centerX, horizonY - 10, 8, centerX, horizonY - 10, 100);
      sunGrad.addColorStop(0, '#f59e0b');
      sunGrad.addColorStop(0.3, 'rgba(234, 88, 12, 0.6)');
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(centerX, horizonY - 10, 100, 0, Math.PI * 2);
      ctx.fill();

      // Distant Temple Pyramids
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(centerX - 240, horizonY);
      ctx.lineTo(centerX - 160, horizonY - 70);
      ctx.lineTo(centerX - 80, horizonY);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX + 60, horizonY);
      ctx.lineTo(centerX + 160, horizonY - 85);
      ctx.lineTo(centerX + 260, horizonY);
      ctx.fill();

      // 2. 3D Temple Stone Runway
      const roadFarW = 90;
      const roadNearW = 540;

      // Stone Ground Below Horizon
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Temple Runway Trajectory
      const floorGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      floorGrad.addColorStop(0, '#292524');
      floorGrad.addColorStop(0.5, '#44403c');
      floorGrad.addColorStop(1, '#1c1917');
      ctx.fillStyle = floorGrad;

      ctx.beginPath();
      ctx.moveTo(centerX - roadFarW / 2, horizonY);
      ctx.lineTo(centerX + roadFarW / 2, horizonY);
      ctx.lineTo(centerX + roadNearW / 2, H);
      ctx.lineTo(centerX - roadNearW / 2, H);
      ctx.closePath();
      ctx.fill();

      // Golden Edge Rails
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(centerX - roadFarW / 2, horizonY);
      ctx.lineTo(centerX - roadNearW / 2, H);
      ctx.moveTo(centerX + roadFarW / 2, horizonY);
      ctx.lineTo(centerX + roadNearW / 2, H);
      ctx.stroke();

      // 3 Lanes Neon Dividers
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
      ctx.setLineDash([18, 14]);
      ctx.lineDashOffset = -game.roadOffset;

      const lane1Far = centerX - roadFarW / 6;
      const lane1Near = centerX - roadNearW / 6;
      const lane2Far = centerX + roadFarW / 6;
      const lane2Near = centerX + roadNearW / 6;

      ctx.beginPath();
      ctx.moveTo(lane1Far, horizonY);
      ctx.lineTo(lane1Near, H);
      ctx.moveTo(lane2Far, horizonY);
      ctx.lineTo(lane2Near, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Render Collectibles & Obstacles (Back-to-Front depth sort)
      const renderQueue = [];
      game.items.forEach(it => {
        if (!it.collected && it.z > -60) {
          renderQueue.push({ type: 'ITEM', data: it, z: it.z });
        }
      });
      game.obstacles.forEach(ob => {
        if (ob.z > -60) {
          renderQueue.push({ type: 'OBSTACLE', data: ob, z: ob.z });
        }
      });

      renderQueue.sort((a, b) => b.z - a.z);

      renderQueue.forEach(item => {
        if (item.type === 'ITEM') {
          drawItem(item.data);
        } else {
          drawObstacle(item.data);
        }
      });

      // 4. Draw Elephanta (The Hero!)
      drawElephanta();

      // 5. Draw The Ant (The Chaser!)
      drawChaserAnt();

      // 6. Draw 3D Particles
      game.particles.forEach(p => {
        const proj = project(p.x, p.y, p.z);
        if (proj.visible) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(1, 4 * proj.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Shield Full-Screen Glow Aura
      if (game.powerup === 'SHIELD') {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.lineWidth = 12;
        ctx.strokeRect(0, 0, W, H);
      }

      ctx.restore();
    };

    // Draw Collectible Item
    const drawItem = (item) => {
      const laneOffset = item.lane - 1;
      const proj = project(laneOffset, 32 + Math.sin(game.runCycle * 1.6) * 6, item.z);
      if (!proj.visible) return;

      const size = 30 * proj.scale;
      ctx.save();
      ctx.translate(proj.x, proj.y);

      if (item.type === 'PEANUT') {
        // Golden Peanut 🥜
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = Math.max(1, 2 * proj.scale);
        ctx.beginPath();
        ctx.ellipse(-size * 0.25, 0, size * 0.45, size * 0.35, 0.2, 0, Math.PI * 2);
        ctx.ellipse(size * 0.25, 0, size * 0.45, size * 0.35, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (item.type === 'WATERMELON') {
        // Watermelon Slice 🍉
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.65, 0, Math.PI);
        ctx.fill();
      } else if (item.type === 'SHIELD') {
        // Shield Orb 🛡️
        ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = Math.max(1, 3 * proj.scale);
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 16 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🛡️', 0, size * 0.35);
      } else if (item.type === 'MAGNET') {
        // Magnet Orb 🧲
        ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = Math.max(1, 3 * proj.scale);
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 16 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🧲', 0, size * 0.35);
      }

      ctx.restore();
    };

    // Draw Obstacle (Log, Arch, Pillar)
    const drawObstacle = (obs) => {
      const laneOffset = obs.lane - 1;
      const proj = project(laneOffset, 0, obs.z);
      if (!proj.visible) return;

      const scale = proj.scale;
      ctx.save();
      ctx.translate(proj.x, proj.y);

      if (obs.type === 'LOG') {
        // Fallen Mossy Log (Jump Over)
        const w = 75 * scale;
        const h = 34 * scale;
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = Math.max(1, 2 * scale);

        ctx.beginPath();
        ctx.roundRect(-w / 2, -h, w, h, 6 * scale);
        ctx.fill();
        ctx.stroke();

        // Green Moss
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(-w * 0.25, -h, w * 0.15, Math.PI, 0);
        ctx.arc(w * 0.2, -h, w * 0.12, Math.PI, 0);
        ctx.fill();

        // Jump Guide
        ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
        ctx.font = `bold ${Math.max(8, 12 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('▲ JUMP', 0, -h - 8 * scale);
      } else if (obs.type === 'ARCH') {
        // High Temple Arch / Laser (Slide Under)
        const w = 85 * scale;
        const archTopY = -105 * scale;
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = Math.max(1, 3 * scale);

        // Top Arch Crossbeam
        ctx.fillRect(-w / 2, archTopY, w, 22 * scale);
        ctx.strokeRect(-w / 2, archTopY, w, 22 * scale);

        // Pillars
        ctx.fillRect(-w / 2, archTopY, 12 * scale, 105 * scale);
        ctx.fillRect(w / 2 - 12 * scale, archTopY, 12 * scale, 105 * scale);

        // Neon Laser Line
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = Math.max(2, 4 * scale);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 10 * scale, archTopY + 36 * scale);
        ctx.lineTo(w / 2 - 10 * scale, archTopY + 36 * scale);
        ctx.stroke();

        // Slide Guide
        ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
        ctx.font = `bold ${Math.max(8, 12 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('▼ SLIDE', 0, archTopY - 6 * scale);
      } else if (obs.type === 'PILLAR') {
        // Massive Golden Rune Pillar (Must Switch Lane)
        const w = 80 * scale;
        const h = 115 * scale;
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = Math.max(1, 3 * scale);

        ctx.fillRect(-w / 2, -h, w, h);
        ctx.strokeRect(-w / 2, -h, w, h);

        ctx.fillStyle = '#fde047';
        ctx.font = `bold ${Math.max(12, 26 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡', 0, -h * 0.45);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.font = `bold ${Math.max(8, 12 * scale)}px sans-serif`;
        ctx.fillText('◀ AVOID ▶', 0, -h - 8 * scale);
      }

      ctx.restore();
    };

    // Draw Main Character: ELEPHANTA! 🐘
    const drawElephanta = () => {
      // Elephanta runs at z = 0, with jumpY height above ground
      const proj = project(game.currentLaneX, game.jumpY, 0);
      if (!proj.visible) return;

      const scale = proj.scale;
      const trot = Math.sin(game.runCycle * 2.2);
      const earFlap = Math.sin(game.runCycle * 1.6) * 12;
      const trunkSwing = Math.cos(game.runCycle * 1.3) * 15;

      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Ground Shadow
      const shadowW = Math.max(10, 75 * scale * (1 - game.jumpY / 180));
      const shadowH = Math.max(4, 22 * scale * (1 - game.jumpY / 180));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shield Aura
      if (game.powerup === 'SHIELD') {
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.arc(0, -55 * scale, 70 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (game.isSliding) {
        // --- Low Belly Slide with Sparks ---
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3 * scale;

        ctx.beginPath();
        ctx.ellipse(0, -22 * scale, 60 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(36 * scale, -24 * scale, 20 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Extended Trunk
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 9 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(48 * scale, -20 * scale);
        ctx.lineTo(76 * scale, -8 * scale);
        ctx.stroke();

        // Friction Sparks
        ctx.fillStyle = '#f59e0b';
        for (let sp = 0; sp < 6; sp++) {
          ctx.fillRect(
            (Math.random() - 0.5) * 80 * scale,
            -Math.random() * 8 * scale,
            3 * scale,
            3 * scale
          );
        }
      } else {
        // --- Running Pose ---

        // Back Legs
        ctx.fillStyle = '#475569';
        ctx.fillRect(-34 * scale, -36 * scale + trot * 6 * scale, 15 * scale, 36 * scale);
        ctx.fillRect(19 * scale, -36 * scale - trot * 6 * scale, 15 * scale, 36 * scale);

        // Giant Round Body
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3.5 * scale;
        ctx.beginPath();
        ctx.ellipse(0, -58 * scale, 48 * scale, 40 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tail
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-45 * scale, -55 * scale);
        ctx.quadraticCurveTo(-58 * scale, -45 * scale, -54 * scale + trot * 6 * scale, -35 * scale);
        ctx.stroke();

        // Front Legs
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-20 * scale, -34 * scale - trot * 6 * scale, 16 * scale, 34 * scale);
        ctx.fillRect(6 * scale, -34 * scale + trot * 6 * scale, 16 * scale, 34 * scale);

        // White Toenails
        ctx.fillStyle = '#f8fafc';
        [-18, -12, 8, 14].forEach(tx => {
          ctx.fillRect(tx * scale, -5 * scale, 4 * scale, 5 * scale);
        });

        // Flapping Ears
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.ellipse(-35 * scale, -80 * scale + earFlap * scale * 0.25, 22 * scale, 30 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(35 * scale, -80 * scale - earFlap * scale * 0.25, 22 * scale, 30 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(0, -80 * scale, 30 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Aviator Adventure Hat
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-22 * scale, -110 * scale, 44 * scale, 8 * scale);
        ctx.beginPath();
        ctx.ellipse(0, -114 * scale, 18 * scale, 10 * scale, 0, Math.PI, 0);
        ctx.fill();

        // Goggles
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(-8 * scale, -108 * scale, 5 * scale, 0, Math.PI * 2);
        ctx.arc(8 * scale, -108 * scale, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Comic Panic Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-9 * scale, -80 * scale, 6 * scale, 0, Math.PI * 2);
        ctx.arc(9 * scale, -80 * scale, 6 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-9 * scale, -78 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(9 * scale, -78 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Tusks
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-14 * scale, -70 * scale);
        ctx.quadraticCurveTo(-24 * scale, -60 * scale, -18 * scale, -48 * scale);
        ctx.lineTo(-12 * scale, -64 * scale);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(14 * scale, -70 * scale);
        ctx.quadraticCurveTo(24 * scale, -60 * scale, 18 * scale, -48 * scale);
        ctx.lineTo(12 * scale, -64 * scale);
        ctx.fill();

        // Swinging Trunk
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 13 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -70 * scale);
        ctx.quadraticCurveTo(trunkSwing * scale * 0.8, -50 * scale, trunkSwing * scale * 1.3, -32 * scale);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Draw The Chaser: THE ANT! 🐜
    const drawChaserAnt = () => {
      // The Ant runs right behind Elephanta.
      // Offset behind player: proportional to antDistance
      const antZ = -Math.min(70, game.antDistance * 3.2);
      const proj = project(game.currentLaneX * 0.92, 0, antZ);
      if (!proj.visible) return;

      const scale = proj.scale * 1.25;
      const legRun = Math.sin(game.runCycle * 4);

      ctx.save();
      ctx.translate(proj.x, proj.y + 10 * scale);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6 Legs
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2 * scale;
      for (let leg = -1; leg <= 1; leg++) {
        ctx.beginPath();
        ctx.moveTo(-5 * scale, -8 * scale);
        ctx.lineTo(-16 * scale, -12 * scale + leg * 3 * scale + legRun * 5 * scale);
        ctx.lineTo(-20 * scale, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(5 * scale, -8 * scale);
        ctx.lineTo(16 * scale, -12 * scale + leg * 3 * scale - legRun * 5 * scale);
        ctx.lineTo(20 * scale, 0);
        ctx.stroke();
      }

      // Red Sneakers
      ctx.fillStyle = '#ef4444';
      [-20 * scale, 20 * scale].forEach(sx => {
        ctx.fillRect(sx - 3 * scale, -3 * scale, 6 * scale, 3.5 * scale);
      });

      // Abdomen
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.ellipse(0, -15 * scale, 14 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thorax & Head
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, -24 * scale, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Antennae
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(-3 * scale, -32 * scale);
      ctx.lineTo(-10 * scale, -44 * scale);
      ctx.moveTo(3 * scale, -32 * scale);
      ctx.lineTo(10 * scale, -44 * scale);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-10 * scale, -44 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.arc(10 * scale, -44 * scale, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Determined Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3 * scale, -24 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.arc(3 * scale, -24 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-2.5 * scale, -24 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.arc(2.5 * scale, -24 * scale, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Warning Balloon if Ant is within 6m!
      if (game.antDistance <= 6) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-38 * scale, -62 * scale, 76 * scale, 16 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(8, 9 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡ TICKLE TIME!', 0, -51 * scale);
      }

      ctx.restore();
    };

    // 60fps Loop
    const loop = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (gameState === 'PLAYING') {
        update(dt);
      }
      draw();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, soundEnabled]);

  const handleRestart = () => {
    setScore(0);
    setDistance(0);
    setPeanuts(0);
    setAntDistance(18);
    setActivePowerup(null);
    setGameState('PLAYING');
    playSound('trumpet');
  };

  return (
    <div className="w-full text-slate-100 select-none">
      
      {/* Game Sub-Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐘</span>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Elephanta Temple Run
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                3D RUNNER
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Run across 3 lanes, jump over logs, slide under arches, and outrun the Ant!
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:text-white hover:border-cyan-500 transition cursor-pointer"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={() => setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-cyan-400 transition cursor-pointer"
          >
            {gameState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{gameState === 'PAUSED' ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Main Game Screen Container */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 shadow-2xl shadow-cyan-500/10 flex flex-col items-center">
        
        {/* HUD Top Bar Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between text-xs font-mono font-bold">
          
          {/* Stats: Score, Distance, Peanuts */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400 text-[10px]">SCORE:</span>
              <span className="text-yellow-400 text-sm">{score}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
              <span className="text-slate-400 text-[10px]">DIST:</span>
              <span className="text-cyan-300 text-sm">{distance}m</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
              <span>🥜</span>
              <span className="text-amber-400 text-sm">{peanuts}</span>
            </div>
          </div>

          {/* Ant Proximity Indicator */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl">
            <span className="text-slate-400 text-[10px]">ANT CHASER:</span>
            <div className="w-16 sm:w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 flex">
              <div
                className={`h-full transition-all duration-300 ${
                  antDistance <= 6 ? 'bg-rose-500 animate-pulse' : antDistance <= 12 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (antDistance / 22) * 100)}%` }}
              />
            </div>
            <span
              className={`text-xs ${
                antDistance <= 6 ? 'text-rose-400 animate-bounce' : 'text-slate-300'
              }`}
            >
              {antDistance}m
            </span>
          </div>

          {/* High Score / Powerup */}
          <div className="flex items-center gap-2">
            {activePowerup && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 animate-pulse text-[10px]">
                {activePowerup === 'SHIELD' ? <Shield className="w-3 h-3 text-cyan-300" /> : <Magnet className="w-3 h-3 text-pink-400" />}
                <span>{activePowerup} ({powerupTimeLeft}s)</span>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>HIGH: {highScore}</span>
            </div>
          </div>
        </div>

        {/* 3D Game Canvas */}
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full max-w-[800px] h-auto aspect-[16/10.4] cursor-pointer touch-none block"
        />

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500 flex items-center justify-center text-3xl mb-3 animate-bounce">
              🐜
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
              THE ANT CAUGHT ELEPHANTA!
            </h3>
            <p className="text-slate-300 text-xs max-w-sm mb-4">
              Anty tickled Elephanta's toes! Elephanta trumpeted in comic panic!
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400">SCORE</div>
                <div className="text-base font-bold text-yellow-400">{score}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400">DISTANCE</div>
                <div className="text-base font-bold text-cyan-300">{distance}m</div>
              </div>
              <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-400">PEANUTS</div>
                <div className="text-base font-bold text-amber-400">{peanuts}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              RUN AGAIN! 🐘💨
            </button>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6 text-center">
            <h3 className="text-2xl font-black text-white mb-2">GAME PAUSED</h3>
            <p className="text-xs text-slate-400 mb-4">Elephanta is taking a quick rest!</p>
            <button
              type="button"
              onClick={() => setGameState('PLAYING')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Resume Game
            </button>
          </div>
        )}

        {/* On-Screen Mobile & Touch Arcade Controls */}
        <div className="w-full px-4 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between sm:justify-around gap-2">
          
          {/* Lane Left / Right Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerMoveLeft}
              className="w-14 h-12 rounded-xl bg-slate-800/90 border border-slate-700 active:bg-cyan-500/30 active:border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-lg transition shadow-md cursor-pointer"
              title="Move Left"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={triggerMoveRight}
              className="w-14 h-12 rounded-xl bg-slate-800/90 border border-slate-700 active:bg-cyan-500/30 active:border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-lg transition shadow-md cursor-pointer"
              title="Move Right"
            >
              ▶
            </button>
          </div>

          {/* Desktop/Mobile Tips */}
          <div className="hidden md:flex flex-col items-center text-[10px] text-slate-400 font-mono">
            <span>Desktop: Arrow Keys / WASD</span>
            <span>Mobile: Touch Buttons or Swipe gestures</span>
          </div>

          {/* Action Jump & Slide Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerJump}
              className="px-4 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 active:bg-amber-500/40 text-amber-300 font-black text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer"
              title="Jump over low logs and spikes"
            >
              <span>▲</span>
              <span>JUMP</span>
            </button>

            <button
              type="button"
              onClick={triggerSlide}
              className="px-4 h-12 rounded-xl bg-pink-500/20 border border-pink-500/50 active:bg-pink-500/40 text-pink-300 font-black text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer"
              title="Slide under high arches and lasers"
            >
              <span>▼</span>
              <span>SLIDE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="font-bold text-amber-300 text-xs mb-1.5 flex items-center gap-1.5">
            <span>▲ JUMP vs ▼ SLIDE</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Jump over low fallen logs and golden spikes. Slide and belly-duck under high temple arches and lasers. Switch lanes to avoid solid pillars!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="font-bold text-rose-300 text-xs mb-1.5 flex items-center gap-1.5">
            <span>🐜 ANTY THE CHASER</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Anty runs right behind your heels! Bumping into obstacles causes you to trip and the Ant surges closer. Eat watermelons (🍉) to push him back!
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="font-bold text-cyan-300 text-xs mb-1.5 flex items-center gap-1.5">
            <span>🛡️ POWER-UPS & PEANUTS</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Collect golden peanuts (🥜) for points, grab the Cyber Shield (🛡️) to smash obstacles, and grab the Magnet (🧲) to vacuum all peanuts!
          </p>
        </div>
      </div>

    </div>
  );
}
