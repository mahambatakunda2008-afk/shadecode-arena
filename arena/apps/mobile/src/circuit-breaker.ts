export type PipeCell = { ports: number; fixed?: "source" | "target"; decoy?: boolean; blocked?: boolean; bridge?: boolean; networkId?: string };
export type CircuitPuzzle = { cells: PipeCell[]; solutionPorts: number[]; routeCells: boolean[]; checkpointIndices: number[]; reachedCheckpoints: number; branchIndices: number[]; switchIndex: number | null; switchActive: boolean; seed: number; level: number; moves: number; solved: boolean };
export type CircuitHint = { cellIndex: number; rotationsRemaining: number } | { activateSwitch: true } | null;
export type CircuitNetwork = { sourceIndex: number; targetIndex: number; cellIndices?: number[]; boardSize?: number; id?: string; color?: string; solutionPorts?: number[] };
export type CircuitNetworkState = { network: CircuitNetwork; connected: Set<number>; complete: boolean };
export type MultiNetworkPuzzle = { cells: PipeCell[]; networks: CircuitNetwork[]; moves: number; solved: boolean; seed: number; boardSize: number };
export const N=1,E=2,S=4,W=8;
const rotate=(mask:number)=>((mask<<1)&15)|(mask>>3);
function random(seed:number){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
const index=(r:number,c:number)=>r*5+c;
const direction=(a:number,b:number)=>{const ar=Math.floor(a/5),ac=a%5,br=Math.floor(b/5),bc=b%5;if(br<ar)return N;if(bc>ac)return E;if(br>ar)return S;return W;};
const opposite=(d:number)=>d===N?S:d===S?N:d===E?W:E;
const shuffled=(values:number[],rand:()=>number)=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};

/** Build a seeded, self-avoiding route with occasional detours.
 * The bounded DFS keeps generation cheap while producing longer, less predictable
 * networks than the original monotonic shortest-path family.
 */
function createRoute(rand:()=>number):number[]{
 const start=index(4,0),target=index(0,4),path=[start],visited=new Set(path);
 let budget=24000;
 const walk=(current:number):boolean=>{
  if(--budget<=0)return false;
  if(current===target)return path.length>=10&&path.slice(2,-2).some((tile,i)=>direction(tile,path[i+1])===opposite(direction(tile,path[i+3])));
  if(path.length>=18)return false;
  const r=Math.floor(current/5),c=current%5;
  const next=shuffled([[r-1,c],[r,c+1],[r+1,c],[r,c-1]]
   .filter(([nr,nc])=>nr>=0&&nr<5&&nc>=0&&nc<5)
   .map(([nr,nc])=>index(nr,nc)),rand)
   .filter(i=>!visited.has(i));
  for(const candidate of next){
   // Leave enough board space for a detour, but never trap the target behind us.
   visited.add(candidate);path.push(candidate);
   if(walk(candidate))return true;
   path.pop();visited.delete(candidate);
  }
  return false;
 };
 if(walk(start))return path;
 // Guaranteed fallback: the original eight-step route always exists.
 const steps=[N,N,E,E,N,N,E,E],fallback=[start];
 for(const step of steps){const here=fallback[fallback.length-1],r=Math.floor(here/5),c=here%5;fallback.push(step===N?index(r-1,c):index(r,c+1));}
 return fallback;
}

