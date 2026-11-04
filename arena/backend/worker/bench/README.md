# Replay verifier benchmark

Run from `arena/backend/worker`:

```sh
npm run bench
```

The harness constructs deterministic winning Circuit Breaker fixtures across early and later chapter levels, warms the verifier, then reports median, p95, maximum and average throughput over 200 replay verifications. Fixture construction is outside the timed section.

This is a **Node.js wall-clock benchmark**, useful for catching large regressions and comparing commits on the same machine/runtime. It is not a Cloudflare Workers CPU-time measurement: host scheduling, JIT state and the Node runtime differ from the deployed Worker isolate. Do not use these numbers to claim compliance with Cloudflare's CPU limits.

Before enabling Circuit Breaker ranked submissions, the Worker route must call this verifier, the database must have a published matching rules version and persistence procedure, and the verifier must be exercised in a real Cloudflare Workers environment with representative worst-case valid and invalid replays. Ranked submissions remain disabled until that work is completed.
