'use client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Optional player-supplied character model. Procedural characters stay the
// default; if someone uploads their own rigged .glb/.gltf we use it for the
// player avatar instead. The upload is user-provided (never downloaded), so it
// stays true to the project's "no downloaded assets" rule.

const DB = 'yourspace-rigs';
const STORE = 'models';
const KEY = 'you';
/** localStorage mirror so the render loop can check presence synchronously. */
const FLAG = 'yourspace-custom-rig';
const MAX_BYTES = 12 * 1024 * 1024;
/** Normalised standing height in metres, matching the procedural characters. */
export const TARGET_HEIGHT = 1.72;

/** Validate an uploaded file before we ever touch it. Pure; returns an error or null. */
export function validateRigFile(file: { name: string; size: number }): string | null {
  if (!/\.(glb|gltf)$/i.test(file.name)) return 'Upload a .glb or .gltf model file.';
  if (file.size <= 0) return 'That file is empty.';
  if (file.size > MAX_BYTES) return `Model is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`;
  return null;
}

/** Scale + offset that drops a model's feet to y=0, centres x/z, and sizes it to TARGET_HEIGHT. Pure. */
export function normalizeTransform(
  size: { x: number; y: number; z: number },
  center: { x: number; y: number; z: number }
): { scale: number; offset: [number, number, number] } {
  const scale = size.y > 1e-4 ? TARGET_HEIGHT / size.y : 1;
  const footY = center.y - size.y / 2;
  return { scale, offset: [-center.x * scale, -footY * scale, -center.z * scale] };
}

export function hasCustomRig(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no storage for custom models.'));
      return;
    }
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error ?? new Error('Could not open model storage.'));
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Model storage failed.'));
      tx.oncomplete = () => db.close();
    };
  });
}

/** Persist an uploaded model. Validates, then stores its bytes in IndexedDB. */
export async function storeCustomRig(file: File): Promise<void> {
  const error = validateRigFile(file);
  if (error) throw new Error(error);
  const bytes = await file.arrayBuffer();
  await withStore('readwrite', (store) => store.put(bytes, KEY));
  try {
    localStorage.setItem(FLAG, '1');
  } catch {
    /* The IndexedDB copy is the source of truth; the flag is only a fast hint. */
  }
}

export async function clearCustomRig(): Promise<void> {
  try {
    localStorage.removeItem(FLAG);
  } catch {
    /* Ignore: clearing the model below is what actually matters. */
  }
  await withStore('readwrite', (store) => store.delete(KEY));
}

async function readCustomRig(): Promise<ArrayBuffer | null> {
  try {
    const bytes = await withStore<ArrayBuffer | undefined>('readonly', (store) => store.get(KEY));
    return bytes ?? null;
  } catch {
    return null;
  }
}

export interface LoadedRig {
  group: THREE.Group;
  update: (dt: number) => void;
  setMoving: (moving: boolean) => void;
  dispose: () => void;
}

/** Load the stored model into a normalised, shadow-casting group with optional walk/idle clips. */
export async function loadStoredRig(): Promise<LoadedRig | null> {
  const bytes = await readCustomRig();
  if (!bytes) return null;

  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const { scale, offset } = normalizeTransform(size, center);

  const group = new THREE.Group();
  model.scale.setScalar(scale);
  model.position.set(offset[0], offset[1], offset[2]);
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  group.add(model);

  // Pick idle/walk clips by name when present; otherwise the model stands still.
  const clips = gltf.animations ?? [];
  const byHint = (hint: RegExp): THREE.AnimationClip | undefined => clips.find((c) => hint.test(c.name));
  const idleClip = byHint(/idle|stand|breath/i) ?? clips[0];
  const walkClip = byHint(/walk|run|move/i) ?? idleClip;
  const mixer = clips.length > 0 ? new THREE.AnimationMixer(model) : null;
  const idle = idleClip && mixer ? mixer.clipAction(idleClip) : null;
  const walk = walkClip && mixer ? mixer.clipAction(walkClip) : null;
  let current = idle;
  idle?.play();
  if (walk && walk !== idle) walk.play().setEffectiveWeight(0);

  return {
    group,
    update: (dt) => mixer?.update(dt),
    setMoving: (moving) => {
      const next = moving ? walk : idle;
      if (!next || next === current) return;
      current?.fadeOut(0.2);
      next.reset().fadeIn(0.2).play();
      current = next;
    },
    dispose: () => {
      mixer?.stopAllAction();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mat = o.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    },
  };
}
