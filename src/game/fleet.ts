import { BOARD_SIZE, FLEET } from './constants';
import type { Cell, Orientation, Ship, ShipSpec } from './types';

export function shipCells(ship: Ship): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < ship.size; i++) {
    cells.push(
      ship.orientation === 'h'
        ? { row: ship.row, col: ship.col + i }
        : { row: ship.row + i, col: ship.col },
    );
  }
  return cells;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** The ship's own cells plus the one-cell halo that must stay empty. */
export function shipHalo(ship: Ship): Cell[] {
  const halo: Cell[] = [];
  const seen = new Set<string>();
  for (const cell of shipCells(ship)) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = cell.row + dr;
        const col = cell.col + dc;
        const key = `${row}:${col}`;
        if (!inBounds(row, col) || seen.has(key)) continue;
        seen.add(key);
        halo.push({ row, col });
      }
    }
  }
  return halo;
}

/**
 * A placement is legal when the ship is fully on the board and no other ship
 * touches it — not even diagonally.
 */
export function canPlace(fleet: Ship[], candidate: Ship): boolean {
  const cells = shipCells(candidate);
  if (cells.some((c) => !inBounds(c.row, c.col))) return false;

  const blocked = new Set<string>();
  for (const other of fleet) {
    if (other.id === candidate.id) continue;
    for (const cell of shipHalo(other)) blocked.add(`${cell.row}:${cell.col}`);
  }
  return cells.every((c) => !blocked.has(`${c.row}:${c.col}`));
}

export function findShipAt(fleet: Ship[], row: number, col: number): Ship | undefined {
  return fleet.find((ship) => shipCells(ship).some((c) => c.row === row && c.col === col));
}

/** Ships from the pool that have not been put on the board yet. */
export function remainingSpecs(placed: Ship[]): ShipSpec[] {
  return FLEET.filter((spec) => !placed.some((ship) => ship.id === spec.id));
}

export function isFleetComplete(placed: Ship[]): boolean {
  return placed.length === FLEET.length;
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/** Random but always legal arrangement of the whole pool. */
export function randomFleet(): Ship[] {
  // Largest ships first — they are the hardest to fit.
  const specs = [...FLEET].sort((a, b) => b.size - a.size);

  for (let attempt = 0; attempt < 200; attempt++) {
    const fleet: Ship[] = [];
    let stuck = false;

    for (const spec of specs) {
      let placed = false;
      for (let tries = 0; tries < 400 && !placed; tries++) {
        const orientation: Orientation = Math.random() < 0.5 ? 'h' : 'v';
        const span = BOARD_SIZE - spec.size + 1;
        const candidate: Ship = {
          ...spec,
          orientation,
          row: orientation === 'h' ? randomInt(BOARD_SIZE) : randomInt(span),
          col: orientation === 'h' ? randomInt(span) : randomInt(BOARD_SIZE),
        };
        if (canPlace(fleet, candidate)) {
          fleet.push(candidate);
          placed = true;
        }
      }
      if (!placed) {
        stuck = true;
        break;
      }
    }

    if (!stuck) return fleet.sort((a, b) => a.id.localeCompare(b.id));
  }

  // Practically unreachable: 200 independent attempts of a 10-ship layout.
  throw new Error('Could not generate a valid fleet layout');
}