/** Seeded route between the fixed source and target, including non-monotonic detours. */
export function createCircuitPuzzle(level=1,seed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0):CircuitPuzzle{
 const safeLevel=Math.max(1,Math.floor(level)||1),rand=random(seed);
 const route=createRoute(rand);
 const routeCells=Array.from({length:25},()=>false);
 const solutionPorts=Array.from({length:25},()=>0);
 const cells:PipeCell[]=Array.from({length:25},()=>({ports:0,decoy:true}));
 for(let i=0;i<route.length;i++){
  const here=route[i];routeCells[here]=true;
  let mask=0;if(i>0)mask|=direction(here,route[i-1]);if(i<route.length-1)mask|=direction(here,route[i+1]);
  solutionPorts[here]=mask;cells[here]={ports:mask,fixed:i===0?"source":i===route.length-1?"target":undefined};
 }
 // Chapter 5 adds a fixed crossover on a straight route segment. Power
 // travels straight through the bridge; the perpendicular channel is isolated.
 if(safeLevel>=21){
  const bridgeCandidates=route.slice(2,-2).filter(i=>{
   const mask=solutionPorts[i];
   return mask===(N|S)||mask===(E|W);
  });
  if(bridgeCandidates.length){
   const bridgeIndex=bridgeCandidates[Math.floor(rand()*bridgeCandidates.length)];
   cells[bridgeIndex]={...cells[bridgeIndex],ports:15,bridge:true};
   solutionPorts[bridgeIndex]=15;
  }
 }
 // Off-route tiles are visual dead-end wires. Their single port can never bridge
 // two cells, so they add noise without creating an accidental alternate solution.
 for(let i=0;i<25;i++)if(!routeCells[i]){const r=Math.floor(i/5),c=i%5,options=[N,E,S,W].filter(d=>(d!==N||r>0)&&(d!==S||r<4)&&(d!==W||c>0)&&(d!==E||c<4));cells[i]={ports:options[Math.floor(rand()*options.length)],decoy:true};}
 const switchIndex=safeLevel>=7?route[Math.floor(route.length/2)]:null;
 const checkpointIndices=safeLevel>=12?[route[Math.floor(route.length/3)],route[Math.floor((route.length*2)/3)]]:safeLevel>=9?[route[Math.floor(route.length*0.4)]]:[];
 // Later chapters add powered side branches. Each branch is a real tee junction
 // on the main route and a one-port terminal on a neighbouring unused cell.
 const branchCount=safeLevel>=18?2:safeLevel>=15?1:0;
 const branchIndices:number[]=[];
 const branchCandidates:number[]=[];
 for(let i=2;i<route.length-2;i++){
  const anchor=route[i],r=Math.floor(anchor/5),col=anchor%5;
  for(const [nr,nc,out] of [[r-1,col,N],[r,col+1,E],[r+1,col,S],[r,col-1,W]]){
   if(nr<0||nr>=5||nc<0||nc>=5||cells[anchor].bridge)continue;
   const candidate=index(nr,nc);
   if(routeCells[candidate]||!cells[candidate].decoy)continue;
   // A branch terminal has one port. Other route cells cannot connect
   // to it unless their route mask points back to the terminal.
   branchCandidates.push(anchor,candidate,out);
  }
 }
 const branchTriples:number[][]=[];
 for(let i=0;i<branchCandidates.length;i+=3)branchTriples.push(branchCandidates.slice(i,i+3));
 for(const [anchor,candidate,out] of shuffled(branchTriples.map((_,i)=>i),rand).map(i=>branchTriples[i])){
  if(branchIndices.length>=branchCount)break;
  if(routeCells[candidate]||branchIndices.includes(candidate))continue;
  routeCells[candidate]=true;
  branchIndices.push(candidate);
  solutionPorts[anchor]|=out;
  cells[anchor].ports|=out;
  solutionPorts[candidate]=out===N?S:out===E?W:out===S?N:E;
  cells[candidate]={ports:solutionPorts[candidate],decoy:false};
 }
 // Chapter 2 introduces fixed blockers. They occupy off-route cells and
 // cannot be rotated or conduct power, so the guaranteed route stays solvable.
 const blockerCount=safeLevel>=10?3:safeLevel>=5?1:0;
 const blockerCandidates=shuffled(cells.map((cell,i)=>cell.decoy?i:-1).filter(i=>i>=0),rand);
 for(const i of blockerCandidates.slice(0,blockerCount))cells[i]={ports:0,blocked:true};
 const minTurns=safeLevel>=8?3:safeLevel>=4?2:1;
 for(const tileIndex of [...route.slice(1,-1),...branchIndices]){const turns=minTurns+Math.floor(rand()*(4-minTurns));for(let t=0;t<turns;t++)cells[tileIndex].ports=rotate(cells[tileIndex].ports);}
 // Guarantee a fresh puzzle does not begin already completed, including any
 // incidental adjacency between nearby route segments.
 let guard=0;while(isCircuitConnected(cells,true)&&guard++<3){const tile=route[1];cells[tile].ports=rotate(cells[tile].ports);}
 return {cells,solutionPorts,routeCells,checkpointIndices,reachedCheckpoints:0,branchIndices,switchIndex,switchActive:switchIndex===null,seed,level:safeLevel,moves:0,solved:false};
}

