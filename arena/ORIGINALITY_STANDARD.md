# Arena game originality standard

Status: design and implementation guardrails, not a legal clearance certificate.

Last reviewed: 2026-11-04

## Non-negotiable rule

Every Arena game must be an independently authored game, not a reskin, clone, or close imitation of a named commercial game. Familiar genres and abstract mechanics can be starting points, but Arena's actual rules, combinations, level construction, progression, art, audio, writing, UI, code and identity must be independently created.

No game is approved for public release merely because its name, colours or sprites have been changed.

## Current games: originality review

### Shade Tiles: Rush

Current implementation evidence:
- It is a deterministic grid-based tile puzzle with a replayable seeded board and a fixed 30-move ranked run.
- The server imports the shared engine and recomputes results rather than trusting a client score.
- Its public presentation uses the Shade Tiles: Rush name and Arena visual system.

Originality assessment:
- Grid tile matching, swaps, cascades and move-limited puzzle play are established genre conventions. Their presence alone does not make this game original.
- The implementation must establish its own rule interactions, board generation, scoring, progression, challenge formats, feedback, visual language and level content.
- Do not copy another game's board layouts, level scripts, icons, sound effects, animation timing, UI composition, text, source code or distinctive combination of mechanics.
- Keep a written record of the original rules and the reason each special mechanic exists. Add tests for the rules rather than reproducing another game's expected outputs.

Release gate:
- Complete a side-by-side market review of the closest tile puzzle games.
- Identify and remove any unusually close combination of mechanics, progression, presentation or terminology.
- Verify all assets are original, properly licensed, or documented as public-domain assets.
- Run name and trademark clearance for Shade Tiles: Rush in intended launch markets.

### Circuit Breaker

Current implementation evidence:
- Its campaign uses seeded 5x5 wire-routing boards with fixed endpoints, blockers, switches, ordered checkpoints, powered side branches and isolated crossover channels.
- Its separate multi-network mode uses a 7x7 board, multiple independently owned source-to-target routes, and seeded route generation.
- The campaign and multi-network rules are authored in Arena's own engine source.

Originality assessment:
- Pipe and wire-connection puzzles are an established puzzle family. A rotate-the-pipes game by itself is not a distinctive claim of originality.
- Arena's combination of winding seeded routes, ordered checkpoint latching, required powered branches, switch activation, isolated bridge channels and independently owned multi-network routes is the direction to develop as its own rule system.
- Preserve the exact semantics of bridges, checkpoints, branch power, network ownership and route generation in tests and game documentation.
- Do not borrow another game's board maps, level sequences, iconography, story, effects, text, source code or distinctive UI.

Release gate:
- Compare against leading pipe-connection, network-routing and circuit-logic games.
- Make the multi-network mode and campaign progression feel unmistakably Arena through original objectives, constraints, feedback and visual design, not just a different palette.
- Verify every sound, illustration, font and UI asset has an acceptable provenance.
- Run name and trademark clearance for Circuit Breaker. The phrase is widely used in technical and entertainment contexts and should not be assumed exclusive.

## Asset and code provenance

For every shipped asset, record:
- Asset path and a short description.
- Creator or source.
- Whether it was created in-house, commissioned, licensed, or sourced from public domain.
- License and attribution requirements, if any.
- Evidence of permission for commissioned or third-party work.

Never copy assets from competitor games, app-store screenshots, websites, game files, or extracted packages. Do not use another game's logo, characters, signature sounds, level layouts, UI artwork or marketing copy.

All gameplay source code must be authored for Arena or use dependencies whose licenses permit the intended use. Record third-party packages and license notices. Do not paste decompiled or copied game source into the repository.

## New-game approval checklist

A proposed game must have all of the following before implementation is called original:
1. A one-page original game brief describing the player fantasy, core loop, win/loss conditions and what makes the rules distinct.
2. A mechanics comparison against the closest three to five known games, recording similarities and meaningful differences.
3. Original rules, scoring, progression and level-generation specifications.
4. Original or documented-permission art, sound, animation, writing and UI assets.
5. Independently authored source and tests, with dependency/license review.
6. A title and brand clearance check before public marketing or commercial release.
7. A final human review for confusing similarity, not just a code review.

## Important limits

This repository review is not a worldwide market search, patent search, copyright opinion, trademark clearance, or legal guarantee. Game genres and abstract rules are treated differently from protected expression, but the boundary is fact-specific and jurisdiction-dependent. Obtain qualified IP advice before a significant commercial launch, especially before paid competitions, sponsorship campaigns or app-store scale.

## Working rule for future development

When a mechanic feels familiar, do not automatically reject it. Ask whether Arena has independently authored the actual expression and whether the complete combination creates a distinct experience. If the answer is unclear, redesign before shipping. Originality must be demonstrated in the game itself, not asserted in marketing.
