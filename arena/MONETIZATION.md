# Shadecode Arena: hybrid monetisation strategy

Status: product and commercial strategy to implement in stages. This document is not legal advice or permission to launch paid contests.

## 1. The strategy: several engines, one Arena

Shadecode Arena is a hybrid business, not a single-revenue-stream game. It combines:

1. **Paid skill competitions:** players enter eligible contests with a clearly disclosed entry contribution; verified winners receive published prizes; Arena earns a separately disclosed platform fee.
2. **Free and sponsor-funded competition:** players can compete without paying an entry fee, while sponsors fund prizes, events, seasons or themed challenges.
3. **Tournament hosting:** schools, communities, brands, creators and organisations pay Arena to organise and operate competitions.
4. **Player purchases:** optional cosmetics and identity customisation, plus optional membership for non-competitive benefits.
5. **Advertising:** carefully placed, clearly labelled advertising and optional rewarded ads.

These are complementary business lines. A player should be able to enjoy Arena without paying, while players who choose paid competition can access it only in markets and formats that have passed the required legal, payment and operational gates.

**Important distinction:** “skill competition” describes the intended game design. It does not settle the legal classification. Each contest format and jurisdiction must be assessed on its actual mechanics.

## 2. How the hybrid model works for different players

| Player / customer | What they can do | How Arena can earn |
|---|---|---|
| Casual player | Play free practice, learn games, join free events | Suitable ads, optional cosmetics, sponsor exposure |
| Competitive player | Join free ranked events and, where cleared, paid-entry contests | Disclosed platform fee on eligible paid contests; optional cosmetics |
| Community / school | Run private leagues, class or club tournaments | Tournament-hosting fee or organisation subscription |
| Brand / sponsor | Sponsor a tournament, season, prize pool or challenge | Sponsorship revenue |
| Dedicated fan | Customise profile, themes, badges and other non-gameplay features | Cosmetic purchases or optional membership |

Do not make payment a prerequisite for the core game loop. Do not give paying users a scoring, board, move-count, power-up, matchmaking or leaderboard advantage.

## 3. Revenue line A: paid skill competitions

The original player-funded competition model remains a core part of Arena's commercial design.

- A player sees the full entry amount before joining.
- Contest rules, eligibility, duration, scoring, tie-breaks and prize allocation are published before entry.
- Any platform fee is separately disclosed.
- Winners are determined from server-verified results, not client-submitted scores.
- Prize obligations and payout status are visible and auditable.
- Cancellation, ties, failed payments, refunds, disputes and chargebacks have published handling rules.
- No paid boosts, extra moves, retries, power-ups or other competitive advantages.

Do not hardcode entry prices, fee percentages, prize splits or payout timings before legal review, payment-provider confirmation and unit-economics modelling. Gross entry collections and prize obligations are not Arena revenue. Only earned platform fees and other earned charges count as revenue.

## 4. Revenue line B: free and sponsor-funded events

Free competition is a deliberate acquisition and engagement channel, not a watered-down version of the product.

Examples:
- Daily and weekly free challenges.
- Sponsor-funded prize tournaments.
- Launch events and seasonal championships.
- Community or school challenges with sponsor-backed prizes.
- Sponsored themed boards, events or game modes, provided sponsorship never changes competitive fairness.

Sponsor packages can include event naming, approved brand placement, campaign reporting, prize sponsorship and event promotion. Sponsor reporting should use aggregated, privacy-conscious metrics. Never sell personal student/player data.

A sponsor-funded prize must be contractually funded and confirmed before the prize is advertised. Clearly distinguish sponsor-funded prizes from player-funded prize pools.

## 5. Revenue line C: tournament hosting (B2B)

Arena should be usable by organisations, not just individual players.

Potential customers:
- Schools and student clubs.
- Universities and colleges.
- Esports and gaming communities.
- Youth organisations and community groups.
- Brands, agencies and event organisers.

Potential paid services:
- Private tournament creation and administration.
- Branded event pages and registration.
- Team, group or school leaderboards.
- Scheduling, moderation and dispute workflows.
- Results, participation and engagement reports.
- Hosted finals and seasonal competition operations.

