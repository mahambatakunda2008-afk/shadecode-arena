import { describe, expect, it } from "vitest";
import { applySwap, createGame, dailyChallengeSeed, RULES_VERSION, verifyReplay } from "../src/index";

describe("Tile Rush deterministic engine", () => {
  it("creates identical boards and random streams for the same seed", () => {
    const a=createGame(123456),b=createGame(123456);
    expect(a.board).toEqual(b.board);expect(a.rngState).toBe(b.rngState);
    expect(a.board).toHaveLength(8);expect(a.board.every(row=>row.length===8)).toBe(true);
  });
  it("creates a stable board with six valid colour values", () => {
    const state=createGame(99);
    expect(state.board.flat().every(tile=>tile.colour>=0&&tile.colour<6)).toBe(true);
    for(let row=0;row<8;row++)for(let col=0;col<8;col++){
      const tile=state.board[row][col];
      if(col>=2)expect([state.board[row][col-1].colour,state.board[row][col-2].colour].every(c=>c===tile.colour)).toBe(false);
      if(row>=2)expect([state.board[row-1][col].colour,state.board[row-2][col].colour].every(c=>c===tile.colour)).toBe(false);
    }
  });
  it("rejects non-adjacent swaps without mutating the board",()=>{
    const state=createGame(7),result=applySwap(state,{from:{row:0,col:0},to:{row:2,col:0}});
    expect(result.accepted).toBe(false);expect(result.reason).toBe("not_adjacent");
    expect(result.state.board).toEqual(state.board);expect(result.state.movesUsed).toBe(0);
  });
  it("counts a no-match swap as invalid but not as a move",()=>{
    const state=createGame(17);let rejected;
    for(let row=0;row<8&&!rejected;row++)for(let col=0;col<7&&!rejected;col++){
      const result=applySwap(state,{from:{row,col},to:{row,col:col+1}});
      if(result.reason==="no_match")rejected=result;
    }
    expect(rejected).toBeDefined();expect(rejected!.state.invalidAttempts).toBe(1);
    expect(rejected!.state.movesUsed).toBe(0);expect(rejected!.scoreGained).toBe(0);
  });
  it("reconstructs a replay from its seed and exact rules version",()=>{
    const result=verifyReplay({rulesVersion:RULES_VERSION,seed:123,mode:"ranked",swaps:[]});
    expect(result.valid).toBe(true);expect(result.state?.board).toEqual(createGame(123).board);
  });
  it("rejects a replay with another rules version",()=>{
    expect(verifyReplay({rulesVersion:"future-rules",seed:1,mode:"ranked",swaps:[]})).toEqual({valid:false,error:"rules_version_mismatch"});
  });
  it("does not accept client-side Blitz replays without timestamped events",()=>{
    expect(verifyReplay({rulesVersion:RULES_VERSION,seed:1,mode:"blitz",swaps:[]})).toEqual({valid:false,error:"blitz_requires_timestamped_events"});
  });
});

function firstLegalSwap(state: ReturnType<typeof createGame>) {
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    for(const [dr,dc] of [[0,1],[1,0]]){
      const to={row:row+dr,col:col+dc};
      if(to.row>=8||to.col>=8)continue;
      const swap={from:{row,col},to};
      const result=applySwap(state,swap,"ranked");
      if(result.accepted)return {swap,result};
    }
  }
  throw new Error("Engine returned a board with no legal move");
}

it("replays a sequence of accepted moves to the identical authoritative state",()=>{
  let state=createGame(20261101);
  const swaps=[];
  for(let i=0;i<12;i++){
    const next=firstLegalSwap(state);
    swaps.push(next.swap);
    state=next.result.state;
  }
  const replay=verifyReplay({rulesVersion:RULES_VERSION,seed:20261101,mode:"ranked",swaps});
  expect(replay.valid).toBe(true);
  expect(replay.state).toEqual(state);
});

it("ends Ranked after exactly 30 accepted moves",()=>{
  let state=createGame(404);
  for(let i=0;i<30;i++){
    const next=firstLegalSwap(state);
    state=next.result.state;
  }
  expect(state.movesUsed).toBe(30);
  expect(state.status).toBe("complete");
  expect(applySwap(state,{from:{row:0,col:0},to:{row:0,col:1}}).reason).toBe("game_complete");
});

