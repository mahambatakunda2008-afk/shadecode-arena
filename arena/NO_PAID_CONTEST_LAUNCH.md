# Arena: no-paid-contest launch policy

Status: conservative product release policy, not legal advice or a guarantee of exemption from regulation.

## Decision

**Launch Arena without paid-entry competitions or cash-prize competitions.** Defer that business line until we can fund qualified Zimbabwean legal advice, any required approvals, and written payment-provider acceptance. This is sequencing, not abandonment of the hybrid model.

## Initial launch scope

Subject to ordinary business, privacy, consumer, advertising and app-store obligations being checked:
- Free practice and offline play.
- Free daily challenges with no cash or cash-equivalent reward.
- Non-cash progression and achievements with no redemption or transfer value.
- Free leaderboards for recognition only, with no money, prizes, credits or valuable benefits.
- Social play and private groups with no entry fee, stake, pooled contribution or prize.

Clearly label practice, free ranked play and non-rewarded challenges. Do not describe these as cash competitions.

## Explicitly disabled until clearance

Do not offer, advertise, simulate as a live service, or remotely activate:
- Entry fees, buy-ins, stakes, deposits or paid contest attempts.
- Player-funded prize pools or pooled player contributions.
- Cash, mobile-money, cryptocurrency, gift-card or other cash-equivalent prizes.
- Withdrawable, transferable or redeemable balances, points, tokens or credits.
- Wallets, escrow, custody of player funds, winner payouts or payment splitting.
- Sponsored or organisation-funded prize competitions. A third-party-funded prize can still raise promotional-competition or gaming-law questions.
- Paid tournament formats where payment is connected to entry, qualification, ranking or a prize.
- Workarounds disguising an entry fee as a donation, subscription, purchase, service fee or cosmetic transaction.

No hidden admin override or client-side flag may activate these flows. Backend validation must reject them by default.

## Separate monetisation to assess

Cosmetic-only purchases, general memberships, ordinary advertising and fixed-fee software/event-management services for organisations may be explored separately. They are not automatically cleared by disabling paid contests. Check applicable company, tax, consumer, privacy, advertising, child-safety, app-store and payment-provider requirements first. Avoid manipulative purchases or ads targeted at children. No loot boxes, paid random rewards or chance-based monetisation in the initial release.

## Engineering controls

1. No payment SDK, checkout, wallet, payout or prize-settlement flow in the initial release.
2. Do not expose active entry-fee, prize-pool or withdrawable-balance fields in launch client contracts.
3. Competition APIs default to free, non-prize events and reject entry charges, prizes or cash-equivalent benefits.
4. Keep the future financial-service boundary documented, but do not build live money movement before clearance.
5. Leaderboards are informational only and create no debt, prize obligation or redemption right.
6. Remote configuration is not the sole safeguard. Enforce restrictions server-side.
7. Marketing must not imply that players can earn money, win cash or withdraw rewards during this phase.
8. Keep a dated record of approvals required to change this policy.

## Reopening the paid-competition gate

Reconsider paid contests only after documenting:
- Written advice from a qualified Zimbabwean lawyer on the exact game mechanics, entry flow, prize source and payout arrangement.
- Written regulator classification/requirements where available or appropriate.
- Any required licence, registration, exemption or approval, with evidence it has been obtained.
- Written payment-provider approval for the exact use case, including collection, refunds and prize settlement.
- Age and eligibility rules, identity checks where required, player-protection controls and complaints process.
- Financial ledger, reconciliation, prize-liability segregation, refund/chargeback handling and audit trail.
- Published contest rules and disclosures.
- Release review confirming server-side enforcement and independent replay verification.

A funding target is not a legal threshold. Having enough money later does not itself authorise paid contests.

## Public wording

Use: "Arena is launching with free-to-play games and non-cash progression. Paid competitions are planned for a later phase, subject to legal and payment-provider approval."

Do not promise a launch date for paid competitions before the clearance gate is passed.