Use a transparent event-hosting fee, fixed package or organisation subscription. The organisation's hosting payment is separate from player entry contributions and prize money. Do not bundle or disguise prize funds as Arena service revenue.

## 6. Revenue line D: cosmetics and optional membership

Sell expression, not advantage.

Potential cosmetics:
- Profile frames, avatars and banners.
- Board skins, tile appearances and visual effects.
- Emotes, victory animations and celebration effects.
- Theme packs and profile customisation.

Optional membership may offer:
- Expanded profile customisation.
- Personal statistics and history tools.
- Additional private practice layouts or training insights.
- Ad-light or ad-free experience, where platform policy permits.
- Early access to non-competitive cosmetic content.

Membership must not grant extra moves, stronger tiles, better starting boards, scoring multipliers, priority matchmaking, paid retries in ranked, exclusive competitive eligibility or leaderboard advantages. Free users must retain access to meaningful play and fair competition.

## 7. Revenue line E: advertising

Advertising is a supporting revenue line, not the foundation of the game.

- Use clearly labelled placements in natural breaks, not over the active board.
- Rewarded ads must be optional and explain the reward before viewing.
- Never require an ad to enter a contest, claim a legitimate prize, submit a result or recover progress.
- Never grant competitive advantage, score or ranked attempts in exchange for watching ads.
- Avoid intrusive interstitials during active play.
- Apply age-appropriate advertising, consent, privacy and platform-store requirements.
- Offer a paid ad-free option only if it remains commercially viable and policy-compliant.

No floating ad overlays over the game board.

## 8. Product architecture: keep money out of game rules

The deterministic Tile Rush engine must not know about payments, wallets, entry fees, prizes or ads.

Separate Arena capabilities into:
- **Game service:** game rules, challenge seeds, replay events and verified results.
- **Competition service:** contest formats, eligibility, registration, brackets, leaderboards and settlement state.
- **Commercial service:** sponsorships, organisation plans, cosmetics, memberships and ad placements.
- **Financial ledger:** immutable transaction records for collections, fees, prize liabilities, refunds, chargebacks and payouts.
- **Jurisdiction and eligibility policy:** server-side feature gates based on approved market, age and contest eligibility.

A contest should reference a published prize/funding source: sponsor-funded, organisation-funded, or player-funded. Never mix these accounting categories. The engine calculates game outcomes; trusted backend services handle competition state and approved financial workflows.

## 9. Financial controls and transparency

For each paid contest, track at minimum:
1. Entry payments collected.
2. Payment processing fees and applicable taxes.
3. Platform fee earned.
4. Prize pool and outstanding prize obligations.
5. Refunds and cancelled-entry liabilities.
6. Chargebacks and disputed payments.
7. Payouts initiated, completed, failed or pending.
8. Reconciliation status and transaction references.

Maintain separate records for sponsor commitments, sponsor receipts and sponsor-funded prize obligations. Track organisation hosting revenue separately from entry fees and prizes. Record cosmetic and membership revenue separately from contest financial flows.

Do not assume Arena can hold player balances, run a wallet, custody funds, provide escrow or pay winners directly. Settlement must use a legally approved structure and a provider that expressly accepts the exact use case.

## 10. Zimbabwe-first legal and payment readiness

Zimbabwe is the first market to investigate. Before enabling paid entry or cash prizes, obtain qualified local advice and document:
- Classification of each contest format under applicable gambling, betting, lottery, prize-competition and other laws.
- Licensing, registration, exemptions or approvals.
- Age limits and identity-verification requirements.
- AML, sanctions, fraud and source-of-funds controls where applicable.
- Consumer protection, advertising, disclosures and complaint handling.
- Tax, accounting, prize reporting and company obligations.
- Data protection, consent and retention.
- Player-protection requirements, including limits, self-exclusion or cooling-off controls if applicable.
- Written payment-provider acceptance for entry collection and prize settlement.

