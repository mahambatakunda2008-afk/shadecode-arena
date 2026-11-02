import test from "node:test";
import assert from "node:assert/strict";
import {
  createCircuitPuzzle,
  rotateCircuitCell,
  activateCircuitSwitch,
  isCircuitConnected,
  getCircuitConnectedCells,
  evaluateCircuitNetworks,
  createMultiNetworkPuzzle,
  rotateMultiNetworkCell,
  getCircuitHint,
  N, E, S, W,
} from "./circuit-breaker.ts";

test("generated Circuit Breaker boards remain solvable across levels and seeds", () => {
  for (let level = 1; level <= 24; level++) {
    for (let seed = 1; seed <= 40; seed++) {
      let puzzle = createCircuitPuzzle(level, seed * 7919 + level);
      assert.equal(puzzle.cells.length, 25, `level ${level}, seed ${seed}: board size`);
      assert.equal(puzzle.routeCells.length, 25, `level ${level}, seed ${seed}: route mask`);
      assert.equal(puzzle.checkpointIndices.length, level >= 12 ? 2 : level >= 9 ? 1 : 0);
      assert.equal(puzzle.branchIndices.length, level >= 18 ? 2 : level >= 15 ? 1 : 0);
      if (level >= 21) assert.equal(puzzle.cells.filter(cell => cell.bridge).length, 1, "chapter five must generate exactly one bridge");
      assert.ok(puzzle.branchIndices.every(index => puzzle.routeCells[index]));
      assert.ok(puzzle.branchIndices.every(index => (puzzle.solutionPorts[index] & (puzzle.solutionPorts[index]-1)) === 0), "branch terminals must have one port");
      assert.equal(puzzle.cells.filter(cell => cell.blocked).length, level >= 10 ? 3 : level >= 5 ? 1 : 0);
      assert.ok(puzzle.checkpointIndices.every(index => puzzle.routeCells[index]));
      assert.ok(puzzle.checkpointIndices.every((index, i, all) => i === 0 || index !== all[i - 1]));
      assert.equal(isCircuitConnected(puzzle.cells, true), false, "fresh board must not start solved");
      assert.ok(puzzle.cells.every((cell, index) => !cell.blocked || !puzzle.routeCells[index]), "blockers must stay off the solution route");

      const source = puzzle.cells.findIndex(cell => cell.fixed === "source");
      const target = puzzle.cells.findIndex(cell => cell.fixed === "target");
      assert.ok(source >= 0 && target >= 0);
      const beforeSource = puzzle.cells[source].ports;
      const beforeTarget = puzzle.cells[target].ports;
      puzzle = rotateCircuitCell(puzzle, source);
      puzzle = rotateCircuitCell(puzzle, target);
      assert.equal(puzzle.cells[source].ports, beforeSource, "source endpoint must remain fixed");
      assert.equal(puzzle.cells[target].ports, beforeTarget, "target endpoint must remain fixed");

      for (let index = 0; index < puzzle.cells.length; index++) {
        if (!puzzle.routeCells[index] || puzzle.cells[index].fixed) continue;
        let guard = 0;
        while (puzzle.cells[index].ports !== puzzle.solutionPorts[index] && guard++ < 4) {
          puzzle = rotateCircuitCell(puzzle, index);
        }
        assert.equal(puzzle.cells[index].ports, puzzle.solutionPorts[index],
          `level ${level}, seed ${seed}: route tile ${index} must align`);
      }

      if (puzzle.switchIndex !== null) puzzle = activateCircuitSwitch(puzzle);
      assert.equal(puzzle.switchActive, true, `level ${level}, seed ${seed}: switch activation`);
      assert.equal(isCircuitConnected(puzzle.cells, true), true,
        `level ${level}, seed ${seed}: solved wire path`);
      assert.equal(puzzle.reachedCheckpoints, puzzle.checkpointIndices.length,
        `level ${level}, seed ${seed}: all checkpoints secured`);
      assert.equal(puzzle.solved, true, `level ${level}, seed ${seed}: puzzle completion`);
    }
  }
});