export function getCircuitHint(puzzle:CircuitPuzzle):CircuitHint{
 if(puzzle.switchIndex!==null&&!puzzle.switchActive&&isCircuitConnected(puzzle.cells,true))return {activateSwitch:true};
 for(let i=0;i<puzzle.cells.length;i++){
  if(!puzzle.routeCells[i]||puzzle.cells[i].fixed||puzzle.cells[i].bridge)continue;
  let mask=puzzle.cells[i].ports;
  for(let turns=1;turns<=3;turns++){mask=rotate(mask);if(mask===puzzle.solutionPorts[i])return {cellIndex:i,rotationsRemaining:turns};}
 }
 return null;
}

export function rotateCircuitCell(puzzle:CircuitPuzzle,cellIndex:number):CircuitPuzzle{
 if(puzzle.solved||cellIndex<0||cellIndex>=25||puzzle.cells[cellIndex].blocked||puzzle.cells[cellIndex].fixed||puzzle.cells[cellIndex].bridge)return puzzle;
 const cells=puzzle.cells.map((cell,i)=>i===cellIndex?{...cell,ports:rotate(cell.ports)}:cell);
 return evaluateCircuit({...puzzle,cells,moves:puzzle.moves+1});
}
export function activateCircuitSwitch(puzzle:CircuitPuzzle):CircuitPuzzle{
 if(puzzle.solved||puzzle.switchIndex===null||puzzle.switchActive)return puzzle;
 const switchActive=true;
 return evaluateCircuit({...puzzle,switchActive,moves:puzzle.moves+1});
}

/** Latch ordered checkpoints as the live network reaches them. */
function evaluateCircuit(puzzle:CircuitPuzzle):CircuitPuzzle{
 if(!puzzle.switchActive)return puzzle;
 const connected=connectedFromSource(puzzle.cells);
 let reached=puzzle.reachedCheckpoints;
 while(reached<puzzle.checkpointIndices.length&&connected.has(puzzle.checkpointIndices[reached]))reached++;
 const target=puzzle.cells.findIndex(cell=>cell.fixed==="target");
 const branchesPowered=puzzle.branchIndices.every(index=>connected.has(index));
 return {...puzzle,reachedCheckpoints:reached,solved:reached===puzzle.checkpointIndices.length&&branchesPowered&&connected.has(target)};
}
/** Traverse the network while preserving independent bridge channels.
 * State includes the port through which power entered the current tile.
 * Ordinary tiles connect all their ports; bridge tiles only connect opposite
 * ports on the same axis (N↔S or E↔W).
 */
