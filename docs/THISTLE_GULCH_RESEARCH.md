# Thistle Gulch research and browser story implementation

Reviewed September 16, 2026, at upstream commit `f21f79d36619846219ed9d012837ed48ae9fafb3`.

## What the upstream project actually provides

Primary sources: [repository and setup](https://github.com/fablestudio/thistle-gulch), [license](https://github.com/fablestudio/thistle-gulch/blob/main/LICENSE.txt), [runtime/bridge overview](https://github.com/fablestudio/thistle-gulch/wiki), [API](https://github.com/fablestudio/thistle-gulch/wiki/API).

Thistle Gulch separates a downloaded desktop 3D runtime from a Python bridge. The bridge uses SAGA to propose actions and conversations and supports overriding those decisions. Character/persona context, observations, individual memories, goals and action-completion messages provide a useful architecture for directed stories. The inspected Python dependency file requires Python below 3.13 and references SAGA from GitHub. This is not a JavaScript library that can be mounted in our existing Three.js canvas.

The repository's Fable Studio License adds a non-commercial-use clause. Its README describes the runtime as separately distributed under Fable Studio's EULA. We have not installed or redistributed that runtime, Python bridge, SAGA, characters, prompts or Western assets. The implementation in this game is original TypeScript using the architectural ideas, not a port or a protocol-compatible Thistle Gulch client. No Thistle Gulch dependency has been added to package.json. The upstream clone used for research is outside the game package.

Inspected source: `python/thistle_gulch/data_models.py`, `skills.py`, `api.py`, `bridge.py`, `python/pyproject.toml`, and the story directory. At the reviewed commit, the Christmas Carol `run.py` is empty; the presence of that directory should not be taken as a ready-made story campaign to import.

## Architecture mapped into this game

| Upstream concept | Implemented here | Scope |
| --- | --- | --- |
| Personas and goals | Four family personas with wants, fears, voices and temperament weights | Original household characters |
| Propose and score actions | `rankStoryActions` ranks conversations using directed trust, resentment, tone, episode focus and prior reflection | Local utility rules; not an LLM |
| Character context and observations | Participating agents remember their own scenes and choices | No automatic knowledge of another character's private memories |
| Memory retrieval | Existing recency/relevance/importance retrieval selects a participant's prior memory | Twenty memories per agent |
| Conversation generation | Four-line dialogue assembled from original episode text, prior choices, family state and actual memories | Authored templates; no model service |
| Director overrides | Six episodes, each with three scenes, branching dialogue and three possible endings | Childhood through old age; infancy retains the existing diary |
| Execute actions in the world | Existing approach/facing/turn-taking controller stages selected participants; scene captions follow speaker turns | Paths can fail; the story panel remains usable |
| Reflection | Choices update participating characters' reflections, which influence subsequent scores | Bounded rule-based reflection |
| Inspect world context | JSON story snapshot export with goals, memories, active scene and scored candidates | Original diagnostic format, not an upstream API payload |
| Share story scenarios | Story editor job creates validated story-card JSON for another person to review or play | File exchange/pass-the-device; no hosted community |

Not implemented: the original runtime connection, upstream Socket.IO protocol, live LLM generation, arbitrary generated code/actions, inventory exchange or take-to commands, cloud accounts, automatic quality judgment, voice generation, or a shared online story marketplace. These would require additional systems and, for actual upstream reuse, attention to its separate licensing terms.

## Using Story mode

Open Story and start Family Story mode. Pick Grounded, Tender or Chaotic. Each episode has an opening, development and resolution. Choices alter bonds and the next scene's dialogue. Two repair choices produce the healing ending; otherwise any escalation produces a rift, and the remaining paths end unresolved. Mixed choices therefore have predictable, testable consequences.

Daily activities move the story clock forward. The wait button advances to the next scene. Existing household moments must be resolved before a directed scene begins. Pausing Story mode preserves its open scene. A pending scene must be finished before advancing a life stage; turning Story mode off allows skipping the rest of an episode after its open scene is resolved. Older saves default to free-life mode.

## The Story editor computer job

1. Apply for Story editor in the computer's job board.
2. Choose Work to walk to the computer and open the editor, or open Story editor desk on the desktop.
3. Write a question and two distinct answers. Choose self-review or another reviewer.
4. Save the draft. Its question and answers are fixed for review.
5. Write a repercussion for each answer and choose its mechanical effect: rebuild trust, escalate conflict, or leave tension unresolved.
6. Approve the completed consequences. Approval awards $120, one shift and one creativity point, and advances one hour. It requires energy and pays once for that card ID. Generic work completion cannot pay this job.
7. Play the approved card through Story mode, or export it. Selecting an answer displays its written repercussion and applies the declared relationship effect. It does not consume a built-in episode beat.

Exported drafts let another person supply the consequences. Reviewer names are credits, not authenticated identities. Peer review requires a different name, but it does not verify who typed it. Approval validates structure and completeness, not narrative quality or whether the stated consequence is realistic. Authors should keep prose consistent with the selected mechanical effect; prose does not execute code or create arbitrary rewards.

The local library holds 24 cards and survives starting a new character. A card can be played once per life. Imports have a 250 KB UI limit and reject invalid fields or conflicting IDs. Identical scenes are reused. A returned approved review can upgrade the same draft if its question, answers, title, author and review mode are unchanged; importing it does not grant a wage. Full household backups include the library, reviews, payout IDs, played IDs, director progress and character memories.

Answers may now link to approved follow-up scenes. Authors build from endings backward and select follow-ups during consequence review. Episode exports recursively include all reachable scenes. Imports validate the complete graph before changing the library: missing/unapproved targets and loops are rejected. The selected branch is queued after a response, persists through saves, and takes priority over the built-in campaign. A branch that reaches an already-played scene ends rather than replaying rewards or effects.

## Where to extend it

Edit `story-episodes.ts` for episode goals, choices and endings; `story-director.ts` for original topic dialogue, personas and scoring; `story-director-state.ts` for persisted data and validation; `story-cards.ts` and `story-workshop.ts` for authoring/review rules. Future model-generated proposals should select only validated supported actions and preserve the current local fallback. Do not place provider secrets in the browser bundle.

The code has been tested separately from rendered appearance. The current preview environment has previously reported WebGL disabled; no visual parity with The Sims or actual Thistle Gulch runtime execution is claimed.
