import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

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
  playCoin() {
    if(!this.ctx) return;
    try {
      if(this.ctx.state==='suspended') this.ctx.resume();
      this._sfx(988, 'sine', 0.12, 0.1);
      setTimeout(() => {
        this._sfx(1318, 'triangle', 0.14, 0.18);
      }, 50);
    } catch {}
  }
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
// ── Subtle Realistic Corner Mirror Break Overlay ──────────────────────────────
function ShatteredMirrorOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* 1. Subtle, gentle corner vignette (100% transparent in center) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 72%, rgba(2, 6, 23, 0.45) 100%)',
        }}
      />

      {/* 2. Realistic Hairline Corner Fractures & Translucent Glass Shards */}
      <svg
        className="w-full h-full absolute inset-0 filter drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cornerGlassSheen" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="50%" stopColor="rgba(224,242,254,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
          </linearGradient>

          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Top-Right Corner Break (Realistic Mirror Fracture) ── */}
        <g filter="url(#subtleGlow)">
          {/* Corner glass shards */}
          <polygon points="945,0 1000,0 1000,55 972,42" fill="url(#cornerGlassSheen)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
          <polygon points="1000,55 1000,115 958,82 972,42" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.68)" strokeWidth="1.0" />
          <polygon points="885,0 945,0 972,42 918,34" fill="rgba(224,242,254,0.06)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.0" />

          {/* Impact origin micro-arcs */}
          <path d="M 960,34 Q 972,46 982,40" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3" />
          <path d="M 946,26 Q 966,54 990,48" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="1.0" />

          {/* Hairline radiating crack lines staying strictly in corner */}
          <polyline points="972,42 928,24 864,10 815,0" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.2" strokeLinecap="round" />
          <polyline points="972,42 918,74 874,106 835,130" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="1.1" strokeLinecap="round" />
          <polyline points="972,42 956,102 932,158 922,200" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="1.0" strokeLinecap="round" />
          
          {/* Delicate micro-branches */}
          <polyline points="918,74 922,118 908,150" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
          <polyline points="928,24 908,44 884,48" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
        </g>

        {/* ── Bottom-Left Corner Break (Subtle Secondary Impact) ── */}
        <g filter="url(#subtleGlow)">
          {/* Corner glass shards */}
          <polygon points="0,545 52,562 0,600" fill="url(#cornerGlassSheen)" stroke="rgba(255,255,255,0.72)" strokeWidth="1.2" />
          <polygon points="0,600 52,562 108,580 88,600" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.0" />

          {/* Impact micro-arc */}
          <path d="M 38,552 Q 52,565 62,556" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.1" />

          {/* Hairlines extending only along bottom-left corner */}
          <polyline points="48,565 86,532 138,512 185,502" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinecap="round" />
          <polyline points="48,565 66,518 92,464 102,418" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.0" strokeLinecap="round" />
          <polyline points="86,532 110,546 134,554" fill="none" stroke="rgba(255,255,255,0.52)" strokeWidth="0.8" />
        </g>

        {/* ── Top-Left Corner (Minimal Stress Fracture) ── */}
        <g filter="url(#subtleGlow)">
          <polygon points="0,0 42,0 24,24 0,18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.0" />
          <polyline points="0,32 42,22 86,8 115,0" fill="none" stroke="rgba(255,255,255,0.68)" strokeWidth="1.0" strokeLinecap="round" />
          <polyline points="42,22 56,52 70,80" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" />
        </g>

        {/* ── Bottom-Right Corner (Minimal Stress Fracture) ── */}
        <g filter="url(#subtleGlow)">
          <polygon points="975,600 1000,568 1000,600" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.0" />
          <polyline points="960,600 942,568 918,540 885,522" fill="none" stroke="rgba(255,255,255,0.62)" strokeWidth="0.9" strokeLinecap="round" />
        </g>
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

// ── Arcade 3D Curved Highway Track Dynamics ──────────────────────────────────
// Level 1 Track Curvature Profile (1000m Total):
//   0m–120m:   Launch Straightaway (0.0)
// 120m–360m:   Sweeping Right Turn (+0.75)
// 360m–520m:   High-Speed Straight (0.0)
// 520m–740m:   Thrilling Left Turn (-0.80)
// 740m–930m:   Arcade S-Curve Combo (Right -> Left flick)
// 930m–1000m:  Straight sprint to the Checkered Finish Line Gantry!
function getRoadCurveAt(dist) {
  const d = dist;
  if (d < 120) return 0;
  if (d < 360) {
    const t = (d - 120) / 240;
    return Math.sin(t * Math.PI) * 0.75;
  }
  if (d < 520) return 0;
  if (d < 740) {
    const t = (d - 520) / 220;
    return -Math.sin(t * Math.PI) * 0.80;
  }
  if (d < 930) {
    const t = (d - 740) / 190;
    return Math.sin(t * Math.PI * 2) * 0.85;
  }
  return 0;
}

// Parabolic lateral displacement at depth z relative to player
function getCurveOffset(z, playerDist) {
  if (z >= 10) return 0;
  const distAhead = Math.max(0, -z);
  const sampleDist = playerDist + distAhead * 0.65;
  const curvature = getRoadCurveAt(sampleDist);
  return curvature * (distAhead * distAhead * 0.0004);
}

// Tangent angle along curve (for car, gantry, and camera alignment)
function getCurveTangent(z, playerDist) {
  const z1 = z - 2;
  const z2 = z + 2;
  const x1 = getCurveOffset(z1, playerDist);
  const x2 = getCurveOffset(z2, playerDist);
  return Math.atan2(x1 - x2, 4);
}

