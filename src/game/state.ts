import { createStore, produce } from 'solid-js/store';
import { BOARD_SIZE, FLEET_COUNT, MISS_HANDOVER_MS } from './constants';
import { findShipAt, isFleetComplete, randomFleet, shipCells, shipHalo } from './fleet';
import type { Phase, PlayerBoard, PlayerId, Ship, ShotMark, ShotResult } from './types';

export interface LastShot {
  player: PlayerId;
  row: number;
  col: number;
  result: ShotResult;
}

export interface GameState {
  phase: Phase;
  /** Whose fleet is being arranged during `placing`. */
  placingPlayer: PlayerId;
  /** Whose turn it is during `battle`. */
  currentPlayer: PlayerId;
  winner: PlayerId | null;
  /** Who should pick up the device on the `handoff` screen. */
  handoffFor: PlayerId;
  /** What comes after the handoff screen. */
  handoffNext: 'placing' | 'battle';
  boards: [PlayerBoard, PlayerBoard];
  lastShot: LastShot | null;
  /** Shots taken by each player, for the final scoreboard. */
  shotsFired: [number, number];
  /** Set while a miss is on screen, right before the boards swap. */
  locked: boolean;
}

function emptyGrid(): ShotMark[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): ShotMark => 'none'),
  );
}

function emptyBoard(name: string): PlayerBoard {
  return { name, ships: [], incoming: emptyGrid(), sunkIds: [] };
}

function initialState(): GameState {
  return {
    phase: 'intro',
    placingPlayer: 0,
    currentPlayer: 0,
    winner: null,
    handoffFor: 1,
    handoffNext: 'placing',
    boards: [emptyBoard('Player 1'), emptyBoard('Player 2')],
    lastShot: null,
    shotsFired: [0, 0],
    locked: false,
  };
}

const [state, setState] = createStore<GameState>(initialState());

let handoverTimer: ReturnType<typeof setTimeout> | undefined;

function cancelHandover(): void {
  if (handoverTimer !== undefined) {
    clearTimeout(handoverTimer);
    handoverTimer = undefined;
  }
}

export const opponentOf = (player: PlayerId): PlayerId => (player === 0 ? 1 : 0);

export const actions = {
  startGame(): void {
    cancelHandover();
    const fresh = initialState();
    setState({ ...fresh, phase: 'placing', placingPlayer: 0 });
  },

  /** Replace the fleet of the player who is currently arranging ships. */
  setPlacement(ships: Ship[]): void {
    setState('boards', state.placingPlayer, 'ships', ships);
  },

  randomizePlacement(): void {
    actions.setPlacement(randomFleet());
  },

  clearPlacement(): void {
    actions.setPlacement([]);
  },

  /** Lock in the current player's fleet and move on. */
  confirmPlacement(): void {
    if (!isFleetComplete(state.boards[state.placingPlayer].ships)) return;

    if (state.placingPlayer === 0) {
      // Hide the first fleet behind a handoff screen before player 2 arranges theirs.
      setState({ phase: 'handoff', handoffFor: 1, handoffNext: 'placing' });
    } else {
      // Both fleets are ready — the device goes back to player 1, who shoots first.
      setState({ phase: 'handoff', handoffFor: 0, handoffNext: 'battle' });
    }
  },

  /** "I have the device" button on the handoff screen. */
  continueAfterHandoff(): void {
    if (state.phase !== 'handoff') return;
    if (state.handoffNext === 'placing') {
      setState({ phase: 'placing', placingPlayer: state.handoffFor });
    } else {
      setState({ phase: 'battle', currentPlayer: state.handoffFor, lastShot: null, locked: false });
    }
  },

  fire(row: number, col: number): void {
    if (state.phase !== 'battle' || state.locked) return;

    const shooter = state.currentPlayer;
    const defender = opponentOf(shooter);
    if (state.boards[defender].incoming[row][col] !== 'none') return;

    const ship = findShipAt(state.boards[defender].ships, row, col);

    if (!ship) {
      setState(
        produce((s) => {
          s.shotsFired[shooter] += 1;
          s.boards[defender].incoming[row][col] = 'miss';
          s.lastShot = { player: shooter, row, col, result: 'miss' };
          s.locked = true;
        }),
      );
      // Let the shooter see where the shot landed, then swap sides.
      cancelHandover();
      handoverTimer = setTimeout(() => {
        handoverTimer = undefined;
        setState(
          produce((s) => {
            if (s.phase !== 'battle') return;
            s.currentPlayer = defender;
            s.locked = false;
            s.lastShot = null;
          }),
        );
      }, MISS_HANDOVER_MS);
      return;
    }

    setState(
      produce((s) => {
        s.shotsFired[shooter] += 1;
        const board = s.boards[defender];
        board.incoming[row][col] = 'hit';

        const destroyed = shipCells(ship).every((c) => board.incoming[c.row][c.col] === 'hit');
        if (destroyed) {
          board.sunkIds.push(ship.id);
          // A sunk ship cannot touch another one, so its halo is known-empty water.
          for (const c of shipHalo(ship)) {
            if (board.incoming[c.row][c.col] === 'none') board.incoming[c.row][c.col] = 'miss';
          }
        }

        const won = board.sunkIds.length === FLEET_COUNT;
        s.lastShot = {
          player: shooter,
          row,
          col,
          result: won ? 'win' : destroyed ? 'sunk' : 'hit',
        };
        if (won) {
          s.phase = 'over';
          s.winner = shooter;
        }
      }),
    );
  },

  playAgain(): void {
    actions.startGame();
  },

  /** Drop the current game and go back to the title screen. */
  abandonGame(): void {
    cancelHandover();
    setState(initialState());
  },
};

export { state };
