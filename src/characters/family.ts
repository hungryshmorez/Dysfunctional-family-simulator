import * as THREE from 'three';
import { Character } from './Character';
import { ProceduralRig } from './ProceduralRig';
import { GltfRig } from './GltfRig';
import type { CharacterRig } from './CharacterRig';
import { rosterById, type RosterEntry } from './roster';
import { roomById } from '../world/rooms';

interface FamilyMemberSpec {
  rosterId: string;
  role: string;
  mood: number;
  spawnRoom: string;
  /** Set to a rigged GLB URL to promote this member to the GltfRig path. */
  gltfUrl?: string;
}

/** The default household. Swap rosterIds to seat any of the 20 built-ins. */
const DEFAULT_FAMILY: FamilyMemberSpec[] = [
  { rosterId: 'dad-gary', role: 'Dad · avoids conflict', mood: -0.1, spawnRoom: 'living' },
  { rosterId: 'mom-denise', role: 'Mom · keeps score', mood: -0.3, spawnRoom: 'kitchen' },
  { rosterId: 'kid-skye', role: 'Teen · perpetually unimpressed', mood: -0.5, spawnRoom: 'bedroom' },
  { rosterId: 'kid-milo', role: 'Kid · chaos engine', mood: 0.4, spawnRoom: 'study' },
];

export function buildFamily(): Character[] {
  return DEFAULT_FAMILY.map((spec) => {
    const entry = rosterById(spec.rosterId);
    if (!entry) throw new Error(`Unknown roster id: ${spec.rosterId}`);
    return makeCharacter(entry, spec.role, spec.spawnRoom, spec.mood, spec.gltfUrl);
  });
}

export function makeCharacter(
  entry: RosterEntry,
  role: string,
  spawnRoom: string,
  mood = 0,
  gltfUrl?: string
): Character {
  const room = roomById(spawnRoom);
  const spawn = new THREE.Vector3(room.center.x, 0, room.center.y);
  const rig: CharacterRig = gltfUrl
    ? new GltfRig({
        url: gltfUrl,
        scale: entry.appearance.height,
        placeholderColor: entry.appearance.topColor,
        walkClip: 'walk',
        idleClip: 'idle',
      })
    : new ProceduralRig(entry.appearance);

  return new Character({ id: entry.id, name: entry.name, role, rig, spawn, mood });
}
