# Dysfunctional Family Simulator

Build a home. Raise a family. Pass down your problems.

## Story mode and the Story editor job

Open **Story → Start story mode** for six original family episodes from childhood through old age. Each has three scenes and branching endings. Four family characters have goals, fears, personal memories and reflections; a local utility planner chooses who initiates each scene. Grounded, Tender and Chaotic tones change those decisions. Dialogue responds to your choices and remembered events, with timed captions connected to the 3D speaking turns. The existing infancy and seven-stage diary remain available. No AI service or API key is required.

This is an original browser implementation inspired by Thistle Gulch's persona/context/action/director architecture. The separately distributed desktop runtime and non-commercial Python bridge are **not bundled or connected**. It uses authored dialogue and local rules rather than a live language model. Read `docs/THISTLE_GULCH_RESEARCH.md` for the research, exact scope and extension points.

**Computer → Job board → Story editor**, then **Work**, opens a question/answer/consequence assignment at the computer. Write a dilemma and two answers; explain their repercussions yourself or pass the saved draft to another reviewer. Both consequences need written explanations and a declared relationship effect. Approval pays $120 once per card, advances one hour, and adds a playable scene to your story library. Choosing an answer in that scene displays its written consequence and changes family bonds.

Each answer can also lead to a **Follow-up scene**. Approve your ending scenes first, then select them while reviewing an earlier scene. The selected branch queues after its repercussion, survives save/load, and plays before the built-in episode continues. Choosing no follow-up ends that branch. Previously played scenes are not replayed within the same life.

**Export episode** includes all linked scenes in one JSON pack. Imports validate the complete graph, reject missing/unapproved destinations and loops, reuse identical existing scenes, and keep conflicting saved versions intact. Returned approved reviews can replace a matching draft only when its title, question, author, review mode and both answers are unchanged. Imports are atomic and never award a wage.

Export/import JSON cards or episode packs to exchange drafts or finished stories with other people. The library holds 64 cards, is included in household backups, and survives starting a new character. Sharing is by file or the same device, not a hosted online community. Reviewer names are credits, not verified identities. Validation checks completeness, not the quality of the writing. The import UI accepts files up to 250 KB.

## Your middle-child family

Open **People → Your family** to choose a boy or girl character. You are the middle child between Casey (older sibling) and Riley (younger sibling), with parents Dana and Morgan. Riley joins the visible household in childhood. Relatives are present in the home and can be approached for conversation; Rowan and Jules remain unrelated friends.

Family saves include directed affection, trust and resentment between every pair of members. Spending time improves the two bonds between you and that relative. From childhood onward, each chapter has a family-pressure event selected by your boy/girl choice, with different expectations around emotion, independence, work and caregiving. Choices can win approval while increasing your resentment, or strengthen sibling trust while meeting parental resistance. Events reflect this particular family, not universal traits of boys or girls. Each chapter's decision can be made only once, including after changing the character choice; outcomes persist in family bonds and Memories. Existing saves migrate automatically, with the character choice left unset until selected.

**People → Everyone at the table** adds a playable dinner story event from childhood. Swap the five seats, inspect tension, and choose whether to include everyone or reinforce parental favoritism. Adjacent relatives affect each other's bonds. Existing resentment and proximity to a parent's favorite determine whether dinner becomes an argument; mediation can fail when tension is already high. A dinner costs $20, advances an hour, and is available once per game day with a table in the home. A remembered family moment adds context, and the result is saved in Memories.

**People → We need to talk** adds conversations with each relative from childhood. Their trust and resentment determine whether they are guarded or willing to listen. Recall a family moment, try to repair things, confront unequal treatment, or hold a grudge. A receptive parent makes an effort with both overlooked children; a guarded relative can react defensively. Each conversation advances 30 minutes, persists its consequences, and has a separate daily cooldown per relative.

Relatives now show **Settled, Feeling close, Guarded, or Resentful** labels in the 3D room. Head and brow poses, defensive arms and open conversation gestures reflect their saved bonds. Idle moods prioritize unresolved tension with any present relative; ordinary in-room conversations use their bond toward you. Walking and furniture activities retain their own arm animations. The scene review includes a **Family mood** selector to compare poses without changing your save.

**Life in the household** adds automatic family moments from childhood. After three game hours, relatives may argue over existing resentment or unequal attention, or offer one another support. Their bonds change immediately. Use the scene's **Family moment / Family argument → Respond** button or open People to mediate, take a side, join a positive moment, or give them space. Mediation depends on their trust in you; siding with one person leaves the other feeling outnumbered. Responses take 15 minutes and are remembered. One unresolved moment is retained through save/load, with no backlog after time skips; the next three-hour interval starts after your response. These moments also influence participant mood poses and later conversation recall.

