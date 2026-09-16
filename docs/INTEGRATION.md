# Customize your game

This is a local single-player prototype called YourSpace, a working title you can change. It has no paid API requirements or account system.

## Your website and unlocks

The household computer is available in adolescence. Creator settings accepts your HTTPS website address. The local `public/website-demo.html` page works out of the box.

To connect your own website:

1. Copy `public/integrations/yourspace-bridge.js` to your site's public files.
2. Add `<script src="/yourspace-bridge.js" data-game-origin="https://YOUR-GAME-HOST"></script>` to the page players visit. Replace the origin with the exact game origin, including a port if applicable.
3. Make sure your site's framing policy permits your game origin. A site using `X-Frame-Options: DENY` or a restrictive `frame-ancestors` policy will not display inside the computer.
4. Set your actual website address in Creator settings or `config/game.json`.

The game issues a random nonce and requires a receipt from the exact embedded window and configured origin within five minutes. Receipt handling is idempotent. Opening a separate tab alone does not award the unlock. Rewards currently change room colors and unlock the creator job.

These are editable local cosmetic rewards. A player can edit their own browser save. Valuable rewards, multiplayer inventory, accounts, cross-device persistence, and purchases require a server with authenticated, single-use receipts. That server is not included.

## Where to edit

| Feature | Source |
| --- | --- |
| Game identity, website, starting money, bills | `config/game.json` |
| Seven chapters and original story choices | `components/life-sim/story.ts` |
| Jobs, needs, money, romance, health | `components/life-sim/engine.ts` |
| 3D home, WASD, prowler timing and speed | `components/life-sim/world.tsx` |
| Collision and pathfinding | `components/life-sim/navigation.ts` |
| Blueprint storage and design brief | `components/life-sim/properties.ts` |
| House designer job screen | `app/design/page.tsx` |
| Household interface and computer | `components/life-sim/life-game.tsx` |
| City-work assignment UI and tools | `public/city-work/` |
| Music sequencer and local sample loading | `components/life-sim/music-desk.tsx` |

## Current gameplay boundaries

- Seven stages use three story choices each plus activity milestones, rather than real-time birthdays. Caregivers cover bills in early life. Young adulthood requires a job and a paid shift; adulthood requires three total shifts.
- WASD movement and collision operate on the ground floor of the current house. The editor supports more floors. Town lots are saved placements with floor-plan previews and a move-in action; they are not a continuous walkable open-world neighborhood.
- A prowler warns after 45 active seconds from adolescence, spawns after another eight seconds if there is room, and chases for 24 seconds. Player speed is 2.4 m/s, running 3.8 m/s, prowler 1.55 m/s. Hits deal 12 health with two seconds between hits. Rest restores 30 health. An alarm repels the prowler once per game day; its cooldown persists in the life save. Pause, modal screens, hidden tabs, and the design editor suspend danger. Settings can disable prowlers. More enemy types and long-term difficulty balancing remain future work.
- Dating is available in young adulthood. Rowan prefers music; Jules prefers museums. Three dates and 65 connection permit a girlfriend relationship. Marriage, children, cohabitation, and deeper NPC conversations are not implemented.
- There are six job options, with one active job at a time. House designer opens the separate blank/draft studio and pays for a completed brief. City planner opens the city assignment. Other jobs use timed shifts. Client furniture is paid for by the client. Placing/moving between your saved houses is currently free.
- City Planning uses an actual compiled city engine for tile placement, funds, and map rules. The current mission is a paused planning exercise, not an ongoing full city campaign. Each new assignment starts a fresh city.
- The music desk has a 16-step sequencer, four voices, tempo control, individual volume/mute controls, and local sample loading. Patterns persist in localStorage; samples persist in IndexedDB. Pattern JSON import/export and rendered WAV export are included. Household backup files do not include the studio pattern or audio sample.
- Saves live in this browser and origin. Export life + home + blueprints from settings to back up or transfer. Import validates structure. Safe checkpoints restore life and home; blueprint storage stays independent. Multi-tab edits are last-writer-wins; keep one active gameplay tab.

This project does not include Minecraft's proprietary game code or Alter Ego's narrative text. The house editing, life choices, careers, local character memory, city work, and music are connected into this prototype; it is not a merger of every upstream game's entire feature set.