test("blockers cannot rotate or conduct power", () => {
  const puzzle = createCircuitPuzzle(10, 123456);
  const blocker = puzzle.cells.findIndex(cell => cell.blocked);
  assert.ok(blocker >= 0);
  const next = rotateCircuitCell(puzzle, blocker);
  assert.equal(next, puzzle);
  assert.equal(puzzle.cells[blocker].ports, 0);
});

test("bridge crossover keeps perpendicular channels electrically isolated", () => {
  const cells = Array.from({ length: 25 }, () => ({ ports: 0 }));
  cells[10] = { ports: E, fixed: "source" };
  cells[11] = { ports: E | W };
  cells[12] = { ports: N | E | S | W, bridge: true };
  cells[13] = { ports: E | W };
  cells[14] = { ports: W, fixed: "target" };
  cells[7] = { ports: S };
  cells[17] = { ports: N };

  const connected = getCircuitConnectedCells(cells);
  assert.equal(connected.has(14), true, "horizontal source-to-target channel must conduct");
  assert.equal(connected.has(7), false, "power must not leak from horizontal into north channel");
  assert.equal(connected.has(17), false, "power must not leak from horizontal into south channel");
  assert.equal(isCircuitConnected(cells), true);
});

test("generated bridge tiles are fixed and cannot be rotated", () => {
  const puzzle = createCircuitPuzzle(21, 987654321);
  const bridge = puzzle.cells.findIndex(cell => cell.bridge);
  assert.ok(bridge >= 0);
  assert.equal(puzzle.cells[bridge].ports, 15);
  assert.equal(rotateCircuitCell(puzzle, bridge), puzzle);
});

test("hints never recommend rotating a fixed crossover bridge", () => {
  const puzzle = createCircuitPuzzle(21, 246813579);
  const bridge = puzzle.cells.findIndex(cell => cell.bridge);
  assert.ok(bridge >= 0);
  const aligned = {
    ...puzzle,
    cells: puzzle.cells.map((cell, index) =>
      puzzle.routeCells[index] && !cell.fixed && !cell.bridge
        ? { ...cell, ports: puzzle.solutionPorts[index] }
        : cell
    ),
  };
  const hint = getCircuitHint(aligned);
  assert.ok(hint === null || !("cellIndex" in hint) || hint.cellIndex !== bridge);
});

test("independent networks retain separate power through a shared crossover", () => {
  const cells = Array.from({ length: 25 }, () => ({ ports: 0 }));
  // Network A runs horizontally across the centre row.
  cells[10] = { ports: E, fixed: "source" };
  cells[11] = { ports: E | W };
  cells[12] = { ports: N | E | S | W, bridge: true };
  cells[13] = { ports: E | W };
  cells[14] = { ports: W, fixed: "target" };
  // Network B runs vertically through the same bridge tile.
  cells[2] = { ports: S };
  cells[7] = { ports: N | S };
  cells[17] = { ports: N | S };
  cells[22] = { ports: N };

  const results = evaluateCircuitNetworks(cells, [
    { sourceIndex: 10, targetIndex: 14 },
    { sourceIndex: 2, targetIndex: 22 },
  ]);
  assert.deepEqual(results.map(result => result.complete), [true, true]);
  assert.equal(results[0].connected.has(2), false, "horizontal power must not energise vertical source");
  assert.equal(results[1].connected.has(10), false, "vertical power must not energise horizontal source");
  assert.equal(results[0].connected.has(22), false);
  assert.equal(results[1].connected.has(14), false);
});

test("a disconnected network cannot borrow another network's powered path", () => {
  const cells = Array.from({ length: 25 }, () => ({ ports: 0 }));
  cells[10] = { ports: E, fixed: "source" };
  cells[11] = { ports: E | W };
  cells[12] = { ports: W, fixed: "target" };
  cells[20] = { ports: E };
  cells[21] = { ports: E | W };
  cells[22] = { ports: W };

  const results = evaluateCircuitNetworks(cells, [
    { sourceIndex: 10, targetIndex: 12 },
    { sourceIndex: 20, targetIndex: 23 },
  ]);
  assert.deepEqual(results.map(result => result.complete), [true, false]);
});

