# Tile Rush Engine

A deterministic, UI-independent rules engine for Shadecode Arena.

## Modes
- Ranked: 8x8 board, six tile colours, fixed 30 valid moves, identical seeded board for every competitor in a challenge.
- Practice: unranked, no competitive leaderboard impact.
- Blitz: separate 90-second mode and leaderboard. Replay verification remains disabled until timestamped server-timed input events are implemented.

Ranked tie-break order: highest verified score, fewest valid moves used to reach that score, then fewest invalid swap attempts.

## Resolution order
1. Validate an adjacent swap.
2. Detect horizontal and vertical matches of at least three equal-colour tiles.
3. Reverse a swap that creates no match. It earns no score and does not consume a valid move.
4. Create deterministic specials from qualifying match shapes.
5. Clear matches and activate matched specials.
6. Score the clear.
7. Apply gravity and seeded refills.
8. Resolve cascades until the board is stable.
9. If the stable board has no legal move, deterministically reshuffle it using the same seeded random stream.

Specials: four in a straight line creates Line Clear; five or more in a straight line creates Prism; a T/L-shaped match creates Burst.

### Special-combo rules (tile-rush-2)

A special-to-special or Prism-to-normal swap is itself a valid move, even when it does not create an ordinary three-tile match.

| Combination | Deterministic effect |
| --- | --- |
| Line + Line | Clears the complete row and column crossing at the swap destination. |
| Line + Burst | Clears three rows and three columns centred on the swap destination, clipped at board edges. |
| Burst + Burst | Clears a 5×5 square centred on the swap destination, clipped at board edges. |
| Prism + normal | Clears every tile of the normal tile's colour. |
| Prism + Line/Burst | Converts every tile of the partner colour into that special, then activates the resulting chain. |
| Prism + Prism | Clears the entire 8×8 board. |

Combo clears enter the normal special-activation, scoring, gravity, refill and cascade pipeline. Effects are deterministic and replayed by the same rules version. Any future balance change to these effects requires a new rules version and replay fixtures.

## Daily challenge

The native practice screen offers an offline daily challenge. Its board seed is derived from the validated UTC date using a stable 32-bit FNV-1a hash. Every client using the same date and rules version therefore starts from the same board without a network request. Daily challenge runs are practice-only: they are not ranked, do not create a verified leaderboard result, and do not award prizes. The date boundary is UTC.

## Scoring baseline

P = (10N + B + E) × C. N is tiles cleared in the cascade, B is the provisional special activation bonus, E is the provisional extra-clear effect bonus, and C is the cascade multiplier. Multipliers are 1.0x, 1.5x, 2.0x, then 2.5x for the fourth and later cascade waves.

The current B/E constants are implementation placeholders, not locked competitive economics. Scoring must be reviewed and frozen in a rules version before ranked seasons launch.

## Fair-play boundary

The client may run this engine for immediate feedback, but ranked results are never trusted from the client. A server reconstructs the initial board from the challenge seed, replays every submitted swap with this exact rules version, and compares move count, invalid-attempt count, score, and final state. Never accept a client-supplied score as authoritative.

This package contains game rules only. It does not implement accounts, contest entry collection, financial ledgers, prize liabilities, payment custody, refunds, or payouts. Those belong to separately reviewed Arena services. The engine remains usable for practice, sponsor-funded events, and legally cleared paid skill competitions without embedding money handling in game logic.
