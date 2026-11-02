# Shadecode Arena: product and platform decisions

Status: proposed baseline, to be validated as the product is built.
Scope: Arena and its first game, Tile Rush. Arena is separate from Shadecode Student.

## Product shape

Arena is a game platform, not a single game screen. Tile Rush is the first title. The platform should eventually support multiple small competitive games, profiles, seasons, events, leaderboards, achievements, and fair-play review without coupling every game to one UI or one backend schema.

### Non-negotiable principles

- Arena uses a hybrid commercial model: paid skill competitions where cleared, free and sponsor-funded events, organisation-hosted tournaments, optional cosmetics/membership, and suitable advertising.
- Players must retain meaningful free play. Monetisation must never buy competitive advantage.
- Skill and fair play should determine ranked outcomes. Client-reported scores are never authoritative.
- Ranked challenges use identical deterministic starting conditions.
- Low-data friendly, quick to load, and resilient on inconsistent connections.
- Native-feeling interactions, responsive layouts, accessible controls, and reduced-motion support.
- No collection or sale of unnecessary personal data. Public profiles should expose only deliberate, minimal information.
- No paid boosts, extra moves, paid retries, or paid competitive advantages.
- Do not assume a skill-based label automatically removes a contest from gambling, gaming, lottery, prize-competition, or other regulation. Classification depends on applicable law and actual mechanics.

## Native-first client decision

Build the primary mobile client with **React Native + Expo SDK 58 (development builds / EAS), using React Native 0.88 and React 19.3**, using TypeScript. Do not ship a website inside a WebView and call it a native app.

Why:
- Real native navigation, gestures, haptics, safe-area handling, lifecycle behaviour, and platform distribution.
- Shared TypeScript game rules and validation logic with the server.
- One mobile codebase for Android and iOS, while preserving the option of a web companion.
- Expo SDK 58 is the current stable baseline and provides a practical build and release pipeline without requiring the founder to own a local Android device for every cloud build.

The game board itself should be rendered with native React Native primitives or a carefully selected performant drawing layer only after profiling. Avoid adding a heavyweight game engine before the board complexity justifies it. Keep animation and rendering separate from rules.

### Client structure

- `apps/mobile`: Expo + React Native app, Expo Router, native navigation and platform integrations.
- `apps/web`: optional web companion using the same game engine and API contracts. It must not be the only client.
- `packages/tile-rush-engine`: pure deterministic TypeScript rules, no React, platform APIs, network, clock, or storage dependencies.
- `packages/contracts`: shared request/response schemas and versioned API contracts.
- `packages/ui-tokens`: shared design tokens only; do not force web and native into identical component implementations.
- `services/arena-api`: server-authoritative challenge, replay, profile, season, and leaderboard operations.

The current engine lives at `arena/tile-rush-engine` in the Shadecode repository as an isolated first step. Keep it isolated until a dedicated Arena repository is available. Do not import Shadecode Student's auth, database, user records, or private student data.

## Backend and trust boundary

Use a dedicated Arena backend and database project, not the Shadecode Student Supabase project. Supabase is a reasonable initial managed foundation for authentication, Postgres, storage for approved assets, and server-side functions. Keep business rules portable so the platform can move services later.

Server responsibilities:
1. Issue challenge IDs, rules versions, seeds, and server timestamps.
2. Store the exact rules version and challenge configuration used for each ranked session.
3. Accept an ordered event/replay stream, not a claimed score.
4. Reconstruct the game from the seed and replay every accepted and rejected action.
5. Enforce move limits and server-measured Blitz duration.
6. Calculate score on the server and persist the verified result transactionally.
7. Make leaderboard writes idempotent and protect against duplicate submissions.
8. Keep an audit trail for suspicious submissions and provide an appeal/review path before punitive action.

The client can predict and animate moves immediately, but the server is the source of truth for ranked results. Never trust client clocks for Blitz. Use server-issued start/end times and timestamped input events with a documented latency policy.

