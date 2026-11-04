import { performance } from "node:perf_hooks";
import { createCircuitPuzzle, rotateCircuitCell } from "../../../apps/mobile/src/circuit-breaker.ts";
import { CIRCUIT_BREAKER_RULES_VERSION, verifyCircuitBreakerReplay } from "../src/circuit-breaker-verifier.ts";

type Replay = {
  rulesVersion: string;
  mode: "ranked";
  level: number;
  seed: number;
  actions: Array<{ type: "rotate"; cellIndex: number } | { type: "activate_switch" }>;
};

function winningReplay(level: number, seed: number): Replay {
  let puzzle = createCircuitPuzzle(level, seed);
  const actions: Replay["actions"] = [];
  const required = new Set([
    ...puzzle.routeCells.map((included, index) => included ? index : -1).filter(index => index >= 0),
    ...puzzle.branchIndices,
  ]);
  for (const cellIndex of required) {
    if (puzzle.cells[cellIndex].fixed || puzzle.cells[cellIndex].bridge) continue;
    let turns = 0;
    while (puzzle.cells[cellIndex].ports !== puzzle.solutionPorts[cellIndex] && turns < 4) {
      puzzle = rotateCircuitCell(puzzle, cellIndex);
      actions.push({ type: "rotate", cellIndex });
      turns++;
    }
    if (puzzle.cells[cellIndex].ports !== puzzle.solutionPorts[cellIndex]) {
      throw new Error(`Could not construct fixture: level=${level}, seed=${seed}`);
    }
  }
  if (puzzle.switchIndex !== null) actions.push({ type: "activate_switch" });
  return { rulesVersion: CIRCUIT_BREAKER_RULES_VERSION, mode: "ranked", level, seed, actions };
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

const levels = [1, 5, 9, 15, 21, 30, 100, 10_000];
const seeds = [1, 42, 0xdeadbeef, 0x12345678, 0x7fffffff];
const fixtures = levels.flatMap(level => seeds.map(seed => winningReplay(level, seed)));
const warmupRuns = 20;
const measuredRuns = 200;

for (let i = 0; i < warmupRuns; i++) {
  if (!verifyCircuitBreakerReplay(fixtures[i % fixtures.length]).valid) {
    throw new Error("Warm-up replay unexpectedly failed verification");
  }
}

const timings: number[] = [];
let acceptedActions = 0;
for (let i = 0; i < measuredRuns; i++) {
  const replay = fixtures[i % fixtures.length];
  const start = performance.now();
  const result = verifyCircuitBreakerReplay(replay);
  timings.push(performance.now() - start);
  if (!result.valid) throw new Error(`Replay rejected: level=${replay.level}, seed=${replay.seed}`);
  acceptedActions += result.acceptedActions;
}

const sorted = [...timings].sort((a, b) => a - b);
const totalMs = timings.reduce((sum, value) => sum + value, 0);
const report = {
  runtime: process.version,
  benchmark: "Circuit Breaker replay verifier; Node.js wall-clock only, not Cloudflare CPU billing",
  fixtureCount: fixtures.length,
  levels,
  seedsPerLevel: seeds.length,
  warmupRuns,
  measuredRuns,
  totalVerifiedActions: acceptedActions,
  medianMs: Number(percentile(sorted, 0.5).toFixed(4)),
  p95Ms: Number(percentile(sorted, 0.95).toFixed(4)),
  maxMs: Number(sorted[sorted.length - 1].toFixed(4)),
  verificationsPerSecond: Number((measuredRuns / (totalMs / 1000)).toFixed(1)),
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
