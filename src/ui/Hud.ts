import * as THREE from 'three';
import type { Character } from '../characters/Character';
import type { DramaEvent } from '../sim/DramaSystem';

interface ActiveBubble {
  el: HTMLDivElement;
  character: Character;
  ttl: number;
}

/** DOM overlay: title, selected-character panel, and floating speech bubbles. */
export class Hud {
  private readonly root: HTMLElement;
  private readonly panel: HTMLDivElement;
  private readonly bubbles: ActiveBubble[] = [];
  private selected: Character | null = null;
  private readonly projected = new THREE.Vector3();

  constructor(root: HTMLElement, onCreate: () => void) {
    this.root = root;
    this.root.innerHTML = `
      <div class="hud-title">Dysfunctional Family Simulator
        <small>The Morose family, at home. Click anyone.</small>
      </div>
      <div class="hint">Drag to orbit · scroll to zoom</div>
    `;

    const createBtn = document.createElement('button');
    createBtn.className = 'create-btn';
    createBtn.textContent = '＋ Create a character';
    createBtn.addEventListener('click', onCreate);
    this.root.appendChild(createBtn);

    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    this.panel.style.display = 'none';
    this.root.appendChild(this.panel);
  }

  select(character: Character | null): void {
    this.selected = character;
    this.panel.style.display = character ? 'block' : 'none';
  }

  speak(event: DramaEvent): void {
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = event.line;
    el.style.borderColor =
      event.tone < 0 ? 'rgba(216,91,91,0.6)' : 'rgba(91,216,140,0.6)';
    this.root.appendChild(el);
    this.bubbles.push({ el, character: event.speaker, ttl: 3.2 });
  }

  update(dt: number, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.ttl -= dt;
      if (b.ttl <= 0) {
        b.el.remove();
        this.bubbles.splice(i, 1);
        continue;
      }
      this.placeAtHead(b.el, b.character, camera, rect);
      b.el.style.opacity = String(Math.min(1, b.ttl));
    }

    if (this.selected) {
      this.renderPanel(this.selected);
    }
  }

  private placeAtHead(
    el: HTMLElement,
    character: Character,
    camera: THREE.Camera,
    rect: DOMRect
  ): void {
    this.projected.copy(character.position);
    this.projected.y += character.rig.height + 0.35;
    this.projected.project(camera);
    const x = (this.projected.x * 0.5 + 0.5) * rect.width;
    const y = (-this.projected.y * 0.5 + 0.5) * rect.height;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.display = this.projected.z < 1 ? 'block' : 'none';
  }

  private renderPanel(c: Character): void {
    const pct = ((c.mood.valence + 1) / 2) * 100;
    this.panel.innerHTML = `
      <h2>${c.name}</h2>
      <div class="row"><span>${c.role}</span></div>
      <div class="row"><span>Mood</span><span>${c.mood.label}</span></div>
      <div class="meter"><span style="width:${pct.toFixed(
        0
      )}%;background:${c.mood.color}"></span></div>
      <div class="row"><span>Currently in</span><span>${c.room.name}</span></div>
    `;
  }
}