export function getCircuitConnectedCells(cells:PipeCell[],sourceIndex?:number,allowedCellIndices?:number[],boardSize=5):Set<number>{
 const source=sourceIndex??cells.findIndex(cell=>cell.fixed==="source"),connected=new Set<number>();
 const allowedCells=allowedCellIndices?new Set(allowedCellIndices):null;
 if(source<0||source>=cells.length||cells[source].blocked||(allowedCells&&!allowedCells.has(source)))return connected;
 const queue:Array<{index:number;incoming:number}>=[{index:source,incoming:0}];
 const visited=new Set<string>();
 while(queue.length){
  const {index:current,incoming}=queue.shift()!;
  const state=`${current}:${incoming}`;
  if(visited.has(state))continue;
  visited.add(state);connected.add(current);
  const cell=cells[current];if(cell.blocked)continue;
  const allowed=cell.bridge&&incoming!==0
   ? [incoming===N?S:incoming===S?N:incoming===E?W:E]
   : [N,E,S,W].filter(port=>port!==incoming);
  const row=Math.floor(current/boardSize),col=current%boardSize;
  const neighbours:[[number,number,number,number],[number,number,number,number],[number,number,number,number],[number,number,number,number]]=[
   [row-1,col,N,S],[row,col+1,E,W],[row+1,col,S,N],[row,col-1,W,E]
  ];
  for(const [nr,nc,out,back] of neighbours){
   if(!allowed.includes(out)||!(cell.ports&out)||nr<0||nr>=boardSize||nc<0||nc>=boardSize)continue;
   const next=nr*boardSize+nc,nextCell=cells[next];
   if((!allowedCells||allowedCells.has(next))&&!nextCell.blocked&&(nextCell.ports&back))queue.push({index:next,incoming:back});
  }
 }
 return connected;
}
/** Evaluate each circuit from its own source. A source cannot borrow power
 * from another network, even when the networks touch or cross on the board.
 */
export function evaluateCircuitNetworks(cells:PipeCell[],networks:CircuitNetwork[]):CircuitNetworkState[]{
 return networks.map(network=>{
  const connected=getCircuitConnectedCells(cells,network.sourceIndex,network.cellIndices,network.boardSize??5);
  return {network,connected,complete:connected.has(network.targetIndex)};
 });
}
function connectedFromSource(cells:PipeCell[]):Set<number>{return getCircuitConnectedCells(cells);}
export function isCircuitConnected(cells:PipeCell[],switchActive=true):boolean{
 if(!switchActive)return false;
 const target=cells.findIndex(cell=>cell.fixed==="target");
 return target>=0&&getCircuitConnectedCells(cells).has(target);
}
export function circuitGlyph(mask:number):string{
 const glyphs:Record<number,string>={1:"╵",2:"╶",3:"└",4:"╷",5:"│",6:"┌",7:"├",8:"╴",9:"┘",10:"─",11:"┴",12:"┐",13:"┤",14:"┬",15:"┼"};
 return glyphs[mask]??"·";
}

const directionForSize=(a:number,b:number,size:number)=>{
 const ar=Math.floor(a/size),ac=a%size,br=Math.floor(b/size),bc=b%size;
 if(br<ar)return N;if(bc>ac)return E;if(br>ar)return S;return W;
};
const MULTI_SIZE=7;
const MULTI_COLORS=["#35D8E8","#FFB45B","#A78BFA","#72D69A"] as const;
/** Seeded bounded DFS for a self-avoiding route. Reserved cells protect the
 * other network's endpoints and already-generated path. */
function createMultiRoute(start:number,target:number,rand:()=>number,reserved:Set<number>,minimumLength=10,budgetLimit=12000):number[]|null{
 const path=[start],visited=new Set<number>([start]);let budget=budgetLimit;
 const walk=(current:number):boolean=>{
  if(--budget<=0)return false;
  if(current===target)return path.length>=minimumLength;
  if(path.length>=35)return false;
  const row=Math.floor(current/MULTI_SIZE),col=current%MULTI_SIZE;
  const candidates=shuffled([[row-1,col],[row,col+1],[row+1,col],[row,col-1]]
   .filter(([r,c])=>r>=0&&r<MULTI_SIZE&&c>=0&&c<MULTI_SIZE)
   .map(([r,c])=>r*MULTI_SIZE+c),rand)
   .filter(next=>!visited.has(next)&&(!reserved.has(next)||next===target));
  for(const next of candidates){
   visited.add(next);path.push(next);
   if(walk(next))return true;
   path.pop();visited.delete(next);
  }
  return false;
 };
 return walk(start)?[...path]:null;
}
/** Generate two independently owned, self-avoiding routes with seeded,
 * randomized topology. A known disjoint pair is retained as a safe fallback. */
