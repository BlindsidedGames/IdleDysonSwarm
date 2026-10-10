# Farming final stretch — proposal, 10 October 2026

Matthew asked for a few more upgrades before the first city. This is a concrete proposal, not approved gameplay or a change to production Farming. Forager and Farming remain the beta's two ages; First Cities stays a future endpoint with “More coming soon.” No extra Catalyst rewards are proposed beyond the approved seven Forager and six Farming points.

## Three funded upgrades

Use the existing construction/job ownership and focus system. These are finite, once-per-village projects with paid receipts; resource costs are charged at admission and existing jobs retain their original bill, duration and output. Names are working English copy, not approved translations/artwork.

| Upgrade | Prerequisite | Cost | Work | Immediate purpose |
| --- | --- | --- | ---: | --- |
| Intensive Cultivation | Waterworks | 180 Materials, 12 Tools, 40 Goods | 1,260 worker-seconds | Future Fields batches gain 20% Food: 22.5 → 27. Existing positive Weathering rate gains an additional ×0.8 reduction (Waterworks ×0.6 becomes ×0.48 overall). More reliable housing and food for the final Homes/shipments. |
| Guild Workshop | Hall, five lifetime Homes, three trade connections | 250 Materials, 16 Tools, 60 Goods | 1,680 worker-seconds | Future Goods batches produce 3 for 6 Materials and 63 work instead of 2 for 4 and 63. Material efficiency stays 2 Materials/Goods; worker throughput improves 50%. |
| Town Market | Both projects, five lifetime Homes, three connections | 450 Food, 320 Materials, 20 Tools, 80 Goods | 2,100 worker-seconds | Future shipments need 1,512 work instead of 1,890 and return 100 Materials instead of 80. The remaining three connections use the benefit. Food cost needs the third ordinary Granary (560 capacity), which the sixth Home already needs. |

Complete Farming when all three projects, six **supported** Homes and six connections are present, then use the existing explicit age-completion action to settle already paid jobs. Finish ready to found First Cities; do not fabricate city production, purchases or a seventh Farming reward. Town Market is part of readiness, not an indefinite terminal production loop.

The source-derived candidate plan builds Cultivation immediately after Waterworks and Guild/Market after Home five and connection three, then finishes Home six and connections four–six. This preserves meaningful focus/stock/storage choices. The first project's increased Food is used by later construction and trade; Guild and Market affect the remaining trade work. Their benefits are not deferred wholly into an unimplemented age.

For an initial implementation, extend the existing automatic goal planner and show these projects in the ordinary production/building rows. Do not add a second research/currency system or new manual purchase gates beyond Granaries. If Matthew wants selectable project ordering instead, review that UI/command scope separately before implementation; the measured model below uses automatic sequencing.

## Pacing evidence

Actual current Farming source was copied into an isolated `.mts` what-if module. Only the three bills, prerequisites, completion requirement and future batch/trade effects above were added there. The real production files are untouched. Both control and candidate start from the same actual 7,043-second Balanced Forager opening and paid handoff, with no spent fractures. Required Granaries are bought immediately, using one-second domain ticks.

| Policy | Current minutes | Proposed minutes | Added minutes |
| --- | ---: | ---: | ---: |
| Balanced | 121.32 | 149.62 | 28.30 |
| Supplies | 119.97 | 145.72 | 25.75 |
| Growth | 123.35 | 153.53 | 30.18 |
| Travel | 120.22 | 147.12 | 26.90 |
| Switching: Supplies for inputs, Growth for funded building, Travel for funded shipping | 113.40 | 141.62 | 28.22 |

This is a roughly half-hour extension, rather than a full extra age. Current and candidate all complete with six Homes, six connections and six distinct Farming payout IDs. Balanced candidate completes Waterworks at 44.17m, Cultivation 56.15m, Hall 84.98m, Guild 117.40m and Market 130.98m; the final connection/readiness follows at 149.62m. Fixed Supplies/Travel still suffer repair time; Balanced/Growth/switching do not. No policy deadlocked in this matrix.

Evidence: `output/save-safety/farming-extension-proposal.json`; model generator and harness live in the isolated task directory as `build-farming-proposal-model.py`, `farming-proposal-domain.mts` and `farming-extension-probe.mts`. This is a source-derived forecast, not a certified production implementation. It does not cover slow/manual human decisions, spent fractures, damaged historical saves, extreme stocks, idle/Stored Time job interruptions, or native devices.

## Exactly six Farming rewards

Keep current placements 1–5: first Home, Pasture or Kiln, Waterworks, Hall, three connections. Placement 6 remains age completion, now requiring the three readiness projects too. The additional upgrades earn no separate Catalyst. Retain paid `farming-catalyst-6` for an already completed/paid village; never revoke it or repay it because the endpoint changes. The current code's eligibility and Int64 wallet constraints still exist and need the separate reward-ledger design if Matthew approves banking/compensation changes.

An eventual save migration needs a new Farming recipe/version contract. Never reinterpret an in-flight original Goods or shipment job using a new output/duration. Preserve already funded receipts, tick fractions, supported/lost Homes, earned/paid milestone records and the explicit completed-state behavior. Recommended treatment of already completed villages: grandfather their completed endpoint and six paid receipts; do not reopen their terminal economy. Applying new readiness work to completed saves would be a separate player-policy decision.

The actual seventh Forager point placement is still pending. This forecast intentionally observes today's six-point opening and six Farming points; it does not claim that the release-blocking 7+6 contract is implemented.
