import * as THREE from 'three';
import { Character } from './Character';
import { ProceduralRig } from './ProceduralRig';
import { GltfRig } from './GltfRig';
import type { CharacterRig } from './CharacterRig';
import { roomById } from '../world/rooms';

interface MemberSpec {
  id: string;
  name: string;
  role: string;
  color: number;
  scale: number;
  mood: number;
  spawnRoom: string;
  /**
   * Set to a rigged GLB URL to promote this member to the "special movement"
   * path (GltfRig). Leave undefined and they render as a procedural primitive.
   */
  gltfUrl?: string;
}

/**
 * The Morose family. Personalities seed their starting moods; the drama system
 * takes it from there. One member is wired to GltfRig to demonstrate the
 * hybrid seam — it uses a procedural placeholder until a real GLB URL is set.
 */
const FAMILY: MemberSpec[] = [
  {
    id: 'dad',
    name: 'Gary',
    role: 'Dad · avoids conflict',
    color: 0x5b7bd8,
    scale: 1.05,
    mood: -0.1,
    spawnRoom: 'living',
    // Example of the special-movement path. No asset ships in v0, so this
    // gracefully shows a placeholder; set a real URL to activate rigged motion:
    // gltfUrl: 'https://example.com/gary-rigged.glb',
  },
  {
    id: 'mom',
    name: 'Denise',
    role: 'Mom · keeps score',
    color: 0xd85b9b,
    scale: 1.0,
    mood: -0.3,
    spawnRoom: 'kitchen',
  },
  {
    id: 'teen',
    name: 'Skye',
    role: 'Teen · perpetually unimpressed',
    color: 0x8a5bd8,
    scale: 0.92,
    mood: -0.5,
    spawnRoom: 'bedroom',
  },
  {
    id: 'kid',
    name: 'Milo',
    role: 'Kid · chaos engine',
    color: 0xd8b45b,
    scale: 0.7,
    mood: 0.4,
    spawnRoom: 'study',
  },
];

export function buildFamily(): Character[] {
  return FAMILY.map((spec) => {
    const room = roomById(spec.spawnRoom);
    const spawn = new THREE.Vector3(room.center.x, 0, room.center.y);
    const rig: CharacterRig = spec.gltfUrl
      ? new GltfRig({
          url: spec.gltfUrl,
          scale: spec.scale,
          placeholderColor: spec.color,
          walkClip: 'walk',
          idleClip: 'idle',
        })
      : new ProceduralRig({ scale: spec.scale, color: spec.color });

    return new Character({
      id: spec.id,
      name: spec.name,
      role: spec.role,
      rig,
      spawn,
      mood: spec.mood,
    });
  });
}