it("keeps invalid attempts separate from the 30-move Ranked limit",()=>{
  let state=createGame(808);
  let invalidFound=false;
  for(let row=0;row<8&&!invalidFound;row++)for(let col=0;col<7&&!invalidFound;col++){
    const result=applySwap(state,{from:{row,col},to:{row,col:col+1}});
    if(result.reason==="no_match"){state=result.state;invalidFound=true;}
  }
  expect(invalidFound).toBe(true);
  expect(state.movesUsed).toBe(0);
  expect(state.invalidAttempts).toBe(1);
});

function boardHasMatch(board: ReturnType<typeof createGame>["board"]): boolean {
  for (let row=0; row<8; row++) for (let col=0; col<8; col++) {
    const colour=board[row][col].colour;
    if (col>=2 && board[row][col-1].colour===colour && board[row][col-2].colour===colour) return true;
    if (row>=2 && board[row-1][col].colour===colour && board[row-2][col].colour===colour) return true;
  }
  return false;
}
it("keeps 1,000 seeded starting boards match-free and playable",()=>{
  for(let seed=1;seed<=1000;seed++){
    const state=createGame(seed);
    expect(boardHasMatch(state.board), `seed ${seed} starts with a match`).toBe(false);
    let legal=false;
    for(let row=0;row<8&&!legal;row++)for(let col=0;col<8&&!legal;col++){
      for(const [dr,dc] of [[0,1],[1,0]]){
        const to={row:row+dr,col:col+dc};
        if(to.row<8&&to.col<8&&applySwap(state,{from:{row,col},to}).accepted){legal=true;break;}
      }
    }
    expect(legal, `seed ${seed} has no legal move`).toBe(true);
    expect(state.board.flat().every(tile=>Number.isInteger(tile.colour)&&tile.colour>=0&&tile.colour<6)).toBe(true);
  }
});
it("rejects out-of-bounds swaps without changing game state",()=>{
  const state=createGame(8);
  const result=applySwap(state,{from:{row:0,col:0},to:{row:0,col:8}});
  expect(result.accepted).toBe(false);
  expect(result.reason).toBe("out_of_bounds");
  expect(result.state).toEqual(state);
});


describe("Tile Rush special combinations", () => {
  function comboState(left: "line" | "prism" | "burst", right: "line" | "prism" | "burst" | undefined) {
    const state=createGame(9001);
    state.board=Array.from({length:8},(_,row)=>Array.from({length:8},(_,col)=>({colour:(row+col)%2})));
    state.board[3][3]={colour:0,special:left};
    state.board[3][4]=right?{colour:1,special:right}:{colour:1};
    return state;
  }
  function play(left: "line" | "prism" | "burst", right: "line" | "prism" | "burst" | undefined) {
    return applySwap(comboState(left,right),{from:{row:3,col:3},to:{row:3,col:4}},"practice");
  }

  it("combines two Line Clears into a full crossing row and column",()=>{
    const result=play("line","line");
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(15);
  });
  it("combines Line Clear and Burst into three rows and three columns",()=>{
    const result=play("line","burst");
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(39);
  });
  it("combines two Bursts into a 5 by 5 area",()=>{
    const result=play("burst","burst");
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(25);
  });
  it("combines two Prisms into a board-wide clear",()=>{
    const result=play("prism","prism");
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(64);
  });
  it("combines Prism and a normal tile by clearing its colour",()=>{
    const result=play("prism",undefined);
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(32);
  });
  it("combines Prism and another special by converting that colour into the partner special",()=>{
    const result=play("prism","line");
    expect(result.accepted).toBe(true);
    expect(result.cleared).toBeGreaterThanOrEqual(32);
  });
});