Automatic moments now stage a short 3D interaction: one relative approaches the other along a furniture-aware route, they face one another and alternate speaking gestures for 18 active seconds, then return to ordinary roaming. Player conversations take priority and cause the pair to replan afterward. Pausing freezes progress; resolving the moment cancels its scene. Inaccessible pairs remain panel events instead of speaking through a wall. Scene staging does not apply relationship effects a second time. Use **Review the 3D scene → Family scene** to preview a sibling argument or supportive conversation; switch to Free roaming before replaying the same scenario.

This is an initial family system. Dinner seating and response choices still use interactive panels. The automatic scene choreography is implemented, but its rendered appearance has not been visually verified here. Gender-specific character meshes, seated family dinners, inheritance and playable next generations are not implemented yet. The original story track continues alongside these family events.

If 3D fails, expand **Graphics details** and share the browser's reported reason together with your device and browser. Startup retries without antialiasing and uses reduced resolution/shadows if that succeeds. Both the life scene and house editor now explicitly release graphics contexts when unmounted. These changes cannot enable WebGL where the browser or environment disables it.

## Visual review first

Open **Creator settings → Review the 3D scene**, or `/scene` on the local server. This displays the starter home and an adult character separately from your saved household. Compare House view and Follow me, lower or raise the walls, and select morning, afternoon, evening or night lighting. **Save scene image** exports the actual 3D canvas as PNG on a WebGL-enabled browser. If graphics initialization fails, this review screen reports that failure and does not substitute the flat floor plan. Share the exported image to guide the next visual pass. Existing save keys and the YourSpace website integration remain compatible.

Editable single-player life game prototype: seven life chapters, a 3D home, WASD movement, careers, dating, survival threats, saved house designs, a music sampler, and an in-game computer with website rewards.

## Play the included build

1. Extract the whole ZIP.
2. Install Node.js 22 or newer if you do not already have it.
3. Open a terminal in this folder and run `node serve.mjs`. On Windows you can double-click `START-GAME.bat` instead.
4. Open **http://localhost:3100** in your browser. Keep the terminal open while playing.

The `out/` folder contains the built game. It needs a local web server; opening `index.html` directly will not load its modules and native engine correctly. No npm install is required just to play the included build. Node is only needed to run the local server.

## First things to try

- Use **WASD** to walk and **Shift** to run. Drag to rotate the camera. Click furniture or use the bottom actions to eat, rest, wash, study, and work.
- Complete three story choices and two activities per chapter to grow through seven stages. For immediate access to adult jobs, choose **Creator settings → New adult sandbox**.
- Use the **Computer** to apply for a job. **House designer** opens a separate blank/draft studio when you press Work. Meet the brief and submit for $220; the design saves to your blueprint shelf.
- In **Town**, save your current home, import/export a house JSON, choose a blueprint, and place it on one of four lots. **Move into this house** loads that saved house into the 3D life scene and preserves your former home as another blueprint.
- In **People**, build friendship with Rowan or Jules. Adults can go on dates. Three dates and 65 connection allow a girlfriend relationship.
- Prowlers begin in adolescence. Watch the warning, keep moving, run, or sound your daily alarm. Rest heals 30 health. Save a checkpoint while at full health; death lets you restore it. Prowlers can be switched off in settings.
- The computer's **City Planning** app has a paid town-building assignment. The **Music studio** has a 16-step sequencer and accepts a local audio sample.
- **Visit YourSpace** opens the included demo and unlocks room styling and a creator career. See `docs/INTEGRATION.md` to connect your actual website.

## Edit the code

```sh
npm ci
npm run dev
```

Development runs at http://localhost:3000. The source is in `app/`, `components/`, `config/`, and `public/`.

```sh
npm run typecheck
npm test
node scripts/verify-city.mjs
npm run build
node serve.mjs
```

Building replaces `out/` with a fresh static game. Run commands one at a time; do not run the development server and production build simultaneously.

## Saves, status, and credits

Browser saves are local to the browser and address. Creator settings can download and import a life/home/blueprint backup. Checkpoints restore the household separately from the blueprint shelf. There is no cloud account system.

This is a prototype, not a finished open-world Sims replacement. Movement uses the current ground floor; neighborhood lots are separate saved homes. There are seven careers with one active job, two potential partners, one enemy type, and original stories. See `docs/INTEGRATION.md` for exact boundaries and customization points.

