export const RULES_VERSION = "tile-rush-3";
export const BOARD_SIZE = 8;
export const COLOURS = 6;
export const RANKED_MOVES = 30;
export const BLITZ_DURATION_MS = 90_000;

export type Special = "line" | "prism" | "burst";
export type Tile = { colour: number; special?: Special };
export type Position = { row: number; col: number };
export type Swap = { from: Position; to: Position };
export type Mode = "ranked" | "practice" | "blitz";
export type Board = Tile[][];

/** Stable UTC-day seed so every player receives the same offline daily board. */
export function dailyChallengeSeed(utcDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(utcDate)) throw new Error("date_must_be_YYYY-MM-DD");
  const parsed = new Date(utcDate + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== utcDate) {
    throw new Error("invalid_utc_date");
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < utcDate.length; i++) {
    hash ^= utcDate.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 1;
}

export interface GameState {
  rulesVersion: typeof RULES_VERSION;
  seed: number;
  rngState: number;
  board: Board;
  score: number;
  movesUsed: number;
  invalidAttempts: number;
  cascades: number;
  /** Dominant colour cleared by the previous accepted move, or null before play. */
  resonanceColour: number | null;
  /** Consecutive accepted moves that repeat the same dominant clear colour. */
  resonanceStreak: number;
  status: "active" | "complete";
}
export interface MoveResult {
  accepted: boolean;
  reason?: "game_complete" | "out_of_bounds" | "not_adjacent" | "no_match";
  state: GameState;
  cleared: number;
  cascades: number;
  scoreGained: number;
}
export interface Replay { rulesVersion: string; seed: number; mode: Mode; swaps: Swap[]; }

const cloneBoard = (board: Board): Board => board.map(row => row.map(tile => ({ ...tile })));
const cloneState = (state: GameState): GameState => ({ ...state, board: cloneBoard(state.board) });
const key = (row: number, col: number) => row * BOARD_SIZE + col;
const inside = (p: Position) => p.row >= 0 && p.row < BOARD_SIZE && p.col >= 0 && p.col < BOARD_SIZE;

function nextRandom(state: number): [number, number] {
  let x = state >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
  return [x / 0x1_0000_0000, x || 0x9e3779b9];
}
function randomInt(state: number, max: number): [number, number] {
  const [value, next] = nextRandom(state);
  return [Math.floor(value * max), next];
}
const makeTile = (colour: number): Tile => ({ colour });