describe("Daily challenge seed",()=>{
  it("gives every player the same seed for a UTC date",()=>{
    expect(dailyChallengeSeed("2026-11-01")).toBe(dailyChallengeSeed("2026-11-01"));
  });
  it("changes the seed on a different UTC date",()=>{
    expect(dailyChallengeSeed("2026-11-01")).not.toBe(dailyChallengeSeed("2026-11-02"));
  });
  it("rejects invalid calendar dates",()=>{
    expect(()=>dailyChallengeSeed("2026-02-30")).toThrow("invalid_utc_date");
  });
  it("rejects non-ISO date formats",()=>{
    expect(()=>dailyChallengeSeed("01/11/2026")).toThrow("date_must_be_YYYY-MM-DD");
  });
});


describe("Tile Rush state integrity", () => {
  it("does not mutate the caller's state when an accepted move resolves", () => {
    const original = createGame(20261102);
    const snapshot = structuredClone(original);
    const accepted = firstLegalSwap(original);
    expect(accepted.result.accepted).toBe(true);
    expect(original).toEqual(snapshot);
  });

  it("produces identical state transitions for identical seeded inputs", () => {
    const first = createGame(0xabcdef01);
    const second = createGame(0xabcdef01);
    const swap = firstLegalSwap(first).swap;
    expect(applySwap(first, swap)).toEqual(applySwap(second, swap));
  });

  it("keeps invalid-attempt accounting deterministic in replay verification", () => {
    const initial = createGame(1701);
    let invalidSwap;
    for (let row = 0; row < 8 && !invalidSwap; row++) {
      for (let col = 0; col < 7 && !invalidSwap; col++) {
        const candidate = { from: { row, col }, to: { row, col: col + 1 } };
        if (applySwap(initial, candidate).reason === "no_match") invalidSwap = candidate;
      }
    }
    expect(invalidSwap).toBeDefined();
    const replay = verifyReplay({
      rulesVersion: RULES_VERSION,
      seed: 1701,
      mode: "practice",
      swaps: [invalidSwap!],
    });
    expect(replay.valid).toBe(true);
    expect(replay.state?.invalidAttempts).toBe(1);
    expect(replay.state?.movesUsed).toBe(0);
  });

  it("normalizes zero and unsigned overflow seeds deterministically", () => {
    expect(createGame(0)).toEqual(createGame(0x6d2b79f5));
    expect(createGame(-1)).toEqual(createGame(0xffffffff));
    expect(createGame(0x1_0000_0001)).toEqual(createGame(1));
  });
});


describe("Replay input validation", () => {
  const replay = { rulesVersion: RULES_VERSION, seed: 42, mode: "practice" as const, swaps: [] };

  it("rejects a missing replay object without throwing", () => {
    expect(verifyReplay(undefined as never)).toEqual({ valid: false, error: "malformed_replay" });
    expect(verifyReplay(null as never)).toEqual({ valid: false, error: "malformed_replay" });
  });

  it("rejects unsupported modes and malformed seeds", () => {
    expect(verifyReplay({ ...replay, mode: "spectator" } as never)).toEqual({ valid: false, error: "invalid_mode" });
    expect(verifyReplay({ ...replay, seed: Number.NaN })).toEqual({ valid: false, error: "invalid_seed" });
    expect(verifyReplay({ ...replay, seed: 1.5 })).toEqual({ valid: false, error: "invalid_seed" });
  });

  it("rejects a non-array swap collection", () => {
    expect(verifyReplay({ ...replay, swaps: null } as never)).toEqual({ valid: false, error: "invalid_swaps" });
  });

  it("rejects missing, non-integer and non-object swap coordinates", () => {
    expect(verifyReplay({ ...replay, swaps: [null] } as never)).toEqual({ valid: false, error: "malformed_swap_0" });
    expect(verifyReplay({ ...replay, swaps: [{ from: { row: 0.5, col: 0 }, to: { row: 0, col: 1 } }] } as never))
      .toEqual({ valid: false, error: "malformed_swap_0" });
    expect(verifyReplay({ ...replay, swaps: [{ from: null, to: { row: 0, col: 1 } }] } as never))
      .toEqual({ valid: false, error: "malformed_swap_0" });
  });

  it("keeps structurally valid but out-of-board swaps as indexed replay errors", () => {
    expect(verifyReplay({ ...replay, swaps: [{ from: { row: 0, col: 0 }, to: { row: 0, col: 8 } }] }))
      .toEqual({ valid: false, error: "invalid_swap_0:out_of_bounds" });
  });
});