test("network route ownership prevents leakage through an ordinary shared junction", () => {
  const cells = Array.from({ length: 25 }, () => ({ ports: 0 }));
  // Two paths geometrically meet at cell 12. Without route ownership, the
  // ordinary four-way junction would electrically merge both circuits.
  cells[10] = { ports: E, fixed: "source" };
  cells[11] = { ports: E | W };
  cells[12] = { ports: N | E | S | W };
  cells[13] = { ports: E | W };
  cells[14] = { ports: W, fixed: "target" };
  cells[2] = { ports: S };
  cells[7] = { ports: N | S };
  cells[17] = { ports: N | S };
  cells[22] = { ports: N };

  const results = evaluateCircuitNetworks(cells, [
    { sourceIndex: 10, targetIndex: 14, cellIndices: [10, 11, 12, 13, 14] },
    { sourceIndex: 2, targetIndex: 22, cellIndices: [2, 7, 12, 17, 22] },
  ]);
  assert.deepEqual(results.map(result => result.complete), [true, true]);
  assert.equal(results[0].connected.has(2), false, "horizontal route cannot enter vertical-only cells");
  assert.equal(results[1].connected.has(10), false, "vertical route cannot enter horizontal-only cells");
  assert.equal(results[0].connected.has(17), false);
  assert.equal(results[1].connected.has(13), false);
});

test("network route ownership rejects a source outside its assigned route", () => {
  const cells = Array.from({ length: 25 }, () => ({ ports: E | W }));
  const result = evaluateCircuitNetworks(cells, [
    { sourceIndex: 0, targetIndex: 4, cellIndices: [1, 2, 3, 4] },
  ])[0];
  assert.equal(result.complete, false);
  assert.equal(result.connected.size, 0);
});


test("seeded 7x7 multi-network puzzles contain two disjoint, independently solvable routes", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let puzzle = createMultiNetworkPuzzle(seed * 104729);
    assert.equal(puzzle.boardSize, 7);
    assert.equal(puzzle.cells.length, 49);
    assert.equal(puzzle.networks.length, 2);
    const [alpha, beta] = puzzle.networks;
    assert.notEqual(alpha.color, beta.color);
    assert.equal(alpha.boardSize, 7);
    assert.equal(beta.boardSize, 7);
    assert.ok(alpha.cellIndices.length >= 10 && alpha.cellIndices.length <= 35);
    assert.ok(beta.cellIndices.length >= 10 && beta.cellIndices.length <= 35);
    assert.equal(alpha.cellIndices.some(index => beta.cellIndices.includes(index)), false,
      "independent routes must not overlap");
    assert.equal(puzzle.cells[alpha.sourceIndex].fixed, "source");
    assert.equal(puzzle.cells[alpha.targetIndex].fixed, "target");
    assert.equal(puzzle.cells[beta.sourceIndex].fixed, "source");
    assert.equal(puzzle.cells[beta.targetIndex].fixed, "target");
    assert.equal(puzzle.solved, false, "fresh puzzle must not start completed");

    for (const network of puzzle.networks) {
      for (const index of network.cellIndices) {
        if (index === network.sourceIndex || index === network.targetIndex) continue;
        let guard = 0;
        while (puzzle.cells[index].ports !== network.solutionPorts[index] && guard++ < 4) {
          puzzle = rotateMultiNetworkCell(puzzle, index);
        }
        assert.equal(puzzle.cells[index].ports, network.solutionPorts[index],
          `seed ${seed}: route tile ${index} must align`);
      }
    }
    assert.equal(puzzle.solved, true, `seed ${seed}: both networks must complete`);
    const solved = evaluateCircuitNetworks(puzzle.cells, puzzle.networks);
    assert.deepEqual(solved.map(network => network.complete), [true, true]);
  }
});

test("multi-network route ownership prevents cross-network power leakage", () => {
  const puzzle = createMultiNetworkPuzzle(90210);
  const states = evaluateCircuitNetworks(puzzle.cells, puzzle.networks);
  assert.equal(states[0].connected.has(puzzle.networks[1].sourceIndex), false);
  assert.equal(states[1].connected.has(puzzle.networks[0].sourceIndex), false);
  assert.equal(states[0].connected.has(puzzle.networks[1].targetIndex), false);
  assert.equal(states[1].connected.has(puzzle.networks[0].targetIndex), false);
});