The September visual update adds articulated characters with walking/running animations, a closer perspective camera, cutaway bedroom and bathroom partitions, lighter flooring, windows, garden borders, and decorative neighboring houses. Existing saves can choose **Town → Move into updated starter home**; their current home is preserved as a blueprint.

The second visual pass adds shaped torsos, eyes and brows, fingers, articulated elbows and knees, and gestures for several activities. **House view / Follow me**, zoom buttons, and raised/lowered walls are available in the 3D scene. Daylight and warm room lighting follow the household clock. The starter home now includes a dining area, kitchen fittings, table accessories, and a desktop workstation. Its furnishings exceed the separate $8,000 client brief; design jobs still enforce that budget. Neighbor houses remain decorative. These are original procedural models, not production-quality character assets; the game does not yet match The Sims' visual finish or depth of interactions.

Settings, welcome guidance, pause behavior, backup handling, and the music desk have also been revised. The studio saves patterns, remembers imported samples using IndexedDB, and exports WAV audio. Back up the music pattern separately from the household save.

The interaction update adds **Your look** in the 3D camera toolbar (skin, hair, and clothing colors). Appearance preferences are local to the browser and are separate from household backups. Resting at a bed reclines the visible character on the mattress while preserving its safe navigation position; studying and eating show held props. Ending an activity restores the standing/walking pose. These are basic procedural activity animations; full furniture-specific interaction sets are still unfinished.

Click Rowan or Jules (or their name label) to approach and talk. **People → Spend time** uses the same interaction. Characters stop a short distance apart and face each other while chatting; the selected companion waits for the interaction to finish. Conversation paths reject spots blocked by partitions or furnishings. Dates remain menu-driven events rather than playable venue visits.

The house-management update adds blueprint renaming, **Edit a copy in studio**, shelf removal and an undo button available until leaving the Town panel. Editing preserves the previous draft under `yourspace-design-draft-before-edit`; saved and placed houses remain unchanged. The design studio shows a live client budget, floor area and list of missing or inaccessible essentials. Saving is disabled until the editor has loaded. Client submission still checks the current layout and career requirements.

Production compilation and the full 328-test suite pass, including 84 focused life-sim/persistence tests. Native city-engine assignment verification was completed in an earlier pass. The preview browser loads the interface but has WebGL disabled, so the updated 3D appearance is not visually verified here. A flat floor-plan fallback is displayed only when 3D initialization fails. A browser with WebGL support is required for the intended 3D game and house editor.

Third-party credits, source origins, and license scope are in `docs/THIRD_PARTY.md`. The combined integration is GPL-3.0-or-later with the city engine's additional terms; original MIT and Apache notices remain included. The upstream house-builder README is preserved as `docs/HOUSE-BUILDER-UPSTREAM.md`.


### Playable story catalog
At the in-game computer, open **Story editor desk → Add a playable episode**. There are 20 episodes (60 unique scenes). The original catalog includes: a broken window, murder mystery, adult dating show, drug offer, Mom’s drinking, Dad’s affair, a missing dog, a controlling cult, a DSS visit, a car breakdown, Dad’s job loss, and homelessness. The job-loss story continues into the housing story. The local library now holds 64 scenes, enough for the catalog and your own work.

Each episode offers two answers per scene, written repercussions, relationship effects and linked follow-ups. The branch preview shows where each answer leads. Dating, drug, affair, drinking, cult and murder stories unlock in adulthood; age requirements survive exports and saved games. These are authored narrative episodes affecting sibling trust and resentment. They do not yet simulate crime investigation, substances, child-welfare procedures, cars, job loss for NPCs, or physical loss of housing in the 3D world.


The turning-point expansion adds eight episodes: a non-graphic family-killing story with opportunities to step away, drug dealing and its fallout, a character living with schizophrenia and hearing voices, a school fight, an adult pregnancy/abortion story, gender transition and family boundaries, a restored car wrecked by Mom driving drunk, and a DUI story with a sober-ride alternative. The school episode unlocks in the teen stage; the other new episodes unlock in adulthood. Mental health, gender identity, and violence are separate stories. Choices do not connect schizophrenia or being transgender to violent behavior.

These episodes use the existing story-card system: the written outcomes and sibling relationship effects persist. They do not change character gender or appearance, simulate a pregnancy or abortion, kill/remove household NPCs, create an inventory of drugs, grant a car, or implement a legal/medical system. The dark ending closes its story episode, not the entire life save. The catalog remains optional, with answer/repercussion previews before playback.
