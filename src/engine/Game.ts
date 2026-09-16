import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { House, houseBounds } from '../world/House';
import { Television } from '../world/Television';
import { roomById } from '../world/rooms';
import { buildFamily } from '../characters/family';
import { Character } from '../characters/Character';
import { DramaSystem } from '../sim/DramaSystem';
import { Picker } from './Input';
import { Hud } from '../ui/Hud';

/** Wires renderer, scene, family, simulation, and HUD into one loop. */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new THREE.Clock();
  private readonly family: Character[];
  private readonly drama: DramaSystem;
  private readonly tv: Television;
  private readonly hud: Hud;
  private readonly picker: Picker;
  private raf = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    hudRoot: HTMLElement
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x14121a);
    this.scene.fog = new THREE.Fog(0x14121a, 14, 30);

    const bounds = houseBounds();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(bounds.cx + 8, 9, bounds.cz + 11);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(bounds.cx, 0.5, bounds.cz);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 26;

    this.setupLights();
    this.scene.add(new House().group);

    // A Static Corp CRT against the living-room back wall. Its screen doubles
    // as a household-mood readout (see Television), so the family's conflict
    // physically shows up as broadcast static in the world.
    const living = roomById('living');
    const base = import.meta.env.BASE_URL;
    this.tv = new Television({
      position: new THREE.Vector3(living.center.x, 0, living.center.y - living.size.y + 0.45),
      facing: 0,
      broadcastUrl: `${base}static-corp/broadcast.mp4`,
      logoUrl: `${base}static-corp/static-corp-logo.png`,
    });
    this.scene.add(this.tv.group);

    this.family = buildFamily();
    for (const c of this.family) {
      this.scene.add(c.object);
    }

    this.drama = new DramaSystem(this.family);
    this.hud = new Hud(hudRoot);
    this.drama.onEvent((e) => {
      this.hud.speak(e);
      this.tv.reactTo(e);
    });

    this.picker = new Picker(
      canvas,
      this.camera,
      this.family,
      (c) => this.hud.select(c)
    );

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb8c0ff, 0x2b2735, 0.7));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.1);
    key.position.set(6, 12, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    this.scene.add(key);
  }

  start(): void {
    const loop = (): void => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      for (const c of this.family) c.update(dt);
      this.drama.update(dt);
      this.tv.update(dt);
      this.controls.update();
      this.hud.update(dt, this.camera, this.canvas);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.picker.dispose();
    this.controls.dispose();
    this.tv.dispose();
    for (const c of this.family) c.rig.dispose();
    this.renderer.dispose();
  }
}