test("seeded multi-network boards vary spatial layout while preserving disjoint routes", () => {
  const signatures = new Set();
  for (let seed = 1; seed <= 256; seed++) {
    const puzzle = createMultiNetworkPuzzle(seed * 65537);
    const [alpha, beta] = puzzle.networks;
    signatures.add(alpha.cellIndices.join(",") + "|" + beta.cellIndices.join(","));
    assert.ok(alpha.cellIndices.length >= 10 && alpha.cellIndices.length <= 35);
    assert.ok(beta.cellIndices.length >= 10 && beta.cellIndices.length <= 35);
    assert.equal(alpha.cellIndices.some(index => beta.cellIndices.includes(index)), false);
    for (const network of puzzle.networks) {
      for (let i = 1; i < network.cellIndices.length; i++) {
        const previous = network.cellIndices[i - 1];
        const current = network.cellIndices[i];
        const distance = Math.abs(Math.floor(previous / 7) - Math.floor(current / 7))
          + Math.abs((previous % 7) - (current % 7));
        assert.equal(distance, 1, "every generated route step must be orthogonally adjacent");
      }
    }
  }
  assert.ok(signatures.size >= 8, `expected varied randomized route pairs, received only ${signatures.size}`);
});


test("multi-network generation is reproducible for the same seed", () => {
  for (const seed of [0, 1, 2, 42, 90210, 0xffffffff]) {
    const first = createMultiNetworkPuzzle(seed);
    const second = createMultiNetworkPuzzle(seed);
    assert.deepEqual(first, second, `seed ${seed} must produce an identical board`);
  }
});

test("each generated network owns its endpoints and every route tile", () => {
  for (let seed = 1; seed <= 128; seed++) {
    const puzzle = createMultiNetworkPuzzle(seed * 31337);
    for (const network of puzzle.networks) {
      assert.equal(puzzle.cells[network.sourceIndex].networkId, network.id);
      assert.equal(puzzle.cells[network.targetIndex].networkId, network.id);
      assert.equal(puzzle.cells[network.sourceIndex].fixed, "source");
      assert.equal(puzzle.cells[network.targetIndex].fixed, "target");
      assert.equal(network.cellIndices[0], network.sourceIndex);
      assert.equal(network.cellIndices.at(-1), network.targetIndex);
      for (const tile of network.cellIndices) {
        assert.equal(puzzle.cells[tile].networkId, network.id,
          `seed ${seed}: route ownership must match network ${network.id}`);
        assert.ok(network.solutionPorts[tile] > 0,
          `seed ${seed}: every route tile must have a valid solution mask`);
      }
    }
  }
});


test("three- and four-network generators preserve disjoint routes and solve completely", () => {
  for (const count of [3, 4]) {
    for (let seed = 1; seed <= 64; seed++) {
      let puzzle = createMultiNetworkPuzzle(seed * 99991, count);
      assert.equal(puzzle.networks.length, count);
      assert.equal(puzzle.cells.length, 49);
      const occupied = new Set();
      for (const network of puzzle.networks) {
        assert.ok(network.color);
        assert.equal(puzzle.cells[network.sourceIndex].fixed, "source");
        assert.equal(puzzle.cells[network.targetIndex].fixed, "target");
        assert.equal(network.cellIndices[0], network.sourceIndex);
        assert.equal(network.cellIndices.at(-1), network.targetIndex);
        for (let i = 0; i < network.cellIndices.length; i++) {
          const tile = network.cellIndices[i];
          assert.equal(occupied.has(tile), false, `count ${count}, seed ${seed}: routes overlap at ${tile}`);
          occupied.add(tile);
          assert.equal(puzzle.cells[tile].networkId, network.id);
          if (i > 0) {
            const previous = network.cellIndices[i - 1];
            const distance = Math.abs(Math.floor(previous / 7) - Math.floor(tile / 7)) + Math.abs((previous % 7) - (tile % 7));
            assert.equal(distance, 1);
          }
        }
      }
      for (const network of puzzle.networks) {
        for (const tile of network.cellIndices) {
          if (tile === network.sourceIndex || tile === network.targetIndex) continue;
          let guard = 0;
          while (puzzle.cells[tile].ports !== network.solutionPorts[tile] && guard++ < 4) puzzle = rotateMultiNetworkCell(puzzle, tile);
          assert.equal(puzzle.cells[tile].ports, network.solutionPorts[tile]);
        }
      }
      assert.equal(puzzle.solved, true, `count ${count}, seed ${seed} should solve`);
      assert.equal(evaluateCircuitNetworks(puzzle.cells, puzzle.networks).every(item => item.complete), true);
    }
  }
});

