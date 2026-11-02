# Shadecode Arena

A standalone, native-first game platform from Shadecode.

Arena currently contains two game foundations:
- **Shade Tiles: Rush** (provisional working title): a deterministic match-and-clear game. The previous public working name, Tile Rush, is retired because of an existing naming/discoverability conflict. The replacement name still requires clearance.
- **Circuit Breaker**: a seeded logic-puzzle generator and native puzzle screens.

The initial client is built with Expo, React Native and Expo Router. It is a native application, not a WebView wrapper.

## Repository layout

- `arena/apps/mobile/`: Expo Android/iOS application
- `arena/tile-rush-engine/`: UI-independent deterministic game engine (legacy internal path; not the public game name)
- `arena/*.md`: architecture, beta, audio, Circuit Breaker and monetisation guidance
- `.github/workflows/`: native client and engine CI

## Requirements

- Node.js 22+
- pnpm 10.20.0 (the native CI version)

## Run the native app

```sh
cd arena/apps/mobile
pnpm install
pnpm exec expo install --check
pnpm dlx expo-doctor
pnpm start
```

Use the EAS profiles in `arena/apps/mobile/eas.json` for cloud device builds. Configure EAS and store credentials when the release owner is ready.

## Test the shared engine

```sh
cd arena/tile-rush-engine
pnpm install
pnpm test
pnpm run typecheck
```

## Beta and commercial validation

Arena will use a staged beta to validate product quality, retention, competition integrity, sponsorship demand and organisation willingness to pay before major investment. Beta competitions start free and non-prize. Do not collect entry fees or offer cash/cash-equivalent prizes during this phase.

See `arena/BETA_PROGRAM_AND_PRIZE_DISTRIBUTION.md` for the beta scorecard, commercial validation gates and scalable top-3/top-5/top-10/top-100 prize-distribution design.

## Launch and fairness boundaries

The initial public release is free-to-play and non-prize. No entry fees, stakes, pooled contributions, cash or cash-equivalent prizes, wallets, escrow or payouts are enabled. Do not disguise entry fees as subscriptions, donations, purchases or service fees.

Ranked results must be server-authoritative before competitive launch. Blitz requires server-timed events. Local practice scores, streaks and achievements are not verified competitive results.

Read `arena/MONETIZATION.md` and `arena/NO_PAID_CONTEST_LAUNCH.md` before changing monetisation or competition flows.

## Independence

Arena must remain independent of Shadecode Student. Do not import Student authentication, database assumptions or app-specific dependencies into the Arena client.