## Tile Rush rules baseline

- Board: 8×8.
- Tile colours: six.
- Ranked: deterministic seeded board, exactly 30 accepted moves.
- Practice: unranked.
- Blitz: 90 seconds, separate leaderboard, server-timed.
- Matches: horizontal or vertical runs of at least three equal-colour tiles.
- Four in a straight line: Line Clear.
- Five or more in a straight line: Prism.
- T/L-shaped match: Burst.
- Invalid non-matching swaps reverse, do not score, and do not consume a valid move.
- Resolution is deterministic: match detection, special creation/activation, scoring, gravity, seeded refill, cascades, then dead-board recovery.
- Ranked tie-breaks: verified score, then fewest valid moves, then fewest invalid attempts.

Special-combo effects must be explicitly specified, versioned, and fixture-tested before they are enabled in ranked play. Do not silently invent or change competitive rules after a season begins.

## Competition and integrity

- Every ranked challenge is bound to a rules version and immutable challenge configuration.
- Replays are reproducible and independently verifiable.
- A rules update creates a new rules version. Existing challenges retain their original version.
- Leaderboards distinguish verified ranked results from practice and unverified local play.
- Rate limits, duplicate protection, replay size limits, and abuse monitoring are required before public ranked launch.
- Do not launch ranked competition until replay verification, server timing for Blitz, and leaderboard transaction tests pass.
- Paid contests must disclose the rules, eligibility, entry amount, prize structure, platform fee, tie handling, cancellation/refund policy, and payout timing before a player enters.
- Competition entry funds and prize liabilities are not platform revenue. Only a clearly disclosed platform fee or other earned charge is revenue, subject to accounting and applicable tax treatment.
- Do not accept deposits, hold player balances, operate escrow, or initiate cash payouts until the chosen legal structure, custody/payment flow, provider approval, and operational controls have been reviewed and approved.
- Initial public launch is free-to-play and non-prize: no entry fees, stakes, pooled contributions, cash-equivalent prizes, wallets, escrow or payouts. Sponsor-funded prize competitions are also deferred pending assessment. Enforce this boundary server-side; see `arena/NO_PAID_CONTEST_LAUNCH.md`.

## UX and accessibility

- A player should understand the objective, remaining moves/time, score, and result without opening a help page.
- Keep the board central. Avoid floating overlays that obscure play.
- Use clear motion and feedback, but respect reduced-motion settings and provide non-colour-only cues where feasible.
- Support screen readers for menus, status, and controls. The board needs a deliberate accessible interaction mode.
- Provide haptics as optional feedback, never as the only feedback.
- Save Practice progress locally. Ranked sessions must recover safely from app suspension and reconnect without allowing client state to overwrite server state.
- Design for narrow phones first, then tablets and web.

## Hybrid monetisation

Arena combines paid skill competitions where cleared, free and sponsor-funded events, organisation-hosted tournaments, optional cosmetics and memberships, and suitable advertising. No single revenue stream should be a dependency for the entire business. Players retain meaningful free play, and purchases never confer competitive advantage.

See `arena/MONETIZATION.md` for revenue lines, player journeys, financial separation, Zimbabwe-first legal/payment gates, rollout stages and metrics.

## Release gates

1. Engine correctness: deterministic fixtures, property tests across many seeds, special/cascade/gravity tests, replay tests.
2. Native client: Android and iOS builds, lifecycle/reconnect handling, accessibility, performance, and device testing.
3. Server integrity: replay verification, server-side timing, idempotent result writes, abuse controls.
4. Commercial/legal readiness: written jurisdiction assessment, approved payment-provider flow, accounting and settlement design, age and player-protection controls.
5. Closed test: small invited cohort, telemetry limited to product reliability and fair-play signals.
6. Public launch: support process, privacy notice, rules/version disclosure, moderation and incident response.

Do not skip a gate to make a launch date.
