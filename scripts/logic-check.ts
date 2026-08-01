/**
 * Headless smoke test for the rules engine — no test framework, no browser.
 * Run with `npm run check:logic`.
 */
import { BOARD_SIZE, FLEET_COUNT, FLEET_SIZES } from '../src/game/constants';
import { canPlace, randomFleet, shipCells, shipHalo } from '../src/game/fleet';
import { actions, state } from '../src/game/state';
import type { Orientation, Ship } from '../src/game/types';

let failures = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/** Re-verifies a whole layout from scratch, independently of canPlace(). */
function fleetProblem(fleet: Ship[]): string | null {
  const occupied = new Map<string, string>();
  for (const ship of fleet) {
    for (const cell of shipCells(ship)) {
      if (cell.row < 0 || cell.row >= BOARD_SIZE || cell.col < 0 || cell.col >= BOARD_SIZE) {
        return `${ship.id} is out of bounds at ${cell.row},${cell.col}`;
      }
      const key = `${cell.row}:${cell.col}`;
      const owner = occupied.get(key);
      if (owner) return `${ship.id} overlaps ${owner}`;
      occupied.set(key, ship.id);
    }
  }
  for (const ship of fleet) {
    for (const cell of shipHalo(ship)) {
      const owner = occupied.get(`${cell.row}:${cell.col}`);
      if (owner && owner !== ship.id) return `${ship.id} touches ${owner}`;
    }
  }
  return null;
}

const ship = (
  id: string,
  size: number,
  row: number,
  col: number,
  orientation: Orientation,
): Ship => ({ id, size, row, col, orientation });

function setUpBattle(): void {
  actions.startGame();
  actions.randomizePlacement();
  actions.confirmPlacement();
  actions.continueAfterHandoff();
  actions.randomizePlacement();
  actions.confirmPlacement();
  actions.continueAfterHandoff();
}

console.log('\n1. random placement');
{
  const expectedSizes = [...FLEET_SIZES].sort((a, b) => b - a).join();
  let poolOk = true;
  let problem: string | null = null;

  for (let i = 0; i < 500; i++) {
    const fleet = randomFleet();
    if (fleet.length !== FLEET_COUNT) poolOk = false;
    if (fleet.map((s) => s.size).sort((a, b) => b - a).join() !== expectedSizes) poolOk = false;
    problem ??= fleetProblem(fleet);
  }

  check('500 random fleets use the exact ship pool', poolOk);
  check('500 random fleets are legal', problem === null, problem ?? '');
}

console.log('\n2. placement rules');
{
  const base = ship('a', 3, 4, 4, 'h');
  check('overlap is rejected', !canPlace([base], ship('b', 2, 4, 5, 'h')));
  check('side contact is rejected', !canPlace([base], ship('b', 2, 5, 4, 'h')));
  check('diagonal contact is rejected', !canPlace([base], ship('b', 1, 3, 3, 'h')));
  check('a one-cell gap is allowed', canPlace([base], ship('b', 2, 6, 4, 'h')));
  check('hanging off the right edge is rejected', !canPlace([], ship('b', 4, 0, 7, 'h')));
  check('hanging off the bottom edge is rejected', !canPlace([], ship('b', 4, 7, 0, 'v')));
  check('flush against an edge is allowed', canPlace([], ship('b', 4, 0, 6, 'h')));
  check('a ship does not block itself when moved', canPlace([base], ship('a', 3, 4, 5, 'h')));
}

console.log('\n3. a player who never misses');
{
  actions.startGame();
  check('the first player places first', state.phase === 'placing' && state.placingPlayer === 0);

  actions.randomizePlacement();
  actions.confirmPlacement();
  check('player 1 fleet is hidden behind a handoff', state.phase === 'handoff' && state.handoffFor === 1);

  actions.continueAfterHandoff();
  check('player 2 places second', state.phase === 'placing' && state.placingPlayer === 1);

  actions.randomizePlacement();
  actions.confirmPlacement();
  actions.continueAfterHandoff();
  check('battle opens with player 1', state.phase === 'battle' && state.currentPlayer === 0);

  const hullCells = state.boards[1].ships.flatMap((item) => shipCells(item));
  let turnHeld = true;
  let haloNeverHitHull = true;

  for (const cell of hullCells) {
    if (state.phase !== 'battle') break;
    if (state.currentPlayer !== 0) turnHeld = false;
    if (state.boards[1].incoming[cell.row][cell.col] === 'miss') haloNeverHitHull = false;
    actions.fire(cell.row, cell.col);
  }

  check('a hit keeps the turn (20 shots in a row)', turnHeld);
  check('auto-marked water never lands on a hull', haloNeverHitHull);
  check('the game ends', state.phase === 'over');
  check('the shooter wins', state.winner === 0);
  check('all 10 ships are sunk', state.boards[1].sunkIds.length === FLEET_COUNT);
  check('20 shots were enough', state.shotsFired[0] === 20, `took ${state.shotsFired[0]}`);

  let outlined = true;
  for (const item of state.boards[1].ships) {
    const hull = new Set(shipCells(item).map((c) => `${c.row}:${c.col}`));
    for (const cell of shipHalo(item)) {
      if (hull.has(`${cell.row}:${cell.col}`)) continue;
      if (state.boards[1].incoming[cell.row][cell.col] !== 'miss') outlined = false;
    }
  }
  check('every sunk ship is outlined with known water', outlined);
}

console.log('\n4. a miss hands the device over');
{
  setUpBattle();

  const hull = new Set(
    state.boards[1].ships.flatMap((item) => shipCells(item)).map((c) => `${c.row}:${c.col}`),
  );
  let water: { row: number; col: number } | undefined;
  for (let row = 0; row < BOARD_SIZE && !water; row++) {
    for (let col = 0; col < BOARD_SIZE && !water; col++) {
      if (!hull.has(`${row}:${col}`)) water = { row, col };
    }
  }
  if (!water) throw new Error('a 10×10 board always has empty water');

  actions.fire(water.row, water.col);
  check('the miss stays on screen before the swap', state.locked && state.currentPlayer === 0);

  const beforeLocked = state.shotsFired[0];
  actions.fire(water.row === 0 ? 9 : 0, 0);
  check('shots are ignored while locked', state.shotsFired[0] === beforeLocked);

  await new Promise((resolve) => setTimeout(resolve, 1400));
  check('the turn passes to player 2', state.currentPlayer === 1 && !state.locked);
  check('the miss banner is cleared for the new player', state.lastShot === null);

  const beforeRepeat = state.shotsFired[1];
  actions.fire(water.row, water.col);
  const repeatCell = state.boards[0].incoming[water.row][water.col];
  check(
    'shooting the same cell twice is possible on the other board',
    state.shotsFired[1] === beforeRepeat + 1 && repeatCell !== 'none',
  );
}

console.log('\n5. replay resets everything');
{
  actions.playAgain();
  check('back to placing player 1', state.phase === 'placing' && state.placingPlayer === 0);
  check('boards are empty', state.boards[0].ships.length === 0 && state.boards[1].ships.length === 0);
  check('no shots are carried over', state.shotsFired[0] === 0 && state.shotsFired[1] === 0);
  check('no winner is carried over', state.winner === null);
  check(
    'shot grids are cleared',
    state.boards[0].incoming.every((row) => row.every((cell) => cell === 'none')),
  );
}

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
