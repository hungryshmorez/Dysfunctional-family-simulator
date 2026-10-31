'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseAppearance } from '@/components/life-sim/appearance';
import { animateCharacter, createCharacter } from '@/components/life-sim/character';
import { startGraphics } from '@/components/life-sim/graphics';
import { nameplate } from '@/components/life-sim/nameplate';
import { disposeObject } from '@/components/room-organizer/three/builder-utils';
import { buildPark, TRAILER, type TrailerSpec } from './park-data';

interface Rect { x0: number; x1: number; z0: number; z1: number }
interface TrailerRuntime {
  spec: TrailerSpec;
  walls: Rect[];
  doorPos: { x: number; z: number };
  barrier: Rect | null;
  door: THREE.Mesh;
  roofs: THREE.Object3D[];
  welcoming: number;
  locked: boolean;
}
interface Near { id: number; locked: boolean; isPlayer: boolean; household: string }

const PLAYER_R = 0.34;

export function ParkWorld(): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [mode, setMode] = useState<'fp' | 'tp'>('fp');
  const [near, setNear] = useState<Near | null>(null);
  const [message, setMessage] = useState('You live at lot 3. Drag to look, WASD or the pad to walk. Your neighbors keep to themselves.');
  const modeRef = useRef(mode); modeRef.current = mode;
  const moveRef = useRef('');
  const sprintRef = useRef(false);
  const knockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (fallback || !host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer; let reducedQuality = false;
    try { const g = startGraphics(); renderer = g.renderer; reducedQuality = g.reducedQuality; }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(reducedQuality ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !reducedQuality; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#3c3d49');
    scene.fog = new THREE.Fog('#34343f', 42, 110);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 260);
    camera.rotation.order = 'YXZ';

    const sky = new THREE.HemisphereLight('#9aa0b0', '#2a2620', 2.2); scene.add(sky);
    scene.add(new THREE.AmbientLight('#565668', 0.55));
    const sun = new THREE.DirectionalLight('#e4d3ad', 1.7);
    sun.position.set(10, 34, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45; sun.shadow.camera.far = 90; sun.shadow.normalBias = 0.04;
    scene.add(sun);

    const park = buildPark();
    // Ground (dirt) + road down the middle.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#3b3a30', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(park.road.halfWidth * 2, park.road.zMax - park.road.zMin + 14), new THREE.MeshStandardMaterial({ color: '#2b2a2c', roughness: 1 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 0); road.receiveShadow = true; scene.add(road);
    for (let z = park.road.zMin; z <= park.road.zMax; z += 4) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.6), new THREE.MeshStandardMaterial({ color: '#b7a85a', roughness: 1 }));
      dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, z); scene.add(dash);
    }

    const trailers: TrailerRuntime[] = [];
    const hx = TRAILER.width / 2, hz = TRAILER.length / 2, t = TRAILER.wall, H = TRAILER.height, dh = TRAILER.door / 2;
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, cast = true): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m;
    };
    for (const spec of park.trailers) {
      const { x, z, side } = spec;
      const body = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.9 });
      const trim = new THREE.MeshStandardMaterial({ color: '#2e2b28', roughness: 1 });
      const faceSign = side === 'left' ? 1 : -1;          // +X for left trailers, -X for right
      const xFace = x + faceSign * hx;
      const walls: Rect[] = [];
      // Floor + skirting
      addBox(TRAILER.width, 0.3, TRAILER.length, x, 0.15, z, trim, false);
      addBox(TRAILER.width + 0.1, 0.9, TRAILER.length + 0.1, x, 0.45, z, new THREE.MeshStandardMaterial({ color: '#201d1b', roughness: 1 }), false);
      // Back long wall (away from the road)
      const xBack = x - faceSign * hx;
      addBox(t, H, TRAILER.length, xBack, H / 2 + 0.3, z, body);
      walls.push({ x0: xBack - t / 2, x1: xBack + t / 2, z0: z - hz, z1: z + hz });
      // Short end walls
      for (const sz of [z - hz, z + hz]) {
        addBox(TRAILER.width, H, t, x, H / 2 + 0.3, sz, body);
        walls.push({ x0: x - hx, x1: x + hx, z0: sz - t / 2, z1: sz + t / 2 });
      }
      // Front long wall (road side) with a door gap
      const segLen = hz - dh;
      for (const dir of [-1, 1]) {
        const segZ = z + dir * (dh + segLen / 2);
        addBox(t, H, segLen, xFace, H / 2 + 0.3, segZ, body);
        walls.push({ x0: xFace - t / 2, x1: xFace + t / 2, z0: segZ - segLen / 2, z1: segZ + segLen / 2 });
      }
      // Roof (hidden in third-person so you can see in from above)
      const roof = addBox(TRAILER.width + 0.4, 0.22, TRAILER.length + 0.4, x, H + 0.42, z, new THREE.MeshStandardMaterial({ color: '#43403a', roughness: 1 }));
      // Windows
      for (const wz of [z - hz * 0.5, z + hz * 0.5]) {
        const win = addBox(t + 0.02, 0.7, 0.9, xFace, 1.5, wz, new THREE.MeshStandardMaterial({ color: '#d8c98a', emissive: '#6b5d2a', emissiveIntensity: 0.5, roughness: 0.6 }), false);
        win.castShadow = false;
      }
      // Steps / stoop at the door
      addBox(1.1, 0.18, 0.8, xFace + faceSign * 0.5, 0.18, z, trim, false);
      addBox(1.3, 0.1, 1.0, xFace + faceSign * 0.9, 0.08, z, trim, false);
      // Door panel (also the lock barrier when closed)
      const doorMat = new THREE.MeshStandardMaterial({ color: spec.isPlayer ? '#2ce6dd' : '#3a332e', emissive: spec.isPlayer ? '#145f5b' : '#000000', emissiveIntensity: spec.isPlayer ? 0.4 : 0, roughness: 0.8 });
      const door = addBox(t + 0.06, H - 0.4, TRAILER.door, xFace, (H - 0.4) / 2 + 0.3, z, doorMat, false);
      const barrier: Rect = { x0: xFace - t / 2, x1: xFace + t / 2, z0: z - dh, z1: z + dh };
      // Household sign
      const label = nameplate(spec.isPlayer ? 'YOUR LOT' : spec.household);
      label.position.set(xFace + faceSign * 0.1, H + 0.9, z); scene.add(label);

      const rt: TrailerRuntime = {
        spec, walls, doorPos: { x: xFace + faceSign * 0.6, z }, barrier, door, roofs: [roof],
        welcoming: spec.isPlayer ? 1 : 0.25 + (spec.id % 3) * 0.22, locked: spec.locked,
      };
      if (!spec.locked) { rt.door.rotation.y = faceSign * 1.1; } // player's door stands open
      trailers.push(rt);
    }

    // People — each loiters in their yard.
    const npcGroups = park.npcs.map((n) => {
      const m = createCharacter(n.name, n.color); m.position.set(n.home.x, 0, n.home.z);
      m.add(nameplate(n.name)); scene.add(m);
      return { m, home: n.home, target: { ...n.home }, wait: Math.random() * 4, phase: Math.random() * 6 };
    });

    // Player
    let look: string | import('@/components/life-sim/appearance').Appearance = '#d8a14c';
    try { const saved = parseAppearance(JSON.parse(localStorage.getItem('yourspace-appearance') ?? 'null')); if (saved) look = saved; } catch { /* default look */ }
    const player = createCharacter('You', look); scene.add(player);
    // Spawn on the road, mid-park, looking down it so the rows of trailers read.
    player.position.set(0, 0, 0);
    let yaw = Math.PI, pitch = -0.05;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.1; controls.minDistance = 3; controls.maxDistance = 22;
    controls.target.set(player.position.x, 1, player.position.z);
    camera.position.set(player.position.x + 5, 6, player.position.z + 7);

    const blocked = (nx: number, nz: number): boolean => {
      if (Math.abs(nx) > 24 || nz < park.road.zMin - 8 || nz > park.road.zMax + 8) return true;
      for (const r of trailers) {
        for (const w of r.walls) if (nx > w.x0 - PLAYER_R && nx < w.x1 + PLAYER_R && nz > w.z0 - PLAYER_R && nz < w.z1 + PLAYER_R) return true;
        if (r.locked && r.barrier) { const w = r.barrier; if (nx > w.x0 - PLAYER_R && nx < w.x1 + PLAYER_R && nz > w.z0 - PLAYER_R && nz < w.z1 + PLAYER_R) return true; }
      }
      return false;
    };

    // Knock handler exposed to React.
    knockRef.current = () => {
      const p = player.position;
      const rt = trailers.filter((r) => r.locked).sort((a, b) => Math.hypot(a.doorPos.x - p.x, a.doorPos.z - p.z) - Math.hypot(b.doorPos.x - p.x, b.doorPos.z - p.z))[0];
      if (!rt || Math.hypot(rt.doorPos.x - p.x, rt.doorPos.z - p.z) > 2.6) { setMessage('Stand at a door to knock.'); return; }
      if (Math.random() < rt.welcoming) {
        rt.locked = false;
        rt.door.rotation.y = (rt.spec.side === 'left' ? 1 : -1) * 1.1;
        setMessage(`${rt.spec.household[0]!.toUpperCase()}${rt.spec.household.slice(1)} let you in. The door's open.`);
      } else {
        setMessage(`You knock at ${rt.spec.household}'s. Nothing — or a shout to clear off.`);
      }
    };

    const keys = new Set<string>();
    const kd = (e: KeyboardEvent) => { if (['w', 'a', 's', 'd', 'shift'].includes(e.key.toLowerCase())) { keys.add(e.key.toLowerCase()); } };
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

    // First-person drag-look.
    let dragging = false, lastX = 0, lastY = 0;
    const down = (e: PointerEvent) => { if (modeRef.current === 'fp') { dragging = true; lastX = e.clientX; lastY = e.clientY; } };
    const movePtr = (e: PointerEvent) => {
      if (!dragging || modeRef.current !== 'fp') return;
      yaw -= (e.clientX - lastX) * 0.005; pitch -= (e.clientY - lastY) * 0.005;
      pitch = Math.max(-1.2, Math.min(0.6, pitch)); lastX = e.clientX; lastY = e.clientY;
    };
    const up = () => { dragging = false; };
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', movePtr); window.addEventListener('pointerup', up);

    let raf = 0, last = performance.now(), phase = 0, prevNear = -2, lastMode = modeRef.current;
    const prev = new THREE.Vector3().copy(player.position);
    function frame() {
      raf = requestAnimationFrame(frame);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; phase += dt;
      const fp = modeRef.current === 'fp';
      if (lastMode !== modeRef.current) {
        lastMode = modeRef.current; controls.enabled = !fp;
        for (const r of trailers) for (const roof of r.roofs) roof.visible = fp;
        player.userData.body.visible = !fp;
        if (!fp) {
          // Drop into an overhead chase offset from the player.
          camera.position.set(player.position.x + 6, 8, player.position.z + 9);
          controls.target.set(player.position.x, 1, player.position.z); controls.update();
        }
      }
      // Movement
      const held = (k: string) => keys.has(k) || moveRef.current === k;
      const f = Number(held('w')) - Number(held('s')), s = Number(held('d')) - Number(held('a'));
      let moving = false;
      if (f || s) {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        const dir = right.multiplyScalar(s).add(fwd.multiplyScalar(f)); if (dir.lengthSq() > 0) dir.normalize();
        const speed = dt * (keys.has('shift') || sprintRef.current ? 4.6 : 2.7);
        const nx = player.position.x + dir.x * speed, nz = player.position.z + dir.z * speed;
        if (!blocked(nx, player.position.z)) player.position.x = nx;
        if (!blocked(player.position.x, nz)) player.position.z = nz;
        player.rotation.y = Math.atan2(dir.x, dir.z); moving = true;
      }
      if (fp) player.rotation.y = yaw;
      animateCharacter(player, phase, moving, keys.has('shift') || sprintRef.current);

      // People wander in their yards.
      for (const g of npcGroups) {
        g.wait -= dt;
        if (g.wait <= 0) { g.wait = 2 + Math.random() * 4; g.target = { x: g.home.x + (Math.random() - 0.5) * 2.4, z: g.home.z + (Math.random() - 0.5) * 2.4 }; }
        const dx = g.target.x - g.m.position.x, dz = g.target.z - g.m.position.z, d = Math.hypot(dx, dz);
        const walk = d > 0.12;
        if (walk) { const st = dt * 0.7; g.m.position.x += dx / d * st; g.m.position.z += dz / d * st; g.m.rotation.y = Math.atan2(dx, dz); }
        animateCharacter(g.m, g.phase + phase, walk);
      }

      // Cameras
      if (fp) {
        camera.position.set(player.position.x, 1.62, player.position.z);
        camera.rotation.set(pitch, yaw, 0);
      } else {
        const delta = player.position.clone().sub(prev);
        camera.position.add(delta); controls.target.set(player.position.x, 1, player.position.z); controls.update();
      }
      prev.copy(player.position);

      // Nearest door prompt (throttled to state changes).
      const p = player.position; let best: TrailerRuntime | null = null, bestD = 2.6;
      for (const r of trailers) { const dd = Math.hypot(r.doorPos.x - p.x, r.doorPos.z - p.z); if (dd < bestD) { bestD = dd; best = r; } }
      const key = best ? best.spec.id : -1;
      if (key !== prevNear) {
        prevNear = key;
        setNear(best ? { id: best.spec.id, locked: best.locked, isPlayer: best.spec.isPlayer, household: best.spec.household } : null);
      }

      renderer.render(scene, camera);
    }
    frame();

    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      renderer.domElement.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', movePtr); window.removeEventListener('pointerup', up);
      controls.dispose(); disposeObject(scene); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [fallback]);

  const knockable = near && near.locked;
  return (
    <main className="park-app">
      {fallback
        ? <div className="park-fallback"><b>3D unavailable</b><span>This browser can’t start WebGL. Try another browser.</span></div>
        : <div className="park-scene" ref={host} aria-label="Trailer park. Drag to look, WASD or the pad to walk." />}
      <header className="park-head">
        <div><strong>TRAILER PARK</strong><small>PASS DOWN YOUR PROBLEMS · LOT 3</small></div>
        <Link className="park-exit" href="/">↩ Family game</Link>
      </header>
      <button className="park-cam" onClick={() => setMode((m) => (m === 'fp' ? 'tp' : 'fp'))}>{mode === 'fp' ? '↳ Overhead view' : '↳ First person'}</button>
      <div className="park-hud">
        {near && (near.isPlayer
          ? <span className="park-tag home">Your trailer — walk on in</span>
          : near.locked
            ? <span className="park-tag locked">{near.household.charAt(0).toUpperCase() + near.household.slice(1)}’s — locked</span>
            : <span className="park-tag open">{near.household.charAt(0).toUpperCase() + near.household.slice(1)}’s — open</span>)}
        <span className="park-msg">{message}</span>
        {knockable && <button className="park-knock" onClick={() => knockRef.current?.()}>Knock</button>}
      </div>
      <div className="park-pad" aria-label="Move">
        {[['w', '↑'], ['a', '←'], ['s', '↓'], ['d', '→']].map(([k, label]) => (
          <button key={k} className={`pad-${k}`} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveRef.current = k!; }} onPointerUp={() => { moveRef.current = ''; }} onPointerCancel={() => { moveRef.current = ''; }}>{label}</button>
        ))}
        <button className="pad-run" aria-pressed={false} onClick={(e) => { sprintRef.current = !sprintRef.current; e.currentTarget.setAttribute('aria-pressed', String(sprintRef.current)); }}>Run</button>
      </div>
    </main>
  );
}