test("three- and four-network generation is deterministic", () => {
  for (const count of [3, 4]) for (const seed of [0, 1, 42, 90210, 0xffffffff]) {
    assert.deepEqual(createMultiNetworkPuzzle(seed, count), createMultiNetworkPuzzle(seed, count));
  }
});


test("multi-network rotations are immutable and reject invalid or fixed cells", () => {
  const puzzle = createMultiNetworkPuzzle(314159);
  const snapshot = structuredClone(puzzle);
  const source = puzzle.networks[0].sourceIndex;
  const target = puzzle.networks[0].targetIndex;

  assert.equal(rotateMultiNetworkCell(puzzle, -1), puzzle);
  assert.equal(rotateMultiNetworkCell(puzzle, puzzle.cells.length), puzzle);
  assert.equal(rotateMultiNetworkCell(puzzle, source), puzzle);
  assert.equal(rotateMultiNetworkCell(puzzle, target), puzzle);
  assert.deepEqual(puzzle, snapshot, "rejected rotations must not mutate the original puzzle");

  const rotatable = puzzle.networks[0].cellIndices[1];
  const next = rotateMultiNetworkCell(puzzle, rotatable);
  assert.notEqual(next, puzzle);
  assert.equal(next.moves, puzzle.moves + 1);
  assert.deepEqual(puzzle, snapshot, "accepted rotations must also preserve the input puzzle");
});

test("multi-network seed normalization is stable across unsigned overflow", () => {
  assert.deepEqual(createMultiNetworkPuzzle(0), createMultiNetworkPuzzle(0x1_0000_0000));
  assert.deepEqual(createMultiNetworkPuzzle(-1), createMultiNetworkPuzzle(0xffffffff));
});


test("2, 3 and 4 network generators produce disjoint solvable routes across seeds", () => {
  for (const networkCount of [2, 3, 4]) {
    for (let seed = 1; seed <= 60; seed++) {
      let puzzle = createMultiNetworkPuzzle(seed * 65537 + networkCount, networkCount);
      assert.equal(puzzle.networks.length, networkCount, `${networkCount} networks, seed ${seed}: network count`);
      assert.equal(puzzle.cells.length, 49);
      const occupied = new Set();
      for (const network of puzzle.networks) {
        assert.ok(network.cellIndices.length >= (networkCount === 2 ? 10 : 7));
        assert.equal(network.cellIndices[0], network.sourceIndex);
        assert.equal(network.cellIndices.at(-1), network.targetIndex);
        assert.equal(puzzle.cells[network.sourceIndex].fixed, "source");
        assert.equal(puzzle.cells[network.targetIndex].fixed, "target");
        for (const index of network.cellIndices) {
          assert.equal(occupied.has(index), false, "routes must be disjoint");
          occupied.add(index);
        }
        for (const index of network.cellIndices.slice(1, -1)) {
          let turns = 0;
          while (puzzle.cells[index].ports !== network.solutionPorts[index] && turns < 4) {
            puzzle = rotateMultiNetworkCell(puzzle, index);
            turns++;
          }
          assert.equal(puzzle.cells[index].ports, network.solutionPorts[index],
            `${networkCount} networks, seed ${seed}: route tile ${index} aligns`);
        }
      }
      const results = evaluateCircuitNetworks(puzzle.cells, puzzle.networks);
      assert.ok(results.every(result => result.complete),
        `${networkCount} networks, seed ${seed}: every route must power its own destination`);
      assert.equal(puzzle.solved, true,
        `${networkCount} networks, seed ${seed}: final puzzle state must be solved`);
    }
  }
});
