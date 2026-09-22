import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { House, houseBounds } from '../world/House';
import { buildFamily } from '../characters/family';
import { Character } from '../characters/Character';
import { ProceduralRig } from '../characters/ProceduralRig';
import { makeAppearance } from '../characters/appearance';
import { DramaSystem } from '../sim/DramaSystem';
import { Picker } from './Input';
import { Hud } from '../ui/Hud';
import { CharacterCreator, type CreatorResult } from '../ui/CharacterCreator';
import { roomById } from '../world/rooms';

/** Wires renderer, scene, family, simulation, and HUD into one loop. */
export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new THREE.Clock();
  private readonly family: Character[];
  private readonly drama: DramaSystem;
  private readonly hud: Hud;
  private readonly picker: Picker;
  private readonly hudRoot: HTMLElement;
  private previewRig: ProceduralRig | null = null;
  private creator: CharacterCreator | null = null;
  private raf = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    hudRoot: HTMLElement
  ) {
    this.hudRoot = hudRoot;
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

    this.family = buildFamily();
    for (const c of this.family) {
      this.scene.add(c.object);
    }

    this.drama = new DramaSystem(this.family);
    this.hud = new Hud(hudRoot, () => this.openCreator());
    this.drama.onEvent((e) => this.hud.speak(e));

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
      if (this.previewRig) {
        this.previewRig.object.rotation.y += dt * 0.8;
        this.previewRig.update(dt, 0);
        this.previewRig.setMood(0.3);
      }
      this.drama.update(dt);
      this.controls.update();
      this.hud.update(dt, this.camera, this.canvas);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  private openCreator(): void {
    if (this.creator) return;
    const spot = roomById('living').center;
    const rig = new ProceduralRig(makeAppearance());
    rig.object.position.set(spot.x, 0, spot.y);
    this.scene.add(rig.object);
    this.previewRig = rig;
    this.creator = new CharacterCreator(this.hudRoot, rig, (r) =>
      this.onCreatorDone(r)
    );
  }

  private onCreatorDone(result: CreatorResult): void {
    const rig = this.previewRig;
    this.creator = null;
    this.previewRig = null;
    if (!rig) return;
    if (result.keep) {
      rig.object.rotation.y = 0;
      const spot = roomById('living').center;
      const character = new Character({
        id: `you-${Date.now()}`,
        name: result.name,
        role: 'You · newcomer',
        rig,
        spawn: new THREE.Vector3(spot.x, 0, spot.y),
        mood: 0.2,
      });
      this.family.push(character);
      this.hud.select(character);
    } else {
      this.scene.remove(rig.object);
      rig.dispose();
    }
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
    for (const c of this.family) c.rig.dispose();
    this.renderer.dispose();
  }
}
