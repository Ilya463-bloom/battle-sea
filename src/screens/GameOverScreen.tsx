import { For, Show } from 'solid-js';
import { BoardFrame, HitMark, MissMark, ShipShape } from '../components/Board';
import { actions, state } from '../game/state';
import type { PlayerBoard, PlayerId } from '../game/types';

/** Final reveal: every ship and every shot on one board. */
function RevealedBoard(props: { board: PlayerBoard; caption: string; tilt: string }) {
  return (
    <div class={`w-full max-w-88 ${props.tilt}`}>
      <BoardFrame
        cell={(row, col) => (
          <Show when={props.board.incoming[row][col] !== 'none'}>
            <Show when={props.board.incoming[row][col] === 'hit'} fallback={<MissMark />}>
              <HitMark />
            </Show>
          </Show>
        )}
        overlay={
          <For each={props.board.ships}>
            {(ship) => (
              <ShipShape
                ship={ship}
                visual={props.board.sunkIds.includes(ship.id) ? 'sunk' : 'intact'}
              />
            )}
          </For>
        }
      />
      <p class="mt-1 text-center text-xl text-ink-soft">{props.caption}</p>
    </div>
  );
}

export function GameOverScreen() {
  const winner = () => (state.winner ?? 0) as PlayerId;
  const loser = () => (winner() === 0 ? 1 : 0) as PlayerId;

  return (
    <div class="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-3 py-6">
      <header class="tilt-l text-center">
        <p class="text-xl tracking-wide text-ink-soft uppercase">Game over</p>
        <h1 class="font-display text-6xl leading-none sm:text-7xl">
          {state.boards[winner()].name} wins!
        </h1>
        <p class="mt-2 text-xl text-ink-soft">
          {state.shotsFired[winner()]} shots fired · {state.shotsFired[loser()]} taken by{' '}
          {state.boards[loser()].name}
        </p>
      </header>

      <div class="flex w-full flex-wrap items-start justify-center gap-6">
        <RevealedBoard
          board={state.boards[0]}
          caption={`${state.boards[0].name}'s waters`}
          tilt="tilt-l"
        />
        <RevealedBoard
          board={state.boards[1]}
          caption={`${state.boards[1].name}'s waters`}
          tilt="tilt-r"
        />
      </div>

      <button type="button" class="btn text-3xl" onClick={() => actions.playAgain()}>
        Play again
      </button>
    </div>
  );
}
