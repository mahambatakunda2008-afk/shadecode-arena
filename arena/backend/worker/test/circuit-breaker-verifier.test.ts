import test from "node:test";
import assert from "node:assert/strict";
import { createCircuitPuzzle, rotateCircuitCell } from "../../../apps/mobile/src/circuit-breaker.ts";
import { CIRCUIT_BREAKER_RULES_VERSION, verifyCircuitBreakerReplay } from "../src/circuit-breaker-verifier.ts";

function winningReplay(level: number, seed: number) {
  let puzzle = createCircuitPuzzle(level, seed);
  const actions: Array<{type:"rotate";cellIndex:number}|{type:"activate_switch"}> = [];
  const required = new Set([...puzzle.routeCells.map((included,index)=>included?index:-1).filter(index=>index>=0), ...puzzle.branchIndices]);
  for (const cellIndex of required) {
    if (puzzle.cells[cellIndex].fixed || puzzle.cells[cellIndex].bridge) continue;
    let turns = 0;
    while (puzzle.cells[cellIndex].ports !== puzzle.solutionPorts[cellIndex] && turns < 4) {
      puzzle = rotateCircuitCell(puzzle, cellIndex);
      actions.push({type:"rotate",cellIndex});
      turns++;
    }
    assert.equal(puzzle.cells[cellIndex].ports, puzzle.solutionPorts[cellIndex]);
  }
  if (puzzle.switchIndex !== null) actions.push({type:"activate_switch"});
  return {rulesVersion:CIRCUIT_BREAKER_RULES_VERSION,mode:"ranked" as const,level,seed,actions};
}

test("reconstructs and verifies deterministic Circuit Breaker wins across chapter mechanics", () => {
  for (const level of [1, 5, 7, 9, 12, 15, 18, 21, 30]) {
    for (const seed of [1, 42, 0xdeadbeef]) {
      const replay = winningReplay(level, seed);
      const result = verifyCircuitBreakerReplay(replay);
      assert.equal(result.valid, true, `level=${level}, seed=${seed}`);
      if (result.valid) {
        assert.equal(result.state.solved, true);
        assert.equal(result.acceptedActions, replay.actions.length);
      }
    }
  }
});

test("rejects malformed, out-of-range and oversized replays", () => {
  assert.deepEqual(verifyCircuitBreakerReplay(null), {valid:false,code:"INVALID_REPLAY"});
  assert.equal(verifyCircuitBreakerReplay({rulesVersion:"wrong",mode:"ranked",level:1,seed:1,actions:[{type:"activate_switch"}]}).valid,false);
  assert.equal(verifyCircuitBreakerReplay({rulesVersion:CIRCUIT_BREAKER_RULES_VERSION,mode:"ranked",level:1,seed:-1,actions:[{type:"activate_switch"}]}).valid,false);
  assert.equal(verifyCircuitBreakerReplay({rulesVersion:CIRCUIT_BREAKER_RULES_VERSION,mode:"ranked",level:1,seed:1,actions:Array(129).fill({type:"activate_switch"})}).valid,false);
});

test("rejects ignored rotations, redundant switches, extra action fields and incomplete boards", () => {
  const base={rulesVersion:CIRCUIT_BREAKER_RULES_VERSION,mode:"ranked",level:1,seed:7};
  assert.deepEqual(verifyCircuitBreakerReplay({...base,actions:[{type:"rotate",cellIndex:0}]}),{valid:false,code:"REPLAY_REJECTED"});
  assert.deepEqual(verifyCircuitBreakerReplay({...base,actions:[{type:"activate_switch"}]}),{valid:false,code:"REPLAY_REJECTED"});
  assert.deepEqual(verifyCircuitBreakerReplay({...base,actions:[{type:"rotate",cellIndex:1,score:999}]}),{valid:false,code:"INVALID_REPLAY"});
  const replay=winningReplay(7,123);
  const incomplete={...replay,actions:replay.actions.slice(0,-1)};
  assert.deepEqual(verifyCircuitBreakerReplay(incomplete),{valid:false,code:"REPLAY_INCOMPLETE"});
});