export function createMultiNetworkPuzzle(seed=1,networkCount:2|3|4=2):MultiNetworkPuzzle{
 const rand=random(seed>>>0),cells:PipeCell[]=Array.from({length:MULTI_SIZE*MULTI_SIZE},()=>({ports:0,decoy:true}));
 const endpointPairs: [number,number][] = networkCount===2
  ? [[48,2],[0,46]]
  : Array.from({length:networkCount},(_,i)=>{const row=networkCount===3?[0,3,6][i]:[0,2,4,6][i];return [row*MULTI_SIZE,row*MULTI_SIZE+MULTI_SIZE-1] as [number,number];});
 const minimumLength=networkCount===2?10:7;
 const fallback=endpointPairs.map(([start,target])=>{
  const row=Math.floor(start/MULTI_SIZE);
  return Array.from({length:MULTI_SIZE},(_,col)=>row*MULTI_SIZE+col);
 });
 let paths:number[][]|null=null;
 for(let attempt=0;attempt<(networkCount===2?24:12)&&!paths;attempt++){
  const candidatePaths:number[][]=[];
  const reserved=new Set(endpointPairs.flat());
  let valid=true;
  for(const [start,target] of endpointPairs){
   const path=createMultiRoute(start,target,rand,reserved,minimumLength,networkCount===2?12000:2500);
   if(!path||path.some(tile=>reserved.has(tile)&&tile!==start&&tile!==target)){valid=false;break;}
   candidatePaths.push(path);
   for(const tile of path)reserved.add(tile);
  }
  if(valid)paths=candidatePaths;
 }
 if(!paths)paths=fallback;
 const occupied=new Set<number>();
 const networks:CircuitNetwork[]=paths.map((path,index)=>{ 
  const id=["alpha","beta","gamma","delta"][index],color=MULTI_COLORS[index];
  for(const tile of path){if(occupied.has(tile))throw new Error("Multi-network route collision");occupied.add(tile);}
  const solutionPorts=Array.from({length:MULTI_SIZE*MULTI_SIZE},()=>0);
  for(let i=0;i<path.length;i++){
   const tile=path[i];let mask=0;
   if(i>0)mask|=directionForSize(tile,path[i-1],MULTI_SIZE);
   if(i<path.length-1)mask|=directionForSize(tile,path[i+1],MULTI_SIZE);
   solutionPorts[tile]=mask;
   cells[tile]={ports:mask,decoy:false,networkId:id,fixed:i===0?"source":i===path.length-1?"target":undefined};
  }
  const rotations=path.slice(1,-1).map(tile=>({tile,turns:1+Math.floor(rand()*3)}));
  for(const {tile,turns} of rotations)for(let i=0;i<turns;i++)cells[tile].ports=rotate(cells[tile].ports);
  return {id,color,sourceIndex:path[0],targetIndex:path[path.length-1],cellIndices:[...path],boardSize:MULTI_SIZE,solutionPorts};
 });
 for(let i=0;i<cells.length;i++)if(!occupied.has(i)){
  const row=Math.floor(i/MULTI_SIZE),col=i%MULTI_SIZE;
  const options=[N,E,S,W].filter(d=>(d!==N||row>0)&&(d!==S||row<MULTI_SIZE-1)&&(d!==W||col>0)&&(d!==E||col<MULTI_SIZE-1));
  cells[i]={ports:options[Math.floor(rand()*options.length)],decoy:true};
 }
 return {cells,networks,moves:0,solved:false,seed:seed>>>0,boardSize:MULTI_SIZE};
}
export function rotateMultiNetworkCell(puzzle:MultiNetworkPuzzle,cellIndex:number):MultiNetworkPuzzle{
 if(puzzle.solved||cellIndex<0||cellIndex>=puzzle.cells.length||puzzle.cells[cellIndex].fixed||puzzle.cells[cellIndex].blocked)return puzzle;
 const cells=puzzle.cells.map((cell,index)=>index===cellIndex?{...cell,ports:rotate(cell.ports)}:cell);
 const networks=evaluateCircuitNetworks(cells,puzzle.networks);
 return {...puzzle,cells,moves:puzzle.moves+1,solved:networks.every(network=>network.complete)};
}
