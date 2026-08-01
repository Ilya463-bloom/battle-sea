import { For } from 'solid-js';
import { ShipBody } from '../components/Board';
import { FLEET_SIZES } from '../game/constants';
import { actions } from '../game/state';

const RULES = [
  'Two players, one device — pass it back and forth.',
  'Ships are straight and may never touch, not even at a corner.',
  'A hit lets you fire again; a miss ends your turn.',
  'Sink every enemy ship to win.',
];

export function IntroScreen() {
  return (
    <div class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div class="tilt-l">
        <h1 class="font-display text-7xl leading-none sm:text-8xl">Sea Battle</h1>
        <p class="mt-1 text-2xl text-ink-soft">two players · one notebook</p>
      </div>

      <div class="sketch ink-line ink-double tilt-r w-full max-w-md bg-paper/70 p-4 text-left">
        <h2 class="font-display text-3xl leading-none">The fleet</h2>
        <div class="mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <For each={FLEET_SIZES}>
            {(size) => (
              <div class="h-5" style={{ width: `${size * 1.25}rem` }}>
                <ShipBody size={size} orientation="h" />
              </div>
            )}
          </For>
        </div>

        <ul class="space-y-1 text-lg">
          <For each={RULES}>
            {(rule) => (
              <li class="flex gap-2">
                <span class="text-ink-soft">—</span>
                <span>{rule}</span>
              </li>
            )}
          </For>
        </ul>
      </div>

      <button type="button" class="btn text-3xl" onClick={() => actions.startGame()}>
        Start game
      </button>
    </div>
  );
}