// Procedural dynamic guardrail ribbon along highway edges
function makeGuardrailGeometry(side, segs, roadW, roadL) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((segs + 1) * 2 * 3);
  const uvs = new Float32Array((segs + 1) * 2 * 2);
  const idx = [];

  const xBase = side * (roadW / 2 + 0.25);
  for(let j = 0; j <= segs; j++) {
    const zWorld = (j / segs - 1) * roadL + 10;
    // Top vertex
    pos[(j * 2 + 0) * 3 + 0] = xBase;
    pos[(j * 2 + 0) * 3 + 1] = 0.68;
    pos[(j * 2 + 0) * 3 + 2] = zWorld;
    // Bottom vertex
    pos[(j * 2 + 1) * 3 + 0] = xBase;
    pos[(j * 2 + 1) * 3 + 1] = 0.24;
    pos[(j * 2 + 1) * 3 + 2] = zWorld;

    uvs[(j * 2 + 0) * 2 + 0] = (j / segs) * 20;
    uvs[(j * 2 + 0) * 2 + 1] = 1;
    uvs[(j * 2 + 1) * 2 + 0] = (j / segs) * 20;
    uvs[(j * 2 + 1) * 2 + 1] = 0;

    if(j < segs) {
      const a = j * 2 + 0;
      const b = j * 2 + 1;
      const c = (j + 1) * 2 + 0;
      const d = (j + 1) * 2 + 1;
      // When side < 0 (left guardrail), reverse winding so the front face points inward (+X) toward the road
      if (side < 0) {
        idx.push(a, c, b, b, c, d);
      } else {
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

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
    score: 0, overtakes: 0, cameraMode: 'chase',
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
    maxSpeedReached: 0,       // peak highest speed reached during level
  });

  const [phase, setPhase] = useState('playing'); // 'playing' | 'gameover' | 'levelcomplete'
  const [shattered, setShattered] = useState(false);
  const [hud,   setHud]   = useState({
    speed: 0, topSpeed: 0, dist: 0, nitro: 100, nitroActive: false, score: 0, overtakes: 0, gear: 1, rpm: 0,
    level: 1, targetDist: 1000, time: 0
  });
  const [levelTimes, setLevelTimes] = useState({}); // { 1: time, 2: time, ... }
  const [currentLevelTime, setCurrentLevelTime] = useState(0);
  const [levelTopSpeed, setLevelTopSpeed] = useState(0);
  const [cameraMode, setCameraMode] = useState('chase');
  const [isPaused, setIsPaused] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);
  const [scorePopups, setScorePopups] = useState([]);
  const [touch, setTouch] = useState({gas:false,brake:false});
  const [loading, setLoading] = useState(true);

  const triggerScorePopupRef = useRef(null);
  const emitFireBurstRef = useRef(null);

  useEffect(() => {
    triggerScorePopupRef.current = (x, y) => {
      const id = Date.now() + Math.random();
      setScorePopups(prev => [...prev.slice(-6), { id, x, y }]);
      setTimeout(() => {
        setScorePopups(prev => prev.filter(p => p.id !== id));
      }, 850);
    };
  }, []);

  // Refs to Three.js objects so restartRace can reset transforms and vehicles without re-mounting
  const sceneRef = useRef(null);
  const playerGroupRef = useRef(null);
  const riderRef = useRef(null);
  const frontWheelPivotRef = useRef(null);
  const rearWheelPivotRef = useRef(null);
  const cameraRef = useRef(null);
  const resetVehiclesRef = useRef(null);

  const toggleCamera = useCallback(() => {
    setCameraMode(prev => {
      const next = prev === 'chase' ? 'cockpit' : 'chase';
      stateRef.current.cameraMode = next;
      return next;
    });
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
      score:0, overtakes:0, crashed:false, crashTime:0, isPaused:false,
      invulnTime: 2.5, // 2.5s collision immunity grace period on restart
      gear:0, // Reset to G1 on replay
      levelTime: 0,
      levelComplete: false,
      maxSpeedReached: 0,
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
    if(frontWheelPivotRef.current) frontWheelPivotRef.current.rotation.set(0, 0, 0);
    if(rearWheelPivotRef.current) rearWheelPivotRef.current.rotation.set(0, 0, 0);
    // Re-attach rider to playerGroup if detached during crash
    if(riderRef.current && playerGroupRef.current) {
      playerGroupRef.current.add(riderRef.current);
      riderRef.current.position.set(0, 0.02, 0.08);
      riderRef.current.rotation.set(0, 0, 0);
    }
    setShattered(false);
    setScorePopups([]);
    setAdPlaying(false);
    setLevelTopSpeed(0);
    // Snap camera to start position so lerp doesn't drag from crash location
    if(cameraRef.current) {
      cameraRef.current.position.set(2.4, 1.9, 4.8);
      cameraRef.current.rotation.set(0, 0, 0);
    }
    setPhase('playing'); setIsPaused(false);
  }, []);

  // Revive player at current distance without resetting race progress
  const revivePlayer = useCallback(() => {
    const s = stateRef.current;
    
    // Revive physics state (keep current dist and overtakes count!)
    Object.assign(s, {
      speed: 65,      // Launch speed in G2
      gear: 1,       // G2
      playerLean: 0,
      steer: 0,
      steerVel: 0,
      crashed: false,
      crashTime: 0,
      isPaused: false,
      invulnTime: 4.0, // 4-second invulnerability shield so player safely stabilizes
    });

    // Push away any vehicles right in front of player
    if(resetVehiclesRef.current) {
      resetVehiclesRef.current();
    }

    // Upright player bike
    if(playerGroupRef.current) {
      playerGroupRef.current.position.set(s.playerX, 0, 0);
      playerGroupRef.current.rotation.set(0, 0, 0);
      playerGroupRef.current.scale.set(1, 1, 1);
    }

    // Re-attach rider to bike
    if(riderRef.current && playerGroupRef.current) {
      playerGroupRef.current.add(riderRef.current);
      riderRef.current.position.set(0, 0.02, 0.08);
      riderRef.current.rotation.set(0, 0, 0);
    }

    // Snap camera smoothly behind bike
    if(cameraRef.current) {
      cameraRef.current.position.set(s.playerX * 0.88, 1.85, 4.3);
      cameraRef.current.rotation.set(0, 0, 0);
    }

    setShattered(false);
    setScorePopups([]);
    setAdPlaying(false);
    setPhase('playing');
    setIsPaused(false);
  }, []);

  // Watch Ad to Continue (Future Google Ads integration hook)
  const continueWithAd = useCallback(() => {
    // =========================================================================
    // FUTURE GOOGLE ADS / ADMOB REWARDED VIDEO AD HOOK:
    // When real Ads are enabled, call your Ad SDK here:
    // window.admob?.rewarded?.show().then(() => revivePlayer());
    // =========================================================================
    setAdPlaying(true);
    setAdCountdown(3);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if(count <= 0) {
        clearInterval(timer);
        setAdPlaying(false);
        revivePlayer();
      }
    }, 850);
  }, [revivePlayer]);

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
    if(s.crashed || s.levelComplete || s.nitroAvailable < 100 || s.nitroActive) return;
    s.nitroActive = true;
    s.nitroTime = 4.0;
    s.nitroAvailable = 0;
    // Explosive instant speed surge
    s.speed = Math.min(s.maxSpeed || 290, s.speed + 32);
    audio.playNitro();
    if(emitFireBurstRef.current) {
      emitFireBurstRef.current();
    }
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
    scene.background = new THREE.Color('#5ba4d0');
    scene.fog = new THREE.FogExp2('#e89a5c', 0.0033);

    const camera = new THREE.PerspectiveCamera(65, W/H, 0.05, 1000);
    camera.position.set(2.4, 1.9, 4.8);
    camera.lookAt(2.4, 1.1, -24);
    cameraRef.current = camera; // expose to restartRace for snap-reset on replay

    const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance', stencil:false});
    renderer.setSize(W,H);
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor('#5ba4d0', 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

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

    // ── 3D Curved Road, Terrain & Guardrails ──────────────────────────────────
    const ROAD_W = 16.5, ROAD_L = 420;
    const ROAD_SEGS = 70;
    const {diffuse:rdiff, normal:rnorm, roughness:rrough} = makeAsphaltTextures();

    const roadGeo = new THREE.PlaneGeometry(ROAD_W, ROAD_L, 1, ROAD_SEGS);
    const road = new THREE.Mesh(
      roadGeo,
      new THREE.MeshStandardMaterial({map:rdiff, normalMap:rnorm, normalScale:new THREE.Vector2(.8,.8), roughnessMap:rrough, roughness:.82, metalness:.12})
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -ROAD_L / 2 + 10);
    road.receiveShadow = true;
    scene.add(road);

    // Terrain/grass shoulders
    const terrainMat = new THREE.MeshStandardMaterial({color:'#3d4a3e', roughness:.95, metalness:.04});
    const terrainGeo = new THREE.PlaneGeometry(320, ROAD_L, 1, ROAD_SEGS);
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, -0.01, -ROAD_L / 2 + 10);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Dynamic Guardrail Ribbons along highway edges (Left & Right Highway Steel Barricades)
    const railMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.94,
      roughness: 0.22,
      side: THREE.DoubleSide
    });
    const railLeftGeo = makeGuardrailGeometry(-1, ROAD_SEGS, ROAD_W, ROAD_L);
    const railLeft = new THREE.Mesh(railLeftGeo, railMat);
    railLeft.castShadow = true;
    railLeft.receiveShadow = true;
    scene.add(railLeft);

    const railRightGeo = makeGuardrailGeometry(1, ROAD_SEGS, ROAD_W, ROAD_L);
    const railRight = new THREE.Mesh(railRightGeo, railMat);
    railRight.castShadow = true;
    railRight.receiveShadow = true;
    scene.add(railRight);

    // Guardrail Support Posts along highway edges with highway reflectors
    const railPosts = [];
    const reflMatLeft = new THREE.MeshBasicMaterial({ color: '#f59e0b' }); // Amber warning reflector on oncoming left
    const reflMatRight = new THREE.MeshBasicMaterial({ color: '#ef4444' }); // Red reflector on right
    for(let z = -ROAD_L + 10; z < 20; z += 12) {
      [-1, 1].forEach(side => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), railMat);
        post.position.set(side * (ROAD_W / 2 + 0.25), 0.33, z);
        post.userData = { side, origZ: z };
        post.castShadow = true;

        // Highway reflector stud facing traffic
        const refl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.04), side < 0 ? reflMatLeft : reflMatRight);
        refl.position.set(0, 0.16, 0);
        post.add(refl);

        scene.add(post);
        railPosts.push(post);
      });
    }

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
        tree.userData = { origX: xd };
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

    // Wheel pivots & dynamic rolling angle
    let frontWheelPivot = null;
    let rearWheelPivot = null;
    let wheelRollAngle = 0;

    gltfLoader.load('/models/motorcycle.glb', gltf=>{
      const bikeModel = gltf.scene;

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

      // Collect front and rear rotating wheel components
      const frontParts = [];
      const rearParts = [];

      // High-detail realistic materials for moving wheel parts
      const tireMat = new THREE.MeshStandardMaterial({
        color: '#15171a',     // Vulcanized rubber black
        roughness: 0.88,
        metalness: 0.08,
      });
      const rimMat = new THREE.MeshStandardMaterial({
        color: '#d4af37',     // Metallic gold alloy rims (high contrast against black tire)
        roughness: 0.22,
        metalness: 0.92,
        envMapIntensity: 2.5,
      });
      const rimDecalMat = new THREE.MeshStandardMaterial({
        color: '#ef4444',     // Racing red rim lip decals for high-speed dynamic strobing
        roughness: 0.28,
        metalness: 0.65,
        emissive: '#dc2626',
        emissiveIntensity: 0.35,
      });
      const brakeDiscMat = new THREE.MeshStandardMaterial({
        color: '#cbd5e1',     // Drilled steel brake rotor disc
        roughness: 0.25,
        metalness: 0.95,
        envMapIntensity: 2.0,
      });
      const brakeCaliperMat = new THREE.MeshStandardMaterial({
        color: '#b91c1c',     // Brembo racing red static caliper
        roughness: 0.35,
        metalness: 0.5,
      });

      bikeModel.traverse(child=>{
        if(!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;

        const name = child.name || '';
        const matName = child.material?.name || '';
        const isCaliper = /caliper|calipper|cylinder_brake/i.test(name) || /caliper|calipper/i.test(matName);

        // Group wheel meshes for spinning (strictly excluding static brake calipers)
        if(!isCaliper) {
          if(/front/i.test(name) && /tire|rim|disk|wheel|brake_disk|decal_rim|bolt_brake/i.test(name)) {
            frontParts.push(child);
          } else if(/rear/i.test(name) && /tire|rim|disk|wheel|brake_disk|decal_rim|bolt_rear/i.test(name)) {
            rearParts.push(child);
          }
        }

        // Apply realistic materials
        if(/tire/i.test(name) || /tire/i.test(matName)) {
          child.material = tireMat;
        } else if(/decal_rim/i.test(name)) {
          child.material = rimDecalMat;
        } else if(/rim/i.test(name) || /rim/i.test(matName)) {
          child.material = rimMat;
        } else if(/brake_disk|brakedisk|disk_ABS/i.test(name) || /brakedisk/i.test(matName)) {
          child.material = brakeDiscMat;
        } else if(isCaliper) {
          child.material = brakeCaliperMat;
        } else if(/carpaint|body|fairing/i.test(matName) || /body|fender/i.test(name)){
          child.material = new THREE.MeshPhysicalMaterial({
            color: '#b91c1c', // Deep racing red
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            metalness: 0.85,
            roughness: 0.15,
            envMapIntensity: 2.2,
          });
        } else if(/chrome|bolt|lever|pipe|exhaust/i.test(matName)){
          child.material = new THREE.MeshStandardMaterial({
            color: '#e2e8f0',
            metalness: 0.98,
            roughness: 0.06,
            envMapIntensity: 2.0,
          });
        } else if(/glass|windshield|mirror/i.test(matName)){
          child.material = new THREE.MeshStandardMaterial({
            color: '#a5f3fc',
            transparent: true,
            opacity: 0.45,
            roughness: 0.03,
          });
        } else if(child.material) {
          child.material.envMapIntensity = 1.8;
        }
      });

      playerGroup.add(bikeWrapper);
      playerGroup.updateMatrixWorld(true);

      // Create axle pivots for Front and Rear wheels inside playerGroup space
      if(frontParts.length > 0) {
        const frontBox = new THREE.Box3();
        frontParts.forEach(m => frontBox.expandByObject(m));
        const frontCenterWorld = new THREE.Vector3();
        frontBox.getCenter(frontCenterWorld);
        const frontCenterLocal = frontCenterWorld.clone();
        playerGroup.worldToLocal(frontCenterLocal);

        frontWheelPivot = new THREE.Group();
        frontWheelPivot.name = 'frontWheelPivot';
        frontWheelPivot.position.copy(frontCenterLocal);
        playerGroup.add(frontWheelPivot);
        frontWheelPivotRef.current = frontWheelPivot;
        playerGroup.updateMatrixWorld(true);

        frontParts.forEach(m => {
          frontWheelPivot.attach(m);
        });
      }

      if(rearParts.length > 0) {
        const rearBox = new THREE.Box3();
        rearParts.forEach(m => rearBox.expandByObject(m));
        const rearCenterWorld = new THREE.Vector3();
        rearBox.getCenter(rearCenterWorld);
        const rearCenterLocal = rearCenterWorld.clone();
        playerGroup.worldToLocal(rearCenterLocal);

        rearWheelPivot = new THREE.Group();
        rearWheelPivot.name = 'rearWheelPivot';
        rearWheelPivot.position.copy(rearCenterLocal);
        playerGroup.add(rearWheelPivot);
        rearWheelPivotRef.current = rearWheelPivot;
        playerGroup.updateMatrixWorld(true);

        rearParts.forEach(m => {
          rearWheelPivot.attach(m);
        });
      }

      // Position rider naturally on the superbike seat
      rider.position.set(0, 0.02, 0.08);
    }, undefined, (err)=>{
      console.error('Error loading HD motorcycle.glb:', err);
    });


    // ── Tire Smoke & Smoking Fire Nitro Exhaust Particle System ────────────────
    const N_PARTS = 240;
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
    const pMat = new THREE.PointsMaterial({size:.95,vertexColors:true,transparent:true,opacity:.68,map:smokeTex,depthWrite:false});
    const pSys = new THREE.Points(pGeo, pMat);
    scene.add(pSys);

    const pool = Array.from({length:N_PARTS},()=>({active:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1,sz:0,tSz:1,r:1,g:1,b:1,a:1}));
    let pNext = 0;

    function emitSmoke(isNitro, spd, isFire = false) {
      const p = pool[pNext]; pNext = (pNext + 1) % N_PARTS;
      const s = stateRef.current;
      p.active = true;

      if(isNitro && isFire) {
        // ── Blazing Exhaust Flame Jet ─────────────────────────────────────────
        p.life = 0;
        p.maxLife = 0.16 + Math.random() * 0.22;
        // Dual exhaust muffler positions
        const side = Math.random() > 0.5 ? 0.16 : -0.16;
        p.x = s.playerX + side + (Math.random() - 0.5) * 0.04;
        p.y = 0.27 + (Math.random() - 0.5) * 0.05;
        p.z = 0.94;

        p.vx = (Math.random() - 0.5) * 0.35;
        p.vy = 0.12 + Math.random() * 0.24;
        p.vz = 9.8 + spd * 0.075;
        p.sz = 0.45;
        p.tSz = 1.15;

        // Vivid fiery palette: electric blue nitro core, blazing orange/red fire, golden white sparks
        const roll = Math.random();
        if(roll < 0.38) {
          // Electric Nitro Blue flame
          p.r = 0.05; p.g = 0.88; p.b = 1.0;
        } else if(roll < 0.78) {
          // Blazing Fire Orange/Red
          p.r = 1.0; p.g = 0.42; p.b = 0.03;
        } else {
          // Hot Golden Yellow spark
          p.r = 1.0; p.g = 0.88; p.b = 0.15;
        }
        p.a = 1.0;
      } else if(isNitro && !isFire) {
        // ── Billowing Smoky Fire Trail Plume ──────────────────────────────────
        p.life = 0;
        p.maxLife = 0.48 + Math.random() * 0.38;
        p.x = s.playerX + (Math.random() - 0.5) * 0.24;
        p.y = 0.32 + Math.random() * 0.14;
        p.z = 1.12 + Math.random() * 0.16;

        p.vx = (Math.random() - 0.5) * 0.75;
        p.vy = 0.35 + Math.random() * 0.5;
        p.vz = 4.2 + spd * 0.04;
        p.sz = 0.4;
        p.tSz = 2.2;

        // Smoky charcoal grey with burning warm tint
        p.r = 0.34; p.g = 0.30; p.b = 0.28;
        p.a = 0.65;
      } else {
        // ── Normal Tire/Road Friction Smoke ──────────────────────────────────
        p.life = 0;
        p.maxLife = 0.38 + Math.random() * 0.35;
        p.x = s.playerX + (Math.random() - 0.5) * 0.18;
        p.y = 0.1 + Math.random() * 0.07;
        p.z = 1.05;

        p.vx = (Math.random() - 0.5) * 0.65;
        p.vy = 0.22 + Math.random() * 0.42;
        p.vz = 1.8 + spd * 0.025;
        p.sz = 0.32;
        p.tSz = 1.55;
        p.r = 0.88; p.g = 0.90; p.b = 0.92;
        p.a = 0.48;
      }
    }

    // Expose instant combustion burst for nitro ignition
    emitFireBurstRef.current = () => {
      for(let i = 0; i < 20; i++) {
        emitSmoke(true, stateRef.current.speed, true);
        if(i % 2 === 0) emitSmoke(true, stateRef.current.speed, false);
      }
    };

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
        const effectiveTorque = (s.nitroActive ? curGear.torque * 2.2 + 80 : curGear.torque) * torqueCurve;
        const topSpd = s.nitroActive ? 290 : curGear.shift;

        if(s.accel || s.nitroActive) {
          const nitroThrust = s.nitroActive ? 85 : 0;
          s.speed = Math.min(topSpd, s.speed + (effectiveTorque + nitroThrust) * dt);
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

        // Centrifugal drift on curves: high-speed turns push bike outward if player doesn't steer
        const currentCurvature = getRoadCurveAt(s.dist);
        if(Math.abs(currentCurvature) > 0.05 && s.speed > 25) {
          const centrifugal = currentCurvature * (s.speed / 160) * 1.5 * dt;
          s.playerX -= centrifugal;
        }

        s.playerX = Math.max(-ROAD_W/2 + 1.2, Math.min(ROAD_W/2 - 1.2, s.playerX));

        // Controlled, realistic banking lean: combines player steer + curve banking
        const leanTarget = -s.steer * 0.25 * Math.min(1, s.speed / 30 + 0.2) + currentCurvature * 0.08;
        const clampedLean = Math.max(-0.28, Math.min(0.28, leanTarget));
        s.playerLean += (clampedLean - s.playerLean) * 22 * dt;

        // Track highest peak speed achieved in this level
        if (s.speed > (s.maxSpeedReached || 0)) {
          s.maxSpeedReached = Math.round(s.speed);
        }

        s.dist  += (s.speed*1000/3600)*dt;
        // Score is awarded strictly +10 pts per obstacle passed
        if(!s.levelComplete) {
          s.levelTime += dt;
        }

        audio.update(s.speed, s.accel, s.brake, s.nitroActive, g, rpmRatio);

        // Emit tire smoke & smoking fiery nitro exhaust
        if(s.nitroActive) {
          emitSmoke(true, s.speed, true);
          emitSmoke(true, s.speed, true);
          emitSmoke(true, s.speed, true);
          emitSmoke(true, s.speed, false);
          emitSmoke(true, s.speed, false);
        } else if((s.accel || (s.brake && s.speed > 75)) && s.speed > 8) {
          emitSmoke(false, s.speed, false);
          if(s.speed > 155) emitSmoke(false, s.speed, false);
        }
      }

      // ── Finish Line Position & Level Complete Detection ──────────────────────
      const remDist = s.levelTargetDist - s.dist;
      if(remDist <= 120 && remDist >= -20) {
        finishLineGroup.visible = true;
        const flZ = -remDist;
        const flCurve = getCurveOffset(flZ, s.dist);
        const flAngle = getCurveTangent(flZ, s.dist);
        finishLineGroup.position.set(flCurve, 0, flZ);
        finishLineGroup.rotation.y = -flAngle;
      } else {
        finishLineGroup.visible = false;
      }

      // Check for level complete
      if(!s.crashed && !s.levelComplete && s.dist >= s.levelTargetDist) {
        s.levelComplete = true;
        s.accel = false;
        s.steer = 0;
        s.steerVel = 0;
        const peakSpeed = Math.round(Math.max(s.maxSpeedReached || 0, s.speed));
        s.maxSpeedReached = peakSpeed;
        setLevelTopSpeed(peakSpeed);
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

      // ── Dynamic Wheel & Tire Spinning (Synchronized with Ground Speed) ────────
      // Outer tire radius is ~0.315m. Angular delta in radians = moveDist / radius.
      // Negative rotation around local X rolls the wheels forward down the road.
      if(s.speed > 0.1 || !s.crashed) {
        wheelRollAngle += (moveDist / 0.315);
      } else if(s.crashed && Math.abs(s.crashVel?.z || 0) > 0.1) {
        wheelRollAngle += (Math.abs(s.crashVel.z) * dt / 0.315);
      }
      if(frontWheelPivot) {
        frontWheelPivot.rotation.x = -wheelRollAngle;
      }
      if(rearWheelPivot) {
        rearWheelPivot.rotation.x = -wheelRollAngle;
      }

      // ── 3D Dynamic Curve Highway Deformation ────────────────────────────────
      const roadPos = roadGeo.attributes.position;
      const terrPos = terrainGeo.attributes.position;
      const railLPos = railLeftGeo.attributes.position;
      const railRPos = railRightGeo.attributes.position;

      for (let j = 0; j <= ROAD_SEGS; j++) {
        const zWorld = (j / ROAD_SEGS - 1) * ROAD_L + 10;
        const offX = getCurveOffset(zWorld, s.dist);

        // Road plane vertices
        roadPos.setX(j * 2 + 0, -ROAD_W / 2 + offX);
        roadPos.setX(j * 2 + 1, ROAD_W / 2 + offX);

        // Terrain plane vertices
        terrPos.setX(j * 2 + 0, -160 + offX);
        terrPos.setX(j * 2 + 1, 160 + offX);

        // Left & right guardrails
        railLPos.setX(j * 2 + 0, -ROAD_W / 2 - 0.25 + offX);
        railLPos.setX(j * 2 + 1, -ROAD_W / 2 - 0.25 + offX);

        railRPos.setX(j * 2 + 0, ROAD_W / 2 + 0.25 + offX);
        railRPos.setX(j * 2 + 1, ROAD_W / 2 + 0.25 + offX);
      }
      roadPos.needsUpdate = true;
      terrPos.needsUpdate = true;
      railLPos.needsUpdate = true;
      railRPos.needsUpdate = true;

      // ── Guardrail Posts Looping along Curve ──────────────────────────────────
      railPosts.forEach(post => {
        post.position.z += moveDist;
        if(post.position.z > 20) post.position.z -= ROAD_L;
        const offX = getCurveOffset(post.position.z, s.dist);
        post.position.x = post.userData.side * (ROAD_W / 2 + 0.25) + offX;
      });

      // ── Tree Looping along Curve ─────────────────────────────────────────────
      trees.forEach(tree => {
        tree.position.z += moveDist;
        if(tree.position.z > 30) tree.position.z -= ROAD_L;
        const offX = getCurveOffset(tree.position.z, s.dist);
        tree.position.x = (tree.userData.origX || 0) + offX;
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

        // ── Curve Follow: Lock car to its curved lane X and rotate along tangent ──
        const curveOff = getCurveOffset(v.mesh.position.z, s.dist);
        const curveAngle = getCurveTangent(v.mesh.position.z, s.dist);
        v.mesh.position.x = v.x + curveOff;
        v.mesh.rotation.y = (v.isOncoming ? 0 : Math.PI) - curveAngle;

        // ── Bounding Box Collision ─────────────────────────────────────────────
        const dx = Math.abs(s.playerX - v.x);
        const dz = Math.abs(v.mesh.position.z);
        const hitW = (v.width+.9)/2;
        const hitL = (v.len+1.6)/2;

        if(dx < hitW && dz < hitL && !s.crashed && !s.levelComplete && (s.invulnTime || 0) <= 0) {
          if(s.speed < 30 || v.isOncoming || dx < hitW * 0.75) {
            triggerCrash(s, v);
          } else {
            // Sideswipe: speed penalty instead of full crash
            s.speed = Math.max(0, s.speed * 0.55);
            s.score = Math.max(0, s.score - 10);
          }
        }

        // ── Obstacle Pass Detection (+10 Golden Score at Obstacle Location) ────
        // ONLY triggers when:
        // 1. Direct Overtake: Player overtakes car ahead in same lane / close adjacent lane (dx <= hitW + 1.6 && s.speed > v.speed)
        // 2. Close Edge Pass: Player skims right along the edge of the vehicle (dx <= hitW + 1.25)
        // Otherwise does NOT trigger if player is far away in another lane.
        if(!v.passed && !s.crashed && !s.levelComplete && v.mesh.position.z > 0.5) {
          v.passed = true;

          const isDirectOvertake = (!v.isOncoming && dx <= hitW + 1.6 && s.speed > v.speed);
          const isCloseEdgePass  = (dx <= hitW + 1.25 && s.speed >= 35);

          if(isDirectOvertake || isCloseEdgePass) {
            s.score += 10;
            s.overtakes = (s.overtakes || 0) + 1;
            s.nitroAvailable = Math.min(100, s.nitroAvailable + 15);
            audio.playCoin();

            // Determine which side of the bike the car was crossed:
            // v.mesh.position.x < s.playerX -> Car is on the LEFT of bike
            // v.mesh.position.x > s.playerX -> Car is on the RIGHT of bike
            const isLeftSide = v.mesh.position.x <= s.playerX;

            const vPos = new THREE.Vector3(v.mesh.position.x, 1.2, v.mesh.position.z);
            vPos.project(camera);

            let scrX;
            if(vPos.z < 1.0) {
              const rawX = (vPos.x * 0.5 + 0.5) * 100;
              scrX = isLeftSide ? Math.max(14, Math.min(42, rawX)) : Math.max(58, Math.min(86, rawX));
            } else {
              scrX = isLeftSide ? 25 : 75;
            }
            const scrY = Math.max(30, Math.min(68, (-vPos.y * 0.5 + 0.5) * 100));

            if(triggerScorePopupRef.current) {
              triggerScorePopupRef.current(scrX, scrY);
            }
          }
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
        if(riderRef.current) {
          // Hide rider model only during cockpit view to avoid near-frustum clipping & flickering; show in chase view
          riderRef.current.visible = (s.cameraMode !== 'cockpit');
        }

        const currentCurvature = getRoadCurveAt(s.dist);
        if(s.cameraMode==='chase') {
          camera.up.set(0, 1, 0);
          // Stable, forward-driving chase cam with smooth lateral follow
          const targetX = s.playerX * 0.88; // Slight trailing lag creates natural 3D lane change feel
          const targetY = 1.82 + ratio * 0.1;
          const targetZ = 4.3 - ratio * 0.22; // Subtly tucks forward under acceleration to enhance forward speed rush
          camera.position.x += (targetX - camera.position.x) * 12 * dt;
          camera.position.y += (targetY - camera.position.y) * 10 * dt;
          camera.position.z += (targetZ - camera.position.z) * 10 * dt;
          // Camera banks slightly with curve + bike lean
          camera.rotation.z = -s.playerLean * 0.24 - currentCurvature * 0.05;
          camera.fov = 64 + ratio * 5; // Controlled, clean speed FOV (no bike shrinking)
          camera.updateProjectionMatrix();
          // High-speed micro-shake
          if(s.speed > 120){
            camera.position.y += (Math.random() - 0.5) * ratio * 0.018;
            camera.position.x += (Math.random() - 0.5) * ratio * 0.012;
          }
          // Camera peers through the curve ahead
          const lookAheadCurve = getCurveOffset(-35, s.dist);
          camera.lookAt(s.playerX * 0.55 + lookAheadCurve * 0.35, 1.1, -26);
        } else {
          // First-person cockpit: locked to rider eye position on the bike with 100% precision
          // localEye at (0, 1.15, -0.22) in playerGroup coordinates
          const localEye = new THREE.Vector3(0, 1.15, -0.22);
          const worldEye = localEye.applyMatrix4(playerGroup.matrixWorld);

          // Subtle harmonic engine rev vibration (zero random polygon jitter)
          if(s.speed > 55) {
            worldEye.y += Math.sin(performance.now() * 0.045) * ratio * 0.003;
          }

          camera.position.copy(worldEye);

          // Camera up-vector tilts precisely with the bike's roll / lean
          const localUp = new THREE.Vector3(0, 1, 0);
          localUp.applyQuaternion(playerGroup.quaternion);
          camera.up.copy(localUp);

          camera.fov = 66 + ratio * 6;
          camera.updateProjectionMatrix();

          // Camera looks down the highway along the curved road ahead
          const lookAheadCurve = getCurveOffset(-36, s.dist);
          const lookTarget = new THREE.Vector3(
            s.playerX + lookAheadCurve * 0.45,
            worldEye.y - 0.08,
            worldEye.z - 36
          );
          camera.lookAt(lookTarget);
        }
      }

      // HUD: gear comes directly from physics state (1-indexed for display: 1 to 5)
      // RPM = position within current gear band (0 = just shifted in, 1 = redline / ready to upshift)
      const gIdx = Math.min(4, s.gear ?? 0);
      const curG = GEARS[gIdx];
      const prevShift = gIdx === 0 ? 0 : GEARS[gIdx - 1].shift * 0.7;
      const rpm = Math.min(1, Math.max(0, (s.speed - prevShift) / (curG.shift - prevShift)));
      const gear = gIdx + 1; // display as 1–5

      setHud({
        speed: Math.round(s.speed),
        topSpeed: Math.round(s.maxSpeedReached || s.speed),
        dist: Math.min(s.levelTargetDist, Math.round(s.dist)),
        nitro: Math.round(s.nitroAvailable),
        nitroActive: !!s.nitroActive,
        score: s.score,
        overtakes: s.overtakes || 0,
        curveAhead: getRoadCurveAt(s.dist + 65),
        gear,
        rpm,
        level: s.level,
        targetDist: s.levelTargetDist,
        time: s.levelTime,
      });

      renderer.render(scene, camera);
    } catch (err) {
      console.error('BikeRacer animation error:', err);
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
        riderRef.current.visible = true; // Ensure rider is ALWAYS visible on crash!
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

      // If crash occurred in cockpit view, immediately snap camera back so player sees the crash in full dramatic view
      if(cameraRef.current) {
        cameraRef.current.up.set(0, 1, 0);
        if(s.cameraMode === 'cockpit') {
          cameraRef.current.position.set(s.playerX, 2.3, 4.2);
          cameraRef.current.lookAt(s.playerX, 0.6, 0);
        }
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
      renderer.setSize(w,h);
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

        {/* ── Golden +10 Score Popups (Sleek, reduced font size at obstacle pass location) ── */}
        {scorePopups.map(p => (
          <div
            key={p.id}
            className="absolute pointer-events-none select-none z-35 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/60 border border-amber-400/40 backdrop-blur-[2px] shadow-[0_0_8px_rgba(245,158,11,0.35)] animate-[goldPopFloat_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
          >
            <span className="text-amber-300 text-[10px] leading-none">✦</span>
            <span
              className="text-xs md:text-sm font-mono font-black tracking-tight leading-none"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #fde047 30%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))',
              }}
            >
              +10
            </span>
          </div>
        ))}

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

                {/* Speed in soft subtle shade directly underneath level line */}
                <div className="mt-1 flex items-baseline gap-1 font-mono select-none px-3 py-0.5 rounded-full bg-black/35 border border-white/10 backdrop-blur-xs shadow-sm">
                  <span className="text-xs sm:text-sm font-extrabold text-white/70 tracking-tight">{hud.speed}</span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-white/40">KM/H</span>
                </div>

                {/* Upcoming Curve Warning Badge */}
                {Math.abs(hud.curveAhead || 0) > 0.35 && (
                  <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-amber-300 font-mono text-[10px] font-black tracking-wider animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)] mt-1 select-none">
                    <span className="text-xs">{(hud.curveAhead || 0) > 0 ? '⮞' : '⮜'}</span>
                    <span>{(hud.curveAhead || 0) > 0 ? 'RIGHT CURVE AHEAD' : 'LEFT CURVE AHEAD'}</span>
                  </div>
                )}
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
                  <span className="text-amber-400 text-[11px] font-mono font-bold" title="Overtakes">🚗 {hud.overtakes}</span>
                </div>

                {/* RPM bar */}
                <div className="w-48 h-1.5 bg-slate-800/70 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
                  <div className="h-full rounded-full transition-all duration-75"
                    style={{width:`${Math.round(hud.rpm*100)}%`, background:`linear-gradient(90deg, #22c55e ${hud.rpm<.6?'':','} ${hud.rpm>=.6?'#f59e0b':''} ${hud.rpm>=.85?', #ef4444':''})`}}/>
                </div>

                {/* Nitro HUD Status */}
                <button
                  onClick={triggerNitro}
                  disabled={hud.nitro < 100 || hud.nitroActive}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-lg transition-all ${
                    hud.nitroActive
                      ? 'bg-cyan-500 text-white border border-white shadow-[0_0_15px_#06b6d4]'
                      : hud.nitro >= 100
                      ? 'bg-cyan-600/90 text-white border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse active:scale-95 cursor-pointer'
                      : 'bg-black/45 border border-white/10 text-white/35 cursor-not-allowed'
                  }`}>
                  <i className="fa-solid fa-bolt text-cyan-300 text-[11px]"/>
                  <span>{hud.nitroActive ? 'BURNING' : `${hud.nitro}% NITRO`}</span>
                </button>
              </div>
            </div>

            {/* ── On-Screen Transparent Nitro Boost Button (Slightly to the side of screen center) ── */}
            <div className={`absolute pointer-events-auto z-30 select-none ${
              cameraMode === 'cockpit'
                ? 'bottom-28 right-24 sm:right-28 md:right-36'
                : 'bottom-14 sm:bottom-16 md:bottom-20 left-1/2 translate-x-10 sm:translate-x-16 md:translate-x-20'
            }`}>
              <button
                type="button"
                onClick={triggerNitro}
                disabled={hud.nitro < 100 || hud.nitroActive}
                title={hud.nitro >= 100 ? "Nitro Ready! Click or press Space" : `Recharging Boost: ${hud.nitro}%`}
                className={`relative flex flex-col items-center justify-center rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 transition-all duration-300 backdrop-blur-md select-none touch-none ${
                  hud.nitroActive
                    ? 'bg-cyan-500/80 border-2 border-white text-white shadow-[0_0_35px_rgba(6,182,212,1)] scale-105'
                    : hud.nitro >= 100
                    ? 'bg-gradient-to-tr from-cyan-500/80 via-blue-600/80 to-indigo-600/85 border-2 border-cyan-300 text-white shadow-[0_0_25px_rgba(6,182,212,0.9)] animate-pulse hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-black/35 border border-white/15 text-white/35 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center">
                  {hud.nitro >= 100 || hud.nitroActive ? (
                    <>
                      <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                      <i className={`fa-solid fa-fire-flame-curved text-2xl sm:text-3xl text-cyan-200 drop-shadow-[0_0_12px_#06b6d4] ${hud.nitroActive ? 'animate-bounce' : ''}`} />
                    </>
                  ) : (
                    <>
                      {/* Circular Progress Meter */}
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-white/10"
                          strokeWidth="3.2"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-cyan-400/70 transition-all duration-200"
                          strokeDasharray={`${hud.nitro}, 100`}
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <i className="fa-solid fa-bolt text-[11px] text-white/40 mb-0.5" />
                        <span className="text-[9px] font-mono font-bold text-white/60">{hud.nitro}%</span>
                      </div>
                    </>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase mt-0.5 font-mono ${
                  hud.nitroActive
                    ? 'text-yellow-200 drop-shadow'
                    : hud.nitro >= 100
                    ? 'text-cyan-200 drop-shadow-[0_0_6px_#06b6d4]'
                    : 'text-white/40'
                }`}>
                  {hud.nitroActive ? 'BOOSTING!' : hud.nitro >= 100 ? 'NITRO BOOST' : 'NITRO'}
                </span>
              </button>
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
                <div className="text-xl md:text-2xl font-black font-mono text-rose-400">
                  {levelTopSpeed || hud.topSpeed || Math.round(stateRef.current.maxSpeedReached || hud.speed)} KM/H
                </div>
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
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold px-5 py-3 rounded-xl cursor-pointer text-sm flex items-center justify-center gap-2">
                  <i className="fa-solid fa-house text-xs"/>
                  <span>Home</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Shattered Mirror / Broken Glass Overlay (Active on crash and frames Game Over) ── */}
        {shattered && (
          <ShatteredMirrorOverlay isGameOver={phase === 'gameover'} />
        )}

        {/* ── Rewarded Ad Playing Modal Overlay (Google Ads ready) ── */}
        {adPlaying && (
          <div className="absolute inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse">
              📺
            </div>
            <div className="inline-block bg-amber-400/20 border border-amber-400/60 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-full mb-2">
              REWARDED AD [TEST MODE]
            </div>
            <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              Watching Ad to Continue...
            </h3>
            <p className="text-slate-300 text-xs max-w-xs mb-5">
              Google Ads integration ready. Your bike will revive at current distance with a 4s shield!
            </p>

            {/* Countdown Progress Bar */}
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/20 mb-2">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700 ease-linear"
                style={{ width: `${((3 - adCountdown) / 3) * 100}%` }}
              />
            </div>
            <div className="text-amber-300 font-mono text-xs font-bold mb-4">
              Resuming in {adCountdown}s...
            </div>

            {/* Quick Skip for testing */}
            <button
              onClick={() => {
                setAdPlaying(false);
                revivePlayer();
              }}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Skip Ad & Revive Now ⏩
            </button>
          </div>
        )}

        {/* ── Game Over Screen ── */}
        {phase==='gameover' && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out]">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/55 flex items-center justify-center text-3xl mb-3 animate-bounce">💥</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-1" style={{fontFamily:'Fredoka,sans-serif'}}>CRASHED!</h2>
              <p className="text-slate-300 text-xs max-w-xs mb-5">You hit highway traffic at high speed. Keep your line and overtake cleanly.</p>
              <div className="flex justify-center gap-8 bg-slate-900/85 px-7 py-4 rounded-2xl border border-slate-700/80 mb-5 backdrop-blur-md shadow-2xl">
                {[['DISTANCE',`${hud.dist}m`,'text-amber-400'],['OVERTAKES',hud.overtakes,'text-emerald-400']].map(([l,v,cls])=>(
                  <div key={l} className="text-center min-w-[90px]">
                    <div className="text-slate-400 text-[11px] font-semibold tracking-wider">{l}</div>
                    <div className={`text-2xl md:text-3xl font-black font-mono ${cls}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={continueWithAd}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 text-black font-black px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-play text-xs"/>
                  <span>Watch Ad to Continue</span>
                  <span className="text-[10px] bg-black/35 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">AD</span>
                </button>
                <button 
                  onClick={() => restartRace(false)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-rotate-left text-xs"/>
                  <span>Restart Game</span>
                </button>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer text-sm flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-house text-xs"/>
                    <span>Home</span>
                  </button>
                )}
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
