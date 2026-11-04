# Original Gameplay Direction and Source Audit

Status: design and implementation audit  
Scope: Shade Tiles: Rush and Circuit Breaker  
Branch: `feat/original-gameplay-direction`

This document records what is actually present in the current game engines, distinguishes genre conventions from Arena-specific combinations, and sets the bar for new mechanics. It is not a claim of worldwide uniqueness or legal clearance.

## 1. Shade Tiles: Rush

### Current implemented loop

The current engine is an 8×8 deterministic match-and-clear game with six tile colours. Players swap adjacent tiles; only swaps that produce a match or a valid special-tile combination are accepted. The engine resolves gravity/refill and cascades, awards score, tracks accepted moves and invalid attempts, and creates line, burst and prism specials from larger match groups.

Special combinations have distinct effects, including full-board clearing for prism + prism, row/column effects, area effects and colour-based effects. A seeded PRNG makes boards and replay verification deterministic. Ranked runs are capped at 30 accepted moves.

The mobile client currently adds:
- Practice, Target Rush, Chain Hunt and daily-objective formats.
- Device-local personal bests, lifetime moves, daily records and achievements.
- Cosmetic themes, haptics, sound and reduced-motion support.

### Originality assessment

Match-three swapping, gravity, cascades, special pieces and move-limited scoring are established puzzle conventions. These foundations alone do not make the game distinctive. The six-colour presentation and renamed special pieces are not sufficient originality claims.

Arena-owned implementation already includes a deterministic engine, its own special-combination rules, replay contract, seeded daily challenges, and the current mix of practice objectives. Those are implementation facts, not proof that no similar mechanic exists elsewhere.

### Required next gameplay layer

Before treating the game as a finished original product, add a signature system that changes decisions rather than merely adding more tile art or score multipliers. The chosen system must:

1. Be visible in the board state, not hidden in promotional copy.
2. Create meaningful trade-offs between an immediate clear and a later setup.
3. Be deterministic from the run seed and represented in replay data.
4. Be teachable in one short in-game explanation.
5. Have dedicated engine tests for edge cases, replay determinism and scoring.
6. Be optional in casual play only if its absence does not make the core game feel unfinished.

Do not add a new special tile merely to increase the count. A new tile must interact with the board in a way that changes planning and has a clear counterplay.

## 2. Circuit Breaker

### Current implemented loop

The campaign engine generates seeded 5×5 source-to-target wiring puzzles. Players rotate wire tiles. The generator creates a self-avoiding route with detours and decoy ends, then scrambles route tiles. Later levels add:
- Fixed blockers.
- A route switch that must be activated.
- Ordered checkpoints that latch as power reaches them.
- Powered side branches that must also connect.
- Fixed crossover bridges whose horizontal and vertical channels remain electrically isolated.

The separate 7×7 multi-network generator creates two to four independently owned source-to-target routes. Each network has its own allowed cells and connectivity evaluation so a route cannot borrow another network's path.

### Originality assessment

Pipe rotation and wire-connection puzzles are established genres. A plain rotate-the-pipes game would not be distinctive. The more specific combination currently implemented is the chapter progression from route detours to switch activation, ordered checkpoint latching, mandatory branch power, isolated bridge channels and independently owned multi-network routing.

The combination is a stronger Arena identity, but it still needs playtesting and external market comparison. Do not copy other games' board layouts, level order, puzzle scripts, UI composition, sound, effects, iconography, writing or code.

### Required next gameplay layer

Develop campaign chapters around electrical objectives rather than simply increasing route length:
1. **Commissioning:** learn source, target and safe routing.
2. **Control:** route through switches with deliberate activation timing.
3. **Sequencing:** secure ordered checkpoints, not just any connected path.
4. **Distribution:** power required branch terminals while preserving the main route.
5. **Isolation:** route through bridge cells without cross-connecting channels.
6. **Grid coordination:** solve multiple networks without cell ownership collisions.

Each chapter needs a distinct visual language, short objective statement, generated puzzle constraints, and tests proving the generator always produces a solvable board. Do not introduce time pressure as a substitute for puzzle depth.

## 3. Shared originality and provenance rules

- Write all engine code and game-specific content for Arena, or record a licence that explicitly permits the intended use.
- Keep a provenance record for every external font, sound, image, icon set, animation or code dependency.
- Do not trace or recreate another game's distinctive characters, boards, level sequence, interface, sound identity or marketing art.
- Use original names and visual assets; run a separate name/trademark search before public launch. A name being present in code is not clearance.
- Keep game rules versioned. Any rule change affecting replay outcomes must update the rules version and verifier tests.
- Preserve offline play. Network services must not become necessary for a local practice run.
- Add deterministic seed coverage, malformed-input tests, solvability checks and regression fixtures for every new mechanic.
- Record design decisions and rejected alternatives so later contributors do not accidentally drift into a clone.

## 4. Release gate for every new Arena game

A game is not accepted into Arena until it has:
- A one-sentence identity that describes its actual player decisions.
- At least one signature mechanic beyond genre basics.
- Original rules, level-generation logic, progression and presentation.
- A documented asset/code provenance trail.
- A small competitor comparison against the closest games.
- A deterministic test suite where determinism is relevant.
- Accessibility, offline and fair-play checks.
- A review for names and visual assets before public promotion.

## 5. Honest limits

A source audit can identify what our code does and can prevent intentional copying. It cannot establish that a mechanic is globally unprecedented, that no similar game exists, or that a title is legally available. Those questions require current competitor research and appropriate IP/trademark advice. No game in this repository should be advertised as legally cleared or globally unique based on this document.
