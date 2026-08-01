export type Orientation = 'h' | 'v';

/** 0 = first player, 1 = second player. */
export type PlayerId = 0 | 1;

export interface Cell {
  row: number;
  col: number;
}

/** A ship blueprint before it is put on the board. */
export interface ShipSpec {
  id: string;
  size: number;
}

/** A ship that occupies cells on a board. */
export interface Ship extends ShipSpec {
  row: number;
  col: number;
  orientation: Orientation;
}

/** What the opponent knows about one cell of a board. */
export type ShotMark = 'none' | 'miss' | 'hit';

export type ShotResult = 'miss' | 'hit' | 'sunk' | 'win';

export interface PlayerBoard {
  name: string;
  ships: Ship[];
  /** Shots this board has received; indexed [row][col]. */
  incoming: ShotMark[][];
  /** Ids of ships that have been completely destroyed. */
  sunkIds: string[];
}

export type Phase =
  | 'intro'
  /** Someone is arranging their fleet. */
  | 'placing'
  /** "Pass the device" screen shown between the two placement steps. */
  | 'handoff'
  | 'battle'
  | 'over';