function findMatches(board: Board): Set<number> {
  const matched = new Set<number>();
  for (let row = 0; row < BOARD_SIZE; row++) {
    let start = 0;
    while (start < BOARD_SIZE) {
      const colour = board[row][start].colour;
      let end = start + 1;
      while (end < BOARD_SIZE && board[row][end].colour === colour) end++;
      if (end - start >= 3) for (let col = start; col < end; col++) matched.add(key(row, col));
      start = end;
    }
  }
  for (let col = 0; col < BOARD_SIZE; col++) {
    let start = 0;
    while (start < BOARD_SIZE) {
      const colour = board[start][col].colour;
      let end = start + 1;
      while (end < BOARD_SIZE && board[end][col].colour === colour) end++;
      if (end - start >= 3) for (let row = start; row < end; row++) matched.add(key(row, col));
      start = end;
    }
  }
  return matched;
}
function groupsForMatches(matches: Set<number>): number[][] {
  const remaining = new Set(matches);
  const groups: number[][] = [];
  while (remaining.size) {
    const first = remaining.values().next().value as number;
    const queue = [first], group: number[] = [];
    remaining.delete(first);
    while (queue.length) {
      const current = queue.pop()!;
      group.push(current);
      const row = Math.floor(current / BOARD_SIZE), col = current % BOARD_SIZE;
      for (const [r, c] of [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]) {
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
        const candidate = key(r,c);
        if (remaining.has(candidate)) { remaining.delete(candidate); queue.push(candidate); }
      }
    }
    groups.push(group.sort((a,b) => a-b));
  }
  return groups;
}
function specialForGroup(group: number[]): { at: number; special: Special } | undefined {
  const positions = group.map(i => ({ row: Math.floor(i / BOARD_SIZE), col: i % BOARD_SIZE }));
  const rows = new Set(positions.map(p => p.row)), cols = new Set(positions.map(p => p.col));
  const straight = rows.size === 1 || cols.size === 1;
  if (straight && group.length >= 5) return { at: group[Math.floor(group.length / 2)], special: "prism" };
  if (!straight && group.length >= 5) return { at: group[0], special: "burst" };
  if (straight && group.length === 4) return { at: group[Math.floor(group.length / 2)], special: "line" };
  return undefined;
}
function activateSpecial(board: Board, index: number, clear: Set<number>): void {
  const row = Math.floor(index / BOARD_SIZE), col = index % BOARD_SIZE;
  const tile = board[row][col];
  if (tile.special === "line") {
    for (let i=0;i<BOARD_SIZE;i++) { clear.add(key(row,i)); clear.add(key(i,col)); }
  } else if (tile.special === "burst") {
    for (let r=Math.max(0,row-1);r<=Math.min(BOARD_SIZE-1,row+1);r++)
      for (let c=Math.max(0,col-1);c<=Math.min(BOARD_SIZE-1,col+1);c++) clear.add(key(r,c));
  } else if (tile.special === "prism") {
    for (let r=0;r<BOARD_SIZE;r++) for (let c=0;c<BOARD_SIZE;c++)
      if (board[r][c].colour === tile.colour) clear.add(key(r,c));
  }
}
function specialComboClear(board: Board, from: Position, to: Position): Set<number> | undefined {
  const a=board[from.row][from.col], b=board[to.row][to.col];
  if (!a.special || !b.special) {
    const prism=a.special==="prism"?a:b.special==="prism"?b:undefined;
    const partner=a.special==="prism"?b:b.special==="prism"?a:undefined;
    if (!prism || !partner) return undefined;
    const clear=new Set<number>();
    for(let row=0;row<BOARD_SIZE;row++) for(let col=0;col<BOARD_SIZE;col++) {
      const tile=board[row][col];
      if(tile.colour===partner.colour) clear.add(key(row,col));
    }
    return clear;
  }
  const clear=new Set<number>();
  const addRow=(row:number)=>{for(let col=0;col<BOARD_SIZE;col++)clear.add(key(row,col));};
  const addCol=(col:number)=>{for(let row=0;row<BOARD_SIZE;row++)clear.add(key(row,col));};
  const addArea=(center:Position,radius:number)=>{
    for(let row=Math.max(0,center.row-radius);row<=Math.min(BOARD_SIZE-1,center.row+radius);row++)
      for(let col=Math.max(0,center.col-radius);col<=Math.min(BOARD_SIZE-1,center.col+radius);col++)clear.add(key(row,col));
  };
  if(a.special==="prism"&&b.special==="prism") {
    for(let i=0;i<BOARD_SIZE*BOARD_SIZE;i++)clear.add(i);
  } else if(a.special==="prism"||b.special==="prism") {
    const partner=a.special==="prism"?b:a;
    for(let row=0;row<BOARD_SIZE;row++)for(let col=0;col<BOARD_SIZE;col++){
      const tile=board[row][col];
      if(tile.colour===partner.colour) {
        tile.special=partner.special;
        clear.add(key(row,col));
      }
    }
  } else if(a.special==="line"&&b.special==="line") {
    addRow(to.row);addCol(to.col);
  } else if((a.special==="line"&&b.special==="burst")||(a.special==="burst"&&b.special==="line")) {
    for(let offset=-1;offset<=1;offset++){
      const row=to.row+offset,col=to.col+offset;
      if(row>=0&&row<BOARD_SIZE)addRow(row);
      if(col>=0&&col<BOARD_SIZE)addCol(col);
    }
  } else if(a.special==="burst"&&b.special==="burst") {
    addArea(to,2);
  } else {
    return undefined;
  }
  return clear;
}
function hasLegalMove(board: Board): boolean {
  for (let row=0;row<BOARD_SIZE;row++) for (let col=0;col<BOARD_SIZE;col++) {
    for (const [dr,dc] of [[0,1],[1,0]]) {
      const r=row+dr,c=col+dc; if (r>=BOARD_SIZE || c>=BOARD_SIZE) continue;
      const copy=cloneBoard(board);
      [copy[row][col],copy[r][c]]=[copy[r][c],copy[row][col]];
      if (findMatches(copy).size) return true;
    }
  }
  return false;
}
function fillStableBoard(board: Board, rngState: number): { board: Board; rngState: number } {
  let next=rngState;
  for (let row=0;row<BOARD_SIZE;row++) for (let col=0;col<BOARD_SIZE;col++) {
    let colour=0, attempts=0;
    do {
      [colour,next]=randomInt(next,COLOURS); attempts++;
    } while (attempts<32 && ((col>=2 && board[row][col-1].colour===colour && board[row][col-2].colour===colour) ||
      (row>=2 && board[row-1][col].colour===colour && board[row-2][col].colour===colour)));
    board[row][col]=makeTile(colour);
  }
  return {board,rngState:next};
}
export function createGame(seed: number): GameState {
  const normalizedSeed=(seed>>>0)||0x6d2b79f5;
  const board=Array.from({length:BOARD_SIZE},()=>Array.from({length:BOARD_SIZE},()=>makeTile(0)));
  const filled=fillStableBoard(board,normalizedSeed);
  let state:GameState={rulesVersion:RULES_VERSION,seed:normalizedSeed,rngState:filled.rngState,board:filled.board,
    score:0,movesUsed:0,invalidAttempts:0,cascades:0,resonanceColour:null,resonanceStreak:0,status:"active"};
  let guard=0;
  while (!hasLegalMove(state.board) && guard++<64) {
    const reshuffled=fillStableBoard(cloneBoard(state.board),state.rngState);
    state={...state,board:reshuffled.board,rngState:reshuffled.rngState};
  }
  return state;
}
function gravityAndRefill(board: Board,rngState: number):{board:Board;rngState:number} {
  let next=rngState;
  for(let col=0;col<BOARD_SIZE;col++){
    const survivors:Tile[]=[];
    for(let row=BOARD_SIZE-1;row>=0;row--) if(board[row][col]) survivors.push(board[row][col]);
    let write=BOARD_SIZE-1;
    for(const tile of survivors) board[write--][col]=tile;
    while(write>=0){let colour:number;[colour,next]=randomInt(next,COLOURS);board[write--][col]=makeTile(colour);}
  }
  return {board,rngState:next};
}
function resolve(boardInput:Board,rngInput:number,initialClear: Set<number> = new Set()):{board:Board;rngState:number;cleared:number;cascades:number;score:number}{
  let board=cloneBoard(boardInput),rngState=rngInput,clearedTotal=0,cascade=0,score=0;
  let pendingClear=new Set(initialClear);
  while(cascade<128){
    const matches=findMatches(board);
    if(!matches.size&&!pendingClear.size)break;
    cascade++;
    const groups=groupsForMatches(matches);
    const specials=groups.map(specialForGroup).filter(Boolean) as {at:number;special:Special}[];
    const clear=new Set<number>([...matches,...pendingClear]);
    pendingClear=new Set();
    for(const item of specials){
      const row=Math.floor(item.at/BOARD_SIZE),col=item.at%BOARD_SIZE;
      board[row][col]={...board[row][col],special:item.special};
      if(!initialClear.has(item.at)) clear.delete(item.at);
    }
    let activated=0;
    const processed=new Set<number>();
    const queue=[...clear];
    while(queue.length){
      const index=queue.pop()!;
      if(processed.has(index))continue;
      processed.add(index);
      const row=Math.floor(index/BOARD_SIZE),col=index%BOARD_SIZE;
      if(!board[row][col].special)continue;
      activated++;
      const before=clear.size;
      activateSpecial(board,index,clear);
      if(clear.size>before)for(const added of clear)if(!processed.has(added))queue.push(added);
    }
    const count=clear.size;
    const expanded=Math.max(0,count-matches.size);
    clearedTotal+=count;
    const multiplier=cascade===1?1:cascade===2?1.5:cascade===3?2:2.5;
    score+=Math.round((10*count+25*activated+5*expanded)*multiplier);
    for(const index of clear){const row=Math.floor(index/BOARD_SIZE),col=index%BOARD_SIZE;board[row][col]=undefined as unknown as Tile;}
    const refilled=gravityAndRefill(board,rngState);board=refilled.board;rngState=refilled.rngState;
  }
  return {board,rngState,cleared:clearedTotal,cascades:cascade,score};
}
export function applySwap(input:GameState,swap:Swap,mode:Mode="ranked"):MoveResult{
  const state=cloneState(input);
  if(state.status!=="active")return{accepted:false,reason:"game_complete",state,cleared:0,cascades:0,scoreGained:0};
  if(!inside(swap.from)||!inside(swap.to))return{accepted:false,reason:"out_of_bounds",state,cleared:0,cascades:0,scoreGained:0};
  const distance=Math.abs(swap.from.row-swap.to.row)+Math.abs(swap.from.col-swap.to.col);
  if(distance!==1)return{accepted:false,reason:"not_adjacent",state,cleared:0,cascades:0,scoreGained:0};
  const board=cloneBoard(state.board),{row:r1,col:c1}=swap.from,{row:r2,col:c2}=swap.to;
  [board[r1][c1],board[r2][c2]]=[board[r2][c2],board[r1][c1]];
  const comboClear=specialComboClear(board,{row:r1,col:c1},{row:r2,col:c2});
  if(!findMatches(board).size&&!comboClear){state.invalidAttempts++;return{accepted:false,reason:"no_match",state,cleared:0,cascades:0,scoreGained:0};}
  const matched=findMatches(board);
  const colourCounts=new Array<number>(COLOURS).fill(0);
  for(const index of matched){const row=Math.floor(index/BOARD_SIZE),col=index%BOARD_SIZE;colourCounts[board[row][col].colour]++;}
  // A special-only combo still has a deterministic signature: the colour of
  // the tile moved into the destination cell.
  let resonanceColour=r2>=0&&r2<BOARD_SIZE&&c2>=0&&c2<BOARD_SIZE?board[r2][c2].colour:0;
  for(let colour=0;colour<COLOURS;colour++)if(colourCounts[colour]>colourCounts[resonanceColour])resonanceColour=colour;
  const resonanceStreak=state.resonanceColour===resonanceColour?state.resonanceStreak+1:1;
  const resolved=resolve(board,state.rngState,comboClear ?? new Set());
  // Repeating a colour signature on consecutive accepted moves builds
  // Resonance. The capped 15/30/45% bonus rewards deliberate colour planning.
  const resonanceMultiplier=1+Math.min(3,Math.max(0,resonanceStreak-1))*0.15;
  const resonanceBonus=Math.round(resolved.score*(resonanceMultiplier-1));
  state.board=resolved.board;state.rngState=resolved.rngState;state.score+=resolved.score+resonanceBonus;
  state.resonanceColour=resonanceColour;state.resonanceStreak=resonanceStreak;
  state.movesUsed++;state.cascades+=resolved.cascades;
  let reshuffleGuard=0;
  while(!hasLegalMove(state.board)&&reshuffleGuard++<64){
    const reshuffled=fillStableBoard(cloneBoard(state.board),state.rngState);
    state.board=reshuffled.board;state.rngState=reshuffled.rngState;
  }
  if(mode==="ranked"&&state.movesUsed>=RANKED_MOVES)state.status="complete";
  return{accepted:true,state,cleared:resolved.cleared,cascades:resolved.cascades,scoreGained:resolved.score+resonanceBonus};
}
export function verifyReplay(replay:Replay):{valid:boolean;state?:GameState;error?:string}{
  if(replay.rulesVersion!==RULES_VERSION)return{valid:false,error:"rules_version_mismatch"};
  if(replay.mode==="blitz")return{valid:false,error:"blitz_requires_timestamped_events"};
  let state=createGame(replay.seed);
  for(let i=0;i<replay.swaps.length;i++){
    if(state.status!=="active")return{valid:false,error:"moves_after_completion"};
    const result=applySwap(state,replay.swaps[i],replay.mode);
    if(!result.accepted&&result.reason!=="no_match")return{valid:false,error:"invalid_swap_"+i+":"+result.reason};
    state=result.state;
  }
  return{valid:true,state};
}
