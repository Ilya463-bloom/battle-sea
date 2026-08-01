import { Match, Switch, onMount } from 'solid-js';
import { actions, state } from './game/state';
import { initNativeShell } from './platform/native';
import { BattleScreen } from './screens/BattleScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { HandoffScreen } from './screens/HandoffScreen';
import { IntroScreen } from './screens/IntroScreen';
import { PlacementScreen } from './screens/PlacementScreen';

/**
 * Android back button. Returning false lets the system close the app, which is
 * only acceptable from the title screen.
 */
function handleBack(): boolean {
  if (state.phase === 'intro') return false;

  if (state.phase === 'over' || confirm('Quit the current game?')) {
    actions.abandonGame();
  }
  return true;
}

export function App() {
  onMount(() => {
    void initNativeShell(handleBack);
  });

  return (
    <main class="safe-area flex min-h-dvh w-full flex-col">
      <Switch fallback={<IntroScreen />}>
        <Match when={state.phase === 'intro'}>
          <IntroScreen />
        </Match>
        <Match when={state.phase === 'placing'}>
          <PlacementScreen />
        </Match>
        <Match when={state.phase === 'handoff'}>
          <HandoffScreen />
        </Match>
        <Match when={state.phase === 'battle'}>
          <BattleScreen />
        </Match>
        <Match when={state.phase === 'over'}>
          <GameOverScreen />
        </Match>
      </Switch>
    </main>
  );
}
