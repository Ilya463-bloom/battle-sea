import { actions, state } from '../game/state';

export function HandoffScreen() {
  const receiver = () => state.boards[state.handoffFor].name;
  const other = () => state.boards[state.handoffFor === 0 ? 1 : 0].name;

  return (
    <div class="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div class="sketch ink-line ink-double tilt-l w-full bg-paper/80 p-6">
        <p class="text-xl tracking-wide text-ink-soft uppercase">
          {state.handoffNext === 'placing' ? `${other()}'s fleet is hidden` : 'Both fleets are ready'}
        </p>
        <h1 class="mt-2 font-display text-5xl leading-tight sm:text-6xl">
          Pass the device
          <br />
          to {receiver()}
        </h1>
        <p class="mt-3 text-xl text-ink-soft">
          {state.handoffNext === 'placing'
            ? 'Your turn to arrange your ships. No peeking.'
            : `${receiver()} fires the first shot.`}
        </p>
      </div>

      <button type="button" class="btn text-3xl" onClick={() => actions.continueAfterHandoff()}>
        I am {receiver()}
      </button>
    </div>
  );
}
