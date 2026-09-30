import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ── Radial Velocity Motion Blur Shader ────────────────────────────────────────
const RadialMotionBlurShader = {
  uniforms: {
    tDiffuse:  { value: null },
    uSpeed:    { value: 0.0 },
    uCenter:   { value: new THREE.Vector2(0.5, 0.54) },
    uStrength: { value: 0.06 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSpeed;
    uniform vec2 uCenter;
    uniform float uStrength;
    varying vec2 vUv;
    void main(){
      if(uSpeed<0.04){gl_FragColor=texture2D(tDiffuse,vUv);return;}
      vec2 dir=vUv-uCenter;
      float blur=clamp(dot(dir,dir)*uSpeed*uStrength,0.,0.032);
      vec4 col=vec4(0.);
      for(int i=0;i<8;i++){
        float t=float(i)/7.-.5;
        col+=texture2D(tDiffuse,clamp(vUv-dir*(t*blur),0.,1.));
      }
      gl_FragColor=col/8.;
    }
  `,
};

// ── Superbike Engine Audio ─────────────────────────────────────────────────
class BikeAudioEngine {
  constructor() { this.ctx=null; this.osc1=null; this.osc2=null; this.osc3=null; this.gainNode=null; this.windGain=null; }
  init() {
    if(this.ctx) return;
    try {
      const AC = window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      this.ctx = new AC();
      [this.osc1,this.osc2,this.osc3] = ['sawtooth','triangle','sawtooth'].map(t=>{
        const o=this.ctx.createOscillator(); o.type=t; return o;
      });
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.001;
      [this.osc1,this.osc2,this.osc3].forEach(o=>{ o.connect(this.gainNode); o.start(); });
      this.gainNode.connect(this.ctx.destination);
      const sz = this.ctx.sampleRate*2;
      const nb = this.ctx.createBuffer(1,sz,this.ctx.sampleRate);
      const d  = nb.getChannelData(0);
      for(let i=0;i<sz;i++) d[i]=Math.random()*2-1;
      const ns = this.ctx.createBufferSource(); ns.buffer=nb; ns.loop=true;
      const f  = this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=850;
      this.windGain = this.ctx.createGain(); this.windGain.gain.value=0.001;
      ns.connect(f); f.connect(this.windGain); this.windGain.connect(this.ctx.destination);
      ns.start();
    } catch {}
  }
  update(spd,accel,brake,nitro,gear=0,rpm=0) {
    if(!this.ctx) return;
    try {
      if(this.ctx.state==='suspended') this.ctx.resume();
      const now=this.ctx.currentTime, ratio=Math.min(1,spd/245);
      let f=80 + (gear+1)*18 + rpm*180 + (accel?35:0) + (nitro?80:0) - (brake?25:0);
      f=Math.max(60,f);
      this.osc1.frequency.setTargetAtTime(f,now,0.04);
      this.osc2.frequency.setTargetAtTime(f*0.5,now,0.04);
      this.osc3.frequency.setTargetAtTime(f*2,now,0.04);
      let vol=0.05+ratio*0.18*(accel?1.25:1)*(nitro?1.45:1);
      this.gainNode.gain.setTargetAtTime(vol,now,0.05);
      this.windGain.gain.setTargetAtTime(Math.pow(ratio,1.8)*0.22,now,0.06);
    } catch {}
  }
  playBrakeSqueal() { this._sfx(2400+Math.random()*400,'sine',0.08,0.35); }
  playNitro()       { this._ramp(120,520,'sawtooth',0.2,0.6); }
  playHorn()        { this._sfx(440,'sine',0.25,0.4); this._sfx(554,'sine',0.25,0.4); }
  playCrash()       { this._ramp(140,30,'square',0.5,0.9); }
  _sfx(freq,type,gain,dur) {
    if(!this.ctx) return;
    try {
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type; o.frequency.value=freq;
      g.gain.setValueAtTime(gain,this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime+dur);
    } catch {}
  }
  _ramp(f0,f1,type,gain,dur) {
    if(!this.ctx) return;
    try {
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type; o.frequency.setValueAtTime(f0,this.ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(f1,this.ctx.currentTime+dur*0.6);
      g.gain.setValueAtTime(gain,this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime+dur);
    } catch {}
  }
  stop() { try{ if(this.ctx) this.ctx.close(); }catch{} this.ctx=null; }
}

// ── Procedural Asphalt PBR Textures ─────────────────────────────────────────
function makeAsphaltTextures() {
  // Diffuse
  const c = document.createElement('canvas'); c.width=2048; c.height=1024;
  const cx = c.getContext('2d');
  cx.fillStyle = '#1e2124'; cx.fillRect(0,0,2048,1024);
  // Stone grain
  const id = cx.getImageData(0,0,2048,1024);
  for(let i=0;i<id.data.length;i+=4){
    const g=(Math.random()-0.5)*28; id.data[i]+=g; id.data[i+1]+=g; id.data[i+2]+=g;
  }
  cx.putImageData(id,0,0);
  // Tire rubber wear tracks (4 lanes)
  [0.15,0.38,0.62,0.85].forEach(lp=>{
    const lx=lp*2048;
    [-55,55].forEach(off=>{
      const gr=cx.createLinearGradient(lx+off-40,0,lx+off+40,0);
      gr.addColorStop(0,'rgba(8,10,14,0)'); gr.addColorStop(.5,'rgba(8,10,14,.42)'); gr.addColorStop(1,'rgba(8,10,14,0)');
      cx.fillStyle=gr; cx.fillRect(lx+off-40,0,80,1024);
    });
  });
  // Cracks
  for(let i=0;i<14;i++){
    let x=Math.random()*2048, y=Math.random()*1024;
    cx.strokeStyle='rgba(6,7,9,.88)'; cx.lineWidth=2.2; cx.lineCap='round'; cx.beginPath(); cx.moveTo(x,y);
    for(let j=0;j<7;j++){ x+=(Math.random()-.5)*130; y+=Math.random()*90; cx.lineTo(x,y); }
    cx.stroke();
  }
  // Shoulder lines (yellow)
  cx.fillStyle='#f59e0b';
  cx.fillRect(0.042*2048,0,20,1024); cx.fillRect(0.958*2048-20,0,20,1024);
  // Centre double yellow
  cx.fillStyle='#f59e0b';
  cx.fillRect(0.497*2048,0,10,1024); cx.fillRect(0.503*2048,0,10,1024);
  // White dashes
  [0.27,0.73].forEach(p=>{
    const lx=p*2048;
    for(let y=0;y<1024;y+=168){
      cx.fillStyle='rgba(8,10,14,.4)'; cx.fillRect(lx-8,y+2,16,96);
      cx.fillStyle='#ffffff'; cx.fillRect(lx-8,y,16,96);
      cx.fillStyle='rgba(255,255,255,.7)'; cx.fillRect(lx-4,y+4,8,88);
    }
  });

  const diffuse = new THREE.CanvasTexture(c);
  diffuse.wrapS=diffuse.wrapT=THREE.RepeatWrapping; diffuse.repeat.set(1,16); diffuse.anisotropy=8;

  // Normal
  const nc=document.createElement('canvas'); nc.width=512; nc.height=256;
  const ncx=nc.getContext('2d');
  ncx.fillStyle='rgb(128,128,255)'; ncx.fillRect(0,0,512,256);
  const ni=ncx.getImageData(0,0,512,256);
  for(let i=0;i<ni.data.length;i+=4){ const b=(Math.random()-.5)*36; ni.data[i]+=b; ni.data[i+1]+=b; ni.data[i+2]=255; }
  ncx.putImageData(ni,0,0);
  const normal = new THREE.CanvasTexture(nc);
  normal.wrapS=normal.wrapT=THREE.RepeatWrapping; normal.repeat.set(1,16);

  // Roughness
  const rc=document.createElement('canvas'); rc.width=512; rc.height=256;
  const rcx=rc.getContext('2d'); rcx.fillStyle='#c8c8c8'; rcx.fillRect(0,0,512,256);
  const roughness = new THREE.CanvasTexture(rc);
  roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping; roughness.repeat.set(1,16);

  return { diffuse, normal, roughness };
}

// ── Circular Radial Gradient Textures ────────────────────────────────────────
function makeRadialTex(w=256,stops) {
  const c=document.createElement('canvas'); c.width=w; c.height=w;
  const cx=c.getContext('2d');
  const g=cx.createRadialGradient(w/2,w/2,w*0.07,w/2,w/2,w*0.48);
  stops.forEach(([t,col])=>g.addColorStop(t,col));
  cx.fillStyle=g; cx.fillRect(0,0,w,w);
  return new THREE.CanvasTexture(c);
}

// ── Procedural Traffic Vehicle (fallback when GLTF not available) ────────────
function makeProceduralVehicle(type) {
  const g = new THREE.Group();
  const colors = ['#e2e8f0','#0f172a','#1e3a8a','#991b1b','#f8fafc','#78350f'];
  const bodyColor = colors[Math.floor(Math.random()*colors.length)];
  const bodyMat  = new THREE.MeshPhysicalMaterial({color:bodyColor,metalness:.82,roughness:.16,clearcoat:1,clearcoatRoughness:.06});
  const glassMat = new THREE.MeshPhysicalMaterial({color:'#0e1a2a',metalness:.2,roughness:.05,transparent:true,opacity:.55});
  const tireMat  = new THREE.MeshStandardMaterial({color:'#131518',roughness:.9,metalness:.05});
  const rimMat   = new THREE.MeshStandardMaterial({color:'#c0c8d8',metalness:.95,roughness:.1});

  const dims = {
    sedan: { bx:1.85,by:.78,bz:4.3,  cx:.85,cy:.5,cz:1.8,  cy0:.78,  tr:.32,tw:.22},
    suv:   { bx:1.95,by:.9, bz:4.6,  cx:.82,cy:.6,cz:2.0,  cy0:.9,   tr:.34,tw:.24},
    truck: { bx:2.1, by:1.2,bz:7.0,  cx:.7, cy:.7,cz:1.4,  cy0:1.2,  tr:.42,tw:.28},
    semi:  { bx:2.4, by:1.6,bz:12.0, cx:.7, cy:.8,cz:1.5,  cy0:1.55, tr:.48,tw:.3 },
  }[type]||{bx:1.85,by:.78,bz:4.3,cx:.85,cy:.5,cz:1.8,cy0:.78,tr:.32,tw:.22};

  // Body shell
  const body = new THREE.Mesh(new THREE.BoxGeometry(dims.bx,dims.by,dims.bz), bodyMat);
  body.position.y = dims.by/2 + dims.tr*0.6;
  body.castShadow=true; body.receiveShadow=true;
  g.add(body);

  // Cabin / glass
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.cx*dims.bx,dims.cy,dims.cz), glassMat);
  cabin.position.y = dims.cy0 + dims.cy/2;
  cabin.castShadow=true;
  g.add(cabin);

  // Hood slope (wedge look)
  const hoodMat = bodyMat.clone();
  if(type==='semi') {
    // Cab-over extra box
    const cab = new THREE.Mesh(new THREE.BoxGeometry(dims.bx,dims.cy0,dims.bz*0.32), bodyMat);
    cab.position.set(0,dims.by/2+dims.cy0/2,-dims.bz*0.34);
    g.add(cab);
  }

  // 4 Wheels
  const wheelRadius = dims.tr;
  const wheelWidth  = dims.tw;
  const xOff = dims.bx/2+wheelWidth/2;
  const yOff = dims.tr;
  const zFront = -dims.bz*0.32;
  const zRear  =  dims.bz*0.28;

  [[xOff,yOff,zFront],[xOff,yOff,zRear],[-xOff,yOff,zFront],[-xOff,yOff,zRear]].forEach(([wx,wy,wz])=>{
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius,wheelRadius,wheelWidth,20,1), tireMat);
    tire.rotation.z = Math.PI/2;
    const rim  = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius*.6,wheelRadius*.6,wheelWidth+.01,8,1), rimMat);
    rim.rotation.z = Math.PI/2;
    const wg = new THREE.Group();
    wg.add(tire); wg.add(rim);
    wg.position.set(wx,wy,wz);
    wg.castShadow=true;
    g.add(wg);
  });

  g.userData.type = type;
  return g;
}

// ── Detailed Rider Model in Race Tuck ─────────────────────────────────────────
function makeRider() {
  const g = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({color:'#1a2035',roughness:.65,metalness:.15});
  const carbon  = new THREE.MeshStandardMaterial({color:'#0d1120',roughness:.3,metalness:.85});
  const visor   = new THREE.MeshPhysicalMaterial({color:'#1565c0',clearcoat:1,clearcoatRoughness:.02,metalness:.95,roughness:.06});
  const accent  = new THREE.MeshStandardMaterial({color:'#c62828',roughness:.45,metalness:.25});

  // Head / Helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(.18,18,18), new THREE.MeshPhysicalMaterial({color:'#0d0d14',clearcoat:1,clearcoatRoughness:.06,metalness:.6,roughness:.18}));
  head.scale.set(.88,1.04,1.12); head.position.set(0,1.3,-.2); head.rotation.x=.28; head.castShadow=true;
  g.add(head);
  const vis = new THREE.Mesh(new THREE.CylinderGeometry(.155,.155,.085,16,1,false,0,Math.PI), visor);
  vis.rotation.x=Math.PI/2+.3; vis.position.set(0,1.3,-.32);
  g.add(vis);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(.17,.05,.11), carbon);
  spoiler.position.set(0,1.37,-.09); spoiler.rotation.x=-.3;
  g.add(spoiler);

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.22,.19,.5,14), leather);
  torso.rotation.x=1.05; torso.position.set(0,1.04,.02); torso.castShadow=true;
  g.add(torso);
  const hump = new THREE.Mesh(new THREE.BoxGeometry(.16,.11,.32), carbon);
  hump.position.set(0,1.21,-.02); hump.rotation.x=1.05;
  g.add(hump);

  // Shoulders
  [-0.23,0.23].forEach(sx=>{
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.095,10,10), carbon);
    sh.position.set(sx,1.18,-.1);
    g.add(sh);
    const str = new THREE.Mesh(new THREE.BoxGeometry(.04,.07,.2), accent);
    str.position.set(sx*.95,1.14,-.04); str.rotation.x=1.05;
    g.add(str);
  });

  // Arms
  [-0.24,0.24].forEach(ax=>{
    const L = ax<0;
    const ua = new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.32,10), leather);
    ua.position.set(ax*1.1,1.05,-.2); ua.rotation.set(.7,L?.33:-.33,L?-.43:.43);
    g.add(ua);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.3,10), leather);
    fa.position.set(ax*1.04,.91,-.4); fa.rotation.set(1.2,L?.18:-.18,L?-.18:.18);
    g.add(fa);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.1), carbon);
    gl.position.set(ax*.94,.83,-.55);
    g.add(gl);
  });

  // Legs
  [-0.21,0.21].forEach(lx=>{
    const L = lx<0;
    const th = new THREE.Mesh(new THREE.CylinderGeometry(.085,.105,.42,10), leather);
    th.position.set(lx*1.22,.83,.1); th.rotation.set(1.38,L?.18:-.18,0);
    g.add(th);
    const kn = new THREE.Mesh(new THREE.BoxGeometry(.05,.08,.07), carbon);
    kn.position.set(lx*1.55,.8,-.04);
    g.add(kn);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(.065,.077,.36,10), leather);
    ca.position.set(lx*1.08,.66,.26); ca.rotation.set(-1.1,0,0);
    g.add(ca);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(.075,.086,.17), carbon);
    bt.position.set(lx*1.04,.5,.4);
    g.add(bt);
  });

  return g;
}

// ── 5-Gear Superbike Calibration (0→200 km/h in ~8 seconds) ───────────────────
const GEARS = [
  { shift:  42, redline:  55, torque: 46, engBrake: 50 }, // G1: 0–42 km/h in ~1.0s (strong launch)
  { shift:  82, redline:  98, torque: 34, engBrake: 40 }, // G2: 42–82 km/h in ~1.4s
  { shift: 128, redline: 145, torque: 27, engBrake: 32 }, // G3: 82–128 km/h in ~1.8s
  { shift: 172, redline: 190, torque: 22, engBrake: 25 }, // G4: 128–172 km/h in ~2.1s
  { shift: 245, redline: 260, torque: 18, engBrake: 18 }, // G5: 172–200 km/h in ~1.6s -> Total 0–200 in ~7.9s!
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BikeRacer({ onClose }) {

  const containerRef = useRef(null);
  const audioRef = useRef(new BikeAudioEngine());
  const audio = audioRef.current;
  const rafRef = useRef(null);

  const stateRef = useRef({
    speed: 0, maxSpeed: 290, accelRate: 58, brakeRate: 90, friction: 16,
    dist: 0, playerX: 2.1, playerLean: 0,
    accel: false, brake: false, steer: 0,
    nitroAvailable: 100, nitroActive: false, nitroTime: 0,
    score: 0, cameraMode: 'chase',
    gear: 0, // 5-gear system: 0=G1 … 4=G5
    invulnTime: 2.5, // 2.5s collision immunity grace period on start
    crashed: false, crashTime: 0,
    crashPos: {x:2.1,y:0,z:0}, crashVel:{x:0,y:0,z:0}, crashRotVel:{x:0,y:0,z:0},
    isPaused: false,
  });

  const [phase, setPhase] = useState('playing');
  const [hud,   setHud]   = useState({speed:0,dist:0,nitro:100,score:0,gear:1,rpm:0});
  const [cameraMode, setCameraMode] = useState('chase');
  const [isPaused, setIsPaused] = useState(false);
  const [alert, setAlert] = useState(null);
  const [touch, setTouch] = useState({gas:false,brake:false});
  const [loading, setLoading] = useState(true);

  // Refs to Three.js objects so restartRace can reset transforms and vehicles without re-mounting
  const playerGroupRef = useRef(null);
  const cameraRef = useRef(null);
  const resetVehiclesRef = useRef(null);


  const toggleCamera = useCallback(() => {
    setCameraMode(prev => {
      const next = prev === 'chase' ? 'cockpit' : 'chase';
      stateRef.current.cameraMode = next;
      return next;
    });
  }, []);

  const showAlert = useCallback((msg, dur=1100) => {
    setAlert(msg); setTimeout(()=>setAlert(null), dur);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const dn = (e) => {
      audio.init();
      const s = stateRef.current;
      if(s.crashed || phase === 'gameover') {
        if(['Space','Enter','KeyR'].includes(e.code)||e.key===' '||e.key==='r'||e.key==='R'||e.key==='Enter') {
          restartRace();
        }
        return;
      }
      if(['ArrowUp','KeyW'].includes(e.code)||e.key==='w'||e.key==='W'||e.key==='ArrowUp') s.accel=true;
      if(['ArrowDown','KeyS'].includes(e.code)||e.key==='s'||e.key==='S'||e.key==='ArrowDown'){ s.brake=true; audio.playBrakeSqueal(); }
      if(['ArrowLeft','KeyA'].includes(e.code)||e.key==='a'||e.key==='A'||e.key==='ArrowLeft') s.steer=-1;
      if(['ArrowRight','KeyD'].includes(e.code)||e.key==='d'||e.key==='D'||e.key==='ArrowRight') s.steer=1;
      if(['Space','KeyN'].includes(e.code)||e.key===' '||e.key==='n'||e.key==='N') triggerNitro();
      if(['KeyC','KeyV'].includes(e.code)||e.key==='c'||e.key==='C') toggleCamera();
      if(e.code==='KeyH'||e.key==='h'||e.key==='H') audio.playHorn();
      if(['KeyP','Escape'].includes(e.code)) togglePause();
    };
    const up = (e) => {
      const s = stateRef.current;
      if(['ArrowUp','KeyW'].includes(e.code)||e.key==='w'||e.key==='W'||e.key==='ArrowUp') s.accel=false;
      if(['ArrowDown','KeyS'].includes(e.code)||e.key==='s'||e.key==='S'||e.key==='ArrowDown') s.brake=false;
      if(['ArrowLeft','KeyA'].includes(e.code)||e.key==='a'||e.key==='A'||e.key==='ArrowLeft') { if(s.steer===-1) s.steer=0; }
      if(['ArrowRight','KeyD'].includes(e.code)||e.key==='d'||e.key==='D'||e.key==='ArrowRight') { if(s.steer===1) s.steer=0; }
    };
    window.addEventListener('keydown',dn);
    window.addEventListener('keyup',up);
    return ()=>{ window.removeEventListener('keydown',dn); window.removeEventListener('keyup',up); };
  }, [toggleCamera, phase]);

  const triggerNitro = () => {
    audio.init();
    const s = stateRef.current;
    if(s.crashed||s.nitroAvailable<25||s.nitroActive) return;
    s.nitroActive=true; s.nitroTime=3.5; s.nitroAvailable=Math.max(0,s.nitroAvailable-35);
    audio.playNitro(); showAlert('🚀 NITRO BOOST!');
  };

  const togglePause = () => {
    stateRef.current.isPaused = !stateRef.current.isPaused;
    setIsPaused(p=>!p);
  };

  const restartRace = () => {
    const s = stateRef.current;
    Object.assign(s, {
      speed:0, dist:0, playerX:2.1, playerLean:0,
      accel:false, brake:false, steer:0,
      nitroAvailable:100, nitroActive:false, nitroTime:0,
      score:0, crashed:false, crashTime:0, isPaused:false,
      invulnTime: 2.5, // 2.5s collision immunity grace period on restart
      gear:0, // Reset to G1 on replay
      crashPos:{x:2.1,y:0,z:0},
      crashVel:{x:0,y:0,z:0},
      crashRotVel:{x:0,y:0,z:0},
    });

    // Reset all traffic vehicles far ahead down the road so none are sitting at player spawn
    if(resetVehiclesRef.current) {
      resetVehiclesRef.current();
    }

    // Reset Three.js playerGroup transforms
    if(playerGroupRef.current) {
      playerGroupRef.current.position.set(2.1, 0, 0);
      playerGroupRef.current.rotation.set(0, 0, 0);
      playerGroupRef.current.scale.set(1, 1, 1);
    }
    // Snap camera to start position so lerp doesn't drag from crash location
    if(cameraRef.current) {
      cameraRef.current.position.set(2.1, 1.9, 4.8);
      cameraRef.current.rotation.set(0, 0, 0);
    }
    setPhase('playing'); setIsPaused(false);
  };

  // ── Three.js Scene & Game Loop ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if(!container) return;
    const W = container.clientWidth||800, H = container.clientHeight||500;

    // Scene & Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#e89a5c', 0.0033);

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.1, 1000);
    camera.position.set(2.1, 1.9, 4.8);
    camera.lookAt(2.1, 1.1, -24);
    cameraRef.current = camera; // expose to restartRace for snap-reset on replay

    const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance', stencil:false});
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // Post-Processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W,H), 0.48, 0.35, 0.82));
    const blurPass = new ShaderPass(RadialMotionBlurShader);
    composer.addPass(blurPass);

    // Lighting
    scene.add(new THREE.AmbientLight('#d6eaff', 0.88));
    scene.add(new THREE.HemisphereLight('#fde9c8','#2d3a50', 0.68));
    const sun = new THREE.DirectionalLight('#fff7e0', 2.85);
    sun.position.set(-45,62,-72); sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.near=0.5; sun.shadow.camera.far=180;
    sun.shadow.camera.left=-30; sun.shadow.camera.right=30;
    sun.shadow.camera.top=30; sun.shadow.camera.bottom=-30;
    sun.shadow.bias=-0.0003; sun.shadow.normalBias=0.02;
    scene.add(sun);

    // HDRI Environment
    new HDRLoader().load('/textures/env.hdr',
      tx=>{ tx.mapping=THREE.EquirectangularReflectionMapping; scene.environment=scene.background=tx; },
      undefined,
      ()=>{ scene.background=new THREE.Color('#5ba4d0'); }
    );

    // ── Road & Shoulder ──────────────────────────────────────────────────────
    const ROAD_W = 16.5, ROAD_L = 420;
    const {diffuse:rdiff, normal:rnorm, roughness:rrough} = makeAsphaltTextures();

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W, ROAD_L),
      new THREE.MeshStandardMaterial({map:rdiff, normalMap:rnorm, normalScale:new THREE.Vector2(.8,.8), roughnessMap:rrough, roughness:.82, metalness:.12})
    );
    road.rotation.x=-Math.PI/2; road.position.set(0,0,-ROAD_L/2+10); road.receiveShadow=true;
    scene.add(road);

    // Terrain/grass shoulders
    const terrainMat = new THREE.MeshStandardMaterial({color:'#3d4a3e',roughness:.95,metalness:.04});
    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(300,ROAD_L), terrainMat);
    terrain.rotation.x=-Math.PI/2; terrain.position.set(0,-.01,-ROAD_L/2+10); terrain.receiveShadow=true;
    scene.add(terrain);

    // Guardrails
    const railMat = new THREE.MeshStandardMaterial({color:'#c8d0dc',metalness:.92,roughness:.22});
    const railGeo = new THREE.BoxGeometry(.12,.45,ROAD_L);
    [-1,1].forEach(side=>{
      const r = new THREE.Mesh(railGeo, railMat);
      r.position.set(side*(ROAD_W/2+.25), .48, -ROAD_L/2+10);
      r.castShadow=r.receiveShadow=true; scene.add(r);
      // Rail posts
      for(let z=-ROAD_L/2+10; z<ROAD_L/2; z+=8){
        const post = new THREE.Mesh(new THREE.BoxGeometry(.08,.65,.08), railMat);
        post.position.set(side*(ROAD_W/2+.25),.33,z);
        post.castShadow=true; scene.add(post);
      }
    });

    // ── Roadside Trees (GLTF with procedural fallback) ───────────────────────
    const trees = [];
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    function makeFallbackTree() {
      const tg = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,.9,8), new THREE.MeshStandardMaterial({color:'#3d2b1f',roughness:.95}));
      trunk.position.y=.45; trunk.castShadow=true; tg.add(trunk);
      const foliageMat = new THREE.MeshStandardMaterial({color:'#1a3a1c',roughness:.88,metalness:.02});
      [0,1,2].forEach(i=>{
        const r=.85-.18*i, h=.7+.2*i;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r,h,10), foliageMat);
        cone.position.y=.9+i*.45; cone.castShadow=true; tg.add(cone);
      });
      return tg;
    }

    function plantTrees(template=null) {
      for(let i=0;i<65;i++){
        const side = i%2===0 ? -1:1;
        const xd = side*(ROAD_W/2+4+Math.random()*22);
        const sc = .8+Math.random()*.85;
        const tree = template ? template.clone(true) : makeFallbackTree();
        tree.scale.set(sc,sc,sc);
        tree.position.set(xd, 0, -Math.random()*ROAD_L);
        tree.rotation.y = Math.random()*Math.PI*2;
        scene.add(tree); trees.push(tree);
      }
    }

    gltfLoader.load('/models/pine.glb', gltf=>{
      const t=gltf.scene; t.traverse(c=>{ if(c.isMesh){c.castShadow=c.receiveShadow=true;} });
      plantTrees(t);
    }, undefined, ()=>plantTrees(null));

    // ── Player Bike ──────────────────────────────────────────────────────────
    const playerGroup = new THREE.Group();
    playerGroup.position.set(2.1, 0, 0);
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup; // expose to restartRace for transform reset

    // Contact shadow
    const shadowTex = makeRadialTex(256,[
      [0,'rgba(4,5,8,.97)'],[.45,'rgba(4,5,8,.65)'],[.82,'rgba(4,5,8,.2)'],[1,'rgba(4,5,8,0)']
    ]);
    const shadowMat = new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.88,depthWrite:false});
    const bikeShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7,3.3), shadowMat);
    bikeShadow.rotation.x=-Math.PI/2; bikeShadow.position.y=.022;
    playerGroup.add(bikeShadow);

    // Rider model (always visible immediately)
    const rider = makeRider();
    playerGroup.add(rider);

    // Track wheel meshes and the GLTF bike scene
    const wheelMeshes = [];
    let bikeScene = null;

    gltfLoader.load('/models/motorcycle.glb', gltf=>{
      const bikeModel = gltf.scene;
      bikeScene = bikeModel;

      // Auto-scale to ~2.15m length and accurately center
      const bb = new THREE.Box3().setFromObject(bikeModel);
      const sz = new THREE.Vector3(); bb.getSize(sz);
      const center = new THREE.Vector3(); bb.getCenter(center);
      const sc = 2.15 / Math.max(sz.x, sz.z);
      bikeModel.scale.set(sc, sc, sc);
      bikeModel.position.set(-center.x * sc, -bb.min.y * sc, -center.z * sc);

      // Wrapper group to orient motorcycle straight down the highway (-X rotates to -Z)
      const bikeWrapper = new THREE.Group();
      bikeWrapper.rotation.y = -Math.PI / 2;
      bikeWrapper.add(bikeModel);

      bikeModel.traverse(child=>{
        if(!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        // Identify wheels for rolling animation
        if(/tire|rim|wheel|disc_ABS|sprocket/i.test(child.name)) wheelMeshes.push(child);
        if(!child.material) return;
        child.material.envMapIntensity = 1.8;
        if(/carpaint|body|fairing/i.test(child.material.name) || /body|fender/i.test(child.name)){
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#b91c1c', // Deep racing red
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            metalness: 0.85,
            roughness: 0.15,
            envMapIntensity: 2.2,
          });
        } else if(/chrome|bolt|lever|pipe|exhaust/i.test(child.material.name)){
          child.material.metalness = 0.98;
          child.material.roughness = 0.05;
        } else if(/glass|windshield|mirror/i.test(child.material.name)){
          child.material.transparent = true;
          child.material.opacity = 0.45;
          child.material.roughness = 0.03;
        }
      });

      playerGroup.add(bikeWrapper);
      // Position rider naturally on the superbike seat
      rider.position.set(0, 0.02, 0.08);
    }, undefined, (err)=>{
      console.error('Error loading HD motorcycle.glb:', err);
    });


    // ── Tire Smoke Particle System ────────────────────────────────────────────
    const N_PARTS = 100;
    const pPos = new Float32Array(N_PARTS*3);
    const pCol = new Float32Array(N_PARTS*3);
    const pSiz = new Float32Array(N_PARTS);
    for(let i=0;i<N_PARTS;i++){ pPos[i*3+1]=-100; pSiz[i]=.01; }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol,3));
    pGeo.setAttribute('size',     new THREE.BufferAttribute(pSiz,1));

    const smokeTex = makeRadialTex(64,[
      [0,'rgba(255,255,255,.96)'],[.38,'rgba(230,235,245,.52)'],[.72,'rgba(200,210,228,.16)'],[1,'rgba(180,190,215,0)']
    ]);
    const pMat = new THREE.PointsMaterial({size:.95,vertexColors:true,transparent:true,opacity:.62,map:smokeTex,depthWrite:false});
    const pSys = new THREE.Points(pGeo, pMat);
    scene.add(pSys);

    const pool = Array.from({length:N_PARTS},()=>({active:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1,sz:0,tSz:1,r:1,g:1,b:1,a:1}));
    let pNext = 0;

    function emitSmoke(isNitro, spd) {
      const p = pool[pNext]; pNext=(pNext+1)%N_PARTS;
      const s = stateRef.current;
      p.active=true; p.life=0; p.maxLife=.4+Math.random()*.4;
      p.x=s.playerX+(Math.random()-.5)*.18; p.y=.1+Math.random()*.07; p.z=1.05;
      if(isNitro){
        p.vx=(Math.random()-.5)*.5; p.vy=.18+Math.random()*.38; p.vz=5+spd*.055;
        p.sz=.35; p.tSz=1.2; p.r=.15; p.g=.88; p.b=1; p.a=.98;
      } else {
        p.vx=(Math.random()-.5)*.65; p.vy=.22+Math.random()*.42; p.vz=1.8+spd*.025;
        p.sz=.32; p.tSz=1.55; p.r=.9; p.g=.92; p.b=.94; p.a=.52;
      }
    }

    // ── Traffic System ────────────────────────────────────────────────────────
    // 4 lanes: left 2 = oncoming, right 2 = same-direction
    const LANE_CONFIGS = [
      {x:-5.8,oncoming:true, minSpd:72,maxSpd:108, len:12},  // Oncoming fast
      {x:-2.1,oncoming:true, minSpd:58,maxSpd:85,  len:4.6}, // Oncoming slow
      {x: 2.1,oncoming:false,minSpd:68,maxSpd:95,  len:4.6}, // Same-dir cruising
      {x: 5.8,oncoming:false,minSpd:78,maxSpd:112, len:12},  // Same-dir fast
    ];

    const VEHICLE_COLORS = ['#d0d5dc','#0d1117','#1a2f70','#8b1a1a','#f0f4f8','#6b3d0f'];

    const vehicles = [];

    // Load traffic templates — real 3D models with centered wrappers
    const trafficTemplates = {};
    const TRAFFIC_MODELS = [
      {key:'car',   url:'/models/ferrari.glb',  len:4.6},
      {key:'suv',   url:'/models/suv.gltf',     len:4.8},
      {key:'truck', url:'/models/truck.gltf',   len:7.2},
      {key:'semi',  url:'/models/semi-truck.glb',len:12},
      {key:'sedan', url:'/models/sedan.gltf',   len:4.5},
    ];
    let tmplLoadCount = 0;

    function onTrafficModelDone() {
      tmplLoadCount++;
      if(tmplLoadCount >= TRAFFIC_MODELS.length) {
        setLoading(false);
        // Seed initial traffic across highway with generous passing gaps on the right side:
        // Lane 0 (Oncoming Fast): 2 cars, spaced out
        spawnVehicle(-65, 0);
        spawnVehicle(-175, 0);
        // Lane 1 (Oncoming Slow): 2 cars, spaced out
        spawnVehicle(-120, 1);
        spawnVehicle(-240, 1);
        // Lane 2 (Same-dir Center / Player Lane): ONLY 1 car, 95m ahead (plenty of room to launch & pass!)
        spawnVehicle(-95, 2);
        // Lane 3 (Same-dir Right): ONLY 1 car, 190m ahead (wide open passing runway!)
        spawnVehicle(-190, 3);
      }
    }

    TRAFFIC_MODELS.forEach(v=>{
      gltfLoader.load(v.url, gltf=>{
        const m = gltf.scene;
        const bb = new THREE.Box3().setFromObject(m);
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const center = new THREE.Vector3(); bb.getCenter(center);
        const sc = v.len / Math.max(sz.z, sz.x);
        
        // Center the model inside a wrapper so rotation pivots around its true center
        const wrapper = new THREE.Group();
        m.scale.set(sc, sc, sc);
        m.position.set(-center.x * sc, -bb.min.y * sc, -center.z * sc);
        // Ferrari has front at -Z, rotate by Math.PI so ALL templates have front at +Z
        if(v.key === 'car') {
          m.rotation.y = Math.PI;
        }
        wrapper.add(m);

        wrapper.traverse(c=>{
          if(c.isMesh){
            c.castShadow=c.receiveShadow=true;
            if(c.material) c.material.envMapIntensity=1.75;
          }
        });
        trafficTemplates[v.key] = wrapper;
        onTrafficModelDone();
      }, undefined, ()=>{
        onTrafficModelDone();
      });
    });

    // Shared contact shadow material for all vehicles
    const vShadowMat = new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.7,depthWrite:false});

    function spawnVehicle(zOff=-80, forcedLane=null) {
      const li = forcedLane!==null ? forcedLane : Math.floor(Math.random()*LANE_CONFIGS.length);
      const lc = LANE_CONFIGS[li];
      const keys = Object.keys(trafficTemplates).filter(k => trafficTemplates[k]);
      if(keys.length === 0) return null;
      const chosenKey = keys[Math.floor(Math.random()*keys.length)];
      const template = trafficTemplates[chosenKey];
      if(!template) return null;

      const vg = new THREE.Group();
      const visual = template.clone(true);

      // All templates have front at +Z.
      // Oncoming traffic (left lanes): travels toward +Z -> front points at player (+Z) -> rotation.y = 0
      // Same-direction traffic (right lanes): travels forward toward -Z -> front points away (-Z) -> rotation.y = Math.PI
      visual.rotation.y = lc.oncoming ? 0 : Math.PI;
      vg.add(visual);


      // Contact shadow under vehicle
      const vSh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, lc.len*0.9+1), vShadowMat);
      vSh.rotation.x=-Math.PI/2; vSh.position.y=.018;
      vg.add(vSh);

      vg.position.set(lc.x, 0, zOff);
      scene.add(vg);

      const vehicleData = {
        mesh: vg, lane: li, x: lc.x,
        isOncoming: lc.oncoming,
        speed: lc.minSpd + Math.random()*(lc.maxSpd-lc.minSpd),
        len: lc.len, width: 2.1,
        passed: false, active: true,
      };
      vehicles.push(vehicleData);
      return vehicleData;
    }

    // Expose vehicle reset function so restartRace can reset all traffic far down highway
    resetVehiclesRef.current = () => {

      const initialZ = [-65, -175, -120, -240, -95, -190];
      const initialLanes = [0, 0, 1, 1, 2, 3];
      vehicles.forEach((v, idx) => {
        const li = initialLanes[idx % initialLanes.length];
        const z = initialZ[idx % initialZ.length];
        const lc = LANE_CONFIGS[li];
        v.lane = li;
        v.x = lc.x;
        v.isOncoming = lc.oncoming;
        v.mesh.position.set(lc.x, 0, z);
        v.mesh.rotation.y = lc.oncoming ? 0 : Math.PI;
        v.speed = lc.minSpd + Math.random() * (lc.maxSpd - lc.minSpd);
        v.passed = false;
        v.active = true;
      });
    };

    // Dismiss loading after 2.5 seconds max as fallback
    setTimeout(()=>setLoading(false), 2500);




    // ── Main Animation Loop ───────────────────────────────────────────────────
    let lastT = performance.now();

    const animate = () => {
      const now = performance.now();
      const dt  = Math.min((now-lastT)/1000, .08);
      lastT = now;

      const s = stateRef.current;
      if(s.isPaused){ rafRef.current=requestAnimationFrame(animate); return; }

      // ── 5-Gear Physics System ────────────────────────────────────────────────
      if(!s.crashed) {
        if(s.invulnTime > 0) s.invulnTime -= dt;
        if(s.nitroActive){ s.nitroTime-=dt; if(s.nitroTime<=0) s.nitroActive=false; }
        else if(s.nitroAvailable<100) s.nitroAvailable=Math.min(100,s.nitroAvailable+dt*4.5);


        // 5-Gear auto-selection with hysteresis (prevents gear hunting)
        let g = s.gear ?? 0;
        if(s.speed >= GEARS[g].shift && g < 4) {
          g++;
        } else if(g > 0 && s.speed < GEARS[g - 1].shift - 8) {
          g--;
        }
        s.gear = g;
        const curGear = GEARS[g];

        // Smooth power curve: stays strong across powerband, slight natural taper at redline
        const prevShift = g === 0 ? 0 : GEARS[g - 1].shift * 0.7;
        const rpmRatio = Math.min(1, Math.max(0, (s.speed - prevShift) / (curGear.redline - prevShift)));
        const torqueCurve = 1.0 - 0.22 * (rpmRatio * rpmRatio);
        const effectiveTorque = (s.nitroActive ? curGear.torque * 1.55 : curGear.torque) * torqueCurve;
        const topSpd = s.nitroActive ? (GEARS[4].shift + 35) : curGear.shift;

        if(s.accel) {
          s.speed = Math.min(topSpd, s.speed + effectiveTorque * dt);
        } else if(s.brake) {
          // Strong responsive brakes: mechanical disc (65 km/h/s) + gear-dependent engine braking
          // G1: 65 + 50 = 115 km/h/s (stops fast at low speed)
          // G5: 65 + 18 = 83 km/h/s (stops from 200 to 0 in ~2.4s, no brake failure feeling)
          const discBrake = 65;
          const engineBrake = curGear.engBrake;
          s.speed = Math.max(0, s.speed - (discBrake + engineBrake) * dt);
        } else {
          // Passive coasting: gradual deceleration
          const coastFriction = 10 + g * 2.0;
          s.speed = Math.max(0, s.speed - coastFriction * dt);
        }

        // Steering: snappy with flat minimum
        const steerSpd = 1.8 + s.speed * 0.065;
        s.playerX += s.steer * steerSpd * dt;
        s.playerX  = Math.max(-ROAD_W/2+1.1, Math.min(ROAD_W/2-1.1, s.playerX));

        // Lean: snappy lerp
        const leanBase = Math.min(1, s.speed/20 + 0.35);
        const targetLean = -s.steer * 0.4 * leanBase;
        s.playerLean += (targetLean - s.playerLean) * 28 * dt;

        s.dist  += (s.speed*1000/3600)*dt;
        s.score += Math.round(s.speed * .05 * dt);

        audio.update(s.speed, s.accel, s.brake, s.nitroActive, g, rpmRatio);


        // Emit tire smoke
        if((s.accel||s.nitroActive||(s.brake&&s.speed>75))&&s.speed>8){
          emitSmoke(s.nitroActive, s.speed);
          if(s.nitroActive||s.speed>155) emitSmoke(s.nitroActive, s.speed);

        }
      }

      // ── Update Player Group ──────────────────────────────────────────────────
      playerGroup.position.x = s.playerX;
      playerGroup.rotation.z = s.playerLean;
      playerGroup.rotation.y = 0; // Strictly facing -Z (forward)
      rider.rotation.z = s.playerLean*.38;

      // Wheel rolling animation (rotation.x = axle spin rate)
      const rollDelta = (s.speed*1000/3600/0.31)*dt;
      wheelMeshes.forEach(m=>{ m.rotation.x -= rollDelta; });

      // ── Road Texture Scrolling (perfectly calibrated) ─────────────────────
      const moveDist = (s.speed*1000/3600)*dt;
      const texDelta = moveDist/25; // 400m / 16 repeats ≈ 25m per tile
      rdiff.offset.y -= texDelta;
      rnorm.offset.y  = rdiff.offset.y;
      rrough.offset.y = rdiff.offset.y;

      // ── Tree Looping ─────────────────────────────────────────────────────────
      trees.forEach(tree=>{
        tree.position.z += moveDist;
        if(tree.position.z>30) tree.position.z -= ROAD_L;
      });

      // ── Particle System Update ───────────────────────────────────────────────
      const spdMps = s.speed*1000/3600;
      pool.forEach((p,idx)=>{
        if(!p.active) return;
        p.life+=dt;
        if(p.life>=p.maxLife){ p.active=false; pGeo.attributes.position.setY(idx,-200); return; }
        const lr=p.life/p.maxLife;
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=(p.vz+spdMps)*dt;
        const csz=p.sz+(p.tSz-p.sz)*lr, ca=p.a*(1-lr);
        pGeo.attributes.position.setXYZ(idx, p.x, p.y, p.z);
        pGeo.attributes.color.setXYZ(idx, p.r*ca, p.g*ca, p.b*ca);
        pGeo.attributes.size.setX(idx, csz);
      });
      pGeo.attributes.position.needsUpdate=true;
      pGeo.attributes.color.needsUpdate=true;
      pGeo.attributes.size.needsUpdate=true;

      // ── Traffic Vehicle Update ───────────────────────────────────────────────
      for(let i=vehicles.length-1; i>=0; i--) {
        const v = vehicles[i];
        if(!v.active) continue;

        // BUG 1 FIX — Correct relative motion direction:
        // Oncoming (left lanes): approaching the player head-on → positive z drift (coming at us)
        // Same-dir (right lanes): player overtakes them → positive z drift only when player is faster.
        //   Clamp to ≥0: if traffic is faster than player it simply stays ahead, doesn't approach from behind.
        let relKmh;
        if(v.isOncoming) {
          relKmh = s.speed + v.speed; // always positive — they close on each other
        } else {
          relKmh = Math.max(0, s.speed - v.speed); // only positive when player overtakes; 0 = car stays in front
        }
        v.mesh.position.z += (relKmh * 1000/3600) * dt;

        // ── Bounding Box Collision ─────────────────────────────────────────────
        const dx = Math.abs(s.playerX - v.mesh.position.x);
        const dz = Math.abs(v.mesh.position.z);
        const hitW = (v.width+.9)/2;
        const hitL = (v.len+1.6)/2;

        if(dx < hitW && dz < hitL && !s.crashed && (s.invulnTime || 0) <= 0) {
          if(s.speed < 30 || v.isOncoming) {
            triggerCrash(s); setPhase('gameover');
          } else {
            // Sideswipe: speed penalty instead of full crash
            s.speed = Math.max(0, s.speed*0.55);
            s.score = Math.max(0, s.score-100);
            showAlert('💥 SIDESWIPE! −100', 900);
          }
        }


        // Near-miss bonus
        if(!v.passed && v.mesh.position.z>0 && dx<hitW+1.4 && dz<hitL+1.2 && s.speed>80 && !s.crashed) {
          v.passed=true;
          const bonus = v.isOncoming ? 280 : 160;
          s.score+=bonus; s.nitroAvailable=Math.min(100,s.nitroAvailable+18);
          showAlert(v.isOncoming?`⚡ ONCOMING! +${bonus}`:`💨 CLOSE PASS! +${bonus}`, 900);
        }

        // Recycle: lock to same direction type (visual rotation stays correct)
        if(v.mesh.position.z > 40) {
          const matchingLanes = LANE_CONFIGS
            .map((lc,li)=>({lc,li}))
            .filter(({lc})=> lc.oncoming === v.isOncoming);
          const pick = matchingLanes[Math.floor(Math.random()*matchingLanes.length)];
          const lc2 = pick.lc;

          // Same-direction cars get wider recycle spacing so player has passing gaps
          // Oncoming cars recycle closer (exciting near-miss opportunities)
          const baseZ = v.isOncoming
            ? -(ROAD_L * 0.5 + Math.random() * 70)   // oncoming: 210–280m ahead
            : -(120 + Math.random() * 80);             // same-dir: 120–200m ahead (sparse)

          v.mesh.position.z = baseZ;
          v.mesh.position.x = lc2.x;
          v.x = lc2.x;
          v.speed = lc2.minSpd + Math.random()*(lc2.maxSpd-lc2.minSpd);
          v.len = lc2.len;
          v.passed = false;
        }

      }

      // ── Crash Tumble Animation ───────────────────────────────────────────────
      if(s.crashed) {
        s.crashTime+=dt; s.speed=Math.max(0,s.speed-100*dt);
        s.crashPos.x+=s.crashVel.x*dt; s.crashPos.y+=s.crashVel.y*dt; s.crashPos.z+=s.crashVel.z*dt;
        s.crashVel.y-=14*dt;
        if(s.crashPos.y<.4){ s.crashPos.y=.4; s.crashVel.y*=-.42; s.crashVel.x*=.72; }
        playerGroup.position.set(s.crashPos.x, s.crashPos.y, s.crashPos.z);
        playerGroup.rotation.x+=s.crashRotVel.x*dt;
        playerGroup.rotation.z+=s.crashRotVel.z*dt;
      }

      // ── Camera ───────────────────────────────────────────────────────────────
      // ratio = 0→1 mapping of current speed over G5 ceiling (245 km/h)
      const ratio = Math.min(1, s.speed / 245);

      if(s.cameraMode==='chase') {
        // Perfect centred chase cam, directly behind bike
        const targetX = s.playerX;
        const targetY = 1.88+ratio*.18;
        const targetZ = 4.35+ratio*.72;
        camera.position.x += (targetX-camera.position.x)*15*dt;
        camera.position.y += (targetY-camera.position.y)*10*dt;
        camera.position.z += (targetZ-camera.position.z)*10*dt;
        camera.rotation.z = -s.playerLean*.3; // Subtle banking tilt
        camera.fov = 65+ratio*13;
        camera.updateProjectionMatrix();
        // High-speed micro-shake
        if(s.speed>110&&!s.crashed){
          camera.position.y+=(Math.random()-.5)*ratio*.03;
          camera.position.x+=(Math.random()-.5)*ratio*.018;
        }
        camera.lookAt(s.playerX, 1.1, -24);
      } else {
        // First-person cockpit
        camera.position.set(s.playerX, 1.29, .1);
        camera.rotation.z = s.playerLean*.88;
        camera.fov = 64+ratio*15;
        camera.updateProjectionMatrix();
        if(s.speed>75&&!s.crashed) camera.position.y+=(Math.random()-.5)*ratio*.022;
        camera.lookAt(s.playerX, 1.06, -35);
      }

      // Motion blur strength proportional to speed
      blurPass.uniforms.uSpeed.value = ratio;

      // HUD: gear comes directly from physics state (1-indexed for display: 1 to 5)
      // RPM = position within current gear band (0 = just shifted in, 1 = redline / ready to upshift)
      const gIdx = Math.min(4, s.gear ?? 0);
      const curG = GEARS[gIdx];
      const prevShift = gIdx === 0 ? 0 : GEARS[gIdx - 1].shift * 0.7;
      const rpm = Math.min(1, Math.max(0, (s.speed - prevShift) / (curG.shift - prevShift)));
      const gear = gIdx + 1; // display as 1–5


      setHud({speed:Math.round(s.speed), dist:Math.round(s.dist), nitro:Math.round(s.nitroAvailable), score:s.score, gear, rpm});


      composer.render();
      rafRef.current = requestAnimationFrame(animate);
    };

    function triggerCrash(s) {
      if(s.crashed) return;
      s.crashed=true; s.crashTime=0;
      s.crashPos={x:s.playerX, y:1.1, z:0};
      s.crashVel={x:(Math.random()-.5)*6, y:6.5, z:-Math.max(4,s.speed*.04)};
      s.crashRotVel={x:6+Math.random()*4, y:(Math.random()-.5)*4, z:7+Math.random()*4};
      audio.playCrash();
    }

    rafRef.current = requestAnimationFrame(animate);

    // Resize handling
    const onResize = () => {
      const w=container.clientWidth||800, h=container.clientHeight||500;
      camera.aspect=w/h; camera.updateProjectionMatrix();
      renderer.setSize(w,h); composer.setSize(w,h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect(); audio.stop();
      if(renderer.domElement&&container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Touch handlers
  const gasDown   = useCallback(()=>{ audio.init(); const s=stateRef.current; if(!s.crashed){s.accel=true;} setTouch(t=>({...t,gas:true}));  },[]);
  const gasUp     = useCallback(()=>{ stateRef.current.accel=false; setTouch(t=>({...t,gas:false})); },[]);
  const brakeDown = useCallback(()=>{ audio.init(); const s=stateRef.current; if(!s.crashed){s.brake=true; audio.playBrakeSqueal();} setTouch(t=>({...t,brake:true})); },[]);
  const brakeUp   = useCallback(()=>{ stateRef.current.brake=false; setTouch(t=>({...t,brake:false})); },[]);

  const steerL  = useCallback(()=>{ stateRef.current.steer=-1; },[]);
  const steerR  = useCallback(()=>{ stateRef.current.steer=1; },[]);
  const steerOff= useCallback(()=>{ stateRef.current.steer=0; },[]);

  return (
    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',background:'#01050e',overflow:'hidden'}}>
      {/* ── Canvas Container ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden select-none touch-none">

        {/* ── Loading Overlay ── */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-rose-600/30 border-t-rose-500 animate-spin" />
            <p className="text-white font-black text-lg font-mono tracking-widest">LOADING 3D MODELS</p>
            <p className="text-slate-400 text-xs max-w-xs text-center">Superbike GLTF, HDR skybox, asphalt PBR textures, traffic vehicles…</p>
          </div>
        )}

        {/* ── Floating Alert ── */}
        {alert && (
          <div className="absolute left-1/2 top-5 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-black font-black px-5 py-1.5 rounded-full shadow-2xl animate-bounce text-sm border border-amber-300 whitespace-nowrap">
            {alert}
          </div>
        )}

        {/* ── HUD (Playing) ── */}
        {phase==='playing' && (
          <div className="absolute inset-0 pointer-events-none z-30 p-3 md:p-5 flex flex-col justify-between">

            {/* Top Row */}
            <div className="flex items-start justify-between w-full">
              {/* Left Controls */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button onClick={togglePause}
                  className="w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white/90 flex items-center justify-center text-sm backdrop-blur-md shadow-lg active:scale-90 cursor-pointer">
                  <i className={`fa-solid ${isPaused?'fa-play pl-0.5':'fa-pause'}`}/>
                </button>
                <button onClick={()=>audio.playHorn()}
                  className="w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white/90 flex items-center justify-center text-sm backdrop-blur-md shadow-lg active:scale-90 cursor-pointer">
                  <i className="fa-solid fa-bullhorn text-xs"/>
                </button>
                <button onClick={toggleCamera}
                  className={`h-9 px-3 rounded-full border backdrop-blur-md shadow-lg active:scale-90 cursor-pointer flex items-center gap-1.5 text-xs font-bold ${cameraMode==='chase'?'bg-rose-600/35 border-rose-400 text-rose-300':'bg-black/50 border-white/20 text-white/90'}`}>
                  <i className="fa-solid fa-camera text-[11px]"/>
                  <span>{cameraMode==='chase'?'CHASE':'COCKPIT'}</span>
                </button>
              </div>

              {/* Right: Speedometer, Score, Nitro */}
              <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
                {/* Speed pill */}
                <div className="flex items-center gap-2 bg-black/52 border border-white/18 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-lg">
                  <span className="text-rose-400 font-black text-base font-mono">{hud.speed}</span>
                  <span className="text-white/45 text-[10px]">KM/H</span>
                  <span className="text-white/30 text-xs">|</span>
                  <span className="text-slate-300 text-[11px] font-mono">G{hud.gear}</span>
                  <span className="text-white/30 text-xs">|</span>
                  <span className="text-amber-400 text-[11px]">🏆{hud.score}</span>
                  <span className="text-white/30 text-xs">|</span>
                  <span className="text-sky-300 text-[11px]">🛣️{hud.dist}m</span>
                </div>

                {/* RPM bar */}
                <div className="w-48 h-1.5 bg-slate-800/70 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
                  <div className="h-full rounded-full transition-all duration-75"
                    style={{width:`${Math.round(hud.rpm*100)}%`, background:`linear-gradient(90deg, #22c55e ${hud.rpm<.6?'':','} ${hud.rpm>=.6?'#f59e0b':''} ${hud.rpm>=.85?', #ef4444':''})`}}/>
                </div>

                {/* Nitro */}
                <button onClick={triggerNitro}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-lg cursor-pointer ${hud.nitro>=25?'bg-rose-600/88 text-white border border-rose-300 animate-pulse active:scale-95':'bg-black/45 border border-white/10 text-white/35'}`}>
                  <i className="fa-solid fa-bolt text-amber-300 text-[11px]"/>
                  <span>{hud.nitro}% NITRO</span>
                </button>
              </div>
            </div>

            {/* Bottom Touch Controls */}
            <div className="flex items-end justify-between w-full pointer-events-auto">
              {/* Steer Left + Brake (left cluster) */}
              <div className="flex items-end gap-2">
                <button
                  onPointerDown={brakeDown} onPointerUp={brakeUp} onPointerCancel={brakeUp}
                  className={`w-14 h-16 md:w-16 md:h-20 rounded-2xl border-2 flex flex-col items-center justify-center select-none touch-none shadow-xl cursor-pointer active:scale-95 ${touch.brake?'bg-red-500/55 border-red-400 scale-95':'bg-black/42 border-white/28 backdrop-blur-sm'}`}>
                  <div className="flex flex-col items-center gap-1">
                    {[0,1,2].map(i=><div key={i} className="w-8 h-1.5 rounded-full bg-white/80"/>)}
                  </div>
                  <span className="text-[9px] font-bold text-white/65 mt-1 tracking-widest">BRAKE</span>
                </button>
                <button
                  onPointerDown={steerL} onPointerUp={steerOff} onPointerCancel={steerOff}
                  className="w-12 h-12 rounded-full bg-black/42 border border-white/25 text-white/80 flex items-center justify-center text-lg backdrop-blur-sm shadow-lg active:scale-90 cursor-pointer select-none touch-none">
                  ‹
                </button>
              </div>

              {/* Steer Right + Gas (right cluster) */}
              <div className="flex items-end gap-2">
                <button
                  onPointerDown={steerR} onPointerUp={steerOff} onPointerCancel={steerOff}
                  className="w-12 h-12 rounded-full bg-black/42 border border-white/25 text-white/80 flex items-center justify-center text-lg backdrop-blur-sm shadow-lg active:scale-90 cursor-pointer select-none touch-none">
                  ›
                </button>
                <button
                  onPointerDown={gasDown} onPointerUp={gasUp} onPointerCancel={gasUp}
                  className={`w-14 h-20 md:w-16 md:h-24 rounded-2xl border-2 flex flex-col items-center justify-center select-none touch-none shadow-xl cursor-pointer active:scale-95 ${touch.gas?'bg-emerald-500/55 border-emerald-400 scale-95':'bg-black/42 border-white/28 backdrop-blur-sm'}`}>
                  <div className="flex items-center justify-center gap-1 h-9">
                    {[7,9,7].map((h,i)=><div key={i} style={{height:`${h*4}px`}} className="w-1.5 rounded-full bg-white/80"/>)}
                  </div>
                  <span className="text-[9px] font-bold text-white/65 mt-1 tracking-widest">GAS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pause Overlay ── */}
        {isPaused && phase==='playing' && (
          <div className="absolute inset-0 z-40 bg-black/72 backdrop-blur-md flex flex-col items-center justify-center gap-4">
            <i className="fa-solid fa-pause text-5xl text-white/80 mb-2"/>
            <h2 className="text-3xl font-black text-white">PAUSED</h2>
            <button onClick={togglePause} className="bg-gradient-to-r from-rose-500 to-rose-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg cursor-pointer text-sm active:scale-95">
              ▶ RESUME
            </button>
          </div>
        )}

        {/* ── Game Over Screen ── */}
        {phase==='gameover' && (
          <div className="absolute inset-0 z-40 bg-black/88 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/55 flex items-center justify-center text-3xl mb-3 animate-bounce">💥</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-1" style={{fontFamily:'Fredoka,sans-serif'}}>CRASHED!</h2>
            <p className="text-slate-300 text-xs max-w-xs mb-5">You hit highway traffic at high speed. Keep your line and overtake cleanly.</p>
            <div className="flex gap-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 mb-5 backdrop-blur-sm">
              {[['SPEED',`${hud.speed} KM/H`,'text-rose-400'],['DISTANCE',`${hud.dist}m`,'text-amber-400'],['SCORE',hud.score,'text-emerald-400']].map(([l,v,cls])=>(
                <div key={l} className="text-center">
                  <div className="text-slate-400 text-[11px] font-semibold">{l}</div>
                  <div className={`text-xl md:text-2xl font-black font-mono ${cls}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={restartRace} className="bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-bold px-7 py-2.5 rounded-xl shadow-lg active:scale-95 cursor-pointer text-sm">🔄 Play Again</button>
              {onClose&&<button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-sm">Exit</button>}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Controls Legend ── */}
      <div className="bg-slate-950 px-4 py-1 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <span>
          🎮 <kbd className="bg-slate-800 text-slate-300 px-1 rounded">W/↑</kbd> Gas &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded mx-1">S/↓</kbd> Brake &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded mx-1">A/D</kbd> Steer &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded mx-1">C</kbd> Camera &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded mx-1">Space</kbd> Nitro &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded mx-1">H</kbd> Horn &bull;
          <kbd className="bg-slate-800 text-slate-300 px-1 rounded">P/Esc</kbd> Pause
        </span>
        <span className="hidden sm:inline text-slate-500">📱 Touch controls available</span>
      </div>
    </div>
  );
}
