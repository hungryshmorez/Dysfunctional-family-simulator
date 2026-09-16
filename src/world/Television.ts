import * as THREE from 'three';
import type { DramaEvent } from '../sim/DramaSystem';

export interface TelevisionOptions {
  /** Where the TV stand sits on the floor plane. */
  position: THREE.Vector3;
  /** Facing rotation around Y, in radians. 0 = screen faces +Z. */
  facing?: number;
  /** Public path to the looping broadcast clip (respect Vite BASE_URL). */
  broadcastUrl: string;
  /** Public path to the channel-bug logo shown while the signal is clean. */
  logoUrl: string;
}

const SCREEN_W = 256;
const SCREEN_H = 192;
/** Repaint the screen texture at ~15fps instead of every frame. */
const REPAINT_INTERVAL = 1 / 15;

/**
 * A Static Corp CRT television — set dressing that doubles as a readout of the
 * household mood. The screen composites the broadcast clip with procedural
 * static: as conflict mounts the picture dissolves into noise (the "Static" in
 * Static Corp), and warm moments clear the signal again.
 *
 * The TV consumes {@link DramaEvent}s via {@link reactTo} rather than depending
 * on the DramaSystem directly, so it stays a passive sink the Game wires up.
 */
export class Television {
  readonly group = new THREE.Group();

  /** 1 = clean broadcast, 0 = pure static. */
  private signal = 0.85;
  private repaintTimer = 0;

  private readonly video: HTMLVideoElement;
  private readonly videoReady: () => boolean;
  private readonly screenCanvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly noiseCanvas: HTMLCanvasElement;
  private readonly noiseCtx: CanvasRenderingContext2D;
  private readonly noiseImage: ImageData;
  private readonly texture: THREE.CanvasTexture;
  private readonly screenMaterial: THREE.MeshBasicMaterial;
  private readonly screenLight: THREE.PointLight;
  private readonly logo: HTMLImageElement;
  private logoLoaded = false;
  private scanline = 0;

  constructor(opts: TelevisionOptions) {
    this.group.position.copy(opts.position);
    this.group.rotation.y = opts.facing ?? 0;

    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = SCREEN_W;
    this.screenCanvas.height = SCREEN_H;
    this.ctx = get2d(this.screenCanvas);

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = SCREEN_W;
    this.noiseCanvas.height = SCREEN_H;
    this.noiseCtx = get2d(this.noiseCanvas);
    this.noiseImage = this.noiseCtx.createImageData(SCREEN_W, SCREEN_H);

    this.video = document.createElement('video');
    this.video.src = opts.broadcastUrl;
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.crossOrigin = 'anonymous';
    this.video.dataset.role = 'television-broadcast';
    // Kept in the DOM (hidden) rather than fully detached: some browsers only
    // reliably decode/advance a connected <video>, and it stays inspectable.
    this.video.style.display = 'none';
    document.body.appendChild(this.video);
    // Autoplay is only permitted while muted; swallow the rejection so a
    // blocked play never surfaces as an unhandled rejection in the console.
    this.video.play().catch(() => undefined);
    this.videoReady = (): boolean => this.video.readyState >= 2;

    this.logo = new Image();
    this.logo.onload = (): void => {
      this.logoLoaded = true;
    };
    this.logo.src = opts.logoUrl;

    this.texture = new THREE.CanvasTexture(this.screenCanvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.paint(); // seed one frame so the screen is never blank

    this.screenMaterial = new THREE.MeshBasicMaterial({ map: this.texture });
    this.screenLight = new THREE.PointLight(0x88bbff, 0.6, 4, 2);

    this.build();
  }

  /** Nudge the signal from a drama beat. Conflict adds static; warmth clears it. */
  reactTo(event: DramaEvent): void {
    this.signal = clamp01(this.signal + event.tone * 0.45);
  }

  update(dt: number): void {
    // Drift gently back toward a watchable-but-imperfect picture.
    this.signal += (0.8 - this.signal) * Math.min(1, dt * 0.15);

    this.repaintTimer -= dt;
    if (this.repaintTimer > 0) return;
    this.repaintTimer = REPAINT_INTERVAL;
    this.paint();

    // The room glow tracks the picture: a clean broadcast is calm blue, heavy
    // static burns brighter and colder.
    this.screenLight.intensity = 0.35 + (1 - this.signal) * 0.5;
  }

  dispose(): void {
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.video.remove();
    this.texture.dispose();
    this.screenMaterial.dispose();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }

  private build(): void {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2620,
      roughness: 0.6,
      metalness: 0.1,
    });
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1a1720,
      roughness: 0.9,
    });

    // Stand.
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), standMat);
    stand.position.set(0, 0.35, 0);
    stand.castShadow = true;
    stand.receiveShadow = true;
    this.group.add(stand);

    // CRT body.
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.9), bodyMat);
    body.position.set(0, 1.2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // Screen, inset slightly proud of the front face (+Z).
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.76),
      this.screenMaterial
    );
    screen.position.set(0, 1.24, 0.46);
    this.group.add(screen);

    // A thin bezel frame around the screen for a little depth.
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 0.88, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0e0c12, roughness: 0.8 })
    );
    bezel.position.set(0, 1.24, 0.43);
    this.group.add(bezel);

    this.screenLight.position.set(0, 1.24, 0.9);
    this.group.add(this.screenLight);
  }

  private paint(): void {
    const ctx = this.ctx;

    // Base layer: the broadcast if it has decoded a frame, else deep CRT black.
    if (this.videoReady()) {
      drawCover(ctx, this.video, SCREEN_W, SCREEN_H);
    } else {
      ctx.fillStyle = '#050608';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }

    // Channel bug while the signal is mostly clean.
    if (this.logoLoaded && this.signal > 0.55) {
      const bw = 46;
      const bh = (this.logo.height / this.logo.width) * bw || bw;
      ctx.globalAlpha = 0.85 * this.signal;
      ctx.drawImage(this.logo, SCREEN_W - bw - 8, 8, bw, bh);
      ctx.globalAlpha = 1;
    }

    // Static overlay, opacity driven by how degraded the signal is.
    const noiseAlpha = 1 - this.signal;
    if (noiseAlpha > 0.02) {
      this.renderNoise();
      ctx.globalAlpha = noiseAlpha;
      ctx.drawImage(this.noiseCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }

    // A rolling scanline band sells the CRT even on a clean picture.
    this.scanline = (this.scanline + 7) % SCREEN_H;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, this.scanline, SCREEN_W, 3);

    this.texture.needsUpdate = true;
  }

  private renderNoise(): void {
    const data = this.noiseImage.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    this.noiseCtx.putImageData(this.noiseImage, 0, 0);
  }
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable for the television screen');
  }
  return ctx;
}

/** Draw a source image/video to fill the target, cover-style (no distortion). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource & { videoWidth?: number; videoHeight?: number },
  w: number,
  h: number
): void {
  const sw = src.videoWidth ?? w;
  const sh = src.videoHeight ?? h;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
