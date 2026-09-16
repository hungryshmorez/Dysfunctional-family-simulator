# Dysfunctional Family Simulator

A browser-based 3D toy where the Morose family shuffles around a low-poly house
and quietly falls apart. Built with Three.js + TypeScript + Vite. No downloaded
assets — the house, the people, and the drama are all generated in code.

**Live:** https://hungryshmorez.github.io/Dysfunctional-family-simulator/
_(enable GitHub Pages → "GitHub Actions" once, then push to `main`)_

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run test       # Playwright smoke test (asserts the canvas renders)
```

## What's here (v0)

- **Procedural house** — four rooms with floors, walls, and a prop each,
  driven by `src/world/rooms.ts` (the seam a WFC/modular generator can replace).
- **A family of four** — they wander between rooms, pause, and react.
- **Drama system** — roommates periodically have a moment (usually friction),
  which shifts moods and a private relationship score, surfaced as speech
  bubbles.
- **Click-to-inspect** — click anyone for their mood, role, and location.

## The hybrid character architecture (the point of v0)

Every family member is driven through one interface, `CharacterRig`:

| Rig             | Use                                                         |
| --------------- | ----------------------------------------------------------- |
| `ProceduralRig` | Cheap primitive humanoid with a speed-driven walk. Default. |
| `GltfRig`       | Loads a **rigged GLB** + idle/walk clips for members that need real skeletal motion. Shows a procedural placeholder until the asset loads, and falls back to it on error. |

The simulation, movement, and drama code never know which rig a character uses.
To promote someone to the "special movement" path, set a `gltfUrl` on their spec
in `src/characters/family.ts` (e.g. a Tripo/VAST-generated, auto-rigged mesh) —
nothing else changes.

## Roadmap (sequenced, not all at once)

1. **Rigged cast** — generate a few GLBs, wire them via `GltfRig`.
2. **Generated rooms** — replace the static `ROOMS` list with WFC/modular tiles.
3. **Physics** — add Rapier for doors, thrown objects, collisions.
4. **Procedural audio** — Web Audio soundscape reacting to mood/drama.

## Structure

```
src/
├── engine/      Game loop, renderer, input picking
├── world/       House geometry + room definitions
├── characters/  CharacterRig seam, procedural + GLB rigs, the family
├── sim/         Mood model + drama system
└── ui/          HUD overlay (panel, speech bubbles)
```
