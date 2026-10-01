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
      float blur=clamp(dot(dir,dir)*uSpeed*uStrength,0.0,0.032);
      vec4 col=vec4(0.0);
      for(int i=0;i<8;i++){
        float t=float(i)/7.0-0.5;
        col+=texture2D(tDiffuse,clamp(vUv-dir*(t*blur),vec2(0.0),vec2(1.0)));
      }
      gl_FragColor=col*0.125;
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
  playGlassShatter() {
    if(!this.ctx) return;
    try {
      this._ramp(3400, 750, 'sine', 0.25, 0.4);
      this._ramp(4800, 1100, 'triangle', 0.18, 0.35);
      const sz = Math.floor(this.ctx.sampleRate * 0.35);
      const nb = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
      const d = nb.getChannelData(0);
      for(let i=0; i<sz; i++) d[i] = (Math.random()*2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.045));
      const ns = this.ctx.createBufferSource();
      ns.buffer = nb;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      ns.connect(f); f.connect(g); g.connect(this.ctx.destination);
      ns.start();
    } catch {}
  }
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

// ── Checkered Finish Line & Gantry Textures ─────────────────────────────────
function makeFinishLineTextures() {
  // Road checkered surface strip
  const cRoad = document.createElement('canvas'); cRoad.width = 1024; cRoad.height = 128;
  const cxR = cRoad.getContext('2d');
  const sq = 32;
  for(let x = 0; x < 1024; x += sq) {
    for(let y = 0; y < 128; y += sq) {
      cxR.fillStyle = ((x / sq + y / sq) % 2 === 0) ? '#ffffff' : '#111317';
      cxR.fillRect(x, y, sq, sq);
    }
  }
  const roadTex = new THREE.CanvasTexture(cRoad);
  roadTex.wrapS = THREE.RepeatWrapping; roadTex.repeat.set(4, 1);

  // Overhead gantry banner
  const cBan = document.createElement('canvas'); cBan.width = 1024; cBan.height = 256;
  const cxB = cBan.getContext('2d');
  const bg = cxB.createLinearGradient(0, 0, 1024, 0);
  bg.addColorStop(0, '#0a0d14'); bg.addColorStop(0.5, '#1e2538'); bg.addColorStop(1, '#0a0d14');
  cxB.fillStyle = bg; cxB.fillRect(0, 0, 1024, 256);
  // Checkered border top & bottom
  for(let x = 0; x < 1024; x += 32) {
    cxB.fillStyle = (x / 32) % 2 === 0 ? '#f59e0b' : '#ffffff';
    cxB.fillRect(x, 0, 32, 28);
    cxB.fillRect(x, 228, 32, 28);
  }
  // Bold Finish Line text
  cxB.fillStyle = '#ffffff';
  cxB.font = '900 80px Impact, "Arial Black", sans-serif';
  cxB.textAlign = 'center';
  cxB.textBaseline = 'middle';
  cxB.shadowColor = '#f59e0b';
  cxB.shadowBlur = 20;
  cxB.fillText('🏁  FINISH LINE  🏁', 512, 128);
  const bannerTex = new THREE.CanvasTexture(cBan);

  // Checkered flag texture
  const cFlag = document.createElement('canvas'); cFlag.width = 256; cFlag.height = 160;
  const cxF = cFlag.getContext('2d');
  const fsq = 20;
  for(let x = 0; x < 256; x += fsq) {
    for(let y = 0; y < 160; y += fsq) {
      cxF.fillStyle = ((x / fsq + y / fsq) % 2 === 0) ? '#ffffff' : '#0f172a';
      cxF.fillRect(x, y, fsq, fsq);
    }
  }
  const flagTex = new THREE.CanvasTexture(cFlag);

  return { roadTex, bannerTex, flagTex };
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

// ── Shattered Mirror / Broken Glass Screen Edge Overlay ───────────────────────
function ShatteredMirrorOverlay({ isGameOver }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* 1. Impact Flash */}
      <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_1]" />

      {/* 2. Red / Dark Vignette with frosty broken edges */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 38%, rgba(185, 28, 28, 0.2) 75%, rgba(8, 12, 22, 0.88) 100%)',
          boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.45), inset 0 0 170px rgba(0, 0, 0, 0.95)'
        }}
      />

      {/* 3. Broken Glass SVG Fracture Lines & Perimeter Shards */}
      <svg
        className="w-full h-full absolute inset-0 filter drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="glassShardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="30%" stopColor="rgba(186,230,253,0.18)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(147,197,253,0.25)" />
          </linearGradient>

          <linearGradient id="edgeShardGlow" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="50%" stopColor="rgba(224,242,254,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
          </linearGradient>

          <filter id="crackGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Outer Perimeter Mirror Shards (Framing borders around the screen & popup) ── */}
        {/* Top-Left shards */}
        <polygon points="0,0 220,0 140,85 0,160" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.8" />
        <polygon points="0,160 140,85 105,195 0,260" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.5" />
        <polygon points="140,85 220,0 310,0 240,95 185,115" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.4" />
        <polygon points="0,0 90,0 0,90" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="2" />

        {/* Top-Right shards */}
        <polygon points="780,0 1000,0 1000,150 865,85" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.8" />
        <polygon points="865,85 1000,150 1000,270 890,205" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.5" />
        <polygon points="690,0 780,0 865,85 765,110" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.4" />
        <polygon points="910,0 1000,0 1000,90" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="2" />

        {/* Bottom-Left shards */}
        <polygon points="0,440 120,490 0,600" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.8" />
        <polygon points="0,600 120,490 230,535 280,600" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.5" />
        <polygon points="120,490 190,445 230,535" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.3" />
        <polygon points="0,520 80,600 0,600" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="2" />

        {/* Bottom-Right shards */}
        <polygon points="1000,430 870,495 1000,600" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.8" />
        <polygon points="1000,600 870,495 765,540 710,600" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.5" />
        <polygon points="870,495 810,440 765,540" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.3" />
        <polygon points="920,600 1000,520 1000,600" fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth="2" />

        {/* Top border jagged glass spikes */}
        <polygon points="310,0 420,0 380,45" fill="url(#glassShardGlow)" stroke="#e2e8f0" strokeWidth="1.2" />
        <polygon points="420,0 580,0 510,55 460,25" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.3" />
        <polygon points="580,0 690,0 635,42" fill="url(#glassShardGlow)" stroke="#e2e8f0" strokeWidth="1.2" />

        {/* Bottom border jagged glass spikes */}
        <polygon points="280,600 450,600 375,555" fill="url(#glassShardGlow)" stroke="#e2e8f0" strokeWidth="1.2" />
        <polygon points="450,600 590,600 525,545 480,575" fill="url(#edgeShardGlow)" stroke="#e2e8f0" strokeWidth="1.3" />
        <polygon points="590,600 710,600 645,555" fill="url(#glassShardGlow)" stroke="#e2e8f0" strokeWidth="1.2" />

        {/* Left & Right border shards */}
        <polygon points="0,260 95,310 0,370" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.4" />
        <polygon points="1000,270 905,320 1000,380" fill="url(#glassShardGlow)" stroke="#f8fafc" strokeWidth="1.4" />

        {/* ── Primary Impact Spiderweb Center (around 500, 310) ── */}
        <g filter="url(#crackGlow)" stroke="#f8fafc" strokeLinecap="round" strokeLinejoin="round">
          {/* Inner concentric impact rings */}
          <path d="M 485,300 L 515,295 L 530,318 L 510,332 L 480,325 Z" fill="rgba(255,255,255,0.3)" strokeWidth="2.4" />
          <path d="M 465,285 L 525,278 L 555,315 L 535,348 L 475,342 L 452,310 Z" fill="none" strokeWidth="2.0" />
          <path d="M 435,260 L 545,250 L 585,310 L 555,370 L 450,365 L 420,305 Z" fill="none" strokeWidth="1.8" />
          <path d="M 395,230 L 575,215 L 625,305 L 580,400 L 415,395 L 375,295 Z" fill="none" strokeWidth="1.5" strokeDasharray="14 3" />

          {/* Radial fracture lines shooting outward to edges */}
          {/* To top-left corner */}
          <polyline points="485,300 440,250 370,210 290,150 185,115 140,85 0,0" strokeWidth="2.2" />
          <polyline points="440,250 380,225 320,180 240,95 220,0" strokeWidth="1.8" />
          <polyline points="370,210 310,250 215,230 105,195 0,160" strokeWidth="1.8" />

          {/* To top-right corner */}
          <polyline points="515,295 565,245 640,195 730,145 810,105 865,85 1000,0" strokeWidth="2.2" />
          <polyline points="565,245 615,210 685,160 765,110 780,0" strokeWidth="1.8" />
          <polyline points="640,195 725,235 815,220 890,205 1000,150" strokeWidth="1.8" />

          {/* To bottom-left corner */}
          <polyline points="480,325 435,375 360,425 270,470 190,445 120,490 0,600" strokeWidth="2.2" />
          <polyline points="435,375 390,410 315,480 230,535 280,600" strokeWidth="1.8" />
          <polyline points="360,425 285,385 195,400 95,310 0,260" strokeWidth="1.8" />

          {/* To bottom-right corner */}
          <polyline points="510,332 555,380 630,430 720,475 810,440 870,495 1000,600" strokeWidth="2.2" />
          <polyline points="555,380 605,415 680,485 765,540 710,600" strokeWidth="1.8" />
          <polyline points="630,430 715,390 805,405 905,320 1000,270" strokeWidth="1.8" />

          {/* Top cardinal cracks */}
          <polyline points="500,280 495,200 510,130 460,25 420,0" strokeWidth="1.8" />
          <polyline points="510,130 545,75 510,55 580,0" strokeWidth="1.5" />

          {/* Bottom cardinal cracks */}
          <polyline points="495,345 505,430 490,500 525,545 450,600" strokeWidth="1.8" />
          <polyline points="490,500 460,550 375,555" strokeWidth="1.5" />

          {/* Left cardinal cracks */}
          <polyline points="452,310 370,300 280,320 180,310 95,310 0,310" strokeWidth="2.0" />
          
          {/* Right cardinal cracks */}
          <polyline points="555,315 640,310 735,330 830,315 905,320 1000,320" strokeWidth="2.0" />
        </g>

        {/* Small floating fractured glass dots / glints */}
        {[
          [480, 275, 4], [528, 290, 3], [540, 328, 5], [475, 335, 4],
          [440, 270, 3], [560, 260, 4], [430, 350, 4], [570, 360, 5],
          [350, 210, 6], [650, 205, 5], [340, 430, 6], [660, 420, 5],
          [210, 140, 7], [790, 135, 7], [200, 460, 7], [800, 470, 7],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="#ffffff" opacity={0.65} />
        ))}
      </svg>
    </div>
  );
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

  const LEVEL_DISTANCES = [1000, 1500, 2000, 2500, 3000]; // Level 1: 1.0km, Level 2: 1.5km, +0.5km step per level
  const formatDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m}m`);

  const stateRef = useRef({
    speed: 0, maxSpeed: 290, accelRate: 58, brakeRate: 90, friction: 16,
    dist: 0, playerX: 2.4, playerLean: 0,
    accel: false, brake: false, steer: 0, steerVel: 0,
    nitroAvailable: 100, nitroActive: false, nitroTime: 0,
    score: 0, cameraMode: 'chase',
    gear: 0, // 5-gear system: 0=G1 … 4=G5
    invulnTime: 2.5, // 2.5s collision immunity grace period on start
    crashed: false, crashTime: 0,
    crashPos: {x:2.4,y:0,z:0}, crashVel:{x:0,y:0,z:0}, crashRotVel:{x:0,y:0,z:0},
    riderPos: {x:2.4,y:0.9,z:0}, riderVel:{x:0,y:0,z:0}, riderRotVel:{x:0,y:0,z:0},
    isPaused: false,
    level: 1,                 // current level 1–5
    levelTargetDist: 1000,    // distance required for current level (1.0km)
    levelTime: 0,             // elapsed race time for current level
    levelComplete: false,     // level completion trigger lock
  });

  const [phase, setPhase] = useState('playing'); // 'playing' | 'gameover' | 'levelcomplete'
  const [shattered, setShattered] = useState(false);
  const [hud,   setHud]   = useState({
    speed: 0, dist: 0, nitro: 100, score: 0, gear: 1, rpm: 0,
    level: 1, targetDist: 1000, time: 0
  });
  const [levelTimes, setLevelTimes] = useState({}); // { 1: time, 2: time, ... }
  const [currentLevelTime, setCurrentLevelTime] = useState(0);
  const [cameraMode, setCameraMode] = useState('chase');
  const [isPaused, setIsPaused] = useState(false);
  const [alert, setAlert] = useState(null);
  const [touch, setTouch] = useState({gas:false,brake:false});
  const [loading, setLoading] = useState(true);

  // Refs to Three.js objects so restartRace can reset transforms and vehicles without re-mounting
  const sceneRef = useRef(null);
  const playerGroupRef = useRef(null);
  const riderRef = useRef(null);
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

  const restartRace = useCallback((resetLevel = false) => {
    const s = stateRef.current;
    if(resetLevel) {
      s.level = 1;
      s.levelTargetDist = LEVEL_DISTANCES[0];
      setLevelTimes({});
    }
    Object.assign(s, {
      speed:0, dist:0, playerX:2.4, playerLean:0,
      accel:false, brake:false, steer:0, steerVel:0,
      nitroAvailable:100, nitroActive:false, nitroTime:0,
      score:0, crashed:false, crashTime:0, isPaused:false,
      invulnTime: 2.5, // 2.5s collision immunity grace period on restart
      gear:0, // Reset to G1 on replay
      levelTime: 0,
      levelComplete: false,
      crashPos:{x:2.4,y:0,z:0},
      crashVel:{x:0,y:0,z:0},
      crashRotVel:{x:0,y:0,z:0},
    });

    // Reset all traffic vehicles far ahead down the road so none are sitting at player spawn
    if(resetVehiclesRef.current) {
      resetVehiclesRef.current();
    }

    // Reset Three.js playerGroup transforms
    if(playerGroupRef.current) {
      playerGroupRef.current.position.set(2.4, 0, 0);
      playerGroupRef.current.rotation.set(0, 0, 0);
      playerGroupRef.current.scale.set(1, 1, 1);
    }
    // Re-attach rider to playerGroup if detached during crash
    if(riderRef.current && playerGroupRef.current) {
      playerGroupRef.current.add(riderRef.current);
      riderRef.current.position.set(0, 0.02, 0.08);
      riderRef.current.rotation.set(0, 0, 0);
    }
    setShattered(false);
    // Snap camera to start position so lerp doesn't drag from crash location
    if(cameraRef.current) {
      cameraRef.current.position.set(2.4, 1.9, 4.8);
      cameraRef.current.rotation.set(0, 0, 0);
    }
    setPhase('playing'); setIsPaused(false);
  }, []);

  const nextLevel = useCallback(() => {
    const s = stateRef.current;
    if(s.level < 5) {
      const nxt = s.level + 1;
      s.level = nxt;
      s.levelTargetDist = LEVEL_DISTANCES[nxt - 1];
      restartRace(false);
    } else {
      // Completed all 5 levels - restart from level 1
      restartRace(true);
    }
  }, [restartRace]);

  const replayLevel = useCallback(() => {
    restartRace(false);
  }, [restartRace]);

  // Keyboard controls
  useEffect(() => {
    const dn = (e) => {
      audio.init();
      const s = stateRef.current;
      if(s.crashed || phase === 'gameover') {
        if(['Space','Enter','KeyR'].includes(e.code)||e.key===' '||e.key==='r'||e.key==='R'||e.key==='Enter') {
          restartRace(false);
        }
        return;
      }
      if(phase === 'levelcomplete') {
        if(['Space','Enter'].includes(e.code)||e.key===' '||e.key==='Enter') {
          nextLevel();
        } else if(['KeyR'].includes(e.code)||e.key==='r'||e.key==='R') {
          replayLevel();
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
  }, [toggleCamera, phase, restartRace, nextLevel, replayLevel]);

  const triggerNitro = () => {
    audio.init();
    const s = stateRef.current;
    if(s.crashed||s.nitroAvailable<25||s.nitroActive) return;
    s.nitroActive=true; s.nitroTime=3.5; s.nitroAvailable=Math.max(0,s.nitroAvailable-35);
    audio.playNitro(); showAlert('🚀 NITRO BOOST!');
  };

  const togglePause = () => {
    const nextPaused = !stateRef.current.isPaused;
    stateRef.current.isPaused = nextPaused;
    setIsPaused(nextPaused);
    if(nextPaused) {
      audio.update(0, false, false, false, 0, 0);
    }
  };

  // ── Three.js Scene & Game Loop ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if(!container) return;
    const W = container.clientWidth||800, H = container.clientHeight||500;

    // Scene & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2('#e89a5c', 0.0033);

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.1, 1000);
    camera.position.set(2.4, 1.9, 4.8);
    camera.lookAt(2.4, 1.1, -24);
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

    // ── Finish Line Gantry & Checkered Strip ──────────────────────────────────
    const finishLineGroup = new THREE.Group();
    const { roadTex, bannerTex, flagTex } = makeFinishLineTextures();

    // Checkered strip on road
    const finishStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W, 3.5),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.6, metalness: 0.1 })
    );
    finishStrip.rotation.x = -Math.PI / 2;
    finishStrip.position.set(0, 0.024, 0);
    finishStrip.receiveShadow = true;
    finishLineGroup.add(finishStrip);

    // Gantry structure: 2 vertical pillars + top cross beam
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.9, roughness: 0.25 });
    const cautionMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.7, roughness: 0.3 });

    // Left & Right Pillars
    [-1, 1].forEach(side => {
      const px = side * (ROAD_W / 2 + 0.35);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.2, 0.5), pillarMat);
      pillar.position.set(px, 3.1, 0);
      pillar.castShadow = true;
      finishLineGroup.add(pillar);

      // Yellow caution rings on pillar
      for(let y = 0.8; y < 5.8; y += 1.2) {
        const ring = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.25, 0.54), cautionMat);
        ring.position.set(px, y, 0);
        finishLineGroup.add(ring);
      }

      // Checkered flag atop pillar
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), pillarMat);
      flagPole.position.set(px, 7.0, 0);
      finishLineGroup.add(flagPole);

      const flagMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.0),
        new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide })
      );
      flagMesh.position.set(px + side * 0.8, 7.2, 0);
      finishLineGroup.add(flagMesh);
    });

    // Cross beam spanning highway
    const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 1.2, 0.45, 0.6), pillarMat);
    beam.position.set(0, 5.9, 0);
    finishLineGroup.add(beam);

    // Overhead Banner hanging down
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W * 0.78, 1.9),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide })
    );
    bannerMesh.position.set(0, 4.8, 0);
    finishLineGroup.add(bannerMesh);

    finishLineGroup.position.set(0, 0, -500);
    finishLineGroup.visible = false;
    scene.add(finishLineGroup);

    // ── Player Bike ──────────────────────────────────────────────────────────
    const playerGroup = new THREE.Group();
    playerGroup.position.set(2.4, 0, 0);
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
    riderRef.current = rider;
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
    // 4 lanes: left 2 = oncoming (travel toward +Z), right 2 = same-direction (travel toward -Z)
    // Road is 16.5m wide. Center double yellow line is at X = 0.
    // Inner oncoming lane is at x = -2.8 (clear 1.6m gap from center line, never crosses into player's lane).
    // Inner player lane is at x = 2.4 (centered, safe margin from center line).
    const LANE_CONFIGS = [
      { x: -5.8, oncoming: true,  minSpd: 72, maxSpd: 108, len: 7.5 },  // Oncoming fast (outer left)
      { x: -2.8, oncoming: true,  minSpd: 58, maxSpd: 85,  len: 4.6 }, // Oncoming slow (inner left, stays strictly within lane)
      { x:  2.4, oncoming: false, minSpd: 68, maxSpd: 95,  len: 4.6 }, // Same-dir cruising (inner right / player lane)
      { x:  5.8, oncoming: false, minSpd: 78, maxSpd: 112, len: 7.5 },  // Same-dir fast (outer right)
    ];

    const VEHICLE_COLORS = ['#d0d5dc','#0d1117','#1a2f70','#8b1a1a','#f0f4f8','#6b3d0f'];

    const vehicles = [];

    // Load traffic templates — real 3D models with centered wrappers and strict lane-width limits
    const trafficTemplates = {};
    const TRAFFIC_MODELS = [
      {key:'car',   url:'/models/ferrari.glb',   len:4.5, maxW:1.95},
      {key:'suv',   url:'/models/suv.gltf',      len:4.7, maxW:2.00},
      {key:'truck', url:'/models/truck.gltf',    len:5.6, maxW:2.08},
      {key:'semi',  url:'/models/semi-truck.glb',len:7.5, maxW:2.12},
      {key:'sedan', url:'/models/sedan.gltf',    len:4.5, maxW:1.95},
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
        
        // Strict lane-fitting scale: length scaled to v.len, but width STRICTLY capped to v.maxW
        // This ensures trucks and semis never spill outside their lane or overlap into other lanes
        let sc = v.len / Math.max(sz.z, sz.x);
        if(sz.x * sc > v.maxW) {
          sc = v.maxW / sz.x;
        }

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
      visual.rotation.y = 0; // Visual template stays neutral at 0
      vg.add(visual);

      // Contact shadow under vehicle accurately sized to vehicle footprint
      const vSh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, lc.len * 0.9 + 0.3), vShadowMat);
      vSh.rotation.x = -Math.PI / 2;
      vSh.position.y = 0.018;
      vg.add(vSh);

      // Set vehicle orientation strictly on the parent group:
      // Oncoming traffic (left lanes): travels toward +Z -> front points at player (+Z) -> rotation.y = 0
      // Same-direction traffic (right lanes): travels forward toward -Z -> rear points at player (+Z) -> rotation.y = Math.PI
      vg.rotation.y = lc.oncoming ? 0 : Math.PI;
      vg.position.set(lc.x, 0, zOff);
      scene.add(vg);

      const vehicleData = {
        mesh: vg, lane: li, x: lc.x,
        isOncoming: lc.oncoming,
        speed: lc.minSpd + Math.random()*(lc.maxSpd-lc.minSpd),
        len: lc.len, width: 2.05,
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
        // Strictly set parent rotation so same-dir vehicles always show rear and oncoming show front
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
      try {
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

        // Crisp, agile steering with immediate response (no floatiness)
        const steerSpd = 2.8 + Math.min(s.speed, 220) * 0.055;
        const targetSteerVel = s.steer * steerSpd;
        s.steerVel = s.steerVel || 0;
        s.steerVel += (targetSteerVel - s.steerVel) * 32 * dt;
        s.playerX += s.steerVel * dt;
        s.playerX = Math.max(-ROAD_W/2 + 1.2, Math.min(ROAD_W/2 - 1.2, s.playerX));

        // Controlled, realistic banking lean (CAPPED at 0.25 rad / ~14 degrees)
        // Bike NEVER dips or clips into the asphalt surface
        const leanTarget = -s.steer * 0.25 * Math.min(1, s.speed / 30 + 0.2);
        const clampedLean = Math.max(-0.25, Math.min(0.25, leanTarget));
        s.playerLean += (clampedLean - s.playerLean) * 22 * dt;

        s.dist  += (s.speed*1000/3600)*dt;
        s.score += Math.round(s.speed * .05 * dt);
        if(!s.levelComplete) {
          s.levelTime += dt;
        }

        audio.update(s.speed, s.accel, s.brake, s.nitroActive, g, rpmRatio);

        // Emit tire smoke
        if((s.accel||s.nitroActive||(s.brake&&s.speed>75))&&s.speed>8){
          emitSmoke(s.nitroActive, s.speed);
          if(s.nitroActive||s.speed>155) emitSmoke(s.nitroActive, s.speed);
        }
      }

      // ── Finish Line Position & Level Complete Detection ──────────────────────
      const remDist = s.levelTargetDist - s.dist;
      if(remDist <= 120 && remDist >= -20) {
        finishLineGroup.visible = true;
        finishLineGroup.position.z = -remDist;
      } else {
        finishLineGroup.visible = false;
      }

      // Check for level complete
      if(!s.crashed && !s.levelComplete && s.dist >= s.levelTargetDist) {
        s.levelComplete = true;
        s.accel = false;
        s.steer = 0;
        s.steerVel = 0;
        s.speed = Math.max(0, s.speed * 0.4); // controlled deceleration upon crossing finish line
        const finalTime = Math.max(0.1, s.levelTime);
        setCurrentLevelTime(finalTime);
        setLevelTimes(prev => ({ ...prev, [s.level]: finalTime }));
        setPhase('levelcomplete');
        audio.playHorn();
      }

      // ── Update Player Group ──────────────────────────────────────────────────
      if(!s.crashed) {
        playerGroup.position.x = s.playerX;
        // Slight elevation offset when leaning ensures tires, exhaust, and pegs NEVER clip into the road
        playerGroup.position.y = Math.abs(s.playerLean) * 0.08;
        playerGroup.rotation.z = s.playerLean;
        playerGroup.rotation.y = 0; // Strictly facing -Z (forward)
        rider.rotation.z = s.playerLean * 0.2;
      }

      // ── Road Texture Scrolling (forward motion rushing towards player) ────
      const moveDist = (s.speed*1000/3600)*dt;
      const texDelta = moveDist/25; // 400m / 16 repeats ≈ 25m per tile
      rdiff.offset.y += texDelta; // += moves road texture under wheels from horizon forward!
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

        if(dx < hitW && dz < hitL && !s.crashed && !s.levelComplete && (s.invulnTime || 0) <= 0) {
          if(s.speed < 30 || v.isOncoming || dx < hitW * 0.75) {
            triggerCrash(s, v);
          } else {
            // Sideswipe: speed penalty instead of full crash
            s.speed = Math.max(0, s.speed*0.55);
            s.score = Math.max(0, s.score-100);
            showAlert('💥 SIDESWIPE! −100', 900);
          }
        }

        // Near-miss bonus
        if(!v.passed && !s.levelComplete && v.mesh.position.z>0 && dx<hitW+1.4 && dz<hitL+1.2 && s.speed>80 && !s.crashed) {
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
          v.mesh.rotation.y = lc2.oncoming ? 0 : Math.PI; // Strictly preserve rear view for right lanes
          v.x = lc2.x;
          v.speed = lc2.minSpd + Math.random()*(lc2.maxSpd-lc2.minSpd);
          v.len = lc2.len;
          v.passed = false;
        }

      }

      // ── Camera & Crash Dynamics ─────────────────────────────────────────────
      // ratio = 0→1 mapping of current speed over G5 ceiling (245 km/h)
      const ratio = Math.min(1, s.speed / 245);

      // ── 3D Crash Simulation: Bike Tumble & Rider Ragdoll Physics ───────────────
      if(s.crashed) {
        s.crashTime += dt;
        s.speed = Math.max(0, s.speed - 120 * dt);

        // Bike 3D Tumbling & Ground Bounce
        const gravity = 22;
        s.crashVel.y -= gravity * dt;
        s.crashPos.x += s.crashVel.x * dt;
        s.crashPos.y += s.crashVel.y * dt;
        s.crashPos.z += s.crashVel.z * dt;

        if(s.crashPos.y <= 0.16) {
          s.crashPos.y = 0.16;
          if(s.crashVel.y < -1.5) {
            s.crashVel.y = -s.crashVel.y * 0.32; // bounce
          } else {
            s.crashVel.y = 0;
          }
          // Asphalt sliding friction
          s.crashVel.x *= Math.max(0, 1 - 4.5 * dt);
          s.crashVel.z *= Math.max(0, 1 - 4.5 * dt);
          s.crashRotVel.x *= Math.max(0, 1 - 3.8 * dt);
          s.crashRotVel.y *= Math.max(0, 1 - 3.8 * dt);
          s.crashRotVel.z *= Math.max(0, 1 - 3.8 * dt);
        }

        playerGroup.position.set(s.crashPos.x, s.crashPos.y, s.crashPos.z);
        playerGroup.rotation.x += s.crashRotVel.x * dt;
        playerGroup.rotation.y += s.crashRotVel.y * dt;
        playerGroup.rotation.z += s.crashRotVel.z * dt;

        // Rider Ragdoll 3D Physics (thrown off bike, slides and rolls on asphalt)
        if(riderRef.current) {
          s.riderVel.y -= 24 * dt; // gravity
          s.riderPos.x += s.riderVel.x * dt;
          s.riderPos.y += s.riderVel.y * dt;
          s.riderPos.z += s.riderVel.z * dt;

          if(s.riderPos.y <= 0.22) {
            s.riderPos.y = 0.22;
            if(s.riderVel.y < -1.8) {
              s.riderVel.y = -s.riderVel.y * 0.24; // soft bounce
            } else {
              s.riderVel.y = 0;
            }
            // Asphalt ground roll friction
            s.riderVel.x *= Math.max(0, 1 - 4.8 * dt);
            s.riderVel.z *= Math.max(0, 1 - 4.8 * dt);
            s.riderRotVel.x *= Math.max(0, 1 - 4.2 * dt);
            s.riderRotVel.y *= Math.max(0, 1 - 4.2 * dt);
            s.riderRotVel.z *= Math.max(0, 1 - 4.2 * dt);
          }

          riderRef.current.position.set(s.riderPos.x, s.riderPos.y, s.riderPos.z);
          riderRef.current.rotation.x += s.riderRotVel.x * dt;
          riderRef.current.rotation.y += s.riderRotVel.y * dt;
          riderRef.current.rotation.z += s.riderRotVel.z * dt;
        }

        // Camera dramatic tracking during crash
        const focusX = (s.crashPos.x + s.riderPos.x) * 0.5;
        const focusZ = (s.crashPos.z + s.riderPos.z) * 0.5;
        const targetCamX = focusX * 0.7;
        const targetCamY = 2.4;
        const targetCamZ = focusZ + 5.5;

        camera.position.x += (targetCamX - camera.position.x) * 8 * dt;
        camera.position.y += (targetCamY - camera.position.y) * 8 * dt;
        camera.position.z += (targetCamZ - camera.position.z) * 8 * dt;

        // Collision shockwave camera shake (intense at start, decays over 1.2s)
        const shakeMag = Math.max(0, (1.2 - s.crashTime)) * 0.16;
        if(shakeMag > 0.001) {
          camera.position.x += (Math.random() - 0.5) * shakeMag;
          camera.position.y += (Math.random() - 0.5) * shakeMag;
        }
        camera.lookAt(focusX, 0.45, focusZ);

        // After 1.7 seconds of realistic 3D tumbling, open the Game Over popup
        if(s.crashTime >= 1.7 && phase !== 'gameover') {
          setPhase('gameover');
        }
      } else {
        // ── Normal Camera Tracking (when not crashed) ─────────────────────────
        if(s.cameraMode==='chase') {
          // Stable, forward-driving chase cam with smooth lateral follow
          const targetX = s.playerX * 0.88; // Slight trailing lag creates natural 3D lane change feel
          const targetY = 1.82 + ratio * 0.1;
          const targetZ = 4.3 - ratio * 0.22; // Subtly tucks forward under acceleration to enhance forward speed rush
          camera.position.x += (targetX - camera.position.x) * 12 * dt;
          camera.position.y += (targetY - camera.position.y) * 10 * dt;
          camera.position.z += (targetZ - camera.position.z) * 10 * dt;
          camera.rotation.z = -s.playerLean * 0.24; // Subtle banking tilt
          camera.fov = 64 + ratio * 5; // Controlled, clean speed FOV (no bike shrinking)
          camera.updateProjectionMatrix();
          // High-speed micro-shake
          if(s.speed > 120){
            camera.position.y += (Math.random() - 0.5) * ratio * 0.018;
            camera.position.x += (Math.random() - 0.5) * ratio * 0.012;
          }
          camera.lookAt(s.playerX * 0.55, 1.1, -26);
        } else {
          // First-person cockpit
          camera.position.set(s.playerX, 1.29, .1);
          camera.rotation.z = s.playerLean * .88;
          camera.fov = 64 + ratio * 8;
          camera.updateProjectionMatrix();
          if(s.speed > 75) camera.position.y += (Math.random() - 0.5) * ratio * 0.018;
          camera.lookAt(s.playerX, 1.06, -35);
        }
      }

      // Motion blur strength proportional to speed
      blurPass.uniforms.uSpeed.value = ratio * 0.7;

      // HUD: gear comes directly from physics state (1-indexed for display: 1 to 5)
      // RPM = position within current gear band (0 = just shifted in, 1 = redline / ready to upshift)
      const gIdx = Math.min(4, s.gear ?? 0);
      const curG = GEARS[gIdx];
      const prevShift = gIdx === 0 ? 0 : GEARS[gIdx - 1].shift * 0.7;
      const rpm = Math.min(1, Math.max(0, (s.speed - prevShift) / (curG.shift - prevShift)));
      const gear = gIdx + 1; // display as 1–5

      setHud({
        speed: Math.round(s.speed),
        dist: Math.min(s.levelTargetDist, Math.round(s.dist)),
        nitro: Math.round(s.nitroAvailable),
        score: s.score,
        gear,
        rpm,
        level: s.level,
        targetDist: s.levelTargetDist,
        time: s.levelTime
      });


      try {
        composer.render();
      } catch (err) {
        try { renderer.render(scene, camera); } catch {}
      }
    } catch (err) {
      console.error('BikeRacer animation error:', err);
      try { renderer.render(scene, camera); } catch {}
    }
    rafRef.current = requestAnimationFrame(animate);
  };

    function triggerCrash(s, hitVehicle = null) {
      if(s.crashed) return;
      s.crashed = true;
      s.crashTime = 0;
      setShattered(true);

      const fwd = Math.max(s.speed * 0.08, 3.5);
      const sideDir = hitVehicle ? (s.playerX >= hitVehicle.x ? 1 : -1) : (s.steer !== 0 ? Math.sign(s.steer) : (Math.random() > 0.5 ? 1 : -1));

      // Bike initial crash tumble physics
      s.crashPos = { x: s.playerX, y: 0.12, z: 0 };
      s.crashVel = {
        x: sideDir * (3.5 + Math.random() * 2.5),
        y: 4.8 + Math.random() * 2.2, // bike pops up into air
        z: hitVehicle?.isOncoming ? 4.5 : -fwd * 0.7
      };
      s.crashRotVel = {
        x: 6.5 + Math.random() * 4,
        y: (Math.random() - 0.5) * 6,
        z: -sideDir * (7.5 + Math.random() * 4) // flips sideways
      };

      // Rider ejection physics: detaches from bike and thrown onto pavement
      if(riderRef.current && sceneRef.current) {
        const wPos = new THREE.Vector3();
        const wQuat = new THREE.Quaternion();
        riderRef.current.getWorldPosition(wPos);
        riderRef.current.getWorldQuaternion(wQuat);
        sceneRef.current.add(riderRef.current);
        riderRef.current.position.copy(wPos);
        riderRef.current.quaternion.copy(wQuat);

        s.riderPos = { x: wPos.x, y: Math.max(0.8, wPos.y), z: wPos.z };
        s.riderVel = {
          x: sideDir * (2.2 + Math.random() * 2) + (s.steerVel * 0.3),
          y: 5.8 + Math.random() * 2.5, // thrown forward over handlebars
          z: hitVehicle?.isOncoming ? 1.5 : -Math.max(7, fwd * 1.2) // thrown forward
        };
        s.riderRotVel = {
          x: 9 + Math.random() * 5, // front flips
          y: (Math.random() - 0.5) * 6,
          z: (Math.random() - 0.5) * 6
        };
      }

      audio.playCrash();
      audio.playGlassShatter();

      // Crash smoke & spark bursts
      for(let p = 0; p < 25; p++) {
        emitSmoke(true, 120);
      }
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

              {/* Center Scoreboard: Level, Race Distance / Target, Time, Remaining */}
              <div className="flex flex-col items-center pointer-events-auto">
                <div className="flex items-center gap-2.5 bg-black/65 border border-amber-500/40 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-2xl">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    LVL {hud.level}/5
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-white/60">DIST:</span>
                    <span className="text-emerald-400 font-bold">{formatDist(hud.dist)}</span>
                    <span className="text-white/40">/</span>
                    <span className="text-slate-300 font-bold">{formatDist(hud.targetDist)}</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-white/60">REMAIN:</span>
                    <span className="text-amber-300 font-bold">{formatDist(Math.max(0, hud.targetDist - hud.dist))}</span>
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-cyan-300 font-bold">⏱️ {(hud.time || 0).toFixed(1)}s</span>
                  </div>
                </div>

                {/* Race Progress Bar */}
                <div className="w-52 h-1.5 bg-slate-900/80 rounded-full mt-1 overflow-hidden border border-white/10 backdrop-blur-sm">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, (hud.dist / (hud.targetDist || 100)) * 100)}%` }}
                  />
                </div>
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

        {/* ── Level Completed Popup (Levels 1 to 4) ── */}
        {phase === 'levelcomplete' && stateRef.current.level < 5 && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
              🏁
            </div>
            <div className="inline-block bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded-full mb-1">
              FINISH LINE CROSSED
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-wide mb-1" style={{fontFamily:'Fredoka,sans-serif'}}>
              LEVEL {stateRef.current.level} COMPLETED!
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-sm mb-5">
              Outstanding racing! You reached the required distance and crossed the finish line.
            </p>

            <div className="flex gap-4 md:gap-8 bg-slate-900/90 p-4 md:px-7 md:py-5 rounded-2xl border border-slate-700 shadow-2xl mb-6 backdrop-blur-md">
              <div className="text-center">
                <div className="text-slate-400 text-[11px] font-semibold tracking-wider">LEVEL</div>
                <div className="text-xl md:text-2xl font-black font-mono text-cyan-400">{stateRef.current.level} / 5</div>
              </div>
              <div className="w-[1px] bg-slate-700 my-1"/>
              <div className="text-center">
                <div className="text-slate-400 text-[11px] font-semibold tracking-wider">DISTANCE</div>
                <div className="text-xl md:text-2xl font-black font-mono text-amber-400">{formatDist(LEVEL_DISTANCES[stateRef.current.level - 1])}</div>
              </div>
              <div className="w-[1px] bg-slate-700 my-1"/>
              <div className="text-center">
                <div className="text-slate-400 text-[11px] font-semibold tracking-wider">TIME TAKEN</div>
                <div className="text-xl md:text-2xl font-black font-mono text-emerald-400">{currentLevelTime.toFixed(2)}s</div>
              </div>
              <div className="w-[1px] bg-slate-700 my-1"/>
              <div className="text-center">
                <div className="text-slate-400 text-[11px] font-semibold tracking-wider">TOP SPEED</div>
                <div className="text-xl md:text-2xl font-black font-mono text-rose-400">{hud.speed} KM/H</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={nextLevel}
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-white font-black px-8 py-3 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 cursor-pointer text-sm md:text-base flex items-center justify-center gap-2">
                <span>Next Level ({stateRef.current.level + 1}/5)</span>
                <i className="fa-solid fa-arrow-right text-xs"/>
              </button>
              <button
                onClick={replayLevel}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold px-6 py-3 rounded-xl active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2">
                <i className="fa-solid fa-rotate-left text-xs"/>
                <span>Replay</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Level 5 Final Completion Screen (Grand Champion) ── */}
        {phase === 'levelcomplete' && stateRef.current.level >= 5 && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl mb-3 shadow-[0_0_35px_rgba(245,158,11,0.5)] animate-bounce">
              🏆
            </div>
            <div className="inline-block bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold px-4 py-1 rounded-full mb-1">
              GRAND CHAMPION
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-wide mb-1" style={{fontFamily:'Fredoka,sans-serif'}}>
              ALL 5 LEVELS COMPLETED!
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-md mb-4">
              Legendary ride! You completed every highway race distance and set record times across all 5 levels.
            </p>

            {/* Level times breakdown table */}
            <div className="w-full max-w-md bg-slate-900/90 rounded-2xl border border-slate-700 shadow-2xl p-4 mb-5 text-left backdrop-blur-md">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-800 flex justify-between">
                <span>Stage / Level</span>
                <span>Distance</span>
                <span>Completion Time</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {LEVEL_DISTANCES.map((d, idx) => {
                  const lvl = idx + 1;
                  const t = (lvl === 5 ? currentLevelTime : levelTimes[lvl]) || 0;
                  return (
                    <div key={lvl} className="flex justify-between items-center py-1 px-2 rounded bg-slate-800/40">
                      <span className="font-bold text-white">Level {lvl}</span>
                      <span className="text-slate-400">{formatDist(d)}</span>
                      <span className="font-bold text-emerald-400">{t > 0 ? `${t.toFixed(2)}s` : '-'}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-700/80 font-bold text-sm">
                  <span className="text-amber-400">TOTAL RACE TIME</span>
                  <span className="text-amber-300 font-mono">
                    {Object.values({ ...levelTimes, 5: currentLevelTime }).reduce((a, b) => a + b, 0).toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => restartRace(true)}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black font-black px-8 py-3 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer text-sm md:text-base flex items-center justify-center gap-2">
                <span>🏆 Play Again (Level 1)</span>
              </button>
              <button
                onClick={replayLevel}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold px-6 py-3 rounded-xl active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2">
                <i className="fa-solid fa-rotate-left text-xs"/>
                <span>Replay Level 5</span>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-3 rounded-xl cursor-pointer text-sm">
                  Exit
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Shattered Mirror / Broken Glass Overlay (Active on crash and frames Game Over) ── */}
        {shattered && (
          <ShatteredMirrorOverlay isGameOver={phase === 'gameover'} />
        )}

        {/* ── Game Over Screen ── */}
        {phase==='gameover' && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out]">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/55 flex items-center justify-center text-3xl mb-3 animate-bounce">💥</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-1" style={{fontFamily:'Fredoka,sans-serif'}}>CRASHED!</h2>
              <p className="text-slate-300 text-xs max-w-xs mb-5">You hit highway traffic at high speed. Keep your line and overtake cleanly.</p>
              <div className="flex gap-6 bg-slate-900/85 p-4 rounded-2xl border border-slate-700/80 mb-5 backdrop-blur-md shadow-2xl">
                {[['SPEED',`${hud.speed} KM/H`,'text-rose-400'],['DISTANCE',`${hud.dist}m`,'text-amber-400'],['SCORE',hud.score,'text-emerald-400']].map(([l,v,cls])=>(
                  <div key={l} className="text-center">
                    <div className="text-slate-400 text-[11px] font-semibold">{l}</div>
                    <div className={`text-xl md:text-2xl font-black font-mono ${cls}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => restartRace(false)} className="bg-gradient-to-r from-red-500 to-rose-600 hover:brightness-110 text-white font-bold px-7 py-2.5 rounded-xl shadow-lg active:scale-95 cursor-pointer text-sm">🔄 Play Again</button>
                {onClose&&<button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-sm">Exit</button>}
              </div>
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
