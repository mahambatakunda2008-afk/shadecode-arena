import {
  activateCircuitSwitch,
  createCircuitPuzzle,
  rotateCircuitCell,
  type CircuitPuzzle,
} from "../../../apps/mobile/src/circuit-breaker.ts";

export const CIRCUIT_BREAKER_RULES_VERSION = "circuit-breaker-1";
export type CircuitAction =
  | { type: "rotate"; cellIndex: number }
  | { type: "activate_switch" };
export type CircuitReplay = {
  rulesVersion: string;
  mode: "ranked";
  level: number;
  seed: number;
  actions: CircuitAction[];
};
export type CircuitReplayResult =
  | { valid: true; state: CircuitPuzzle; acceptedActions: number }
  | { valid: false; code: "INVALID_REPLAY" | "REPLAY_REJECTED" | "REPLAY_INCOMPLETE" };

const MAX_ACTIONS = 128;
const MAX_LEVEL = 10_000;

export function verifyCircuitBreakerReplay(value: unknown): CircuitReplayResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, code: "INVALID_REPLAY" };
  }
  const replay = value as Record<string, unknown>;
  if (
    replay.rulesVersion !== CIRCUIT_BREAKER_RULES_VERSION ||
    replay.mode !== "ranked" ||
    !Number.isInteger(replay.level) || (replay.level as number) < 1 ||
    (replay.level as number) > MAX_LEVEL ||
    !Number.isSafeInteger(replay.seed) || (replay.seed as number) < 0 ||
    (replay.seed as number) > 0xffff_ffff ||
    !Array.isArray(replay.actions) || replay.actions.length < 1 ||
    replay.actions.length > MAX_ACTIONS
  ) return { valid: false, code: "INVALID_REPLAY" };

  let state = createCircuitPuzzle(replay.level as number, replay.seed as number);
  let acceptedActions = 0;

  for (const rawAction of replay.actions) {
    if (!rawAction || typeof rawAction !== "object" || Array.isArray(rawAction) || state.solved) {
      return { valid: false, code: "REPLAY_REJECTED" };
    }
    const action = rawAction as Record<string, unknown>;
    const beforeMoves = state.moves;

    if (action.type === "rotate" && Object.keys(action).length === 2 &&
        Object.hasOwn(action, "cellIndex")) {
      if (!Number.isInteger(action.cellIndex) ||
          (action.cellIndex as number) < 0 || (action.cellIndex as number) >= state.cells.length) {
        return { valid: false, code: "INVALID_REPLAY" };
      }
      state = rotateCircuitCell(state, action.cellIndex as number);
    } else if (action.type === "activate_switch" && Object.keys(action).length === 1) {
      state = activateCircuitSwitch(state);
    } else {
      return { valid: false, code: "INVALID_REPLAY" };
    }

    // The engine intentionally ignores illegal rotations and redundant switch
    // activations. Ranked replays must not be allowed to pad or disguise actions.
    if (state.moves !== beforeMoves + 1) return { valid: false, code: "REPLAY_REJECTED" };
    acceptedActions++;
  }

  if (!state.solved || state.moves !== acceptedActions) {
    return { valid: false, code: "REPLAY_INCOMPLETE" };
  }
  return { valid: true, state, acceptedActions };
}