Repeat the assessment for every new jurisdiction. A legal assessment for Zimbabwe does not authorise launch elsewhere.

Until paid contests are cleared, do not collect deposits or entry fees, hold player funds, create a cash wallet or escrow, or promise/initiate cash payouts. Continue with free play, sponsor-funded events, organisation-hosted events, cosmetics, memberships and suitable ads where those models are independently lawful and platform-compliant.

## Initial release boundary: free-to-play first

The first public release deliberately defers paid-entry and prize-bearing contests until the Zimbabwe-first legal, regulatory and payment-provider gates below are funded and passed. This does not remove paid skill competitions from the long-term hybrid strategy.

For the initial release, use free practice, free non-prize leaderboards, daily challenges, achievements and non-redeemable progression. Do not collect entry fees, stakes, deposits or pooled contributions; do not offer cash or cash-equivalent prizes; do not create wallets, withdrawable balances, escrow or payout flows. Do not assume sponsor-funded or organisation-funded prizes are exempt: those prize competitions also remain disabled until assessed. Do not disguise entry fees as subscriptions, donations, purchases or service charges.

Cosmetics, memberships, advertising and fixed-fee organisation services are separate possible revenue lines, not automatically cleared. Assess their consumer, tax, privacy, advertising, child-safety, app-store and payment-provider obligations before enabling them. Initial release should not include loot boxes, paid random rewards or chance-based monetisation.

See `arena/NO_PAID_CONTEST_LAUNCH.md` for the binding product boundary and engineering controls. A funding target is not a legal threshold; money alone does not authorise a launch.

## 11. Rollout sequence

### Stage 1: build audience and prove retention
- Free practice, offline play and free non-prize leaderboards.
- Daily challenges and non-redeemable progression.
- Basic profiles, achievements and player feedback.
- Reliability and privacy-conscious analytics.
- No entry fees, cash-equivalent prizes, sponsor prize competitions or live money movement.

### Stage 2: establish commercial partnerships
- Sponsor packages and funded prize events.
- Organisation-hosted private tournaments.
- Admin tools, moderation, reporting and event operations.
- Optional cosmetics and membership after validating demand.

### Stage 3: paid competition readiness
- Written legal assessment for each contest format and market.
- Confirmed payment-provider acceptance.
- Financial ledger, reconciliation, refunds, chargeback handling and settlement controls.
- Age/eligibility checks, fraud controls, player-protection tools and dispute handling.
- Limited pilot only after every gate is passed.

### Stage 4: optimise the portfolio
- Measure revenue and contribution margin by line.
- Compare sponsor renewal, organisation retention, player conversion and cosmetic/membership uptake.
- Tune ad frequency and placement using retention and player-experience evidence.
- Expand only the revenue lines that are sustainable and trusted.

## 12. Metrics that matter

Track each revenue line separately:
- Paid competition: eligible entrants, entry conversion, fee revenue, prize liabilities, payment failure, refund/chargeback rate, settlement time and contribution margin.
- Sponsorship: sponsor pipeline, funded events, revenue per event, sponsor renewal and prize-funding completion.
- Tournament hosting: active organisations, events hosted, renewal, support cost and gross margin.
- Cosmetics/membership: conversion, average revenue per paying user, retention, refund rate and feature usage.
- Advertising: opt-in rate, revenue per active user, ad complaints, retention impact and fill rate.

Across the whole product, watch day-1/day-7/day-30 retention, active players, session completion, crash-free sessions, fair-play incidents and player trust. Do not optimise short-term ad or purchase revenue at the expense of retention or fairness.

## 13. Decisions deliberately left open

Do not invent values for:
- Entry prices, currencies, platform fee or prize split.
- Contest size, format or prize distribution.
- Sponsor package prices and deliverables.
- Organisation pricing.
- Cosmetic catalogue and prices.
- Membership price and exact benefits.
- Ad provider, frequency caps and placements.
- Payment provider, custody/settlement model and payout rails.
- Launch jurisdictions and required authorisations.

Validate these through user research, partner conversations, legal advice, provider approval and unit-economics modelling.
