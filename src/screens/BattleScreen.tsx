import { For, Show, createMemo } from 'solid-js';
import { BoardFrame, HitMark, MissMark, ShipBody, ShipShape } from '../components/Board';
import { FLEET_COUNT, cellName } from '../game/constants';
import { actions, opponentOf, state } from '../game/state';
import { shotFeedback } from '../platform/native';
import type { ShotResult } from '../game/types';

const RESULT_TEXT: Record<ShotResult, string> = {
  hit: 'Hit! Fire again.',
  sunk: 'Sunk her! Fire again.',
  miss: 'Miss.',
  win: 'Fleet destroyed!',
};

export function BattleScreen() {
  const shooter = () => state.currentPlayer;
  const defender = () => opponentOf(shooter());
  const targetBoard = () => state.boards[defender()];

  const sunkShips = createMemo(() =>
    targetBoard().ships.filter((ship) => targetBoard().sunkIds.includes(ship.id)),
  );

  /** Opponent fleet, largest first, marked as destroyed or still afloat. */
  const fleetStatus = createMemo(() =>
    [...targetBoard().ships]
      .sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
      .map((ship) => ({ ship, sunk: targetBoard().sunkIds.includes(ship.id) })),
  );

  const remaining = () => FLEET_COUNT - targetBoard().sunkIds.length;

  return (
    <div class="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-3 py-4">
      {/* Keyed on a string, not on the player id — player 1 is 0, which Show reads as falsy. */}
      <Show when={`turn-${shooter()}`} keyed>
        <header class="animate-fade-slide text-center">
          <p class="text-lg tracking-wide text-ink-soft uppercase">Now shooting</p>
          <h1 class="font-display text-5xl leading-none sm:text-6xl">
            {state.boards[shooter()].name}
          </h1>
          <p class="mt-1 text-lg text-ink-soft">
            {state.boards[defender()].name}'s waters — {remaining()} ships left
          </p>
        </header>
      </Show>

      <div class="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        <div class="tilt-l w-full max-w-104 shrink-0">
          <BoardFrame
            interactive={!state.locked}
            cellDisabled={(row, col) => targetBoard().incoming[row][col] !== 'none'}
            onCellClick={(row, col) => {
              actions.fire(row, col);
              const shot = state.lastShot;
              if (shot && shot.row === row && shot.col === col) shotFeedback(shot.result);
            }}
            cell={(row, col) => (
              <Show when={targetBoard().incoming[row][col] !== 'none'}>
                <Show when={targetBoard().incoming[row][col] === 'hit'} fallback={<MissMark />}>
                  <HitMark />
                </Show>
              </Show>
            )}
            overlay={
              <For each={sunkShips()}>{(ship) => <ShipShape ship={ship} visual="sunk" />}</For>
            }
          />
        </div>

        <div class="flex w-full max-w-104 flex-col gap-4 lg:max-w-xs">
          <section
            class={`sketch-alt ink-double tilt-r border-2 p-3 text-center ${
              state.lastShot
                ? state.lastShot.result === 'miss'
                  ? 'border-ink bg-paper/70'
                  : 'border-red-pen bg-red-pen/5'
                : 'border-ink/40 bg-paper/50'
            }`}
          >
            <Show
              when={state.lastShot}
              fallback={<p class="font-display text-3xl text-ink-soft">Pick a square.</p>}
            >
              {(shot) => (
                <>
                  <p class="font-display text-4xl leading-none">{RESULT_TEXT[shot().result]}</p>
                  <p class="mt-1 text-lg text-ink-soft">
                    {cellName(shot().row, shot().col)}
                    {shot().result === 'miss' ? ' — passing the device…' : ''}
                  </p>
                </>
              )}
            </Show>
          </section>

          <section class="sketch ink-line ink-double bg-paper/70 p-3">
            <h2 class="mb-2 font-display text-3xl leading-none">Enemy fleet</h2>
            <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
              <For each={fleetStatus()}>
                {(entry) => (
                  <div
                    class={`h-5 ${entry.sunk ? 'opacity-90' : ''}`}
                    style={{ width: `${entry.ship.size * 1.25}rem` }}
                    title={entry.sunk ? 'destroyed' : 'afloat'}
                  >
                    <ShipBody
                      size={entry.ship.size}
                      orientation="h"
                      visual={entry.sunk ? 'sunk' : 'intact'}
                    />
                  </div>
                )}
              </For>
            </div>
          </section>

          <p class="px-1 text-center text-lg text-ink-soft lg:text-left">
            A hit keeps the turn. A miss hands the device to{' '}
            {state.boards[defender()].name}.
          </p>
        </div>
      </div>
    </div>
  );
}
