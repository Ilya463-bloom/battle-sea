import type { ShipSpec } from './types';

export const BOARD_SIZE = 10;

export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const ROW_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) => String(i + 1));

/** 1×4-deck, 2×3-deck, 3×2-deck, 4×1-deck — the classic pool. */
export const FLEET_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

export const FLEET: ShipSpec[] = FLEET_SIZES.map((size, i) => ({
  id: `s${size}-${i}`,
  size,
}));

export const FLEET_COUNT = FLEET.length;

/** How long the losing shot stays on screen before the boards swap. */
export const MISS_HANDOVER_MS = 1100;

export function cellName(row: number, col: number): string {
  return `${COLUMN_LABELS[col]}${row + 1}`;
}
