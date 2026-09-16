# Third-party code and source notices

This is a modified integration, not an official release or endorsement by the upstream authors. The player-facing city activity is named **City Planning**. Original source identifiers and notices remain in source/credits.

## House builder

Bassem Chagra, https://github.com/ch-bas/threejs-sims-house-builder, base commit `aa1171772eb0d2a7a4c4bf9e9383a55cdd80dfe6`.
MIT-licensed source is retained in `components/room-organizer` and associated original application infrastructure. The original root `LICENSE` is retained. Changes include scoped draft persistence, game routes, a new life simulation, navigation, and household interaction.

## Character memory

https://github.com/joonspk-research/generative_agents, Apache License 2.0, included in `docs/licenses/generative-agents-LICENSE`.
`components/life-sim/memory.ts` adapts the idea and scoring structure of weighted normalized recency, relevance, and importance into a small TypeScript implementation. Relevance uses lexical overlap rather than embeddings. It does not bundle the upstream hosted agents, paid model integrations, or Stanford demo assets.

## City engine

https://github.com/SimHacker/MicropolisCore, source snapshot `69ccf87ed72d2d2950b70cf16ef1391439bd9d48`.
Copyright (C) 1989–2007 Electronic Arts Inc.; subsequent contributors as identified in the source. GNU GPL version 3 or later, with additional Section 7 terms. Full notices are included in `docs/licenses/city-LICENSE`, `docs/licenses/city-MicropolisGPLLicenseNotice.md`, and `vendor/city-engine-source/`.

The generated JS, WASM, preloaded city data, and tile atlas are in `public/city-engine`. Engine source, makefile, and source city files are in `vendor/city-engine-source`. The custom `public/city-work` interface and assignment integration are modifications written for this game, not the original upstream interface. No Electronic Arts trademarks are used as game branding.

To rebuild the engine, install Emscripten and run `make` from `vendor/city-engine-source/packages/micropolis-engine`. Copy the generated `build/micropolisengine.js`, `.wasm`, and `.data` into `public/city-engine`. The upstream makefile's `install` target expects the upstream monorepo app layout, so use `make` and copy the outputs here. A pinned snapshot of the engine sources is supplied; the shipped prebuilt engine is upstream's generated build, not rebuilt in this environment. The tile atlas can be reused from `public/city-engine/tiles.png`.

The combined game integration is distributed under GPL-3.0-or-later with the city engine's additional notices, while original MIT/Apache files retain their own notices. The root MIT notice alone does not describe every file in this combined package. Keep the supplied source and notices with redistribution. Dependency licenses also remain applicable.

## Design inspiration only

Thistle Gulch (https://github.com/fablestudio/thistle-gulch), inspected at `f21f79d36619846219ed9d012837ed48ae9fafb3`, informed the separation of personas, context, scored actions, memories and story direction. Its Fable Studio License includes a non-commercial-use clause and its runtime is separately distributed. No upstream code, prompts, models, runtime, story text or assets are bundled. `story-director*`, `story-episodes.ts`, `story-cards.ts` and `story-workshop*` are original browser implementations and are not an upstream protocol client. See `THISTLE_GULCH_RESEARCH.md`.

Alter Ego (playalterego.com) inspired seven-stage narrative life choices. All 21 story events here are original; no Alter Ego text or proprietary code is included.

OpenJones (https://github.com/dimidd/openjones) inspired the work/bills/needs loop. No Java source is copied into this browser game; the economy is original TypeScript.

The music desk is original Web Audio code. It does not include copied Knock application source, copyrighted sample packs, or Minecraft source/assets.
