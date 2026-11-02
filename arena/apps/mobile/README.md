# Shadecode Arena Mobile

Native-first Android and iOS client built with Expo, React Native, TypeScript and Expo Router. This is not a WebView wrapper.

## Current scope

- Native navigation and safe-area-aware screens.
- Arena home and Tile Rush mode-selection foundation.
- Dark, cyan-accented visual system.
- Shared deterministic Tile Rush engine dependency.
- Offline personal-best persistence using device storage.
- Daily challenge best scores and completion history, with a UTC-based streak counter.
- Five skill-earned achievements for first move, cascade performance, score milestones and daily consistency.
- Unlockable Sunrise, Orchid and Forest tile themes, with no gameplay or scoring advantage.
- Equipped cosmetic theme, achievement progress, haptics, sound and music preferences persist locally on the device.
- Optional haptic feedback for tile selection, accepted moves and invalid swaps; it can be disabled in-game.
- Offline synthesized sound effects and a generated ambient music loop are available, with independent controls. Music is off by default.
- Daily challenges rotate through three deterministic skill objectives (score target, cumulative cascades, or accepted-move target) based on the UTC date. Completion is claimable only after the objective is met; streaks remain local-device progress, not a verified leaderboard.
- Practice runs end after 30 accepted moves and offer a same-board replay.
- Target Rush is an additional offline practice mode: score 1,200 points within 15 accepted moves, with a fresh seeded board each run and same-board replay. It is unranked and has no prizes or server-verified result.
- Chain Hunt is a separate offline skill challenge: trigger at least three cascade waves from a single accepted move within ten accepted moves. The best single-move chain is tracked for the current attempt; the mode is unranked and has no prizes or server-verified result.
- No account, network, payment, or ranked submission wiring yet.

## Development

Use Node.js 22.13+ and a package manager supported by Expo.

```sh
pnpm install
pnpm exec expo install --fix
pnpm exec expo-doctor
pnpm start
```

For production work, use EAS development builds rather than relying on Expo Go. Configure the EAS project and app-store credentials only when the release owner is ready. Android and iOS builds can be produced in the cloud.

## Architecture rules

- Keep gameplay rules in `../../tile-rush-engine`, not in React components.
- Rendering and animation may predict local moves, but ranked state must be reconciled with the server.
- Do not use a client clock to adjudicate Blitz.
- Do not add Student's auth or database dependencies.
- Keep Practice playable offline with AsyncStorage-backed personal bests and daily challenge history. Clearing app data or reinstalling can reset this local-only progress until account sync is introduced. Achievements and cosmetics are currently local-device unlocks, not transferable account entitlements.
